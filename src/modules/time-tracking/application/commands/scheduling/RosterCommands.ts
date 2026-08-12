export class DraftRoster {
  constructor(
    public readonly organizationId: string,
    public readonly scopeId: string,
    public readonly planningPeriod: any
  ) {}
}

export class RunAutoScheduler {
  constructor(public readonly rosterId: string) {}
}

export class InitiatePublishPipeline {
  constructor(public readonly rosterId: string) {}
}
