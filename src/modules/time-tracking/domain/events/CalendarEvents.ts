import { EnterpriseEventHeader } from './LeaveEvents'; // Reusing the EnterpriseEventHeader defined earlier

export interface CalendarCreatedEvent extends EnterpriseEventHeader {
  eventType: 'CalendarCreated';
  aggregateId: string;
  payload: {
    type: string;
    name: string;
    timezone: string;
    parentId?: string;
  };
}

export interface HolidayDefinedEvent extends EnterpriseEventHeader {
  eventType: 'HolidayDefined';
  aggregateId: string;
  payload: {
    calendarId: string;
    name: string;
    type: string;
    baseDate: Date;
  };
}

export interface HolidayRevokedEvent extends EnterpriseEventHeader {
  eventType: 'HolidayRevoked';
  aggregateId: string;
  payload: {
    calendarId: string;
  };
}

export interface WorkWeekConfiguredEvent extends EnterpriseEventHeader {
  eventType: 'WorkWeekConfigured';
  aggregateId: string;
  payload: {
    calendarId: string;
    pattern: any;
  };
}

export interface CalendarProjectionRebuiltEvent extends EnterpriseEventHeader {
  eventType: 'CalendarProjectionRebuilt';
  aggregateId: string; // calendarId
  payload: {
    rebuildDate: Date;
  };
}
