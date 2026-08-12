import { EnterpriseEventHeader } from './WorkforceRequirementEvents';
export interface ShiftSwapRequestedEvent extends EnterpriseEventHeader {
  eventType: 'ShiftSwapRequested';
  payload: any;
}
