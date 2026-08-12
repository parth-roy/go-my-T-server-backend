import { Request, Response, NextFunction } from 'express';
import { CreateEmploymentTypeUseCase } from '../../application/use-cases/create-employment-type.use-case';
import { UpdateEmploymentTypeUseCase } from '../../application/use-cases/update-employment-type.use-case';
import { ArchiveEmploymentTypeUseCase } from '../../application/use-cases/archive-employment-type.use-case';
import { GetEmploymentTypeUseCase } from '../../application/use-cases/get-employment-type.use-case';
import { ListEmploymentTypesUseCase } from '../../application/use-cases/list-employment-types.use-case';
import { AppError } from '@shared/errors/AppError';

export class EmploymentTypeController {
  constructor(
    private readonly createUseCase: CreateEmploymentTypeUseCase,
    private readonly updateUseCase: UpdateEmploymentTypeUseCase,
    private readonly archiveUseCase: ArchiveEmploymentTypeUseCase,
    private readonly getUseCase: GetEmploymentTypeUseCase,
    private readonly listUseCase: ListEmploymentTypesUseCase
  ) {}

  public create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const context = req.context;
      if (!context) throw AppError.unauthorized('Context missing');
      
      const data = await this.createUseCase.execute(context, req.body);
      res.status(201).json({ success: true, data, message: 'Employment type created successfully' });
    } catch (error) {
      next(error);
    }
  };

  public update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const context = req.context;
      if (!context) throw AppError.unauthorized('Context missing');
      
      const data = await this.updateUseCase.execute(context, id, req.body);
      res.status(200).json({ success: true, data, message: 'Employment type updated successfully' });
    } catch (error) {
      next(error);
    }
  };

  public archive = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const context = req.context;
      if (!context) throw AppError.unauthorized('Context missing');
      
      await this.archiveUseCase.execute(context, id);
      res.status(200).json({ success: true, message: 'Employment type archived successfully' });
    } catch (error) {
      next(error);
    }
  };

  public get = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const context = req.context;
      if (!context) throw AppError.unauthorized('Context missing');
      
      const data = await this.getUseCase.execute(context, id);
      res.status(200).json({ success: true, data, message: 'Employment type retrieved successfully' });
    } catch (error) {
      next(error);
    }
  };

  public list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const context = req.context;
      if (!context) throw AppError.unauthorized('Context missing');
      
      const data = await this.listUseCase.execute(context, {
        cursor: req.query.cursor as string,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        includeInactive: req.query.includeInactive === 'true',
      });
      res.status(200).json({ success: true, data, message: 'Employment types listed successfully' });
    } catch (error) {
      next(error);
    }
  };
}
