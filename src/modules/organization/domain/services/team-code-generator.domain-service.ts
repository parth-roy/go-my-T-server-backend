import { AppError } from '@shared/errors/AppError';
import { ITeamRepository } from '../repositories/team.repository.interface';

export class TeamCodeGeneratorDomainService {
  constructor(private readonly teamRepo: ITeamRepository) {}

  async generate(
    organizationId: string, 
    branchId: string, 
    departmentId: string, 
    preferredCode?: string
  ): Promise<string> {
    if (preferredCode) {
      const exists = await this.teamRepo.existsByCode(organizationId, branchId, departmentId, preferredCode);
      if (exists) {
        throw AppError.conflict('TeamCodeAlreadyExistsError', `Team code ${preferredCode} is already taken in this department`);
      }
      return preferredCode;
    }

    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `TEAM-${randomSuffix}`;
  }
}
