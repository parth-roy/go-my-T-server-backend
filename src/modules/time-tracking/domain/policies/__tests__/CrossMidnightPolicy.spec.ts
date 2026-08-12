import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import { CrossMidnightPolicy, ShiftDefinition } from '../CrossMidnightPolicy';
import { StaticClock } from '../Clock';

describe('CrossMidnightPolicy', () => {
  const fixedClockTime = new Date('2026-08-01T12:00:00Z');
  const clock = new StaticClock(fixedClockTime);
  const policy = new CrossMidnightPolicy(clock);

  it('should properly attribute a cross-midnight punch to the logical shift date', () => {
    // Night shift starts at 22:00 on Aug 1st and lasts up to 14 hours
    const shift: ShiftDefinition = {
      logicalShiftDate: '2026-08-01',
      scheduledStartTime: new Date('2026-08-01T22:00:00Z'),
      scheduledEndTime: new Date('2026-08-02T06:00:00Z'),
      maxShiftDurationMinutes: 14 * 60 // 14 hours
    };

    // Punch occurs next day at 2 AM
    const punchTime = new Date('2026-08-02T02:00:00Z');

    const result = policy.resolveAttribution(punchTime, shift);

    assert.strictEqual(result.logicalDate, '2026-08-01');
    assert.strictEqual(result.isWithinShiftWindow, true);
  });

  it('should reject a punch far outside the max shift duration window', () => {
    const shift: ShiftDefinition = {
      logicalShiftDate: '2026-08-01',
      scheduledStartTime: new Date('2026-08-01T09:00:00Z'),
      scheduledEndTime: new Date('2026-08-01T17:00:00Z'),
      maxShiftDurationMinutes: 12 * 60 // 12 hours max (so up to 21:00)
    };

    // Punch occurs next day at 9 AM (way past 12 hour max duration)
    const punchTime = new Date('2026-08-02T09:00:00Z');

    const result = policy.resolveAttribution(punchTime, shift);

    assert.strictEqual(result.logicalDate, '2026-08-01'); // Always resolves to the logical date if provided
    assert.strictEqual(result.isWithinShiftWindow, false); // But marks it outside the window
  });
});
