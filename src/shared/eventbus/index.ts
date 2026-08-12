import { EventEmitter2 } from 'eventemitter2';

export interface AppEvents {
  // Auth
  'user.registered': { userId: string; fcmToken?: string };
  // Booking lifecycle
  'booking.confirmed': { bookingId: string; customerId: string; vehicleType: string };
  'booking.driver_assigned': { bookingId: string; driverId: string; customerId: string };
  'booking.driver_arriving': { bookingId: string; customerId: string };
  'booking.goods_loaded': { bookingId: string; customerId: string };
  'booking.picked_up': { bookingId: string };
  'booking.delivered': { bookingId: string; customerId: string; totalFare: number };
  'booking.cancelled': { bookingId: string; customerId: string; reason: string };
  'booking.bid_accepted': { bookingId: string; driverId: string };
  // Payments
  'payment.completed': { bookingId: string; customerId: string; amount: number; method: string };
  'payment.wallet_topped_up': { userId: string; amount: number };
  // Rewards
  'rewards.coins_earned': { userId: string; coins: number; bookingId: string };
  'rewards.scratch_card_ready': { userId: string };
  // Announcements
  'announcement.created': { target: string; title: string; body: string };
  // Organization
  'organization.created': { organizationId: string; createdById: string; timestamp: Date };
  'branch.created': { branchId: string; organizationId: string; timestamp: Date };
  'branch.updated': { branchId: string; organizationId: string; timestamp: Date };
  'branch.archived': { branchId: string; organizationId: string; timestamp: Date };
  'department.created': { departmentId: string; branchId: string; organizationId: string; timestamp: Date };
  'department.updated': { departmentId: string; branchId: string; organizationId: string; timestamp: Date };
  'department.archived': { departmentId: string; branchId: string; organizationId: string; timestamp: Date };
  'team.created': { teamId: string; departmentId: string; branchId: string; organizationId: string; timestamp: Date };
  'team.updated': { teamId: string; departmentId: string; branchId: string; organizationId: string; timestamp: Date };
  'team.archived': { teamId: string; departmentId: string; branchId: string; organizationId: string; timestamp: Date };
  'designation.created': { designationId: string; organizationId: string; timestamp: Date };
  'designation.updated': { designationId: string; organizationId: string; timestamp: Date };
  'designation.archived': { designationId: string; organizationId: string; timestamp: Date };
  'employment_type.created': { employmentTypeId: string; organizationId: string; category: string; timestamp: Date };
  'employment_type.updated': { employmentTypeId: string; organizationId: string; timestamp: Date };
  'employment_type.archived': { employmentTypeId: string; organizationId: string; timestamp: Date };
  
  // Explicit Assignment Events
  'assignment.created': { assignmentId: string; membershipId: string; timestamp: Date };
  'assignment.promoted': { assignmentId: string; membershipId: string; previousDesignationId?: string; newDesignationId?: string; timestamp: Date };
  'assignment.transferred': { assignmentId: string; membershipId: string; timestamp: Date };
  'assignment.designation_changed': { assignmentId: string; membershipId: string; timestamp: Date };
  'assignment.department_changed': { assignmentId: string; membershipId: string; timestamp: Date };
  'assignment.branch_changed': { assignmentId: string; membershipId: string; timestamp: Date };
  'assignment.team_changed': { assignmentId: string; membershipId: string; timestamp: Date };
  'assignment.employment_type_changed': { assignmentId: string; membershipId: string; timestamp: Date };
  'assignment.terminated': { assignmentId: string; membershipId: string; timestamp: Date };

  // Work Schedule Events
  'schedule.template.created': { templateId: string; organizationId: string; timestamp: Date };
  'schedule.template.version.created': { templateVersionId: string; templateId: string; organizationId: string; versionNumber: number; timestamp: Date };
  'schedule.assignment.created': { scheduleAssignmentId: string; targetType: string; targetId: string; organizationId: string; timestamp: Date };
  'schedule.assignment.changed': { scheduleAssignmentId: string; targetType: string; targetId: string; organizationId: string; timestamp: Date };
  'schedule.assignment.expired': { scheduleAssignmentId: string; targetType: string; targetId: string; organizationId: string; timestamp: Date };
  'schedule.resolution.changed': { 
    targetType: string; 
    targetId: string; 
    organizationId: string; 
    previousVersionId?: string;
    newVersionId: string;
    timestamp: Date 
  };

  // Shift Events (ORG-012)
  'shift.generated': { shiftId: string; organizationId: string; membershipId: string; timestamp: Date };
  'shift.regenerated': { shiftId: string; organizationId: string; membershipId: string; timestamp: Date };
  'shift.published': { shiftId: string; organizationId: string; membershipId: string; timestamp: Date };
  'shift.cancelled': { shiftId: string; organizationId: string; membershipId: string; timestamp: Date };
  'shift.archived': { shiftId: string; organizationId: string; membershipId: string; timestamp: Date };
  'shift.override.created': { overrideId: string; shiftId: string; organizationId: string; timestamp: Date };
  'shift.override.approved': { overrideId: string; shiftId: string; organizationId: string; timestamp: Date };
  'shift.override.rejected': { overrideId: string; shiftId: string; organizationId: string; timestamp: Date };
  'shift.started': { shiftId: string; organizationId: string; membershipId: string; timestamp: Date };
  'shift.completed': { shiftId: string; organizationId: string; membershipId: string; timestamp: Date };
  'shift.missed': { shiftId: string; organizationId: string; membershipId: string; timestamp: Date };
  'shift.expired': { shiftId: string; organizationId: string; membershipId: string; timestamp: Date };
}

class TypedEventBus extends EventEmitter2 {
  emit<K extends keyof AppEvents>(event: K, data: AppEvents[K]): boolean {
    return super.emit(event as string, data);
  }
  on<K extends keyof AppEvents>(event: K, listener: (data: AppEvents[K]) => void): this {
    return super.on(event as string, listener) as this;
  }
}

export const eventBus = new TypedEventBus({ wildcard: false, maxListeners: 20 });