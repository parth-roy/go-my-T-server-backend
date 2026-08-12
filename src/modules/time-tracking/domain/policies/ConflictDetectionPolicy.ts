import { Availability, AvailabilityStatus } from '../aggregates/Availability';

export class ConflictDetectionPolicy {
  public canReserve(availability: Availability): boolean {
    // If worker is not AVAILABLE (e.g. BUSY, OFF_DUTY, ON_LEAVE), we reject reservation.
    return availability.getStatus() === AvailabilityStatus.AVAILABLE;
  }
}
