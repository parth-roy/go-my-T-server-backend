import { Request, Response, NextFunction } from 'express';
import { TriggerShiftGenerationUseCase } from '../../application/use-cases/trigger-shift-generation.use-case';
import { ApplyShiftOverrideUseCase } from '../../application/use-cases/apply-shift-override.use-case';
import { AppError } from '@shared/errors/AppError';
import { PrismaClient } from '@prisma/client';

export class ShiftController {
  constructor(
    private readonly triggerGenerationUseCase: TriggerShiftGenerationUseCase,
    private readonly applyOverrideUseCase: ApplyShiftOverrideUseCase,
    private readonly prisma: PrismaClient
  ) {}

  public list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const context = req.context;
      const orgId = context?.organization?.id;
      if (!context || !orgId) {
        throw AppError.unauthorized('Missing organization context');
      }

      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date();
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const skip = (page - 1) * limit;

      const shifts = await this.prisma.shiftInstance.findMany({
        where: {
          organizationId: orgId,
          startTime: { gte: startDate },
          endTime: { lte: endDate }
        },
        include: {
          membership: {
            include: { user: { select: { name: true } } }
          }
        },
        skip,
        take: limit + 1,
        orderBy: { startTime: 'asc' }
      });

      const hasNextPage = shifts.length > limit;
      const data = hasNextPage ? shifts.slice(0, limit) : shifts;

      res.status(200).json({ success: true, data, pagination: { page, limit, hasNextPage } });
    } catch (error) {
      next(error);
    }
  };

  public listMine = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const context = req.context;
      const user = req.user;
      const orgId = context?.organization?.id;
      if (!context || !user || !orgId) {
        throw AppError.unauthorized('Missing organization context');
      }

      const membership = await this.prisma.organizationMembership.findFirst({
        where: { organizationId: orgId, userId: user.id }
      });

      if (!membership) throw AppError.unauthorized('Membership not found');

      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(new Date().setHours(0,0,0,0));
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);

      const shifts = await this.prisma.shiftInstance.findMany({
        where: {
          organizationId: orgId,
          membershipId: membership.id,
          startTime: { gte: startDate },
          endTime: { lte: endDate }
        },
        orderBy: { startTime: 'asc' }
      });

      res.status(200).json({ success: true, data: shifts });
    } catch (error) {
      next(error);
    }
  };

  public triggerGeneration = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const context = req.context;
      if (!context) throw AppError.unauthorized('Context missing');
      
      const { windowStart, windowEnd, trigger } = req.body;
      const data = await this.triggerGenerationUseCase.execute(context, {
        windowStart: new Date(windowStart),
        windowEnd: new Date(windowEnd),
        trigger
      });
      
      res.status(202).json({ success: true, data, message: 'Shift generation job triggered successfully' });
    } catch (error) {
      next(error);
    }
  };

  public applyOverride = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const context = req.context;
      if (!context) throw AppError.unauthorized('Context missing');
      
      const { overrideStartTime, overrideEndTime, reason } = req.body;
      const shiftId = req.params.shiftId as string;
      
      const data = await this.applyOverrideUseCase.execute(context, {
        shiftId,
        overrideStartTime: overrideStartTime ? new Date(overrideStartTime) : undefined,
        overrideEndTime: overrideEndTime ? new Date(overrideEndTime) : undefined,
        reason
      });

      res.status(201).json({ success: true, data, message: 'Shift override requested successfully' });
    } catch (error) {
      next(error);
    }
  };
}


