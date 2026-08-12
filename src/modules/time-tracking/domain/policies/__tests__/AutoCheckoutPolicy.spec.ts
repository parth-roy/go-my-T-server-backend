import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import { AutoCheckoutPolicy, AutoCheckoutProposal, AutoCheckoutRules, AutoCheckoutDecisionType } from '../AutoCheckoutPolicy';
import { StaticClock } from '../Clock';

describe('AutoCheckoutPolicy', () => {
  const clock = new StaticClock(new Date('2026-08-01T20:00:00Z'));
  const policy = new AutoCheckoutPolicy(clock);

  it('should reject auto checkout if it is globally disabled by rules', () => {
    const rules: AutoCheckoutRules = { autoCheckoutAllowed: false, requireManagerReviewIfMissingMinutes: 120 };
    const proposal: AutoCheckoutProposal = {
      workerId: 'worker-1',
      shiftEndTime: new Date('2026-08-01T17:00:00Z'),
      lastKnownPunchTime: new Date('2026-08-01T16:00:00Z')
    };

    const result = policy.evaluateProposal(proposal, rules);

    assert.strictEqual(result.decision, AutoCheckoutDecisionType.REJECTED);
  });

  it('should confirm auto checkout if allowed and within missing minute threshold', () => {
    const rules: AutoCheckoutRules = { autoCheckoutAllowed: true, requireManagerReviewIfMissingMinutes: 120 };
    const proposal: AutoCheckoutProposal = {
      workerId: 'worker-1',
      shiftEndTime: new Date('2026-08-01T17:00:00Z'),
      lastKnownPunchTime: new Date('2026-08-01T16:00:00Z') // 60 minutes missing
    };

    const result = policy.evaluateProposal(proposal, rules);

    assert.strictEqual(result.decision, AutoCheckoutDecisionType.CONFIRMED);
    assert.deepStrictEqual(result.checkoutTime, proposal.shiftEndTime);
  });

  it('should require manager review if missing minutes exceed threshold', () => {
    const rules: AutoCheckoutRules = { autoCheckoutAllowed: true, requireManagerReviewIfMissingMinutes: 120 };
    const proposal: AutoCheckoutProposal = {
      workerId: 'worker-1',
      shiftEndTime: new Date('2026-08-01T17:00:00Z'),
      lastKnownPunchTime: new Date('2026-08-01T12:00:00Z') // 5 hours missing
    };

    const result = policy.evaluateProposal(proposal, rules);

    assert.strictEqual(result.decision, AutoCheckoutDecisionType.MANAGER_REVIEW_REQUIRED);
    assert.deepStrictEqual(result.checkoutTime, proposal.shiftEndTime);
  });
});
