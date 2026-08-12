import { WorkScheduleConfiguration, WorkingDayConfig, ShiftDefinition, BreakDefinition } from '../value-objects/work-schedule-configuration.vo';
import { AppError } from '@shared/errors/AppError';

export class ScheduleConfigurationValidator {
  
  public static validate(config: WorkScheduleConfiguration): void {
    if (!config.timezone) {
      throw AppError.badRequest('Timezone must be specified');
    }

    if (!config.workingDays || config.workingDays.length !== 7) {
      throw AppError.badRequest('Schedule must define exactly 7 working days');
    }

    // Ensure all days 0-6 are represented uniquely
    const days = new Set(config.workingDays.map(d => d.dayOfWeek));
    if (days.size !== 7) {
      throw AppError.badRequest('Working days must include exactly one configuration for each day (0-6)');
    }

    for (const day of config.workingDays) {
      this.validateDay(day);
    }
    
    // Additional domain validations for rotation, grace, etc. could go here
  }

  private static validateDay(day: WorkingDayConfig): void {
    if (day.isWorkingDay) {
      if (!day.shifts || day.shifts.length === 0) {
        throw AppError.badRequest(`Day ${day.dayOfWeek} is marked as working but has no shifts defined.`);
      }

      for (const shift of day.shifts) {
        this.validateShift(shift);
      }

      if (day.breaks) {
        for (const brk of day.breaks) {
          this.validateBreak(brk);
        }
      }
    }
  }

  private static validateShift(shift: ShiftDefinition): void {
    if (!this.isValidTimeFormat(shift.startTime) || !this.isValidTimeFormat(shift.endTime)) {
      throw AppError.badRequest('Shift times must be in HH:mm format');
    }

    if (!shift.isCrossMidnight) {
      if (this.timeToMinutes(shift.startTime) >= this.timeToMinutes(shift.endTime)) {
        throw AppError.badRequest('Shift startTime must be before endTime unless it is cross-midnight');
      }
    }
  }

  private static validateBreak(brk: BreakDefinition): void {
    if (!this.isValidTimeFormat(brk.startTime) || !this.isValidTimeFormat(brk.endTime)) {
      throw AppError.badRequest('Break times must be in HH:mm format');
    }
    if (brk.durationMinutes <= 0) {
      throw AppError.badRequest('Break duration must be positive');
    }
  }

  private static isValidTimeFormat(time: string): boolean {
    const regex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    return regex.test(time);
  }

  private static timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }
}
