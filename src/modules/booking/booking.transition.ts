import { BookingStatus, BrokerBookingStatus } from '@prisma/client';
import { AppError } from '@shared/errors/AppError';

// The single booking lifecycle policy used by every module that changes status.
const VALID_TRANSITIONS: Partial<Record<BookingStatus, BookingStatus[]>> = {
  [BookingStatus.DRAFT]: [BookingStatus.CONFIRMED, BookingStatus.CANCELLED],
  [BookingStatus.CONFIRMED]: [
    BookingStatus.DRIVER_ASSIGNED,
    BookingStatus.DRIVER_ARRIVING,
    BookingStatus.CANCELLED,
  ],
  [BookingStatus.DRIVER_ASSIGNED]: [
    BookingStatus.CONFIRMED,
    BookingStatus.DRIVER_ARRIVING,
    BookingStatus.CANCELLED,
  ],
  [BookingStatus.DRIVER_ARRIVING]: [BookingStatus.PICKED_UP, BookingStatus.CANCELLED],
  [BookingStatus.PICKED_UP]: [BookingStatus.IN_TRANSIT, BookingStatus.DELIVERED],
  [BookingStatus.IN_TRANSIT]: [BookingStatus.DELIVERED],
  [BookingStatus.DELIVERED]: [BookingStatus.COMPLETED],
};

export function assertTransition(current: BookingStatus, next: BookingStatus): void {
  const allowed = VALID_TRANSITIONS[current] ?? [];
  if (!allowed.includes(next)) {
    throw AppError.badRequest(
      `Cannot move booking from ${current} to ${next}`,
      'INVALID_STATE_TRANSITION',
    );
  }
}

const VALID_BROKER_TRANSITIONS: Partial<Record<BrokerBookingStatus, BrokerBookingStatus[]>> = {
  [BrokerBookingStatus.SOURCING]: [
    BrokerBookingStatus.PENDING_REVIEW,
    BrokerBookingStatus.CANCELLED,
  ],
  [BrokerBookingStatus.PENDING_REVIEW]: [
    BrokerBookingStatus.ADVANCE_PENDING,
    BrokerBookingStatus.SOURCING,     // Ops rejects all quotes — back to sourcing
    BrokerBookingStatus.CANCELLED,
  ],
  [BrokerBookingStatus.ADVANCE_PENDING]: [
    BrokerBookingStatus.BOOKING_LOCKED,
    BrokerBookingStatus.CANCELLED,
  ],
  [BrokerBookingStatus.BOOKING_LOCKED]: [
    BrokerBookingStatus.LOADING_CONFIRMED,
    BrokerBookingStatus.RE_SOURCING,  // Driver no-show
    BrokerBookingStatus.CANCELLED,
  ],
  [BrokerBookingStatus.LOADING_CONFIRMED]: [
    BrokerBookingStatus.TRIP_COMPLETED,
  ],
  [BrokerBookingStatus.RE_SOURCING]: [
    BrokerBookingStatus.PENDING_REVIEW, // Allow brokers to submit quotes after a driver dropout
    BrokerBookingStatus.SOURCING,     // Reset to open sourcing after driver dropout
    BrokerBookingStatus.CANCELLED,
  ],
};

export function assertBrokerTransition(
  current: BrokerBookingStatus,
  next: BrokerBookingStatus,
): void {
  const allowed = VALID_BROKER_TRANSITIONS[current] ?? [];
  if (!allowed.includes(next)) {
    throw AppError.badRequest(
      `Cannot move broker load from ${current} to ${next}`,
      'INVALID_BROKER_STATE_TRANSITION',
    );
  }
}
