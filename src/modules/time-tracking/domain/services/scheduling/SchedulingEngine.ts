import { WorkforceRequirement } from '../../models/scheduling/WorkforceRequirement';
import { RosterAssignment } from '../../models/scheduling/RosterAssignment';

export interface SchedulingEngine {
  proposeAssignment(requirement: WorkforceRequirement, candidates: any[]): Promise<RosterAssignment>;
}
