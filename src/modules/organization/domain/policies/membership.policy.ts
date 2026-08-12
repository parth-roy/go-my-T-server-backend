import { AppError } from '@shared/errors/AppError';
import { Capability } from '../value-objects/capability.vo';

export class MembershipPolicy {
  static assertCapability(capabilities: Capability[], requiredCapability: string): void {
    if (!capabilities.some(c => c.value === requiredCapability)) {
      throw AppError.forbidden(`You do not have permission to ${requiredCapability.toLowerCase().replace(/_/g, ' ')}`);
    }
  }

  static assertNotSelf(targetUserId: string, actorUserId: string, action: string): void {
    if (targetUserId === actorUserId) {
      throw AppError.forbidden(`You cannot ${action} yourself`);
    }
  }
}
