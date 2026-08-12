export class GetWorkerPerformanceCycleQuery {
  constructor(
    public readonly workerId: string,
    public readonly cycleId: string
  ) {}
}

export class ListWorkerPerformanceCyclesQuery {
  constructor(
    public readonly workerId: string
  ) {}
}

export class GetWorkerPerformanceDashboardQuery {
  constructor(
    public readonly workerId: string
  ) {}
}

export class GetWorkerPerformanceObjectivesQuery {
  constructor(
    public readonly workerId: string,
    public readonly cycleId: string
  ) {}
}

export class GetPerformancePolicyQuery {
  constructor(
    public readonly policyId: string
  ) {}
}

export class ListPerformancePoliciesQuery {
  constructor(
    public readonly status?: string
  ) {}
}

export class GetWorkerAdherenceSnapshotQuery {
  constructor(
    public readonly workerId: string,
    public readonly cycleId: string
  ) {}
}
