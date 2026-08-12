export interface EnterpriseEventHeader {
  aggregateId: string;
  eventType: string;
  timestamp: Date;
}
export interface WorkforceRequirementCreatedEvent extends EnterpriseEventHeader {
  eventType: 'WorkforceRequirementCreated';
  payload: any;
}
