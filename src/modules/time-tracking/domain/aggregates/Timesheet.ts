import { DomainException } from '../exceptions/DomainException';
import { Snapshot } from '../value-objects/Snapshot';
import { AggregationBlocks } from '../value-objects/AggregationBlocks';
import { CalculationAuditTrail } from '../value-objects/CalculationAuditTrail';

export enum TimesheetState {
  DRAFT = 'DRAFT',
  CALCULATED = 'CALCULATED',
  APPROVED = 'APPROVED',
  PAYROLL_LOCKED = 'PAYROLL_LOCKED',
  READY_FOR_EXPORT = 'READY_FOR_EXPORT',
  EXPORTED = 'EXPORTED',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  AMENDED = 'AMENDED'
}

export class Timesheet {
  private state: TimesheetState = TimesheetState.DRAFT;
  private revisionNumber: number = 1;
  private aggregateVersion: string = '1.0';

  constructor(
    public readonly timesheetId: string,
    public readonly workerId: string,
    public readonly payPeriodId: string,
    private calculationVersion: string,
    private snapshots: Snapshot,
    private blocks: AggregationBlocks,
    private auditTrail: CalculationAuditTrail
  ) {}

  public recalculate(
    newCalculationVersion: string,
    newSnapshots: Snapshot,
    newBlocks: AggregationBlocks,
    newAuditTrail: CalculationAuditTrail
  ): void {
    if (
      this.state === TimesheetState.PAYROLL_LOCKED ||
      this.state === TimesheetState.READY_FOR_EXPORT ||
      this.state === TimesheetState.EXPORTED ||
      this.state === TimesheetState.ACKNOWLEDGED
    ) {
      throw new DomainException('INVALID_STATE', 'Cannot recalculate a locked timesheet normally. Use an amendment.');
    }

    this.calculationVersion = newCalculationVersion;
    this.snapshots = newSnapshots;
    this.blocks = newBlocks;
    this.auditTrail = newAuditTrail;
    this.revisionNumber++;
    this.state = TimesheetState.CALCULATED;
  }

  public approve(): void {
    if (this.state !== TimesheetState.CALCULATED) {
      throw new DomainException('INVALID_STATE', 'Timesheet must be calculated before approval.');
    }
    this.state = TimesheetState.APPROVED;
  }

  public lockForPayroll(): void {
    if (this.state !== TimesheetState.APPROVED && this.state !== TimesheetState.AMENDED) {
      throw new DomainException('INVALID_STATE', 'Timesheet must be approved before locking.');
    }
    this.state = TimesheetState.PAYROLL_LOCKED;
  }

  public queueForExport(): void {
    if (this.state !== TimesheetState.PAYROLL_LOCKED) {
      throw new DomainException('INVALID_STATE', 'Timesheet must be payroll locked before export.');
    }
    this.state = TimesheetState.READY_FOR_EXPORT;
  }

  public markExported(): void {
    if (this.state !== TimesheetState.READY_FOR_EXPORT) {
      throw new DomainException('INVALID_STATE', 'Timesheet must be ready for export before exporting.');
    }
    this.state = TimesheetState.EXPORTED;
  }

  public amend(
    newCalculationVersion: string,
    newSnapshots: Snapshot,
    newBlocks: AggregationBlocks,
    newAuditTrail: CalculationAuditTrail
  ): void {
    if (
      this.state !== TimesheetState.PAYROLL_LOCKED &&
      this.state !== TimesheetState.EXPORTED &&
      this.state !== TimesheetState.ACKNOWLEDGED
    ) {
      throw new DomainException('INVALID_STATE', 'Amendments are only for locked or exported timesheets.');
    }

    this.calculationVersion = newCalculationVersion;
    this.snapshots = newSnapshots;
    this.blocks = newBlocks;
    this.auditTrail = newAuditTrail;
    this.revisionNumber++;
    this.state = TimesheetState.AMENDED;
  }

  public getState(): TimesheetState { return this.state; }
  public getBlocks(): AggregationBlocks { return this.blocks; }
  public getSnapshots(): Snapshot { return this.snapshots; }
  public getAuditTrail(): CalculationAuditTrail { return this.auditTrail; }
  public getCalculationVersion(): string { return this.calculationVersion; }
}
