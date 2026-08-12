import { CalendarScopeType } from '../../domain/value-objects/CalendarScope';
import { HolidayType } from '../../domain/aggregates/Holiday';

export interface CreateCalendarCommand {
  type: CalendarScopeType;
  name: string;
  timezone: string;
  referenceId?: string;
  parentId?: string;
}

export interface DefineHolidayCommand {
  calendarId: string;
  name: string;
  type: HolidayType;
  baseDate: Date;
  rule?: any;
}

export interface RevokeHolidayCommand {
  holidayId: string;
}

export interface ConfigureWorkWeekCommand {
  calendarId: string;
  pattern: any;
}
