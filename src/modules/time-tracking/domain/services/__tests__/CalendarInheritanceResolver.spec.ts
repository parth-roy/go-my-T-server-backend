import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import { CalendarInheritanceResolver } from '../CalendarInheritanceResolver';
import { Calendar } from '../../aggregates/Calendar';
import { CalendarScope, CalendarScopeType } from '../../value-objects/CalendarScope';
import { Holiday, HolidayType } from '../../aggregates/Holiday';

describe('CalendarInheritanceResolver', () => {
  it('should flatten holidays and lower levels should override higher levels', () => {
    const resolver = new CalendarInheritanceResolver();
    
    const globalScope = new CalendarScope(CalendarScopeType.GLOBAL);
    const globalCal = new Calendar('GLOBAL1', globalScope, 'Global', 'UTC');

    const orgScope = new CalendarScope(CalendarScopeType.ORGANIZATION, 'ORG1');
    const orgCal = new Calendar('ORG1', orgScope, 'Org Calendar', 'UTC', 'GLOBAL1');
    
    // Global Holiday on Dec 25
    const h1 = new Holiday('H1', 'GLOBAL1', 'Christmas', HolidayType.RECURRING, new Date('2026-12-25T00:00:00Z'));
    
    // Global Holiday on Jan 1
    const h2 = new Holiday('H2', 'GLOBAL1', 'New Year', HolidayType.RECURRING, new Date('2026-01-01T00:00:00Z'));
    
    // Org Override on Dec 25 (e.g. they don't observe it or they rename it)
    const h3 = new Holiday('H3', 'ORG1', 'Org Specific Christmas', HolidayType.RECURRING, new Date('2026-12-25T00:00:00Z'));

    const allHolidays = [h1, h2, h3];
    const ancestors = [globalCal];

    const flattened = resolver.resolveHolidays(orgCal, ancestors, allHolidays);

    assert.strictEqual(flattened.length, 2); // Should only have two dates
    
    const dec25 = flattened.find(h => h.baseDate.toISOString().includes('2026-12-25'));
    assert.ok(dec25);
    assert.strictEqual(dec25!.name, 'Org Specific Christmas'); // Overridden successfully
  });
});
