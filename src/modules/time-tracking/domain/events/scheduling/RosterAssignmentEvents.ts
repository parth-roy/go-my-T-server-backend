import { EnterpriseEventHeader } from './WorkforceRequirementEvents';
export interface RosterAssignmentProposedEvent extends EnterpriseEventHeader {
  eventType: 'ScheduleAssignmentProposed';
  payload: any;
}
