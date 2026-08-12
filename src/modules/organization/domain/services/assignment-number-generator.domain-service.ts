export interface IAssignmentNumberGeneratorDomainService {
  generate(organizationId: string): Promise<string>;
}

// Basic implementation - in a real-world scenario, this might use Redis or a DB sequence table to guarantee gapless numbers
export class AssignmentNumberGeneratorDomainService implements IAssignmentNumberGeneratorDomainService {
  constructor(
    // private readonly sequenceRepository: ISequenceRepository or Redis
  ) {}

  async generate(organizationId: string): Promise<string> {
    // A temporary naive implementation for demonstration.
    // Replace with true atomic increments (e.g., RETURNING id from a sequence table)
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `EMP-HIST-${timestamp}${random}`;
  }
}
