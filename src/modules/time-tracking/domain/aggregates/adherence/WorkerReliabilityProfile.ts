import { ReliabilityScore } from '../../value-objects/ReliabilityScore';
import { PolicySnapshot } from '../../value-objects/PolicySnapshot';

export class WorkerReliabilityProfile {
  public id: string = 'uuid'; // matches workerId
  public aggregateVersion: number = 1;
  constructor(
    public readonly organizationId: string,
    public readonly workerId: string,
    public reliabilityScore: ReliabilityScore,
    public tier: string,
    public status: string,
    public policySnapshot: PolicySnapshot
  ) {}
}
