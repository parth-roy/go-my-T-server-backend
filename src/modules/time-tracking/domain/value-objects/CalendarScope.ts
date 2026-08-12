export enum CalendarScopeType {
  GLOBAL = 'GLOBAL',
  COUNTRY = 'COUNTRY',
  STATE = 'STATE',
  CITY = 'CITY',
  ORGANIZATION = 'ORGANIZATION',
  BRANCH = 'BRANCH',
  DEPARTMENT = 'DEPARTMENT',
  TEAM = 'TEAM'
}

export class CalendarScope {
  constructor(
    public readonly type: CalendarScopeType,
    public readonly referenceId?: string
  ) {}
}
