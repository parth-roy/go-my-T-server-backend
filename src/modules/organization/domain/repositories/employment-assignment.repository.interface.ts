import { EmploymentAssignmentEntity } from '../entities/employment-assignment.entity';

export interface IEmploymentAssignmentRepository {
  save(assignment: EmploymentAssignmentEntity): Promise<void>;
  findById(id: string): Promise<EmploymentAssignmentEntity | null>;
  findActiveByMembershipId(membershipId: string): Promise<EmploymentAssignmentEntity | null>;
  listByMembershipId(membershipId: string): Promise<EmploymentAssignmentEntity[]>;
  findByOrganizationId(organizationId: string): Promise<EmploymentAssignmentEntity[]>;
}
