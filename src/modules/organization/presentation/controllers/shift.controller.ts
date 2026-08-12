import { Request, Response, NextFunction } from 'express';
import { TriggerShiftGenerationUseCase } from '../../application/use-cases/trigger-shift-generation.use-case';
import { ApplyShiftOverrideUseCase } from '../../application/use-cases/apply-shift-override.use-case';
import { AppError } from '@shared/errors/AppError';

export class ShiftController {
  constructor(
    private readonly triggerGenerationUseCase: TriggerShiftGenerationUseCase,
    private readonly applyOverrideUseCase: ApplyShiftOverrideUseCase
  ) {}

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
