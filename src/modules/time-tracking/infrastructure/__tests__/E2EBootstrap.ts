/**
 * Bootstraps the DI container strictly for E2E tests by dynamically loading 
 * test adapters for external dependencies.
 */
import { WorkerComplianceApplicationService } from '../../application/compliance/services/WorkerComplianceApplicationService';
import { PrismaClient } from '@prisma/client';
import { ComplianceEvaluationService } from '../../domain/aggregates/compliance/services/ComplianceEvaluationService';
import { RegulatoryRuleEngine } from '../../domain/aggregates/compliance/services/RegulatoryRuleEngine';
import { TestPrismaWorkerComplianceRepository } from './adapters/TestPrismaWorkerComplianceRepository';
import { TestPrismaEventOutboxService } from './adapters/TestPrismaEventOutboxService';
import { TestAuthorizationService } from './adapters/TestAuthorizationService';

export class E2EBootstrap {
  public static async initialize(prisma: PrismaClient) {
    const repository = new TestPrismaWorkerComplianceRepository(prisma);
    const outbox = new TestPrismaEventOutboxService(prisma);
    const authService = new TestAuthorizationService();
    const ruleEngine = new RegulatoryRuleEngine();
    const evaluationService = new ComplianceEvaluationService(ruleEngine);

    const applicationService = new WorkerComplianceApplicationService(
      repository,
      outbox,
      authService,
      evaluationService
    );

    return {
      repository,
      outbox,
      authService,
      applicationService
    };
  }
}
