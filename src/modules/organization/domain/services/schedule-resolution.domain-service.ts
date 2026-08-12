import { ScheduleTargetType } from '@prisma/client';
import { WorkScheduleTemplateVersionEntity } from '../entities/work-schedule-template-version.entity';
import { IEmploymentAssignmentRepository } from '../repositories/employment-assignment.repository.interface';
import { IScheduleAssignmentRepository, IWorkScheduleTemplateVersionRepository } from '../repositories/schedule.repository.interface';

export interface ResolvedSchedule {
  templateVersion: WorkScheduleTemplateVersionEntity;
  resolvedFrom: ScheduleTargetType;
  resolvedTargetId: string;
  resolutionTimestamp: Date;
}

export class ScheduleResolutionDomainService {
  constructor(
    private readonly scheduleAssignmentRepo: IScheduleAssignmentRepository,
    private readonly versionRepo: IWorkScheduleTemplateVersionRepository,
    private readonly employmentAssignmentRepo: IEmploymentAssignmentRepository
  ) {}

  public async resolveForAssignment(
    organizationId: string,
    assignmentId: string,
    date: Date = new Date()
  ): Promise<ResolvedSchedule | null> {
    
    const empAssignment = await this.employmentAssignmentRepo.findById(assignmentId);
    if (!empAssignment) return null;

    // 1. Try ASSIGNMENT directly
    let versionId = await this.scheduleAssignmentRepo.findActiveByTarget(organizationId, ScheduleTargetType.ASSIGNMENT, assignmentId, date);
    if (versionId) {
      return this.buildResult(versionId, ScheduleTargetType.ASSIGNMENT, assignmentId);
    }

    // 2. Try TEAM
    if (empAssignment.teamId) {
      versionId = await this.scheduleAssignmentRepo.findActiveByTarget(organizationId, ScheduleTargetType.TEAM, empAssignment.teamId, date);
      if (versionId) {
        return this.buildResult(versionId, ScheduleTargetType.TEAM, empAssignment.teamId);
      }
    }

    // 3. Try DEPARTMENT
    if (empAssignment.departmentId) {
      versionId = await this.scheduleAssignmentRepo.findActiveByTarget(organizationId, ScheduleTargetType.DEPARTMENT, empAssignment.departmentId, date);
      if (versionId) {
        return this.buildResult(versionId, ScheduleTargetType.DEPARTMENT, empAssignment.departmentId);
      }
    }

    // 4. Try BRANCH
    if (empAssignment.branchId) {
      versionId = await this.scheduleAssignmentRepo.findActiveByTarget(organizationId, ScheduleTargetType.BRANCH, empAssignment.branchId, date);
      if (versionId) {
        return this.buildResult(versionId, ScheduleTargetType.BRANCH, empAssignment.branchId);
      }
    }

    // 5. Try ORGANIZATION
    versionId = await this.scheduleAssignmentRepo.findActiveByTarget(organizationId, ScheduleTargetType.ORGANIZATION, organizationId, date);
    if (versionId) {
      return this.buildResult(versionId, ScheduleTargetType.ORGANIZATION, organizationId);
    }

    return null;
  }

  private async buildResult(versionId: string, resolvedFrom: ScheduleTargetType, resolvedTargetId: string): Promise<ResolvedSchedule> {
    const version = await this.versionRepo.findById(versionId);
    if (!version) {
      throw new Error(`Orphaned schedule assignment for version ID: ${versionId}`);
    }
    return {
      templateVersion: version,
      resolvedFrom,
      resolvedTargetId,
      resolutionTimestamp: new Date()
    };
  }
}
