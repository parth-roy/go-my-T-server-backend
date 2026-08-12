export interface ShiftDefinition {
  startTime: string; // "HH:mm" format
  endTime: string; // "HH:mm" format
  isNightShift: boolean;
  isCrossMidnight: boolean;
}

export interface BreakDefinition {
  startTime: string;
  endTime: string;
  isPaid: boolean;
  durationMinutes: number;
}

export interface WorkingDayConfig {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  isWorkingDay: boolean;
  isHalfDay?: boolean;
  shifts?: ShiftDefinition[];
  breaks?: BreakDefinition[];
}

export interface GraceRules {
  lateInMinutes: number;
  earlyOutMinutes: number;
}

export interface RotationCycle {
  daysOn: number;
  daysOff: number;
  cycleLengthDays: number;
}

export interface WorkScheduleConfiguration {
  timezone: string; // e.g. "Asia/Kolkata"
  workingDays: WorkingDayConfig[];
  graceRules?: GraceRules;
  rotationRules?: RotationCycle;
  flexibleHours?: {
    isFlexible: boolean;
    coreHoursStart?: string;
    coreHoursEnd?: string;
    totalRequiredHours: number;
  };
}

export class WorkScheduleConfigurationVO {
  constructor(private readonly config: WorkScheduleConfiguration) {
    this.validate(config);
  }

  private validate(config: WorkScheduleConfiguration) {
    if (!config.timezone) {
      throw new Error('Timezone is required for work schedule configuration');
    }
    if (!config.workingDays || config.workingDays.length !== 7) {
      throw new Error('Working days configuration must include exactly 7 days');
    }
    
    // Additional validation could check overlap of shifts, breaks, and cross-midnight rules.
    // For now, domain validations guarantee structure.
  }

  get value(): WorkScheduleConfiguration {
    return this.config;
  }
}
