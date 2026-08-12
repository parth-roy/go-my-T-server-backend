export interface GracePolicyDecision {
  lateMinutes: number;
  earlyMinutes: number;
  isGraceApplied: boolean;
  isWithinGrace: boolean;
}

export interface GracePolicyRules {
  allowedLateMinutes: number;
  allowedEarlyMinutes: number;
}

export class GracePolicy {
  public evaluate(
    scheduledTime: Date,
    actualPunchTime: Date,
    rules: GracePolicyRules
  ): GracePolicyDecision {
    const diffMs = actualPunchTime.getTime() - scheduledTime.getTime();
    const diffMinutes = Math.round(diffMs / 60000);

    let lateMinutes = 0;
    let earlyMinutes = 0;
    let isGraceApplied = false;
    let isWithinGrace = false;

    if (diffMinutes > 0) {
      lateMinutes = diffMinutes;
      isWithinGrace = lateMinutes <= rules.allowedLateMinutes;
      if (isWithinGrace) {
        isGraceApplied = true;
      }
    } else if (diffMinutes < 0) {
      earlyMinutes = Math.abs(diffMinutes);
      isWithinGrace = earlyMinutes <= rules.allowedEarlyMinutes;
      if (isWithinGrace) {
        isGraceApplied = true;
      }
    } else {
      isWithinGrace = true;
      isGraceApplied = false;
    }

    return {
      lateMinutes,
      earlyMinutes,
      isGraceApplied,
      isWithinGrace
    };
  }
}
