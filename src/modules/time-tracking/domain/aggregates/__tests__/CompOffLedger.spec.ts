import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import { CompOffLedger } from '../CompOffLedger';
import { DomainException } from '../../exceptions/DomainException';

describe('CompOffLedger', () => {
  it('should initialize empty', () => {
    const ledger = new CompOffLedger('C1', 'W1');
    assert.strictEqual(ledger.getBalance(), 0);
  });

  it('should credit and increase balance', () => {
    const ledger = new CompOffLedger('C1', 'W1');
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 90);
    
    ledger.credit('CR1', 8, futureDate);
    assert.strictEqual(ledger.getBalance(), 8);
  });

  it('should deduct from oldest credits first', () => {
    const ledger = new CompOffLedger('C1', 'W1');
    
    const nearExpiry = new Date();
    nearExpiry.setDate(nearExpiry.getDate() + 10);
    
    const farExpiry = new Date();
    farExpiry.setDate(farExpiry.getDate() + 90);

    ledger.credit('CR1', 8, farExpiry);
    ledger.credit('CR2', 8, nearExpiry);

    ledger.deduct(10);
    
    assert.strictEqual(ledger.getBalance(), 6);
  });

  it('should throw if insufficient balance', () => {
    const ledger = new CompOffLedger('C1', 'W1');
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 90);
    
    ledger.credit('CR1', 8, futureDate);
    assert.throws(() => ledger.deduct(10), DomainException);
  });

  it('should expire old credits', () => {
    const ledger = new CompOffLedger('C1', 'W1');
    
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 10);
    
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 90);

    ledger.credit('CR1', 8, pastDate);
    ledger.credit('CR2', 8, futureDate);

    ledger.expire(new Date());
    assert.strictEqual(ledger.getBalance(), 8); // Only the future one remains
  });
});
