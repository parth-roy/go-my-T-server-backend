import { PrismaClient, EmploymentAssignmentStatus } from '@prisma/client';
import { IEmploymentAssignmentRepository } from '../../domain/repositories/employment-assignment.repository.interface';
import { EmploymentAssignmentEntity, EmploymentAssignmentProps, TransitionMetadata } from '../../domain/entities/employment-assignment.entity';

export class PrismaEmploymentAssignmentRepository implements IEmploymentAssignmentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private toDomain(record: any): EmploymentAssignmentEntity {
    const props: EmploymentAssignmentProps = {
      id: record.id,
      assignmentNumber: record.assignmentNumber,
      membershipId: record.membershipId,
      
      employmentTypeId: record.employmentTypeId,
      employmentTypeNameSnapshot: record.employmentTypeNameSnapshot,
      
      designationId: record.designationId,
      designationNameSnapshot: record.designationNameSnapshot,
      
      branchId: record.branchId,
      branchNameSnapshot: record.branchNameSnapshot,
      
      departmentId: record.departmentId,
      departmentNameSnapshot: record.departmentNameSnapshot,
      
      teamId: record.teamId,
      teamNameSnapshot: record.teamNameSnapshot,
      
      effectiveFrom: record.effectiveFrom,
      effectiveUntil: record.effectiveUntil,
      status: record.status as EmploymentAssignmentStatus,
      transitionMetadata: record.transitionMetadata as TransitionMetadata,
      
      version: record.version,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
    return EmploymentAssignmentEntity.reconstitute(props);
  }

  async findById(id: string): Promise<EmploymentAssignmentEntity | null> {
    const record = await this.prisma.organizationEmploymentAssignment.findUnique({
      where: { id }
    });
    if (!record) return null;
    return this.toDomain(record);
  }

  async findActiveByMembershipId(membershipId: string): Promise<EmploymentAssignmentEntity | null> {
    const record = await this.prisma.organizationEmploymentAssignment.findFirst({
      where: {
        membershipId,
        status: EmploymentAssignmentStatus.ACTIVE
      },
      orderBy: { effectiveFrom: 'desc' }
    });
    if (!record) return null;
    return record ? this.toDomain(record) : null;
  }

  async findByOrganizationId(organizationId: string): Promise<EmploymentAssignmentEntity[]> {
    const records = await this.prisma.organizationEmploymentAssignment.findMany({
      where: {
        membership: { organizationId },
        status: EmploymentAssignmentStatus.ACTIVE
      }
    });
    return records.map(r => this.toDomain(r));
  }

  async listByMembershipId(membershipId: string): Promise<EmploymentAssignmentEntity[]> {
    const records = await this.prisma.organizationEmploymentAssignment.findMany({
      where: { membershipId },
      orderBy: { effectiveFrom: 'desc' }
    });
    return records.map(r => this.toDomain(r));
  }

  async save(assignment: EmploymentAssignmentEntity): Promise<void> {
    const data = assignment.toJSON();

    await this.prisma.organizationEmploymentAssignment.upsert({
      where: { id: data.id },
      create: {
        id: data.id,
        assignmentNumber: data.assignmentNumber,
        membershipId: data.membershipId,
        
        employmentTypeId: data.employmentTypeId,
        employmentTypeNameSnapshot: data.employmentTypeNameSnapshot,
        
        designationId: data.designationId,
        designationNameSnapshot: data.designationNameSnapshot,
        
        branchId: data.branchId,
        branchNameSnapshot: data.branchNameSnapshot,
        
        departmentId: data.departmentId,
        departmentNameSnapshot: data.departmentNameSnapshot,
        
        teamId: data.teamId,
        teamNameSnapshot: data.teamNameSnapshot,
        
        effectiveFrom: data.effectiveFrom,
        effectiveUntil: data.effectiveUntil,
        status: data.status,
        transitionMetadata: data.transitionMetadata as any,
        
        version: data.version,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      },
      update: {
        effectiveFrom: data.effectiveFrom,
        effectiveUntil: data.effectiveUntil,
        status: data.status,
        transitionMetadata: data.transitionMetadata as any,
        version: data.version,
        updatedAt: data.updatedAt
      }
    });
  }
}
