import { Clock } from './Clock';
import { DomainException } from '../exceptions/DomainException';

export interface AutoCheckoutProposal {
  workerId: string;
  shiftEndTime: Date;
  lastKnownPunchTime: Date;
}

export interface AutoCheckoutRules {
  autoCheckoutAllowed: boolean;
  requireManagerReviewIfMissingMinutes: number; // e.g. 120 mins
}

export enum AutoCheckoutDecisionType {
  CONFIRMED = 'CONFIRMED',
  MANAGER_REVIEW_REQUIRED = 'MANAGER_REVIEW_REQUIRED',
  REJECTED = 'REJECTED'
}

export interface AutoCheckoutDecision {
  decision: AutoCheckoutDecisionType;
  checkoutTime: Date;
  reason: string;
}

export class AutoCheckoutPolicy {
  constructor(private readonly clock: Clock) {}

  public evaluateProposal(
    proposal: AutoCheckoutProposal,
    rules: AutoCheckoutRules
  ): AutoCheckoutDecision {
    if (!rules.autoCheckoutAllowed) {
      return {
        decision: AutoCheckoutDecisionType.REJECTED,
        checkoutTime: proposal.shiftEndTime,
        reason: 'Auto-checkout is not allowed for this organization or worker schedule.'
      };
    }

    const missingMinutes = Math.abs(proposal.shiftEndTime.getTime() - proposal.lastKnownPunchTime.getTime()) / 60000;

    // If the gap between the last known punch and the scheduled end time is extremely large,
    // we may require manual manager review before confirming the checkout.
    if (missingMinutes > rules.requireManagerReviewIfMissingMinutes) {
      return {
        decision: AutoCheckoutDecisionType.MANAGER_REVIEW_REQUIRED,
        checkoutTime: proposal.shiftEndTime,
        reason: `Large gap of ${missingMinutes} minutes since last punch. Requires manager verification.`
      };
    }

    return {
      decision: AutoCheckoutDecisionType.CONFIRMED,
      checkoutTime: proposal.shiftEndTime,
      reason: 'Auto-checkout falls within acceptable parameters.'
    };
  }
}
