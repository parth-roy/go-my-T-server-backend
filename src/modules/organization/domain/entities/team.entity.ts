import { TeamStatus } from '../enums/team-status.enum';
import { AppError } from '@shared/errors/AppError';

export interface TeamProps {
  id: string;
  organizationId: string;
  branchId: string;
  departmentId: string;
  name: string;
  code: string;
  description: string | null;
  leaderId: string | null;
  status: TeamStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export class TeamEntity {
  private constructor(private props: TeamProps) {}

  public static reconstitute(props: TeamProps): TeamEntity {
    return new TeamEntity(props);
  }

  // Domain behavior methods
  public updateDetails(
    updatedAt: Date,
    name?: string,
    description?: string | null,
    leaderId?: string | null
  ): void {
    if (this.props.status === TeamStatus.ARCHIVED || this.props.deletedAt !== null) {
      throw AppError.badRequest('Cannot update an archived team.');
    }
    
    if (name !== undefined) this.props.name = name;
    if (description !== undefined) this.props.description = description;
    if (leaderId !== undefined) this.props.leaderId = leaderId;
    
    this.props.updatedAt = updatedAt;
  }

  public archive(deletedAt: Date): void {
    if (this.props.status === TeamStatus.ARCHIVED) return;
    this.props.status = TeamStatus.ARCHIVED;
    this.props.deletedAt = deletedAt;
    this.props.updatedAt = deletedAt;
  }

  // Getters
  public getId(): string { return this.props.id; }
  public getOrganizationId(): string { return this.props.organizationId; }
  public getBranchId(): string { return this.props.branchId; }
  public getDepartmentId(): string { return this.props.departmentId; }
  public getName(): string { return this.props.name; }
  public getCode(): string { return this.props.code; }
  public getDescription(): string | null { return this.props.description; }
  public getLeaderId(): string | null { return this.props.leaderId; }
  public getStatus(): TeamStatus { return this.props.status; }
  public getCreatedAt(): Date { return this.props.createdAt; }
  public getUpdatedAt(): Date { return this.props.updatedAt; }
  public getDeletedAt(): Date | null { return this.props.deletedAt; }
}
