import { AvailabilityStatusChangedEvent } from '../../domain/events/AvailabilityEvents';

export class WorkerAvailabilityProjector {
  public async onStatusChanged(event: AvailabilityStatusChangedEvent): Promise<void> {
    console.log(`[Projector] Updating WorkerAvailabilityView for ${event.aggregateId} to ${event.payload.newStatus}`);
    // 1. Upsert WorkerAvailabilityView for fast Dispatch access
    // 2. Cascade aggregated counts up to DepartmentAvailabilityProjection and OrganizationCapacityView
  }
}

export class CapacityDashboardProjector {
  public async onCapacityConsumed(event: any): Promise<void> {
    console.log(`[Projector] Updating TeamCapacityDashboard for consumed hours.`);
  }
}
