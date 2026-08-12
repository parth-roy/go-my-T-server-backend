import { ReliabilityScoringStrategy } from '../../policies/adherence/ReliabilityScoringStrategy';
import { WorkerReliabilityProfile } from '../../aggregates/adherence/WorkerReliabilityProfile';

export class ReliabilityScoringEngine {
  constructor(private strategy: ReliabilityScoringStrategy) {}
  public recalculate(profile: WorkerReliabilityProfile, events: any[]): void {}
}
