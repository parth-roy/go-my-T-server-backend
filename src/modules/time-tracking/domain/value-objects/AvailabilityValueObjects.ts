export class AvailabilityWindow {
  constructor(
    public readonly start: Date,
    public readonly end: Date,
    public readonly source: string // e.g., 'SHIFT', 'GIG_ONLINE'
  ) {}
}

export class AvailabilitySnapshot {
  constructor(
    public readonly status: string,
    public readonly windows: AvailabilityWindow[]
  ) {}
}

export class CapacityLimit {
  constructor(
    public readonly maxHours: number,
    public readonly maxConsecutiveShifts: number
  ) {}
}

export class FatigueSnapshot {
  constructor(
    public readonly score: number,
    public readonly lastRestPeriod: Date
  ) {}
}

export class ReservationTTL {
  constructor(
    public readonly requestedAt: Date,
    public readonly expiresAt: Date
  ) {}
}
