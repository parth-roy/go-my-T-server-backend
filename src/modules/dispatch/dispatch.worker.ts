import { createWorker, QUEUES } from '@shared/queue';
import { logger } from '@shared/logger';
import { dispatchBooking } from './dispatch.service';
import { CorrelationContext } from '@shared/context/correlation.context';

export interface DispatchJobData {
    bookingId: string;
    reason?: string;
    round?: number;
    operationId?: string;
}

export function startDispatchWorker() {
    createWorker(QUEUES.DISPATCH, async (job) => {
        const { bookingId, reason, round, operationId } = job.data as DispatchJobData;

        if (!bookingId) {
            logger.error(`[DispatchWorker] Job ${job.id} missing bookingId — skipping`);
            return;
        }

        const opId = operationId || `op_dispatch_job_${job.id}`;

        await CorrelationContext.run({ operationId: opId, bookingId }, async () => {
            logger.info(`[DispatchWorker] Processing durable dispatch for booking ${bookingId} (job: ${job.id}, round: ${round ?? 0}, reason: ${reason || 'DISPATCH'}, op: ${opId})`);
            await dispatchBooking(bookingId);
            logger.info(`[DispatchWorker] Durable dispatch complete for booking ${bookingId} (job: ${job.id}, op: ${opId})`);
        });
    });

    logger.info('✅ Dispatch worker started');
}
