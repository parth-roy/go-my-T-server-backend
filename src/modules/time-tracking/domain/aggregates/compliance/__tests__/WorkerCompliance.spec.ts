import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { WorkerCompliance, WorkerComplianceStatus } from '../WorkerCompliance.aggregate';
import { WorkerCredential } from '../entities/WorkerCredential.entity';
import { CredentialState } from '../state-machines/CredentialStateMachine';
import { CredentialData } from '../value-objects/CredentialData.vo';
import { RestrictionSet } from '../value-objects/RestrictionSet.vo';
import { ExpiryDate } from '../value-objects/ExpiryDate.vo';
import { PolicySnapshot } from '../value-objects/PolicySnapshot.vo';
import { DomainException } from '../../../exceptions/DomainException';

describe('WorkerCompliance Aggregate', () => {
  const createBaseCompliance = () => {
    return new WorkerCompliance(
      'worker-1',
      'worker-1',
      'org-1',
      WorkerComplianceStatus.PENDING_VERIFICATION,
      PolicySnapshot.create({ initial: true }),
      1,
      new Date(),
      new Date()
    );
  };

  const createCredential = (type: string, state: CredentialState) => {
    return new WorkerCredential(
      'cred-1',
      'worker-1',
      type,
      state,
      ExpiryDate.create(new Date(Date.now() + 100000)),
      CredentialData.fromEncrypted('data'),
      RestrictionSet.create([]),
      new Date(),
      new Date()
    );
  };

  it('should initialize with correct status and version', () => {
    const compliance = createBaseCompliance();
    expect(compliance.getStatus()).toBe(WorkerComplianceStatus.PENDING_VERIFICATION);
    expect(compliance.getAggregateVersion()).toBe(1);
    expect(compliance.getPolicySnapshot().snapshotData.initial).toBe(true);
    expect(compliance.getExemptions()).toEqual([]);
  });

  it('should prevent duplicate active credentials of the same type', () => {
    const compliance = createBaseCompliance();
    const cred1 = createCredential('DRIVERS_LICENSE', CredentialState.ACTIVE);
    const cred2 = createCredential('DRIVERS_LICENSE', CredentialState.ACTIVE);

    compliance.addCredential(cred1);

    expect(() => compliance.addCredential(cred2)).toThrowError(DomainException);
    expect(() => compliance.addCredential(cred2)).toThrowError('An active credential of type DRIVERS_LICENSE already exists.');
  });

  it('should allow adding credential if existing is revoked', () => {
    const compliance = createBaseCompliance();
    const cred1 = createCredential('DRIVERS_LICENSE', CredentialState.REVOKED);
    const cred2 = createCredential('DRIVERS_LICENSE', CredentialState.ACTIVE);

    compliance.addCredential(cred1);
    expect(() => compliance.addCredential(cred2)).not.toThrow();
  });

  it('should evaluate to NON_COMPLIANT if a credential expires without exemption', () => {
    const compliance = createBaseCompliance();
    const expiredCred = createCredential('DRIVERS_LICENSE', CredentialState.EXPIRED);
    
    compliance.addCredential(expiredCred);

    expect(compliance.getStatus()).toBe(WorkerComplianceStatus.NON_COMPLIANT);
  });

  it('should record domain events correctly', () => {
    const compliance = createBaseCompliance();
    const cred = createCredential('DRIVERS_LICENSE', CredentialState.DRAFT);
    
    compliance.addCredential(cred);

    const events = compliance.getDomainEvents();
    expect(events.length).toBeGreaterThan(0);
    expect(events.some(e => e.constructor.name === 'WorkerCredentialAddedEvent')).toBe(true);

    compliance.clearDomainEvents();
    expect(compliance.getDomainEvents().length).toBe(0);
  });

  it('should increment version', () => {
    const compliance = createBaseCompliance();
    compliance.incrementVersion();
    expect(compliance.getAggregateVersion()).toBe(2);
  });

  it('should throw error when revoking non-existent credential', () => {
    const compliance = createBaseCompliance();
    expect(() => compliance.revokeCredential('does-not-exist', 'reason')).toThrowError(DomainException);
    expect(() => compliance.revokeCredential('does-not-exist', 'reason')).toThrowError('Credential does-not-exist not found.');
  });

  it('should revoke credential and emit event', () => {
    const compliance = createBaseCompliance();
    const cred = createCredential('DRIVERS_LICENSE', CredentialState.ACTIVE);
    compliance.addCredential(cred);
    
    compliance.revokeCredential(cred.id, 'Lost');
    
    expect(cred.getState()).toBe(CredentialState.REVOKED);
    const events = compliance.getDomainEvents();
    expect(events.some(e => e.constructor.name === 'WorkerCredentialRevokedEvent')).toBe(true);
  });

  it('should add exemption and evaluate status', () => {
    const compliance = createBaseCompliance();
    const mockExemption = {
      isExpired: () => false
    } as any;
    
    compliance.addExemption(mockExemption);
    expect(compliance.getExemptions()).toContain(mockExemption);
  });

  describe('Property Tests', () => {
    it('should always remain structurally sound regardless of random valid operations', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              type: fc.string({ minLength: 1, maxLength: 10 }),
              state: fc.constantFrom(CredentialState.DRAFT, CredentialState.ACTIVE, CredentialState.EXPIRED, CredentialState.REVOKED, CredentialState.VERIFYING)
            })
          ),
          (commands) => {
            const compliance = createBaseCompliance();
            let addedTypes = new Set<string>();

            for (const cmd of commands) {
              const isDuplicateActive = addedTypes.has(cmd.type);
              const cred = createCredential(cmd.type, cmd.state);
              
              if (isDuplicateActive) {
                expect(() => compliance.addCredential(cred)).toThrowError(DomainException);
              } else {
                expect(() => compliance.addCredential(cred)).not.toThrow();
                if (cmd.state === CredentialState.ACTIVE) {
                  addedTypes.add(cmd.type);
                }
              }
            }

            // Invariants check
            const events = compliance.getDomainEvents();
            expect(Array.isArray(events)).toBe(true);
            
            // Status bounds check
            const status = compliance.getStatus();
            expect([WorkerComplianceStatus.COMPLIANT, WorkerComplianceStatus.NON_COMPLIANT, WorkerComplianceStatus.PENDING_VERIFICATION]).toContain(status);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
