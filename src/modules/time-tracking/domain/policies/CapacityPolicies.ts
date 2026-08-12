import { Capacity } from '../aggregates/Capacity';

export class FatiguePolicy {
  public static readonly CRITICAL_THRESHOLD = 100;
  
  public isFatigued(capacity: Capacity): boolean {
    return capacity.getFatigueScore() >= FatiguePolicy.CRITICAL_THRESHOLD;
  }

  public validateAssignment(capacity: Capacity, requiredHours: number): boolean {
    if (this.isFatigued(capacity)) {
      return false; // Cannot take new work if already past fatigue threshold
    }
    // Predictive fatigue check
    const projectedScore = capacity.getFatigueScore() + (requiredHours * 1.5);
    if (projectedScore > (FatiguePolicy.CRITICAL_THRESHOLD + 20)) { 
      // Hard limit
      return false;
    }
    return true;
  }
}

export class CapacityPolicy {
  public canAcceptWorkload(capacity: Capacity, requiredHours: number): boolean {
    return capacity.getRemainingHours() >= requiredHours;
  }
}
