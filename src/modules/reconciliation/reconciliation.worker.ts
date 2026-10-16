/**
 * reconciliation.worker.ts — Background BullMQ Worker for Periodic Financial Reconciliation
 *
 * Runs periodic reconciliation cycles (Point 6) to detect:
 *  - Paid-but-uncredited bookings & wallet transactions
 *  - Completed-but-unsettled trips
 *  - Double-entry ledger discrepancies
 *  - Stuck payouts / withdrawals
 */

import { createWorker, reconciliationQueue, QUEUES } from '@shared/queue';
import { logger } from '@shared/logger';
import { ReconciliationService } from './reconciliation.service';

export function startReconciliationWorker() {
  logger.info('[ReconciliationWorker] Initializing worker...');
  return createWorker(
    QUEUES.RECONCILIATION,
    async (job) => {
      logger.info(`[ReconciliationWorker] Starting reconciliation job ${job.id}`);
      const result = await ReconciliationService.runReconciliationCycle();
      logger.info(`[ReconciliationWorker] Job ${job.id} completed. Discrepancies: ${result.ledgerDiscrepancies.discrepanciesFound}, Auto-resolved: ${result.paidUncredited.autoResolved + result.completedUnsettled.autoResolved}`);
      return result;
    },
    1 // Concurrency 1 guarantees reconciliation cycles never overlap concurrently
  );
}

export async function scheduleReconciliationJob(intervalMs = 15 * 60 * 1000) {
  try {
    await reconciliationQueue.add(
      'periodic-reconciliation',
      {},
      {
        repeat: {
          every: intervalMs,
        },
        jobId: 'scheduled-reconciliation-cycle',
        removeOnComplete: true,
      }
    );
    logger.info(`[ReconciliationWorker] Periodic reconciliation job scheduled (every ${intervalMs / 1000}s)`);
  } catch (err: any) {
    logger.warn(`[ReconciliationWorker] Failed to schedule repeatable job (Redis may be offline): ${err?.message}`);
  }
}
