import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { CredentialStateMachine, CredentialState } from '../state-machines/CredentialStateMachine';
import { DomainException } from '../../../exceptions/DomainException';

describe('CredentialStateMachine', () => {
  it('should not allow transition from DRAFT to EXPIRED', () => {
    expect(() => CredentialStateMachine.transition(CredentialState.DRAFT, CredentialState.EXPIRED)).toThrow();
  });

  it('should throw DomainException for invalid transitions', () => {
    expect(() => CredentialStateMachine.transition(CredentialState.ARCHIVED, CredentialState.ACTIVE)).toThrow();
  });

  it('should allow valid transitions', () => {
    expect(() => CredentialStateMachine.transition(CredentialState.DRAFT, CredentialState.VERIFYING)).not.toThrow();
    expect(() => CredentialStateMachine.transition(CredentialState.VERIFYING, CredentialState.ACTIVE)).not.toThrow();
    expect(() => CredentialStateMachine.transition(CredentialState.ACTIVE, CredentialState.EXPIRED)).not.toThrow();
  });

  it('should throw DomainException on invalid transitions', () => {
    expect(() => CredentialStateMachine.transition(CredentialState.DRAFT, CredentialState.ACTIVE))
      .toThrowError(DomainException);
    expect(() => CredentialStateMachine.transition(CredentialState.EXPIRED, CredentialState.VERIFYING))
      .toThrowError(DomainException);
    expect(() => CredentialStateMachine.transition(CredentialState.REVOKED, CredentialState.ACTIVE))
      .toThrowError(DomainException);
  });

  describe('Property Tests', () => {
    it('should only allow transitions defined in transitions map', () => {
      const allowedMap: Record<string, string[]> = {
        [CredentialState.DRAFT]: [CredentialState.VERIFYING, CredentialState.ARCHIVED],
        [CredentialState.VERIFYING]: [CredentialState.ACTIVE, CredentialState.DRAFT, CredentialState.ARCHIVED],
        [CredentialState.ACTIVE]: [CredentialState.EXPIRING, CredentialState.EXPIRED, CredentialState.SUSPENDED, CredentialState.REVOKED],
        [CredentialState.EXPIRING]: [CredentialState.EXPIRED, CredentialState.SUSPENDED, CredentialState.REVOKED, CredentialState.ACTIVE],
        [CredentialState.EXPIRED]: [CredentialState.ARCHIVED, CredentialState.ACTIVE],
        [CredentialState.SUSPENDED]: [CredentialState.ACTIVE, CredentialState.REVOKED],
        [CredentialState.REVOKED]: [CredentialState.ARCHIVED],
        [CredentialState.ARCHIVED]: []
      };

      fc.assert(
        fc.property(
          fc.constantFrom(CredentialState.DRAFT, CredentialState.VERIFYING, CredentialState.ACTIVE, CredentialState.EXPIRED, CredentialState.REVOKED),
          fc.constantFrom(CredentialState.DRAFT, CredentialState.VERIFYING, CredentialState.ACTIVE, CredentialState.EXPIRED, CredentialState.REVOKED),
          (fromState, toState) => {
            const isAllowed = allowedMap[fromState].includes(toState);
            
            if (isAllowed) {
              expect(() => CredentialStateMachine.transition(fromState, toState)).not.toThrow();
            } else {
              expect(() => CredentialStateMachine.transition(fromState, toState)).toThrowError(DomainException);
            }
          }
        )
      );
    });
  });
});

