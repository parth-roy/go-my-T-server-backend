export class LeaveAvailabilityPolicy {
  
  public validateAvailability(
    startDate: Date,
    endDate: Date,
    existingLeaves: Array<{ start: Date, end: Date, status: string }>,
    hasAttendanceConflict: boolean,
    hasShiftConflict: boolean
  ): boolean {
    
    // 1. Check for overlapping approved or pending leaves
    for (const leave of existingLeaves) {
      if (leave.status === 'APPROVED' || leave.status === 'PENDING' || leave.status === 'UNDER_REVIEW') {
        const overlaps = (startDate <= leave.end) && (endDate >= leave.start);
        if (overlaps) {
          return false;
        }
      }
    }

    // 2. Check attendance conflicts
    if (hasAttendanceConflict) {
      return false; // Worker already punched in
    }

    // 3. Check shift conflicts
    if (hasShiftConflict) {
      return false; // Worker has conflicting critical assignment
    }

    return true;
  }
}
