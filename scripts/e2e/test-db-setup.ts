import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load the test environment specifically
const envPath = path.resolve(process.cwd(), '.env.test');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.warn('[WARNING] .env.test not found. Using .env.test.example.');
  dotenv.config({ path: path.resolve(process.cwd(), '.env.test.example') });
}

async function setupDatabase() {
  console.log('--- ENTERPRISE E2E TEST SETUP ---');
  const databaseUrl = process.env.DATABASE_URL_TEST;
  
  if (!databaseUrl) {
    console.error('🛑 [FATAL] DATABASE_URL_TEST is not defined. Refusing to run setup.');
    process.exit(1);
  }

  if (databaseUrl === process.env.DATABASE_URL) {
    console.error('🛑 [FATAL] DATABASE_URL_TEST matches production DATABASE_URL. Refusing to run destructive operations on potentially live database.');
    process.exit(1);
  }

  if (!databaseUrl.toLowerCase().includes('test')) {
    console.warn('⚠️ [WARNING] DATABASE_URL_TEST does not explicitly contain "test". Verify this is truly isolated before proceeding.');
  }

  // Swap to the test database for the current process
  process.env.DATABASE_URL = databaseUrl;
  
  if (process.env.DIRECT_URL_TEST) {
    process.env.DIRECT_URL = process.env.DIRECT_URL_TEST;
  } else {
    // If testing doesn't need a separate DIRECT_URL_TEST, overwrite DIRECT_URL anyway to prevent bleeding DO prod env
    process.env.DIRECT_URL = databaseUrl;
  }

  try {
    console.log('[INFO] Running database migrations on test database...');
    // Run prisma migrate deploy to ensure test DB schema is up-to-date
    execSync('npx prisma migrate deploy', { stdio: 'inherit', env: process.env });
    
    console.log('[INFO] Test database migrated successfully.');
  } catch (error) {
    console.error('[ERROR] Failed to migrate test database:', error);
    process.exit(1);
  }
}

setupDatabase();
