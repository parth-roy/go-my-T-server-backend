import { Request, Response, NextFunction } from 'express';
import { AssignScheduleUseCase } from '../../application/use-cases/assign-schedule.use-case';
import { ResolveScheduleUseCase } from '../../application/use-cases/resolve-schedule.use-case';
import { AppError } from '@shared/errors/AppError';

export class ScheduleAssignmentController {
  constructor(
    private readonly assignUseCase: AssignScheduleUseCase,
    private readonly resolveUseCase: ResolveScheduleUseCase
  ) {}

  public assignSchedule = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const context = req.context;
      if (!context) throw AppError.unauthorized('Context missing');
      
      await this.assignUseCase.execute(context, req.body);
      res.status(200).json({ success: true, message: 'Schedule assigned successfully' });
    } catch (error) {
      next(error);
    }
  };

  public resolveSchedule = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const assignmentId = req.params.assignmentId as string;
      const context = req.context;
      if (!context) throw AppError.unauthorized('Context missing');
      
      const data = await this.resolveUseCase.execute(context, assignmentId);
      res.status(200).json({ success: true, data, message: 'Schedule resolved successfully' });
    } catch (error) {
      next(error);
    }
  };
}
