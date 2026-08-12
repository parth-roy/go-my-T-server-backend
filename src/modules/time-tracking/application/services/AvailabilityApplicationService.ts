import { RequestReservationCommand, ProcessAssignmentCommand, ReleaseWorkerCommand, SetupCapacityCommand } from '../commands/AvailabilityCommands';
import { Availability } from '../../domain/aggregates/Availability';
import { Capacity } from '../../domain/aggregates/Capacity';
import { Reservation } from '../../domain/aggregates/Reservation';
import { ConflictDetectionPolicy } from '../../domain/policies/ConflictDetectionPolicy';
import { CapacityPolicy, FatiguePolicy } from '../../domain/policies/CapacityPolicies';

export class AvailabilityApplicationService {
  private conflictPolicy = new ConflictDetectionPolicy();
  private capacityPolicy = new CapacityPolicy();
  private fatiguePolicy = new FatiguePolicy();

  public async requestReservation(command: RequestReservationCommand): Promise<string> {
    const reservationId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + command.ttlSeconds * 1000);
    const reservation = new Reservation(reservationId, command.targetId, command.requesterId, expiresAt);
    
    // In real implementation:
    // const availability = await this.availabilityRepo.get(command.targetId);
    // const capacity = await this.capacityRepo.get(command.targetId);
    
    // Check Domain Policies before granting
    // if (!this.conflictPolicy.canReserve(availability) || !this.fatiguePolicy.validateAssignment(capacity, 1)) {
    //   reservation.reject();
    // } else {
    //   availability.reserve();
    //   reservation.grant();
    // }

    // await this.reservationRepo.save(reservation);
    return reservationId;
  }

  public async processAssignment(command: ProcessAssignmentCommand): Promise<void> {
    // const availability = await this.availabilityRepo.get(command.targetId);
    // const capacity = await this.capacityRepo.get(command.targetId);
    
    // availability.assignWork();
    // capacity.consume(command.consumedHours);

    // await this.availabilityRepo.save(availability);
    // await this.capacityRepo.save(capacity);
  }
}
