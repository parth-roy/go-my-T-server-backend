import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import { Timesheet, TimesheetState } from '../Timesheet';
import { Snapshot } from '../../value-objects/Snapshot';
import { AggregationBlocks } from '../../value-objects/AggregationBlocks';
import { CalculationAuditTrail } from '../../value-objects/CalculationAuditTrail';
import { DomainException } from '../../exceptions/DomainException';

describe('Timesheet Aggregate', () => {
  const mockSnapshot = new Snapshot('v1', 'v1', 'v1', 'v1', 'v1');
  const mockBlocks = new AggregationBlocks(480, 0, 0, 0, 0, 0, 0, 0, 0);
  const mockAuditTrail = new CalculationAuditTrail({}, {}, {}, [], {});

  it('should initialize in DRAFT state', () => {
    const timesheet = new Timesheet('ts-1', 'w-1', 'pp-1', 'v1', mockSnapshot, mockBlocks, mockAuditTrail);
    assert.strictEqual(timesheet.getState(), TimesheetState.DRAFT);
  });

  it('should transition to CALCULATED on recalculate', () => {
    const timesheet = new Timesheet('ts-1', 'w-1', 'pp-1', 'v1', mockSnapshot, mockBlocks, mockAuditTrail);
    timesheet.recalculate('v2', mockSnapshot, mockBlocks, mockAuditTrail);
    assert.strictEqual(timesheet.getState(), TimesheetState.CALCULATED);
    assert.strictEqual(timesheet.getCalculationVersion(), 'v2');
  });

  it('should allow approval after calculation', () => {
    const timesheet = new Timesheet('ts-1', 'w-1', 'pp-1', 'v1', mockSnapshot, mockBlocks, mockAuditTrail);
    timesheet.recalculate('v2', mockSnapshot, mockBlocks, mockAuditTrail);
    timesheet.approve();
    assert.strictEqual(timesheet.getState(), TimesheetState.APPROVED);
  });

  it('should throw if locking before approval', () => {
    const timesheet = new Timesheet('ts-1', 'w-1', 'pp-1', 'v1', mockSnapshot, mockBlocks, mockAuditTrail);
    assert.throws(() => timesheet.lockForPayroll(), DomainException);
  });

  it('should allow locking after approval', () => {
    const timesheet = new Timesheet('ts-1', 'w-1', 'pp-1', 'v1', mockSnapshot, mockBlocks, mockAuditTrail);
    timesheet.recalculate('v2', mockSnapshot, mockBlocks, mockAuditTrail);
    timesheet.approve();
    timesheet.lockForPayroll();
    assert.strictEqual(timesheet.getState(), TimesheetState.PAYROLL_LOCKED);
  });

  it('should enforce strict financial boundary by not containing money fields', () => {
    const blocks = mockBlocks as any;
    assert.strictEqual(blocks.salary, undefined);
    assert.strictEqual(blocks.hourlyRate, undefined);
  });

  it('should allow amendments only if locked or exported', () => {
    const timesheet = new Timesheet('ts-1', 'w-1', 'pp-1', 'v1', mockSnapshot, mockBlocks, mockAuditTrail);
    assert.throws(() => timesheet.amend('v3', mockSnapshot, mockBlocks, mockAuditTrail), DomainException);

    timesheet.recalculate('v2', mockSnapshot, mockBlocks, mockAuditTrail);
    timesheet.approve();
    timesheet.lockForPayroll();
    
    // Now amend should succeed
    timesheet.amend('v3', mockSnapshot, mockBlocks, mockAuditTrail);
    assert.strictEqual(timesheet.getState(), TimesheetState.AMENDED);
  });
});
