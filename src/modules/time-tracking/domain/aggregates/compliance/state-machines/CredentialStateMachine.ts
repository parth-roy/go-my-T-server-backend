import { DomainException } from '../../../exceptions/DomainException';

export enum CredentialState {
  DRAFT = 'DRAFT',
  VERIFYING = 'VERIFYING',
  ACTIVE = 'ACTIVE',
  EXPIRING = 'EXPIRING',
  EXPIRED = 'EXPIRED',
  SUSPENDED = 'SUSPENDED',
  REVOKED = 'REVOKED',
  ARCHIVED = 'ARCHIVED'
}

export class CredentialStateMachine {
  public static transition(currentState: CredentialState, targetState: CredentialState): void {
    const validTransitions: Record<CredentialState, CredentialState[]> = {
      [CredentialState.DRAFT]: [CredentialState.VERIFYING, CredentialState.ARCHIVED],
      [CredentialState.VERIFYING]: [CredentialState.ACTIVE, CredentialState.DRAFT, CredentialState.ARCHIVED],
      [CredentialState.ACTIVE]: [CredentialState.EXPIRING, CredentialState.EXPIRED, CredentialState.SUSPENDED, CredentialState.REVOKED],
      [CredentialState.EXPIRING]: [CredentialState.EXPIRED, CredentialState.SUSPENDED, CredentialState.REVOKED, CredentialState.ACTIVE], // Renewed
      [CredentialState.EXPIRED]: [CredentialState.ARCHIVED, CredentialState.ACTIVE], // Reactivated
      [CredentialState.SUSPENDED]: [CredentialState.ACTIVE, CredentialState.REVOKED],
      [CredentialState.REVOKED]: [CredentialState.ARCHIVED],
      [CredentialState.ARCHIVED]: []
    };

    const allowed = validTransitions[currentState] || [];
    if (!allowed.includes(targetState)) {
      throw new DomainException('INVALID_CREDENTIAL_TRANSITION', `Cannot transition credential from ${currentState} to ${targetState}.`);
    }
  }
}
