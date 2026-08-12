import { DeviationMetrics } from '../../value-objects/DeviationMetrics';
import { PolicySnapshot } from '../../value-objects/PolicySnapshot';

export class ShiftAdherence {
  public id: string = 'uuid';
  public aggregateVersion: number = 1;
  constructor(
    public readonly organizationId: string,
    public readonly workerId: string,
    public readonly shiftId: string,
    public status: string,
    public deviationMetrics: DeviationMetrics,
    public policySnapshot: PolicySnapshot
  ) {}
}
