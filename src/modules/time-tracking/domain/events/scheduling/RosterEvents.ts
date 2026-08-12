import { EnterpriseEventHeader } from './WorkforceRequirementEvents';
export interface RosterDraftCreatedEvent extends EnterpriseEventHeader {
  eventType: 'RosterDraftCreated';
  payload: any;
}
export interface RosterPublishedEvent extends EnterpriseEventHeader {
  eventType: 'RosterPublished';
  payload: any;
}
