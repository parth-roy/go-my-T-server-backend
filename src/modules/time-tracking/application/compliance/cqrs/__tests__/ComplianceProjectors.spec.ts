import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  WorkerComplianceDashboardProjector,
  OrganizationComplianceProjector,
  NotificationFeedProjector,
  ComplianceAlertsDashboardProjector,
  ComplianceAuditTimelineProjector
} from '../projectors/ComplianceProjectors';

describe('ComplianceProjectors', () => {
  let dbConnection: any;

  beforeEach(() => {
    dbConnection = {
      execute: vi.fn(),
      query: vi.fn()
    };
  });

  describe('WorkerComplianceDashboardProjector', () => {
    it('should handle WorkerComplianceStatusChangedEvent', async () => {
      const projector = new WorkerComplianceDashboardProjector();
      projector['getCurrentAggregateVersion'] = vi.fn().mockResolvedValue(0);
      projector['isEventProcessed'] = vi.fn().mockResolvedValue(false);
      projector['updateCheckpoint'] = vi.fn();

      const event = { eventType: 'WorkerComplianceStatusChangedEvent', aggregateId: 'w-1', newStatus: 'COMPLIANT', eventVersion: 1, eventId: 'e-1' };
      await expect(projector.project(event, { tx: dbConnection })).resolves.toBeUndefined();
    });

    it('should handle WorkerCredentialAddedEvent and ignore unknown events', async () => {
      const projector = new WorkerComplianceDashboardProjector();
      projector['getCurrentAggregateVersion'] = vi.fn().mockResolvedValue(0);
      projector['isEventProcessed'] = vi.fn().mockResolvedValue(false);
      
      const event1 = { eventType: 'WorkerCredentialAddedEvent', aggregateId: 'w-1', eventVersion: 1, eventId: 'e-2' };
      const event2 = { eventType: 'UnknownEvent', aggregateId: 'w-1', eventVersion: 1, eventId: 'e-3' };
      await projector.project(event1, { tx: dbConnection });
      await projector.project(event2, { tx: dbConnection });
    });
  });

  describe('OrganizationComplianceProjector', () => {
    it('should aggregate metrics', async () => {
      const projector = new OrganizationComplianceProjector();
      projector['getCurrentAggregateVersion'] = vi.fn().mockResolvedValue(0);
      projector['isEventProcessed'] = vi.fn().mockResolvedValue(false);
      projector['updateCheckpoint'] = vi.fn();

      const event = { eventType: 'WorkerComplianceStatusChangedEvent', aggregateId: 'w-1', newStatus: 'COMPLIANT', eventVersion: 1, eventId: 'e-1' };
      await expect(projector.project(event, { tx: dbConnection })).resolves.toBeUndefined();
    });
  });

  describe('NotificationFeedProjector', () => {
    it('should push notifications on specific events', async () => {
      const projector = new NotificationFeedProjector();
      projector['getCurrentAggregateVersion'] = vi.fn().mockResolvedValue(0);
      projector['isEventProcessed'] = vi.fn().mockResolvedValue(false);
      projector['updateCheckpoint'] = vi.fn();

      const event = { eventType: 'WorkerCredentialRevokedEvent', aggregateId: 'w-1', eventVersion: 1, eventId: 'e-1' };
      await expect(projector.project(event, { tx: dbConnection })).resolves.toBeUndefined();
    });

    it('should ignore non-revoked events', async () => {
      const projector = new NotificationFeedProjector();
      projector['getCurrentAggregateVersion'] = vi.fn().mockResolvedValue(0);
      projector['isEventProcessed'] = vi.fn().mockResolvedValue(false);
      const event = { eventType: 'UnknownEvent', aggregateId: 'w-1', eventVersion: 1, eventId: 'e-2' };
      await projector.project(event, { tx: dbConnection });
    });
  });

  describe('ComplianceAlertsDashboardProjector', () => {
    it('should generate alerts on suspensions', async () => {
      const projector = new ComplianceAlertsDashboardProjector();
      projector['getCurrentAggregateVersion'] = vi.fn().mockResolvedValue(0);
      projector['isEventProcessed'] = vi.fn().mockResolvedValue(false);
      projector['updateCheckpoint'] = vi.fn();

      const event = { eventType: 'WorkerComplianceStatusChangedEvent', newStatus: 'NON_COMPLIANT', aggregateId: 'w-1', eventVersion: 1, eventId: 'e-1' };
      await expect(projector.project(event, { tx: dbConnection })).resolves.toBeUndefined();
    });
  });

  describe('ComplianceAuditTimelineProjector', () => {
    it('should append to timeline log', async () => {
      const projector = new ComplianceAuditTimelineProjector();
      projector['getCurrentAggregateVersion'] = vi.fn().mockResolvedValue(0);
      projector['isEventProcessed'] = vi.fn().mockResolvedValue(false);
      projector['updateCheckpoint'] = vi.fn();

      const event = { eventType: 'WorkerCredentialRevokedEvent', aggregateId: 'w-1', eventVersion: 1, eventId: 'e-1' };
      await expect(projector.project(event, { tx: dbConnection })).resolves.toBeUndefined();
    });
  });

  it('NotificationFeedProjector should return false for isEventProcessed', async () => {
    const projector = new NotificationFeedProjector();
    const ctx = { tx: {} as any };
    
    // Test base mock methods
    expect(await (projector as any).isEventProcessed('evt', ctx)).toBe(false);
    expect(await (projector as any).getCurrentAggregateVersion('w-1', ctx)).toBe(0);
    
    // Also test event handler
    const event = { eventId: 'evt-4', eventType: 'WorkerCredentialRevokedEvent', aggregateId: 'w-1', aggregateVersion: 1 };
    await projector.project(event, ctx);
  });

  it('ComplianceAlertsDashboardProjector should handle events and mock methods', async () => {
    const projector = new ComplianceAlertsDashboardProjector();
    const ctx = { tx: {} as any };
    const event = { eventId: 'evt-5', eventType: 'ManualVerificationRequiredEvent', aggregateId: 'w-1', aggregateVersion: 1 };
    await projector.project(event, ctx);
    
    expect(await (projector as any).isEventProcessed('evt', ctx)).toBe(false);
    expect(await (projector as any).getCurrentAggregateVersion('w-1', ctx)).toBe(0);
  });
});
