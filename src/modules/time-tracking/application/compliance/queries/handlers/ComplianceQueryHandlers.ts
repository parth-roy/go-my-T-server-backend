import {
  GetWorkerComplianceQuery,
  GetWorkerComplianceDashboardQuery,
  GetComplianceTimelineQuery,
  GetUpcomingExpirationsQuery,
  GetOrganizationComplianceStatusQuery
} from '../ComplianceQueries';

// Mock abstractions for CQRS Read Models (infrastructure would implement these)
export interface ComplianceReadModelRepository {
  getWorkerCompliance(workerId: string): Promise<any>;
  getWorkerComplianceDashboard(workerId: string): Promise<any>;
  getComplianceTimeline(workerId: string, limit: number): Promise<any[]>;
  getUpcomingExpirations(organizationId: string, daysThreshold: number): Promise<any[]>;
  getOrganizationComplianceStatus(organizationId: string): Promise<any>;
}

export class GetWorkerComplianceHandler {
  constructor(private readModelRepo: ComplianceReadModelRepository) {}
  async handle(query: GetWorkerComplianceQuery): Promise<any> {
    // Read only from CQRS models. Never query aggregate tables directly.
    return this.readModelRepo.getWorkerCompliance(query.workerId);
  }
}

export class GetWorkerComplianceDashboardHandler {
  constructor(private readModelRepo: ComplianceReadModelRepository) {}
  async handle(query: GetWorkerComplianceDashboardQuery): Promise<any> {
    return this.readModelRepo.getWorkerComplianceDashboard(query.workerId);
  }
}

export class GetComplianceTimelineHandler {
  constructor(private readModelRepo: ComplianceReadModelRepository) {}
  async handle(query: GetComplianceTimelineQuery): Promise<any[]> {
    return this.readModelRepo.getComplianceTimeline(query.workerId, query.limit);
  }
}

export class GetUpcomingExpirationsHandler {
  constructor(private readModelRepo: ComplianceReadModelRepository) {}
  async handle(query: GetUpcomingExpirationsQuery): Promise<any[]> {
    return this.readModelRepo.getUpcomingExpirations(query.organizationId, query.daysThreshold);
  }
}

export class GetOrganizationComplianceStatusHandler {
  constructor(private readModelRepo: ComplianceReadModelRepository) {}
  async handle(query: GetOrganizationComplianceStatusQuery): Promise<any> {
    return this.readModelRepo.getOrganizationComplianceStatus(query.organizationId);
  }
}
