import { Request, Response, NextFunction } from 'express';
import { CreateOrganizationUseCase } from '../../application/use-cases/create-organization.use-case';
import { InviteMemberUseCase } from '../../application/use-cases/invite-member.use-case';
import { ValidateInvitationUseCase } from '../../application/use-cases/validate-invitation.use-case';
import { AcceptInvitationUseCase } from '../../application/use-cases/accept-invitation.use-case';
import { ListMyOrganizationsUseCase } from '../../application/use-cases/list-my-organizations.use-case';
import { GetOrganizationUseCase } from '../../application/use-cases/get-organization.use-case';
import { UpdateOrganizationUseCase } from '../../application/use-cases/update-organization.use-case';
import { DeleteOrganizationUseCase } from '../../application/use-cases/delete-organization.use-case';
import { InvitationRepository } from '../../infrastructure/repositories/invitation.repository';
import { OrganizationMembershipRepository } from '../../infrastructure/repositories/membership.repository';
import { OrganizationRepository } from '../../infrastructure/repositories/organization.repository';
import { sendCreated, sendSuccess } from '@shared/utils/response';
import { CreateOrganizationDTO } from '../../application/dtos/create-organization.dto';
import { UpdateOrganizationDTO } from '../../application/dtos/update-organization.dto';
import { AppError } from '@shared/errors/AppError';

export class OrganizationController {
  private createOrganizationUseCase: CreateOrganizationUseCase;
  private inviteMemberUseCase: InviteMemberUseCase;
  private validateInvitationUseCase: ValidateInvitationUseCase;
  private acceptInvitationUseCase: AcceptInvitationUseCase;
  private listMyOrganizationsUseCase: ListMyOrganizationsUseCase;
  private getOrganizationUseCase: GetOrganizationUseCase;
  private updateOrganizationUseCase: UpdateOrganizationUseCase;
  private deleteOrganizationUseCase: DeleteOrganizationUseCase;

  constructor() {
    this.createOrganizationUseCase = new CreateOrganizationUseCase();
    this.inviteMemberUseCase = new InviteMemberUseCase(
      new InvitationRepository(),
      new OrganizationMembershipRepository()
    );
    this.validateInvitationUseCase = new ValidateInvitationUseCase(
      new InvitationRepository(),
      new OrganizationRepository()
    );
    this.acceptInvitationUseCase = new AcceptInvitationUseCase(
      new InvitationRepository(),
      new OrganizationMembershipRepository()
    );
    this.listMyOrganizationsUseCase = new ListMyOrganizationsUseCase(
      new OrganizationMembershipRepository(),
      new OrganizationRepository()
    );
    this.getOrganizationUseCase = new GetOrganizationUseCase();
    this.updateOrganizationUseCase = new UpdateOrganizationUseCase();
    this.deleteOrganizationUseCase = new DeleteOrganizationUseCase();
  }

  public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // req.user is guaranteed by the authentication middleware
      const userId = req.user!.id;
      const dto = req.body as CreateOrganizationDTO;

      const result = await this.createOrganizationUseCase.execute(userId, dto);

      sendCreated(res, result, 'Organization created successfully');
    } catch (error) {
      next(error);
    }
  };

  public listMyOrganizations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const result = await this.listMyOrganizationsUseCase.execute(userId);
      sendSuccess(res, result, 'Organizations retrieved successfully');
    } catch (error) {
      next(error);
    }
  };


  public get = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.context) throw AppError.internal('Request context missing');
      const id = req.params.id as string;
      const result = await this.getOrganizationUseCase.execute(req.context, id);
      sendSuccess(res, result, 'Organization fetched');
    } catch (error) { next(error); }
  };

  public update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.context) throw AppError.internal('Request context missing');
      const id = req.params.id as string;
      const dto = req.body as UpdateOrganizationDTO;
      const result = await this.updateOrganizationUseCase.execute(req.context, id, dto);
      sendSuccess(res, result, 'Organization updated');
    } catch (error) { next(error); }
  };

  public delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.context) throw AppError.internal('Request context missing');
      const id = req.params.id as string;
      await this.deleteOrganizationUseCase.execute(req.context, id);
      sendSuccess(res, null, 'Organization archived successfully');
    } catch (error) { next(error); }
  };

  public inviteMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.context) {
        throw AppError.internal('Request context missing');
      }

      const { phone, email, role } = req.body;

      await this.inviteMemberUseCase.execute(req.context, { phone, email, role });

      sendSuccess(res, null, 'Invitation sent successfully');
    } catch (error) {
      next(error);
    }
  };

  public validateInvitation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = req.params.token as string;
      const result = await this.validateInvitationUseCase.execute(token);
      sendSuccess(res, result, 'Invitation validated');
    } catch (error) {
      next(error);
    }
  };

  public acceptInvitation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = req.params.token as string;
      const userId = req.user!.id;
      const authenticatedPhone = req.user!.phone; // Assuming user phone is available in req.user

      await this.acceptInvitationUseCase.execute(token, userId, authenticatedPhone);
      sendSuccess(res, null, 'Invitation accepted successfully');
    } catch (error) {
      next(error);
    }
  };
}
