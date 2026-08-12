const fs = require('fs');

// Fix auth integration test mock objects
let pAuth = fs.readFileSync('server/src/modules/time-tracking/infrastructure/__tests__/auth/RealPerformanceAuthorizationService.integration.spec.ts', 'utf8');
pAuth = pAuth.replace(/role: 'USER'/g, "role: 'CUSTOMER'");
pAuth = pAuth.replace(/name: 'Org A' }/g, "name: 'Org A', slug: 'org-a' }");
pAuth = pAuth.replace(/name: 'Org B' }/g, "name: 'Org B', slug: 'org-b' }");
pAuth = pAuth.replace(/name: 'Org' }/g, "name: 'Org', slug: 'org' }");
pAuth = pAuth.replace(/rootRole:/g, 'role:');
pAuth = pAuth.replace(/user\.rootRole/g, 'user.role');
fs.writeFileSync('server/src/modules/time-tracking/infrastructure/__tests__/auth/RealPerformanceAuthorizationService.integration.spec.ts', pAuth);

// Fix PrismaPerformanceRepositories.spec.ts mock arguments
let pRepoSpec = fs.readFileSync('server/src/modules/time-tracking/infrastructure/__tests__/performance/PrismaPerformanceRepositories.spec.ts', 'utf8');
pRepoSpec = pRepoSpec.replace(/{ workerId: 'worker-1',\s*cycleId: 'cycle-1'\s*}/g, "{ workerId: 'worker-1', membershipId: 'mem-1', cycleId: 'cycle-1' }");
fs.writeFileSync('server/src/modules/time-tracking/infrastructure/__tests__/performance/PrismaPerformanceRepositories.spec.ts', pRepoSpec);

// Fix WorkerPerformanceCycle.spec.ts remaining errors
let pCycleSpec = fs.readFileSync('server/src/modules/time-tracking/domain/aggregates/performance/__tests__/WorkerPerformanceCycle.spec.ts', 'utf8');
pCycleSpec = pCycleSpec.replace(/new WorkerPerformanceCycle\(([^,]+),\s*([^,]+),\s*([^,]+)\)/g, "new WorkerPerformanceCycle($1, $2, $3, 'DRAFT', 1, null)");
fs.writeFileSync('server/src/modules/time-tracking/domain/aggregates/performance/__tests__/WorkerPerformanceCycle.spec.ts', pCycleSpec);

console.log('Fixed remaining tests mock objects');
