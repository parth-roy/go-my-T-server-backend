import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import { LeaveBalanceLedger } from '../LeaveBalanceLedger';
import { DomainException } from '../../exceptions/DomainException';

describe('LeaveBalanceLedger', () => {
  it('should initialize with given balance', () => {
    const ledger = new LeaveBalanceLedger('L1', 'W1', 'LT1', 10);
    assert.strictEqual(ledger.getBalance(), 10);
    assert.strictEqual(ledger.getVersion(), 1);
  });

  it('should accrue properly', () => {
    const ledger = new LeaveBalanceLedger('L1', 'W1', 'LT1', 10);
    ledger.accrue(5);
    assert.strictEqual(ledger.getBalance(), 15);
    assert.strictEqual(ledger.getVersion(), 2);
  });

  it('should deduct properly if balance sufficient', () => {
    const ledger = new LeaveBalanceLedger('L1', 'W1', 'LT1', 10);
    ledger.deduct(5);
    assert.strictEqual(ledger.getBalance(), 5);
    assert.strictEqual(ledger.getVersion(), 2);
  });

  it('should throw on insufficient balance deduction', () => {
    const ledger = new LeaveBalanceLedger('L1', 'W1', 'LT1', 10);
    assert.throws(() => ledger.deduct(15), DomainException);
  });

  it('should refund properly', () => {
    const ledger = new LeaveBalanceLedger('L1', 'W1', 'LT1', 10);
    ledger.refund(2);
    assert.strictEqual(ledger.getBalance(), 12);
  });

  it('should expire properly and not go below zero', () => {
    const ledger = new LeaveBalanceLedger('L1', 'W1', 'LT1', 10);
    ledger.expire(5);
    assert.strictEqual(ledger.getBalance(), 5);
    
    ledger.expire(10); // More than balance
    assert.strictEqual(ledger.getBalance(), 0);
  });
});
