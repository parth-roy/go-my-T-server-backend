const fs = require('fs');

// Fix WorkerPerformanceCycle tests
let pCycleTest = fs.readFileSync('server/src/modules/time-tracking/domain/aggregates/performance/__tests__/WorkerPerformanceCycle.spec.ts', 'utf8');
pCycleTest = pCycleTest.replace(/new WorkerPerformanceCycle\(([^,]+),\s*([^,]+),\s*([^)]+)\)/g, "new WorkerPerformanceCycle($1, $2, $3, 'DRAFT', 1, null)");
fs.writeFileSync('server/src/modules/time-tracking/domain/aggregates/performance/__tests__/WorkerPerformanceCycle.spec.ts', pCycleTest);

// Fix PerformanceApplicationService tests
let pAppTest = fs.readFileSync('server/src/modules/time-tracking/application/performance/__tests__/PerformanceApplicationService.spec.ts', 'utf8');
pAppTest = pAppTest.replace(/new WorkerPerformanceCycle\(([^,]+),\s*([^,]+),\s*([^)]+)\)/g, "new WorkerPerformanceCycle($1, $2, $3, 'DRAFT', 1, null)");
fs.writeFileSync('server/src/modules/time-tracking/application/performance/__tests__/PerformanceApplicationService.spec.ts', pAppTest);

// Fix PerformanceApplicationService.ts
let pApp = fs.readFileSync('server/src/modules/time-tracking/application/performance/services/PerformanceApplicationService.ts', 'utf8');
pApp = pApp.replace(/new WorkerPerformanceCycle\(id, dto\.workerId, dto\.cycleId\)/, "new WorkerPerformanceCycle(id, dto.workerId, dto.cycleId, 'DRAFT', 1, null)");
fs.writeFileSync('server/src/modules/time-tracking/application/performance/services/PerformanceApplicationService.ts', pApp);

// Fix TestPrismaWorkerComplianceRepository.ts
let pTestRepo = fs.readFileSync('server/src/modules/time-tracking/infrastructure/__tests__/adapters/TestPrismaWorkerComplianceRepository.ts', 'utf8');
pTestRepo = pTestRepo.replace(/new WorkerCompliance\(([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/g, 'new WorkerCompliance($1, $1, $2, $3, $4, $5, $6, $7)');
fs.writeFileSync('server/src/modules/time-tracking/infrastructure/__tests__/adapters/TestPrismaWorkerComplianceRepository.ts', pTestRepo);

// Fix PrismaPerformanceRepositories.spec.ts
let pRepoSpec = fs.readFileSync('server/src/modules/time-tracking/infrastructure/__tests__/performance/PrismaPerformanceRepositories.spec.ts', 'utf8');
pRepoSpec = pRepoSpec.replace(/workerId: 'worker-1',\s*cycleId: 'cycle-1'\s*}/g, "workerId: 'worker-1', membershipId: 'mem-1', cycleId: 'cycle-1' }");
fs.writeFileSync('server/src/modules/time-tracking/infrastructure/__tests__/performance/PrismaPerformanceRepositories.spec.ts', pRepoSpec);

// Fix PrismaPerformanceRepositories.ts
let pRepo = fs.readFileSync('server/src/modules/time-tracking/infrastructure/repositories/performance/PrismaPerformanceRepositories.ts', 'utf8');
pRepo = pRepo.replace(/timestamp:\s*event\.occurredAt/g, 'timestamp: event.occurredAt.toISOString()');
pRepo = pRepo.replace(/timestamp:\s*new Date\(\)/g, 'timestamp: new Date().toISOString()');
fs.writeFileSync('server/src/modules/time-tracking/infrastructure/repositories/performance/PrismaPerformanceRepositories.ts', pRepo);

// Fix PerformanceScoringPolicy.aggregate.ts
let pPol = fs.readFileSync('server/src/modules/time-tracking/domain/aggregates/performance/PerformanceScoringPolicy.aggregate.ts', 'utf8');
pPol = pPol.replace(/this\.domainEvents\.push\(new PerformanceScoringPolicyCreatedEvent\([\s\S]*?\)\);/, 
  "this.domainEvents.push(new PerformanceScoringPolicyCreatedEvent(crypto.randomUUID(), this.policyId, 1, new Date().toISOString(), { version: this.version }, {}));");
fs.writeFileSync('server/src/modules/time-tracking/domain/aggregates/performance/PerformanceScoringPolicy.aggregate.ts', pPol);

// WorkerCompliance.aggregate.ts had an error: WorkerCompliance.aggregate.ts(70,69): Argument of type 'string' is not assignable to parameter of type 'CycleStatus | undefined'
// Wait, WorkerPerformanceCycle.aggregate.ts(70) error: WorkerPerformanceCycle.aggregate.ts(70,69): Argument of type 'string' is not assignable to parameter of type 'CycleStatus | undefined'.
// Let's check WorkerPerformanceCycle.aggregate.ts around line 70
