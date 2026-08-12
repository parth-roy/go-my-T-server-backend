import { IDesignationRepository } from '../repositories/designation.repository.interface';
import { AppError } from '@shared/errors/AppError';

export class DesignationCodeGeneratorDomainService {
  constructor(private readonly designationRepo: IDesignationRepository) {}

  async generateCode(organizationId: string, preferredCode?: string): Promise<string> {
    if (preferredCode) {
      const code = preferredCode.toUpperCase().replace(/[^A-Z0-9-]/g, '');
      const existing = await this.designationRepo.findByCode(organizationId, code);
      if (existing) {
        throw AppError.badRequest(`Designation code ${code} is already in use`);
      }
      return code;
    }

    // Auto-generate logic
    const prefix = 'DESIG';
    let code = '';
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 5) {
      const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
      code = `${prefix}-${randomPart}`;
      
      const existing = await this.designationRepo.findByCode(organizationId, code);
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      throw AppError.internal('Failed to generate unique designation code');
    }

    return code;
  }
}
