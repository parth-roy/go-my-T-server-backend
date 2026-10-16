import { logger } from '@shared/logger';

export async function startAllWorkers() {
  const { startNotificationWorker } = await import('@shared/queue/workers/notification.worker');
  const { startOtpWorker }          = await import('@shared/queue/workers/otp.worker');
  const { startInvoiceWorker }      = await import('@shared/queue/workers/invoice.worker');
  const { startDispatchWorker }     = await import('@modules/dispatch/dispatch.worker');
  const { startEtaWorker, scheduleEtaRecalculationJob } = await import('@shared/jobs/eta.worker');
  // [PAUSED - ULIP DEPRECATION] const { startUlipWorker }         = await import('@shared/queue/workers/ulip.worker');
  const { startAnnouncementWorker } = await import('@shared/queue/workers/announcement.worker');
  const { startReconciliationWorker, scheduleReconciliationJob } = await import('@modules/reconciliation/reconciliation.worker');

  startOtpWorker();
  startNotificationWorker();
  startInvoiceWorker();
  startDispatchWorker();
  startEtaWorker();
  // [PAUSED - ULIP DEPRECATION] startUlipWorker(); // Processes ULIP gov-API verifications in the background
  startAnnouncementWorker();
  startReconciliationWorker();

  // Schedule repeatable ETA batch (every 60 seconds)
  await scheduleEtaRecalculationJob();

  // Schedule periodic financial reconciliation (every 15 minutes)
  await scheduleReconciliationJob();

  logger.info('All workers initialised');
}

