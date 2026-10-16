import { prisma } from '@shared/db/prisma';
import { AppError } from '@shared/errors/AppError';
import { logger } from '@shared/logger';
import {
  assertMultiPartyTransfersEnabled,
  assertRazorpayXPayoutsEnabled,
} from '@shared/payments/outbound-payment.policy';
import { WalletTransactionType, WithdrawalEntityType, WithdrawalStatus } from '@prisma/client';
import { processWithdrawalViaRazorpayX } from '@modules/driver-wallet/driver-wallet.service';

const MIN_WITHDRAWAL = Number(process.env.MIN_WITHDRAWAL_AMOUNT ?? 50);

// ─────────────────────────────────────────────────────────────────────────────
// GET WALLET + HISTORY
// ─────────────────────────────────────────────────────────────────────────────

export async function getFleetWallet(fleetOwnerId: string) {
  return prisma.fleetWallet.upsert({
    where:  { fleetOwnerId },
    create: { fleetOwnerId },
    update: {},
    include: {
      transactions: {
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  });
}

export async function getFleetTransactionHistory(
  fleetOwnerId: string,
  page  = 1,
  limit = 20
) {
  const wallet = await prisma.fleetWallet.findUnique({ where: { fleetOwnerId } });
  if (!wallet) return { transactions: [], total: 0, balance: 0 };

  const [transactions, total] = await Promise.all([
    prisma.fleetWalletTransaction.findMany({
      where:   { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      skip:    (page - 1) * limit,
      take:    limit,
    }),
    prisma.fleetWalletTransaction.count({ where: { walletId: wallet.id } }),
  ]);

  return { transactions, total, balance: wallet.cachedBalance };
}

// ─────────────────────────────────────────────────────────────────────────────
// WITHDRAWAL REQUEST
// ─────────────────────────────────────────────────────────────────────────────

export async function requestFleetWithdrawal(fleetOwnerId: string, amount: number, idempotencyKey?: string) {
  if (!Number.isFinite(amount) || amount < MIN_WITHDRAWAL) {
    throw AppError.badRequest(`Minimum withdrawal is Rs.${MIN_WITHDRAWAL}`, 'BELOW_MIN_WITHDRAWAL');
  }

  assertRazorpayXPayoutsEnabled();

  // FIN-004: Fast-path return for duplicate client retries with an idempotency key
  if (idempotencyKey) {
    const existingReq = await prisma.withdrawalRequest.findUnique({
      where: { idempotencyKey },
    });
    if (existingReq) {
      if (existingReq.amount !== amount) {
        throw AppError.conflict('Idempotency key reused with different amount', 'IDEMPOTENCY_CONFLICT');
      }
      return existingReq;
    }
  }

  const [wallet, fleetOwner] = await Promise.all([
    prisma.fleetWallet.findUnique({ where: { fleetOwnerId } }),
    prisma.fleetOwner.findUnique({ where: { id: fleetOwnerId }, include: { user: true } }),
  ]);

  if (!wallet)      throw AppError.notFound('Fleet wallet not found');
  if (!fleetOwner)  throw AppError.notFound('Fleet owner not found');

  if (wallet.cachedBalance < amount) {
    throw AppError.badRequest(
      `Insufficient balance. Available: Rs.${wallet.cachedBalance.toFixed(2)}`,
      'INSUFFICIENT_BALANCE'
    );
  }

  if (!fleetOwner.bankAccountNo || !fleetOwner.bankIfsc) {
    throw AppError.badRequest(
      'Bank account details not configured. Please add your bank account first.',
      'NO_BANK_ACCOUNT'
    );
  }

  try {
    const withdrawalRequest = await prisma.$transaction(async (tx) => {
      // 1. In-transaction pending check prevents concurrent duplicate withdrawals
      const pending = await tx.withdrawalRequest.findFirst({
        where: {
          entityType: WithdrawalEntityType.FLEET,
          entityId:   fleetOwnerId,
          status: { in: [WithdrawalStatus.PENDING, WithdrawalStatus.AUTO_PROCESSING] },
        },
      });
      if (pending) {
        throw AppError.badRequest(
          'A withdrawal is already in progress. Please wait for it to complete.',
          'WITHDRAWAL_IN_PROGRESS'
        );
      }

      // 2. Conditional balance decrement prevents overdraft
      const deductResult = await tx.fleetWallet.updateMany({
        where: { fleetOwnerId, cachedBalance: { gte: amount } },
        data:  { cachedBalance: { decrement: amount } },
      });
      if (deductResult.count === 0) {
        throw AppError.badRequest('Insufficient balance', 'INSUFFICIENT_BALANCE');
      }

      const freshWallet = await tx.fleetWallet.findUniqueOrThrow({ where: { fleetOwnerId } });

      // 3. Create withdrawal request with optional database-unique idempotencyKey
      const createdRequest = await tx.withdrawalRequest.create({
        data: {
          entityType:            WithdrawalEntityType.FLEET,
          entityId:              fleetOwnerId,
          amount,
          idempotencyKey:        idempotencyKey ?? undefined,
          bankAccountNo:         fleetOwner.bankAccountNo!,
          bankIfsc:              fleetOwner.bankIfsc!,
          bankName:              fleetOwner.bankName ?? 'Unknown',
          bankAccountHolderName: fleetOwner.bankAccountHolderName ?? fleetOwner.user.name ?? 'Fleet Owner',
          razorpayxContactId:    fleetOwner.razorpayxContactId,
          razorpayxFundAccountId: fleetOwner.razorpayxFundAccountId,
        },
      });

      // 4. Create ledger reservation with unique referenceId
      await tx.fleetWalletTransaction.create({
        data: {
          walletId:     freshWallet.id,
          type:         WalletTransactionType.DEBIT,
          amount,
          balanceAfter: freshWallet.cachedBalance,
          referenceId:  `WITHDRAWAL_RESERVE_${createdRequest.id}`,
          note:         `Withdrawal request`,
        },
      });

      return createdRequest;
    });

    logger.info(`[FleetWallet] Withdrawal: Rs.${amount} for fleet ${fleetOwnerId}`);

    processWithdrawalViaRazorpayX(withdrawalRequest.id).catch((err) => {
      logger.error(`[FleetWallet] Auto-payout failed for ${withdrawalRequest.id}:`, err);
    });

    return withdrawalRequest;
  } catch (err: any) {
    if (err.code === 'P2002' && idempotencyKey) {
      const existing = await prisma.withdrawalRequest.findUnique({
        where: { idempotencyKey },
      });
      if (existing) return existing;
    }
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FLEET -> DRIVER DIGITAL TRANSFER
// Fleet owner pays salary to driver's DriverWallet from their FleetWallet
// ─────────────────────────────────────────────────────────────────────────────

export async function transferToDriver(
  fleetOwnerId: string,
  driverId:     string,
  amount:       number,
  note?:        string,
  idempotencyKey?: string
) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw AppError.badRequest('Transfer amount must be positive');
  }

  assertMultiPartyTransfersEnabled();

  const fleetWallet = await prisma.fleetWallet.findUnique({ where: { fleetOwnerId } });
  if (!fleetWallet) throw AppError.notFound('Fleet wallet not found');

  if (fleetWallet.cachedBalance < amount) {
    throw AppError.badRequest(
      `Insufficient fleet balance. Available: Rs.${fleetWallet.cachedBalance.toFixed(2)}`,
      'INSUFFICIENT_BALANCE'
    );
  }

  const fleetDriver = await prisma.fleetDriver.findFirst({
    where: { fleetOwnerId, driverId, isActive: true },
  });
  if (!fleetDriver) {
    throw AppError.forbidden('Driver does not belong to your fleet');
  }

  const transferRef = idempotencyKey || `SALARY_${fleetOwnerId}_${driverId}_${Date.now()}`;

  // If idempotency key provided, check if already completed
  if (idempotencyKey) {
    const existingDebit = await prisma.fleetWalletTransaction.findFirst({
      where: { walletId: fleetWallet.id, referenceId: idempotencyKey },
    });
    if (existingDebit) {
      const freshFleet = await prisma.fleetWallet.findUnique({ where: { fleetOwnerId } });
      const freshDriver = await prisma.driverWallet.findUnique({ where: { driverId } });
      return {
        fleetBalance: freshFleet?.cachedBalance ?? fleetWallet.cachedBalance,
        driverBalance: freshDriver?.cachedBalance ?? 0,
        alreadyProcessed: true,
      };
    }
  }

  return prisma.$transaction(async (tx) => {
    // 1. Conditional debit fleet wallet prevents overdraft
    const deductResult = await tx.fleetWallet.updateMany({
      where: { fleetOwnerId, cachedBalance: { gte: amount } },
      data:  { cachedBalance: { decrement: amount } },
    });
    if (deductResult.count === 0) {
      throw AppError.badRequest('Insufficient fleet balance', 'INSUFFICIENT_BALANCE');
    }
    const freshFleetWallet = await tx.fleetWallet.findUniqueOrThrow({ where: { fleetOwnerId } });

    await tx.fleetWalletTransaction.create({
      data: {
        walletId:    freshFleetWallet.id,
        type:        WalletTransactionType.DEBIT,
        amount,
        balanceAfter: freshFleetWallet.cachedBalance,
        note:        note ?? `Driver salary transfer`,
        referenceId: transferRef,
      },
    });

    // 2. Credit driver's DriverWallet
    const driverWallet = await tx.driverWallet.upsert({
      where:  { driverId },
      create: { driverId, cachedBalance: amount },
      update: { cachedBalance: { increment: amount } },
    });
    const freshDriverWallet = await tx.driverWallet.findUnique({ where: { driverId } });

    await tx.driverWalletTransaction.create({
      data: {
        walletId:    driverWallet.id,
        type:        WalletTransactionType.CREDIT,
        reason:      'FLEET_SALARY' as any,
        amount,
        balanceAfter: freshDriverWallet!.cachedBalance,
        note:        note ?? `Salary from fleet`,
        referenceId: transferRef,
      },
    });

    logger.info(`[FleetWallet] Rs.${amount} transferred: fleet ${fleetOwnerId} -> driver ${driverId}`);
    return {
      fleetBalance:  freshFleetWallet.cachedBalance,
      driverBalance: freshDriverWallet!.cachedBalance,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// RECORD OFFLINE CASH SALARY (fleet owner paid driver in physical cash)
// Audit-only: the money already moved outside the platform. Never create a
// second wallet liability for the same cash payment.
// ─────────────────────────────────────────────────────────────────────────────

export async function recordOfflineDriverSalary(
  fleetOwnerId: string,
  driverId:     string,
  amount:       number,
  note?:        string
) {
  const fleetDriver = await prisma.fleetDriver.findFirst({
    where: { fleetOwnerId, driverId, isActive: true },
  });
  if (!fleetDriver) {
    throw AppError.forbidden('Driver does not belong to your fleet');
  }

  const record = await prisma.cashCollectionRecord.create({
    data: {
      entityType:  'DRIVER' as any,
      entityId:    driverId,
      amount,
      collectedBy: fleetOwnerId,
      note:        note ?? `Offline cash salary from fleet`,
    },
  });

  logger.info(`[FleetWallet] Offline cash salary audit recorded without wallet credit: Rs.${amount}, fleet ${fleetOwnerId}, driver ${driverId}`);
  return record;
}
