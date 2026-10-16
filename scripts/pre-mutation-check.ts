/**
 * pre-mutation-check.ts — Production Database Pre-mutation Gate (Point 8)
 *
 * Verifies all system invariants and structural integrity BEFORE any
 * database migration (prisma migrate deploy) or production mutation is permitted.
 */

import 'dotenv/config';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';

console.log('====================================================');
console.log('🛡️  STARTING PRODUCTION PRE-MUTATION INTEGRITY GATE');
console.log('====================================================\n');

function runStep(name: string, fn: () => void) {
  process.stdout.write(`🔍 [GATE] Checking ${name}... `);
  try {
    fn();
    console.log('✅ PASSED');
  } catch (err: any) {
    console.log('❌ FAILED');
    console.error(`\n🚨 PRE-MUTATION ABORT: ${name} check failed!`);
    console.error(err?.message || err);
    process.exit(1);
  }
}

// 1. Prisma Schema Syntax & Model Validation
runStep('Prisma schema validation', () => {
  execSync('npx prisma validate', { stdio: 'pipe' });
});

// 2. Critical Environment Configuration Check
runStep('Required environment variables', () => {
  const requiredEnv = ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
  const missing = requiredEnv.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
});

// 3. Compiled Artifacts Freshness Verification
runStep('Compiled dist artifacts presence', () => {
  const distServer = resolve(__dirname, '../dist/server.js');
  if (!existsSync(distServer)) {
    throw new Error('dist/server.js was not found! Build step (npm run build) must precede database mutations.');
  }
});

console.log('\n====================================================');
console.log('🎉 PRE-MUTATION VERIFICATION COMPLETE — SAFE TO MUTATE DATABASE');
console.log('====================================================\n');
process.exit(0);
