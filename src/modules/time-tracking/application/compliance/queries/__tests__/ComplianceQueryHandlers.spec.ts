import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  GetWorkerComplianceHandler,
  GetWorkerComplianceDashboardHandler,
  GetComplianceTimelineHandler,
  GetUpcomingExpirationsHandler,
  GetOrganizationComplianceStatusHandler,
  ComplianceReadModelRepository
} from '../handlers/ComplianceQueryHandlers';
import {
  GetWorkerComplianceQuery,
  GetWorkerComplianceDashboardQuery,
  GetComplianceTimelineQuery,
  GetUpcomingExpirationsQuery,
  GetOrganizationComplianceStatusQuery
} from '../ComplianceQueries';

describe('ComplianceQueryHandlers', () => {
  let readModelRepo: ComplianceReadModelRepository;

  beforeEach(() => {
    readModelRepo = {
      getWorkerCompliance: vi.fn().mockResolvedValue({ id: 'w-1' }),
      getWorkerComplianceDashboard: vi.fn().mockResolvedValue({ workerId: 'w-1' }),
      getComplianceTimeline: vi.fn().mockResolvedValue([]),
      getUpcomingExpirations: vi.fn().mockResolvedValue([]),
      getOrganizationComplianceStatus: vi.fn().mockResolvedValue({ orgId: 'org-1' })
    };
  });

  it('should handle GetWorkerComplianceQuery', async () => {
    const handler = new GetWorkerComplianceHandler(readModelRepo);
    const query = new GetWorkerComplianceQuery('w-1');
    const result = await handler.handle(query);
    expect(readModelRepo.getWorkerCompliance).toHaveBeenCalledWith('w-1');
    expect(result).toEqual({ id: 'w-1' });
  });

  it('should handle GetWorkerComplianceDashboardQuery', async () => {
    const handler = new GetWorkerComplianceDashboardHandler(readModelRepo);
    const query = new GetWorkerComplianceDashboardQuery('w-1');
    const result = await handler.handle(query);
    expect(readModelRepo.getWorkerComplianceDashboard).toHaveBeenCalledWith('w-1');
    expect(result).toEqual({ workerId: 'w-1' });
  });

  it('should handle GetComplianceTimelineQuery', async () => {
    const handler = new GetComplianceTimelineHandler(readModelRepo);
    const query = new GetComplianceTimelineQuery('w-1', 10);
    const result = await handler.handle(query);
    expect(readModelRepo.getComplianceTimeline).toHaveBeenCalledWith('w-1', 10);
    expect(result).toEqual([]);
  });

  it('should handle GetUpcomingExpirationsQuery', async () => {
    const handler = new GetUpcomingExpirationsHandler(readModelRepo);
    const query = new GetUpcomingExpirationsQuery('org-1', 30);
    const result = await handler.handle(query);
    expect(readModelRepo.getUpcomingExpirations).toHaveBeenCalledWith('org-1', 30);
    expect(result).toEqual([]);
  });

  it('should handle GetOrganizationComplianceStatusQuery', async () => {
    const handler = new GetOrganizationComplianceStatusHandler(readModelRepo);
    const query = new GetOrganizationComplianceStatusQuery('org-1');
    const result = await handler.handle(query);
    expect(readModelRepo.getOrganizationComplianceStatus).toHaveBeenCalledWith('org-1');
    expect(result).toEqual({ orgId: 'org-1' });
  });
});
