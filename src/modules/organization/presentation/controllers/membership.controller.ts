import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '@shared/utils/response';
import { ListMembersUseCase } from '../../application/use-cases/list-members.use-case';
import { GetMemberUseCase } from '../../application/use-cases/get-member.use-case';
import { ChangeMemberRoleUseCase } from '../../application/use-cases/change-member-role.use-case';
import { SuspendMemberUseCase } from '../../application/use-cases/suspend-member.use-case';
import { ReactivateMemberUseCase } from '../../application/use-cases/reactivate-member.use-case';
import { TerminateMemberUseCase } from '../../application/use-cases/terminate-member.use-case';
import { OrganizationMembershipRepository } from '../../infrastructure/repositories/membership.repository';
import { OrganizationRole } from '../../domain/enums/membership.enum';

export class MembershipController {
  private membershipRepo = new OrganizationMembershipRepository();

  private listMembersUseCase = new ListMembersUseCase(this.membershipRepo);
  private getMemberUseCase = new GetMemberUseCase(this.membershipRepo);
  private changeMemberRoleUseCase = new ChangeMemberRoleUseCase(this.membershipRepo);
  private suspendMemberUseCase = new SuspendMemberUseCase(this.membershipRepo);
  private reactivateMemberUseCase = new ReactivateMemberUseCase(this.membershipRepo);
  private terminateMemberUseCase = new TerminateMemberUseCase(this.membershipRepo);

  public listMembers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const command = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        status: req.query.status as string,
        role: req.query.role as string,
        search: req.query.search as string,
        sort: req.query.sort as string,
      };

      const result = await this.listMembersUseCase.execute(req.context!, command);
      sendSuccess(res, result, 'Members fetched successfully');
    } catch (error) {
      next(error);
    }
  };

  public getMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const result = await this.getMemberUseCase.execute(req.context!, id);
      sendSuccess(res, result, 'Member fetched successfully');
    } catch (error) {
      next(error);
    }
  };

  public changeMemberRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const { role } = req.body;
      await this.changeMemberRoleUseCase.execute(req.context!, id, role as OrganizationRole);
      sendSuccess(res, null, 'Member role updated successfully');
    } catch (error) {
      next(error);
    }
  };

  public suspendMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      await this.suspendMemberUseCase.execute(req.context!, id);
      sendSuccess(res, null, 'Member suspended successfully');
    } catch (error) {
      next(error);
    }
  };

  public reactivateMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      await this.reactivateMemberUseCase.execute(req.context!, id);
      sendSuccess(res, null, 'Member reactivated successfully');
    } catch (error) {
      next(error);
    }
  };

  public terminateMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      await this.terminateMemberUseCase.execute(req.context!, id);
      sendSuccess(res, null, 'Member terminated successfully');
    } catch (error) {
      next(error);
    }
  };
}

export const membershipController = new MembershipController();
