import { Request, Response, NextFunction } from 'express';
import { CreateBranchUseCase } from '../../application/use-cases/create-branch.use-case';
import { UpdateBranchUseCase } from '../../application/use-cases/update-branch.use-case';
import { GetBranchUseCase } from '../../application/use-cases/get-branch.use-case';
import { ListBranchesUseCase } from '../../application/use-cases/list-branches.use-case';
import { ArchiveBranchUseCase } from '../../application/use-cases/archive-branch.use-case';
import { CreateBranchDto, UpdateBranchDto } from '../../application/dtos/branch.dto';
import { sendCreated, sendSuccess } from '@shared/utils/response';
import { AppError } from '@shared/errors/AppError';

export class BranchController {
  private createBranchUseCase = new CreateBranchUseCase();
  private updateBranchUseCase = new UpdateBranchUseCase();
  private getBranchUseCase = new GetBranchUseCase();
  private listBranchesUseCase = new ListBranchesUseCase();
  private archiveBranchUseCase = new ArchiveBranchUseCase();

  public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.context) throw AppError.internal('Request context missing');
      const dto = req.body as CreateBranchDto;
      const result = await this.createBranchUseCase.execute(req.context, dto);
      sendCreated(res, result, 'Branch created successfully');
    } catch (error) {
      next(error);
    }
  };

  public update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.context) throw AppError.internal('Request context missing');
      const branchId = req.params.branchId as string;
      const dto = req.body as UpdateBranchDto;
      const result = await this.updateBranchUseCase.execute(req.context, branchId, dto);
      sendSuccess(res, result, 'Branch updated successfully');
    } catch (error) {
      next(error);
    }
  };

  public get = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.context) throw AppError.internal('Request context missing');
      const branchId = req.params.branchId as string;
      const result = await this.getBranchUseCase.execute(req.context, branchId);
      sendSuccess(res, result, 'Branch retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  public list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.context) throw AppError.internal('Request context missing');
      const limit = parseInt(req.query.limit as string) || 10;
      const cursorStr = req.query.cursor as string;
      
      let cursor;
      if (cursorStr) {
        try {
          const parsed = JSON.parse(Buffer.from(cursorStr, 'base64').toString('ascii'));
          if (parsed.createdAt && parsed.id) {
            cursor = { createdAt: new Date(parsed.createdAt), id: parsed.id };
          }
        } catch (e) {
          throw AppError.badRequest('Invalid cursor format');
        }
      }

      const includeArchived = req.query.includeArchived === 'true';

      const result = await this.listBranchesUseCase.execute(req.context, {
        limit,
        cursor,
        includeArchived
      });

      let nextCursor = null;
      if (result.hasNextPage && result.data.length > 0) {
        const lastItem = result.data[result.data.length - 1];
        nextCursor = Buffer.from(JSON.stringify({ createdAt: lastItem.createdAt, id: lastItem.id })).toString('base64');
      }

      sendSuccess(res, { data: result.data, nextCursor }, 'Branches retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  public archive = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.context) throw AppError.internal('Request context missing');
      const branchId = req.params.branchId as string;
      await this.archiveBranchUseCase.execute(req.context, branchId);
      sendSuccess(res, null, 'Branch archived successfully');
    } catch (error) {
      next(error);
    }
  };
}
