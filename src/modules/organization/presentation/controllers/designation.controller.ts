import { Request, Response, NextFunction } from 'express';
import { CreateDesignationUseCase } from '../../application/use-cases/create-designation.use-case';
import { UpdateDesignationUseCase } from '../../application/use-cases/update-designation.use-case';
import { ArchiveDesignationUseCase } from '../../application/use-cases/archive-designation.use-case';
import { GetDesignationUseCase } from '../../application/use-cases/get-designation.use-case';
import { ListDesignationsUseCase } from '../../application/use-cases/list-designations.use-case';
import { AppError } from '@shared/errors/AppError';

export class DesignationController {
  constructor(
    private readonly createUseCase: CreateDesignationUseCase,
    private readonly updateUseCase: UpdateDesignationUseCase,
    private readonly archiveUseCase: ArchiveDesignationUseCase,
    private readonly getUseCase: GetDesignationUseCase,
    private readonly listUseCase: ListDesignationsUseCase
  ) {}

  public create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const context = req.context;
      if (!context) throw AppError.unauthorized('Context missing');
      
      const data = await this.createUseCase.execute(context, req.body);
      res.status(201).json({ success: true, data, message: 'Designation created successfully' });
    } catch (error) {
      next(error);
    }
  };

  public update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const designationId = req.params.designationId as string;
      const context = req.context;
      if (!context) throw AppError.unauthorized('Context missing');
      
      const data = await this.updateUseCase.execute(context, designationId, req.body);
      res.status(200).json({ success: true, data, message: 'Designation updated successfully' });
    } catch (error) {
      next(error);
    }
  };

  public archive = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const designationId = req.params.designationId as string;
      const context = req.context;
      if (!context) throw AppError.unauthorized('Context missing');
      
      await this.archiveUseCase.execute(context, designationId);
      res.status(200).json({ success: true, message: 'Designation archived successfully' });
    } catch (error) {
      next(error);
    }
  };

  public get = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const designationId = req.params.designationId as string;
      const context = req.context;
      if (!context) throw AppError.unauthorized('Context missing');
      
      const data = await this.getUseCase.execute(context, designationId);
      res.status(200).json({ success: true, data, message: 'Designation retrieved successfully' });
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
        includeArchived: req.query.includeArchived === 'true',
      });
      res.status(200).json({ success: true, data, message: 'Designations listed successfully' });
    } catch (error) {
      next(error);
    }
  };
}
