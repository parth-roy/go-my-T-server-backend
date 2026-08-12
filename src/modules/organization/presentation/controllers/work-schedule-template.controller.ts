import { Request, Response, NextFunction } from 'express';
import { CreateWorkScheduleTemplateUseCase } from '../../application/use-cases/create-work-schedule-template.use-case';
import { PublishScheduleTemplateVersionUseCase } from '../../application/use-cases/publish-schedule-template-version.use-case';
import { AppError } from '@shared/errors/AppError';
import { PrismaClient } from '@prisma/client';

export class WorkScheduleTemplateController {
  constructor(
    private readonly createUseCase: CreateWorkScheduleTemplateUseCase,
    private readonly publishUseCase: PublishScheduleTemplateVersionUseCase,
    private readonly prisma: PrismaClient
  ) {}

  public list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const context = req.context;
      if (!context) throw AppError.unauthorized('Context missing');
      
      const templates = await this.prisma.workScheduleTemplate.findMany({
        where: { organizationId: context.organization?.id || "" },
        include: {
          versions: {
            where: { status: 'PUBLISHED' },
            orderBy: { versionNumber: 'desc' },
            take: 1
          }
        },
        orderBy: { name: 'asc' }
      });

      res.status(200).json({
        success: true,
        data: templates.map(t => ({
          id: t.id,
          name: t.name,
          isActive: t.isActive,
          code: t.code,
          currentVersion: t.versions[0]?.versionNumber
        }))
      });
    } catch (error) {
      next(error);
    }
  };

  public getDetail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const templateId = req.params.id as string;
      const context = req.context;
      if (!context) throw AppError.unauthorized('Context missing');
      
      const template = await this.prisma.workScheduleTemplate.findFirst({
        where: { 
          id: templateId,
          organizationId: context.organization?.id || ""
        },
        include: {
          versions: {
            orderBy: { versionNumber: 'desc' },
            take: 1
          }
        }
      });

      if (!template) {
        throw AppError.notFound('Work Schedule Template not found');
      }

      res.status(200).json({ success: true, data: template });
    } catch (error) {
      next(error);
    }
  };

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
