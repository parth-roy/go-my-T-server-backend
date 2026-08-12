import { ShiftGenerationTrigger } from '@prisma/client';

export interface TriggerShiftGenerationDto {
  windowStart: Date;
  windowEnd: Date;
  trigger: ShiftGenerationTrigger;
}

export interface ApplyShiftOverrideDto {
  shiftId: string;
  overrideStartTime?: Date;
  overrideEndTime?: Date;
  reason: string;
}
