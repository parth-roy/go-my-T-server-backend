export interface RequestReservationCommand {
  targetId: string; // Worker or Fleet
  requesterId: string; // BookingId or DispatchId
  ttlSeconds: number;
}

export interface ProcessAssignmentCommand {
  targetId: string;
  consumedHours: number;
}

export interface ReleaseWorkerCommand {
  targetId: string;
}

export interface SetupCapacityCommand {
  workerId: string;
  maxHours: number;
}
