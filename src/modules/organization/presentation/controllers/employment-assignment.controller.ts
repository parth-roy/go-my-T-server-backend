import { Request, Response, NextFunction } from 'express';
import { CreateEmploymentAssignmentUseCase } from '../../application/use-cases/create-employment-assignment.use-case';
import { TransitionEmploymentAssignmentUseCase } from '../../application/use-cases/transition-employment-assignment.use-case';
import { GetAssignmentTimelineUseCase } from '../../application/use-cases/get-assignment-timeline.use-case';
import { AppError } from '@shared/errors/AppError';

export class EmploymentAssignmentController {
  constructor(
    private readonly createUseCase: CreateEmploymentAssignmentUseCase,
    private readonly transitionUseCase: TransitionEmploymentAssignmentUseCase,
    private readonly getTimelineUseCase: GetAssignmentTimelineUseCase
  ) {}

  public create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const context = req.context;
      if (!context) throw AppError.unauthorized('Context missing');
      
      const data = await this.createUseCase.execute(context, req.body);
      res.status(201).json({ success: true, data, message: 'Employment assignment created successfully' });
    } catch (error) {
      next(error);
    }
  };

  public transition = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const membershipId = req.params.membershipId as string;
      const context = req.context;
      if (!context) throw AppError.unauthorized('Context missing');
      
      const data = await this.transitionUseCase.execute(context, membershipId, req.body);
      res.status(200).json({ success: true, data, message: 'Employment assignment transitioned successfully' });
    } catch (error) {
      next(error);
    }
  };

  public getTimeline = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const membershipId = req.params.membershipId as string;
      const context = req.context;
      if (!context) throw AppError.unauthorized('Context missing');
      
      const data = await this.getTimelineUseCase.execute(context, membershipId);
      res.status(200).json({ success: true, data, message: 'Assignment timeline retrieved successfully' });
    } catch (error) {
      next(error);
    }
  };
}
