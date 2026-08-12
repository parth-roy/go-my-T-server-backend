import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

export class TimeTrackingStatusController {
  constructor(private readonly prisma: PrismaClient) {}

  public getStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const workerId = req.user!.id;
      const organizationId = req.context!.organization?.id || '';

      // The WorkerPresence is the read model projected from events.
      const presence = await this.prisma.workerPresence.findUnique({
        where: { workerId }
      });

      if (!presence) {
        res.status(200).json({
          success: true,
          data: {
            status: 'OFF_DUTY',
            lastSeenAt: null,
            workContext: null
          }
        });
        return;
      }

      // Security Check: If the worker is present in a different organization,
      // do not leak the context, but let them know they are clocked in elsewhere.
      if (presence.organizationId !== organizationId) {
        res.status(200).json({
          success: true,
          data: {
            status: 'PRESENT_IN_OTHER_ORG',
            lastSeenAt: null,
            workContext: null
          }
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          status: presence.status,
          lastSeenAt: presence.lastSeenAt,
          workContext: presence.workContext
        }
      });
    } catch (error) {
      console.error('[TimeTrackingStatusController] Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve time-tracking status'
      });
    }
  };
}
