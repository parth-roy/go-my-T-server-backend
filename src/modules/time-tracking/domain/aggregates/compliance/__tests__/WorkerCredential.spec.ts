import { describe, it, expect } from 'vitest';
import { WorkerCredential } from '../entities/WorkerCredential.entity';
import { CredentialState } from '../state-machines/CredentialStateMachine';
import { CredentialData } from '../value-objects/CredentialData.vo';
import { ExpiryDate } from '../value-objects/ExpiryDate.vo';
import { RestrictionSet } from '../value-objects/RestrictionSet.vo';
import { VerificationAudit } from '../entities/VerificationAudit.entity';

describe('WorkerCredential', () => {
  const createCredential = (state = CredentialState.VERIFYING, expiry: Date | null = null) => {
    return new WorkerCredential(
      'c-1',
      'w-1',
      'MEDICAL',
      state,
      expiry ? ExpiryDate.create(expiry, true) : null,
      CredentialData.fromEncrypted('bar'),
      RestrictionSet.create(['restriction-1']),
      new Date(),
      new Date()
    );
  };

  it('should return getters correctly', () => {
    const cred = createCredential();
    expect(cred.getState()).toBe(CredentialState.VERIFYING);
    expect(cred.getExpiryDate()).toBeNull();
    expect(cred.getCredentialData().encryptedPayload).toBe('bar');
    expect(cred.getRestrictionSet().restrictions).toContain('restriction-1');
    expect(cred.getAudits()).toEqual([]);
  });

  it('should verify and add audit', () => {
    const cred = createCredential();
    const audit = new VerificationAudit('a-1', 'c-1', 'sys', 99, {}, new Date());
    cred.verify(audit);
    expect(cred.getState()).toBe(CredentialState.ACTIVE);
    expect(cred.getAudits()).toContain(audit);
  });

  it('should expire', () => {
    const cred = createCredential(CredentialState.ACTIVE);
    cred.expire();
    expect(cred.getState()).toBe(CredentialState.EXPIRED);
  });

  it('should suspend', () => {
    const cred = createCredential(CredentialState.ACTIVE);
    cred.suspend('Suspended');
    expect(cred.getState()).toBe(CredentialState.SUSPENDED);
  });

  it('should revoke', () => {
    const cred = createCredential(CredentialState.ACTIVE);
    cred.revoke('Revoked');
    expect(cred.getState()).toBe(CredentialState.REVOKED);
  });

  it('should update restrictions', () => {
    const cred = createCredential();
    const newRestrictions = RestrictionSet.create(['new-res']);
    cred.updateRestrictions(newRestrictions);
    expect(cred.getRestrictionSet()).toBe(newRestrictions);
  });

  it('should return isExpired true if expiry date is passed', () => {
    const past = new Date(Date.now() - 10000);
    const cred = createCredential(CredentialState.ACTIVE, past);
    expect(cred.isExpired()).toBe(true);
  });

  it('should return isExpired false if no expiry date', () => {
    const cred = createCredential();
    expect(cred.isExpired()).toBe(false);
  });
});
