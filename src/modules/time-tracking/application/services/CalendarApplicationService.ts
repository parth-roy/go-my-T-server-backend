import { CreateCalendarCommand, DefineHolidayCommand, RevokeHolidayCommand, ConfigureWorkWeekCommand } from '../commands/CalendarCommands';
import { Calendar } from '../../domain/aggregates/Calendar';
import { CalendarScope } from '../../domain/value-objects/CalendarScope';
import { Holiday } from '../../domain/aggregates/Holiday';
import { WorkWeekConfig } from '../../domain/aggregates/WorkWeekConfig';

export class CalendarApplicationService {
  
  public async createCalendar(command: CreateCalendarCommand): Promise<string> {
    const scope = new CalendarScope(command.type, command.referenceId);
    const calendar = new Calendar(
      crypto.randomUUID(),
      scope,
      command.name,
      command.timezone,
      command.parentId
    );
    // await this.calendarRepo.save(calendar);
    return calendar.calendarId;
  }

  public async defineHoliday(command: DefineHolidayCommand): Promise<string> {
    const holiday = new Holiday(
      crypto.randomUUID(),
      command.calendarId,
      command.name,
      command.type,
      command.baseDate,
      command.rule
    );
    // await this.holidayRepo.save(holiday);
    return holiday.holidayId;
  }

  public async revokeHoliday(command: RevokeHolidayCommand): Promise<void> {
    // const holiday = await this.holidayRepo.getById(command.holidayId);
    // holiday.revoke();
    // await this.holidayRepo.save(holiday);
  }

  public async configureWorkWeek(command: ConfigureWorkWeekCommand): Promise<void> {
    const config = new WorkWeekConfig(crypto.randomUUID(), command.calendarId, command.pattern);
    // await this.workWeekRepo.save(config);
  }
}
