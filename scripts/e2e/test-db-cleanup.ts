import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve(process.cwd(), '.env.test');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.test.example') });
}

process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;

const prisma = new PrismaClient();

async function cleanupDatabase() {
  console.log('--- ENTERPRISE E2E TEST CLEANUP ---');
  try {
    // Only clear data for TIME-010 aggregates if we want isolation,
    // or clear everything if the test DB is truly dedicated.
    console.log('[INFO] Truncating compliance tables...');
    await prisma.$transaction([
      prisma.workerCompliance.deleteMany(),
      prisma.complianceEvent.deleteMany(),
      prisma.timeTrackingOutbox.deleteMany(),
      prisma.workerComplianceDashboard.deleteMany(),
      prisma.notificationFeed.deleteMany(), // if applicable
    ]);
    console.log('[SUCCESS] Test database cleaned up successfully.');
  } catch (error) {
    console.error('[ERROR] Cleanup failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupDatabase();
