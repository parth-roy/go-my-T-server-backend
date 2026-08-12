export class GetWorkerComplianceQuery {
  constructor(public readonly workerId: string) {}
}

export class GetWorkerComplianceDashboardQuery {
  constructor(public readonly workerId: string) {}
}

export class GetComplianceTimelineQuery {
  constructor(public readonly workerId: string, public readonly limit: number = 50) {}
}

export class GetUpcomingExpirationsQuery {
  constructor(public readonly organizationId: string, public readonly daysThreshold: number = 30) {}
}

export class GetOrganizationComplianceStatusQuery {
  constructor(public readonly organizationId: string) {}
}
