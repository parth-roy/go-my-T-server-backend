import { ResolvedSchedule } from '../services/schedule-resolution.domain-service';
import { ShiftInstanceProps } from '../entities/shift-instance.entity';
import { ShiftLifecycleStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { ScheduleSnapshotVO, AssignmentSnapshotVO } from '../value-objects/shift-snapshots.vo';
import { EmploymentAssignmentEntity } from '../entities/employment-assignment.entity';

export class ShiftGenerationPolicy {
  /**
   * Evaluates a schedule against an assignment for a given date.
   * Returns a ShiftInstanceProps object if a shift should be generated.
   * Returns null if it's a non-working day.
   */
  public static generate(
    date: Date,
    resolvedSchedule: ResolvedSchedule,
    assignment: EmploymentAssignmentEntity,
    organizationId: string
  ): ShiftInstanceProps | null {
    const config = resolvedSchedule.templateVersion.toJSON().configurationData;

    const dayOfWeek = date.getDay(); // 0 (Sun) - 6 (Sat)
    
    // Find working day config
    const dayConfig = config.workingDays.find((d: any) => d.dayOfWeek === dayOfWeek);
    if (!dayConfig || !dayConfig.isWorkingDay || !dayConfig.shifts || dayConfig.shifts.length === 0) {
      return null;
    }

    // For V1, we assume 1 shift per day per schedule. 
    // In advanced setups with split shifts, we would generate multiple instances.
    const primaryShift = dayConfig.shifts[0];

    // Calculate absolute start/end times based on the date
    const [startHours, startMinutes] = primaryShift.startTime.split(':').map(Number);
    const [endHours, endMinutes] = primaryShift.endTime.split(':').map(Number);

    const startTime = new Date(date);
    startTime.setHours(startHours, startMinutes, 0, 0);

    const endTime = new Date(date);
    endTime.setHours(endHours, endMinutes, 0, 0);

    if (primaryShift.isCrossMidnight) {
      endTime.setDate(endTime.getDate() + 1);
    }

    // Duration in minutes
    const expectedDuration = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

    const scheduleSnapshot = new ScheduleSnapshotVO({
      templateVersionId: resolvedSchedule.templateVersion.id,
      templateVersionNumber: resolvedSchedule.templateVersion.versionNumber,
      templateCode: resolvedSchedule.templateVersion.templateId, // Using id as fallback, ideally we need code
      templateName: 'ResolvedTemplate', 
      workingHours: {
        startTime: primaryShift.startTime,
        endTime: primaryShift.endTime,
        expectedDurationMinutes: expectedDuration,
        isCrossMidnight: primaryShift.isCrossMidnight
      },
      breakRules: dayConfig.breaks || [],
      graceRules: config.graceRules || {},
      timezone: config.timezone
    });

    const assignmentSnapshot = new AssignmentSnapshotVO({
      assignmentId: assignment.id,
      assignmentNumber: assignment.assignmentNumber,
      assignmentVersion: assignment.version,
      membershipId: assignment.membershipId,
      employmentTypeId: assignment.employmentTypeId,
      designationId: assignment.designationId || undefined,
      departmentId: assignment.departmentId || undefined,
      teamId: assignment.teamId || undefined,
      branchId: assignment.branchId || undefined,
      organizationId: organizationId
    });

    return {
      id: randomUUID(),
      organizationId,
      membershipId: assignment.membershipId,
      assignmentId: assignment.id,
      date: date,
      status: ShiftLifecycleStatus.GENERATED,
      startTime,
      endTime,
      expectedDuration,
      scheduleSnapshot,
      assignmentSnapshot,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Protects historical or in-progress shifts from regeneration.
   */
  public static canRegenerate(existingStatus: ShiftLifecycleStatus): boolean {
    const regenerableStates: ShiftLifecycleStatus[] = [ShiftLifecycleStatus.DRAFT, ShiftLifecycleStatus.GENERATED, ShiftLifecycleStatus.PUBLISHED];
    return regenerableStates.includes(existingStatus);
  }
}
