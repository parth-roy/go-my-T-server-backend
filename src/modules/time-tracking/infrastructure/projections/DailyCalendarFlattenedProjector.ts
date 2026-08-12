import { HolidayDefinedEvent, HolidayRevokedEvent, CalendarProjectionRebuiltEvent } from '../../domain/events/CalendarEvents';

export class DailyCalendarFlattenedProjector {
  
  public async onHolidayDefined(event: HolidayDefinedEvent): Promise<void> {
    // 1. Calculate impacted scopes (down the hierarchy).
    // 2. Upsert DailyCalendarFlattenedView records for each impacted calendar scope.
    // 3. Emit CalendarProjectionRebuiltEvent so downstream engines know.
    console.log(`[Projector] Flattening hierarchy for new holiday: ${event.payload.name}`);
  }

  public async onHolidayRevoked(event: HolidayRevokedEvent): Promise<void> {
    // 1. Remove from DailyCalendarFlattenedView.
    // 2. Emit CalendarProjectionRebuiltEvent.
    console.log(`[Projector] Removing holiday and rebuilding projection.`);
  }
}
