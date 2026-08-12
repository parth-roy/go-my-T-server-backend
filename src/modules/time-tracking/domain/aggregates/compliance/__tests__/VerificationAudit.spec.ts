import { describe, it, expect } from 'vitest';
import { VerificationAudit } from '../entities/VerificationAudit.entity';

describe('VerificationAudit Entity', () => {
  it('should create an audit trail entry', () => {
    const date = new Date();
    const audit = new VerificationAudit('a-1', 'c-1', 'SYS', 95, { notes: 'verified' }, date);
    
    expect(audit.id).toBe('a-1');
    expect(audit.workerCredentialId).toBe('c-1');
    expect(audit.verificationSource).toBe('SYS');
    expect(audit.verifiedAt).toBe(date);
    expect(audit.confidenceScore).toBe(95);
    expect(audit.auditDetails).toEqual({ notes: 'verified' });
  });
});
