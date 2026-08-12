import { Request, Response } from 'express';
import { RecordPunchCommandHandler } from '../../application/commands/RecordPunchCommandHandler';
import { RecordPunchCommand } from '../../application/commands/RecordPunchCommand';
import { AttendanceEventType } from '../../domain/events/WorkerAttendanceEvent';
import { WorkContextType } from '../../domain/value-objects/WorkContext';
import { VerificationMethod } from '../../domain/value-objects/VerifiedIdentity';

// Note: In a real implementation, we would use Zod or class-validator here
// to parse req.body and assert types before passing to the application layer.

export class RecordPunchController {
  constructor(private readonly commandHandler: RecordPunchCommandHandler) {}

  public recordPunch = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        workerId,
        organizationId,
        eventType,
        recordedAt,
        deviceTime,
        source,
        workContext,
        verification
      } = req.body;

      // Extract unique request correlation headers
      const commandId = req.headers['x-command-id'] as string || crypto.randomUUID();
      const correlationId = req.headers['x-correlation-id'] as string || crypto.randomUUID();
      const causationId = req.headers['x-causation-id'] as string || commandId;

      const command: RecordPunchCommand = {
        commandId,
        correlationId,
        causationId,
        workerId,
        organizationId,
        eventType: eventType as AttendanceEventType,
        recordedAt,
        deviceTime,
        source,
        workContext: {
          contextType: workContext.contextType as WorkContextType,
          contextId: workContext.contextId
        },
        verification: {
          method: verification.method as VerificationMethod,
          result: verification.result,
          location: verification.location,
          device: verification.device
        }
      };

      await this.commandHandler.handle(command);

      res.status(202).json({
        success: true,
        message: 'Punch recorded successfully and queued for processing',
        data: { commandId }
      });
    } catch (error) {
      console.error('[RecordPunchController] Error:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Invalid request payload'
      });
    }
  };
}
