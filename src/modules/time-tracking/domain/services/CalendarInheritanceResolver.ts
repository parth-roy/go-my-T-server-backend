import { Calendar } from '../aggregates/Calendar';
import { Holiday } from '../aggregates/Holiday';

export class CalendarInheritanceResolver {
  
  /**
   * Resolves the flattened holidays for a given target calendar by traversing up the parent chain.
   * Lower level calendars override higher level calendars if there's a conflict on the same date.
   */
  public resolveHolidays(
    targetCalendar: Calendar,
    ancestors: Calendar[],
    allHolidays: Holiday[]
  ): Holiday[] {
    const flattened = new Map<string, Holiday>();

    // Sort ancestors top-down (e.g. GLOBAL -> COUNTRY -> STATE -> ORG -> TEAM)
    // Assuming ancestors array is pre-sorted or we sort it based on level
    // For simplicity in pure domain, we assume the input is sorted from highest to lowest

    const chain = [...ancestors, targetCalendar];
    
    for (const cal of chain) {
      const calHolidays = allHolidays.filter(h => h.calendarId === cal.calendarId && h.getStatus() === 'ACTIVE');
      for (const h of calHolidays) {
        const dateKey = h.baseDate.toISOString().split('T')[0];
        // Lower level overrides higher level
        flattened.set(dateKey, h);
      }
    }

    return Array.from(flattened.values());
  }
}
