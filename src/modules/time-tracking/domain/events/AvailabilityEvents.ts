import { EnterpriseEventHeader } from './LeaveEvents';
import { AvailabilityStatus } from '../aggregates/Availability';
import { ReservationStatus } from '../aggregates/Reservation';
import { AvailabilityWindow } from '../value-objects/AvailabilityValueObjects';

// Availability Events
export interface AvailabilityStatusChangedEvent extends EnterpriseEventHeader {
  eventType: 'AvailabilityStatusChanged';
  aggregateId: string; // workerId
  payload: {
    oldStatus: AvailabilityStatus;
    newStatus: AvailabilityStatus;
  };
}

export interface AvailabilityWindowCreatedEvent extends EnterpriseEventHeader {
  eventType: 'AvailabilityWindowCreated';
  aggregateId: string;
  payload: {
    windows: AvailabilityWindow[];
  };
}

// Capacity Events
export interface CapacityConsumedEvent extends EnterpriseEventHeader {
  eventType: 'CapacityConsumed';
  aggregateId: string; // workerId
  payload: {
    consumedHours: number;
    remainingHours: number;
    fatigueScore: number;
  };
}

export interface CapacityRestoredEvent extends EnterpriseEventHeader {
  eventType: 'CapacityRestored';
  aggregateId: string; // workerId
  payload: {
    restoredHours: number;
    remainingHours: number;
  };
}

// Reservation Events
export interface ReservationRequestedEvent extends EnterpriseEventHeader {
  eventType: 'ReservationRequested';
  aggregateId: string; // reservationId
  payload: {
    targetId: string;
    requesterId: string;
    expiresAt: Date;
  };
}

export interface ReservationGrantedEvent extends EnterpriseEventHeader {
  eventType: 'ReservationGranted';
  aggregateId: string;
  payload: {
    targetId: string;
    requesterId: string;
  };
}

export interface ReservationRejectedEvent extends EnterpriseEventHeader {
  eventType: 'ReservationRejected';
  aggregateId: string;
  payload: {
    targetId: string;
    reason: string;
  };
}

export interface ReservationExpiredEvent extends EnterpriseEventHeader {
  eventType: 'ReservationExpired';
  aggregateId: string;
  payload: {
    targetId: string;
  };
}
