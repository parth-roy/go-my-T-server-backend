import { EmploymentCategory } from '@prisma/client';
import { IEmploymentStrategy } from './IEmploymentStrategy';

export class EmploymentStrategyRegistry {
  private static strategies = new Map<EmploymentCategory | string, IEmploymentStrategy>();

  static register(category: EmploymentCategory | string, strategy: IEmploymentStrategy) {
    this.strategies.set(category, strategy);
  }

  static get(category: EmploymentCategory | string): IEmploymentStrategy {
    const strategy = this.strategies.get(category);
    if (!strategy) {
      throw new Error(`Employment strategy for category ${category} not found`);
    }
    return strategy;
  }
}
