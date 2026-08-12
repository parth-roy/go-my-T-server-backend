import { Clock } from './Clock';

export interface ShiftDefinition {
  logicalShiftDate: string; // YYYY-MM-DD
  scheduledStartTime: Date;
  scheduledEndTime: Date;
  maxShiftDurationMinutes: number;
}

export interface CrossMidnightDecision {
  logicalDate: string;
  isWithinShiftWindow: boolean;
}

export class CrossMidnightPolicy {
  constructor(private readonly clock: Clock) {}

  public resolveAttribution(
    punchTime: Date,
    shift: ShiftDefinition
  ): CrossMidnightDecision {
    // The Shift Runtime is the source of truth. We use the logicalShiftDate defined by the shift.
    const logicalDate = shift.logicalShiftDate;

    // A punch is generally valid within the max shift duration starting from the scheduled start.
    // If a shift starts at 22:00 and has a max duration of 14 hours, any punch between 22:00 and 12:00 next day
    // belongs to this shift window.
    
    // Calculate the absolute window boundaries
    // Note: In real life, we might also allow punches slightly before the scheduled start time
    const windowStartMs = shift.scheduledStartTime.getTime() - (2 * 60 * 60 * 1000); // Allow 2 hours early
    const windowEndMs = shift.scheduledStartTime.getTime() + (shift.maxShiftDurationMinutes * 60000);

    const punchMs = punchTime.getTime();
    const isWithinShiftWindow = punchMs >= windowStartMs && punchMs <= windowEndMs;

    return {
      logicalDate,
      isWithinShiftWindow
    };
  }
}
