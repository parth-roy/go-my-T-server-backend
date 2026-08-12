import { describe, it, expect } from 'vitest';
import { ComplianceExemption } from '../entities/ComplianceExemption.entity';

describe('ComplianceExemption Entity', () => {
  it('should create an exemption with valid fields', () => {
    const from = new Date(Date.now() - 1000);
    const to = new Date(Date.now() + 86400000);
    const exemption = new ComplianceExemption('ex-1', 'w-1', 'MEDICAL', 'NOTE', 'SYS', to, from);
    
    expect(exemption.id).toBe('ex-1');
    expect(exemption.workerComplianceId).toBe('w-1');
    expect(exemption.type).toBe('MEDICAL');
    expect(exemption.isExpired()).toBe(false);
  });

  it('should correctly evaluate validity based on dates', () => {
    const from = new Date(Date.now() - 86400000);
    const to = new Date(Date.now() - 1000); // Past
    const exemption = new ComplianceExemption('ex-2', 'w-1', 'MEDICAL', 'NOTE', 'SYS', to, from);
    
    expect(exemption.isExpired()).toBe(true);
  });
});
