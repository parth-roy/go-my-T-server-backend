import { Request, Response, NextFunction } from 'express';
import { CreateWorkScheduleTemplateUseCase } from '../../application/use-cases/create-work-schedule-template.use-case';
import { PublishScheduleTemplateVersionUseCase } from '../../application/use-cases/publish-schedule-template-version.use-case';
import { AppError } from '@shared/errors/AppError';

export class WorkScheduleTemplateController {
  constructor(
    private readonly createUseCase: CreateWorkScheduleTemplateUseCase,
    private readonly publishUseCase: PublishScheduleTemplateVersionUseCase
  ) {}

  public createTemplate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const context = req.context;
      if (!context) throw AppError.unauthorized('Context missing');
      
      const data = await this.createUseCase.execute(context, req.body);
      res.status(201).json({ success: true, data, message: 'Work Schedule Template created successfully' });
    } catch (error) {
      next(error);
    }
  };

  public publishVersion = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const templateId = req.params.templateId as string;
      const versionId = req.params.versionId as string;
      const context = req.context;
      if (!context) throw AppError.unauthorized('Context missing');
      
      await this.publishUseCase.execute(context, templateId, versionId);
      res.status(200).json({ success: true, message: 'Template version published successfully' });
    } catch (error) {
      next(error);
    }
  };
}
