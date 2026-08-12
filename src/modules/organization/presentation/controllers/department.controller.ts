import { Request, Response, NextFunction } from 'express';
import { CreateDepartmentUseCase } from '../../application/use-cases/create-department.use-case';
import { UpdateDepartmentUseCase } from '../../application/use-cases/update-department.use-case';
import { ArchiveDepartmentUseCase } from '../../application/use-cases/archive-department.use-case';
import { GetDepartmentUseCase } from '../../application/use-cases/get-department.use-case';
import { ListDepartmentsUseCase } from '../../application/use-cases/list-departments.use-case';
import { CreateDepartmentDto, UpdateDepartmentDto } from '../../application/dtos/department.dto';
import { sendSuccess, sendCreated } from '@shared/utils/response';
import { AppError } from '@shared/errors/AppError';

export class DepartmentController {
  constructor(
    private readonly createDepartmentUseCase: CreateDepartmentUseCase,
    private readonly updateDepartmentUseCase: UpdateDepartmentUseCase,
    private readonly archiveDepartmentUseCase: ArchiveDepartmentUseCase,
    private readonly getDepartmentUseCase: GetDepartmentUseCase,
    private readonly listDepartmentsUseCase: ListDepartmentsUseCase
  ) {}

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.context) throw AppError.internal('Request context missing');
      const branchId = req.params.branchId as string;
      const dto = req.body as CreateDepartmentDto;
      const result = await this.createDepartmentUseCase.execute(req.context, branchId, dto);
      sendCreated(res, result, 'Department created successfully');
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.context) throw AppError.internal('Request context missing');
      const branchId = req.params.branchId as string;
      const departmentId = req.params.departmentId as string;
      const dto = req.body as UpdateDepartmentDto;
      const result = await this.updateDepartmentUseCase.execute(req.context, branchId, departmentId, dto);
      sendSuccess(res, result, 'Department updated successfully');
    } catch (error) {
      next(error);
    }
  };

  get = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.context) throw AppError.internal('Request context missing');
      const branchId = req.params.branchId as string;
      const departmentId = req.params.departmentId as string;
      const result = await this.getDepartmentUseCase.execute(req.context, branchId, departmentId);
      sendSuccess(res, result, 'Department retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.context) throw AppError.internal('Request context missing');
      const branchId = req.params.branchId as string;
      const limit = parseInt(req.query.limit as string) || 20;
      const cursor = req.query.cursor as string;
      const search = req.query.search as string;
      const includeArchived = req.query.includeArchived === 'true';

      const result = await this.listDepartmentsUseCase.execute(req.context, branchId, {
        limit,
        cursor,
        search,
        includeArchived
      });

      sendSuccess(res, result, 'Departments retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  archive = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.context) throw AppError.internal('Request context missing');
      const branchId = req.params.branchId as string;
      const departmentId = req.params.departmentId as string;
      await this.archiveDepartmentUseCase.execute(req.context, branchId, departmentId);
      sendSuccess(res, null, 'Department archived successfully');
    } catch (error) {
      next(error);
    }
  };
}
