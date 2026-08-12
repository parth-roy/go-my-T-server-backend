import { Request, Response, NextFunction } from 'express';
import { CreateTeamUseCase } from '../../application/use-cases/create-team.use-case';
import { UpdateTeamUseCase } from '../../application/use-cases/update-team.use-case';
import { ArchiveTeamUseCase } from '../../application/use-cases/archive-team.use-case';
import { GetTeamUseCase } from '../../application/use-cases/get-team.use-case';
import { ListTeamsUseCase } from '../../application/use-cases/list-teams.use-case';
import { AppError } from '@shared/errors/AppError';

export class TeamController {
  constructor(
    private readonly createTeamUseCase: CreateTeamUseCase,
    private readonly updateTeamUseCase: UpdateTeamUseCase,
    private readonly archiveTeamUseCase: ArchiveTeamUseCase,
    private readonly getTeamUseCase: GetTeamUseCase,
    private readonly listTeamsUseCase: ListTeamsUseCase
  ) {}

  public create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const branchId = req.params.branchId as string;
      const departmentId = req.params.departmentId as string;
      const context = req.context;
      if (!context) throw AppError.unauthorized('Context missing');

      const dto = req.body;
      const team = await this.createTeamUseCase.execute(context, branchId, departmentId, dto);

      res.status(201).json({ success: true, data: team });
    } catch (error) {
      next(error);
    }
  };

  public update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const branchId = req.params.branchId as string;
      const departmentId = req.params.departmentId as string;
      const teamId = req.params.teamId as string;
      const context = req.context;
      if (!context) throw AppError.unauthorized('Context missing');

      const dto = req.body;
      const team = await this.updateTeamUseCase.execute(context, branchId, departmentId, teamId, dto);

      res.status(200).json({ success: true, data: team });
    } catch (error) {
      next(error);
    }
  };

  public archive = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const branchId = req.params.branchId as string;
      const departmentId = req.params.departmentId as string;
      const teamId = req.params.teamId as string;
      const context = req.context;
      if (!context) throw AppError.unauthorized('Context missing');

      await this.archiveTeamUseCase.execute(context, branchId, departmentId, teamId);

      res.status(200).json({ success: true, message: 'Team archived successfully' });
    } catch (error) {
      next(error);
    }
  };

  public get = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const branchId = req.params.branchId as string;
      const departmentId = req.params.departmentId as string;
      const teamId = req.params.teamId as string;
      const context = req.context;
      if (!context) throw AppError.unauthorized('Context missing');

      const team = await this.getTeamUseCase.execute(context, branchId, departmentId, teamId);

      res.status(200).json({ success: true, data: team });
    } catch (error) {
      next(error);
    }
  };

  public list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const branchId = req.params.branchId as string;
      const departmentId = req.params.departmentId as string;
      const context = req.context;
      if (!context) throw AppError.unauthorized('Context missing');

      const params = req.query as any;
      const result = await this.listTeamsUseCase.execute(context, branchId, departmentId, params);

      res.status(200).json({ success: true, data: result.data, nextCursor: result.nextCursor });
    } catch (error) {
      next(error);
    }
  };
}
