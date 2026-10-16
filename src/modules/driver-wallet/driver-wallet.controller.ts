import { Request, Response, NextFunction } from 'express';
import { sendSuccess, sendCreated } from '@shared/utils/response';
import * as DriverWalletService from './driver-wallet.service';
import { WithdrawalEntityType } from '@prisma/client';
import { assertRazorpayXPayoutsEnabled } from '@shared/payments/outbound-payment.policy';
import { AppError } from '@shared/errors/AppError';

// GET /driver/wallet
export async function getWallet(req: Request, res: Response, next: NextFunction) {
  try {
    const driver = await getDriverFromUser(req.user!.id);
    const wallet = await DriverWalletService.getDriverWallet(driver.id);
    sendSuccess(res, wallet, 'Wallet fetched');
  } catch (err) { next(err); }
}

// GET /driver-wallet/bank-details
export async function getBankDetails(req: Request, res: Response, next: NextFunction) {
  try {
    const driver = await getDriverFromUser(req.user!.id);
    const details = await DriverWalletService.getDriverBankDetails(driver.id);
    sendSuccess(res, details, 'Bank details fetched');
  } catch (err) { next(err); }
}

// PUT /driver-wallet/bank-details
export async function updateBankDetails(req: Request, res: Response, next: NextFunction) {
  try {
    const driver = await getDriverFromUser(req.user!.id);
    const { accountNumber, bankAccountNo, ifsc, bankIfsc, bankName, accountHolderName, bankAccountHolderName } = req.body ?? {};
    const finalAcc = String(accountNumber || bankAccountNo || '').trim();
    const finalIfsc = String(ifsc || bankIfsc || '').trim().toUpperCase();
    const finalBankName = String(bankName || 'Bank Account').trim();
    const finalHolder = String(accountHolderName || bankAccountHolderName || '').trim();

    if (!finalAcc || finalAcc.length < 5 || finalAcc.length > 30) {
      throw AppError.badRequest('Valid bank account number is required (5-30 digits)', 'INVALID_ACCOUNT_NUMBER');
    }
    if (!finalIfsc || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(finalIfsc)) {
      throw AppError.badRequest('Valid 11-character Indian IFSC code is required (e.g. SBIN0001234)', 'INVALID_IFSC');
    }

    const updated = await DriverWalletService.updateDriverBankDetails(driver.id, {
      accountNumber: finalAcc,
      ifsc: finalIfsc,
      bankName: finalBankName,
      accountHolderName: finalHolder || driver.licenseNumber,
    });
    sendSuccess(res, updated, 'Bank details updated successfully');
  } catch (err) { next(err); }
}

// GET /driver/wallet/transactions?page=1&limit=20
export async function getTransactions(req: Request, res: Response, next: NextFunction) {
  try {
    const driver = await getDriverFromUser(req.user!.id);
    const page  = Number(req.query.page  ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const result = await DriverWalletService.getDriverTransactionHistory(driver.id, page, limit);
    sendSuccess(res, result, 'Transaction history fetched');
  } catch (err) { next(err); }
}

// POST /driver/wallet/pay-commission
export async function createCommissionOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const driver = await getDriverFromUser(req.user!.id);
    const order = await DriverWalletService.createCommissionPaymentOrder(driver.id);
    sendSuccess(res, order, 'Commission payment order created');
  } catch (err) { next(err); }
}

// POST /driver/wallet/pay-commission/verify
export async function verifyCommissionPayment(req: Request, res: Response, next: NextFunction) {
  try {
    const driver = await getDriverFromUser(req.user!.id);
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const wallet = await DriverWalletService.verifyCommissionPayment(
      driver.id, razorpay_order_id, razorpay_payment_id, razorpay_signature
    );
    sendSuccess(res, wallet, 'Commission payment verified');
  } catch (err) { next(err); }
}

// POST /driver/wallet/withdraw
export async function requestWithdrawal(req: Request, res: Response, next: NextFunction) {
  try {
    const driver  = await getDriverFromUser(req.user!.id);
    const { amount, idempotencyKey } = req.body;
    const headerKey = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];
    const key = (typeof idempotencyKey === 'string' && idempotencyKey) || (typeof headerKey === 'string' && headerKey) || undefined;
    const result = await DriverWalletService.requestWithdrawal(driver.id, Number(amount), key);
    sendCreated(res, result, 'Withdrawal request created. Processing in progress.');
  } catch (err) { next(err); }
}

// ── Admin routes ────────────────────────────────────────────────────────────

// POST /admin/driver-wallet/cash-collection
export async function adminRecordCashCollection(req: Request, res: Response, next: NextFunction) {
  try {
    const { entityType, entityId, amount, bookingId, note } = req.body;
    const result = await DriverWalletService.recordCashCollection(req.user!.id, {
      entityType: entityType as WithdrawalEntityType,
      entityId,
      amount: Number(amount),
      bookingId,
      note,
    });
    sendCreated(res, result, 'Cash collection recorded');
  } catch (err) { next(err); }
}

// GET /admin/driver-wallets
export async function adminListDriverWallets(req: Request, res: Response, next: NextFunction) {
  try {
    const { prisma } = await import('@shared/db/prisma');
    const wallets = await prisma.driverWallet.findMany({
      orderBy: { cachedBalance: 'asc' }, // Lowest (most negative) first
      include: {
        driver: { include: { user: { select: { name: true, phone: true } } } },
      },
    });
    sendSuccess(res, wallets, 'Driver wallets fetched');
  } catch (err) { next(err); }
}

// GET /admin/withdrawals?status=PENDING
export async function adminListWithdrawals(req: Request, res: Response, next: NextFunction) {
  try {
    const { prisma } = await import('@shared/db/prisma');
    const status = req.query.status as string | undefined;
    const withdrawals = await prisma.withdrawalRequest.findMany({
      where: status ? { status: status as any } : {},
      orderBy: { requestedAt: 'desc' },
      take: 100,
    });
    sendSuccess(res, withdrawals, 'Withdrawals fetched');
  } catch (err) { next(err); }
}

// PATCH /admin/withdrawals/:id/manual-complete
export async function adminCompleteWithdrawalManually(req: Request, res: Response, next: NextFunction) {
  try {
    const { prisma } = await import('@shared/db/prisma');
    const id = req.params.id as string;
    const { adminNote, utr } = req.body;
    const updated = await prisma.withdrawalRequest.update({
      where: { id },
      data: {
        status:      'ADMIN_COMPLETED' as any,
        processedAt: new Date(),
        processedBy: req.user!.id as string,
        adminNote:   adminNote as string | undefined,
        razorpayxUtr: utr as string | undefined,
      },
    });
    sendSuccess(res, updated, 'Withdrawal marked as completed');
  } catch (err) { next(err); }
}

// PATCH /admin/withdrawals/:id/retry
export async function adminRetryWithdrawal(req: Request, res: Response, next: NextFunction) {
  try {
    // Check before resetting status so a paused retry cannot mutate history.
    assertRazorpayXPayoutsEnabled();

    const { prisma } = await import('@shared/db/prisma');
    const id = req.params.id as string;
    await prisma.withdrawalRequest.update({ where: { id }, data: { status: 'PENDING' as any } });
    const { processWithdrawalViaRazorpayX } = await import('./driver-wallet.service');
    processWithdrawalViaRazorpayX(id).catch(() => {});
    sendSuccess(res, { id }, 'Withdrawal retry initiated');
  } catch (err) { next(err); }
}

// Helper: resolve Driver from authenticated userId
async function getDriverFromUser(userId: string) {
  const { prisma } = await import('@shared/db/prisma');
  const driver = await prisma.driver.findUnique({ where: { userId } });
  if (!driver) throw new (await import('@shared/errors/AppError')).AppError('Driver profile not found', 404, 'DRIVER_NOT_FOUND');
  return driver;
}
