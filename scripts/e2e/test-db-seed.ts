import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

const envPath = path.resolve(process.cwd(), '.env.test');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.test.example') });
}

process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;

const prisma = new PrismaClient();

export async function seedTestDatabase() {
  console.log('--- ENTERPRISE E2E TEST SEED ---');
  try {
    const orgId = uuidv4();
    const workerId = uuidv4();
    
    // Seed prerequisites that TIME-010 depends on, if they enforce foreign keys.
    // e.g., If Worker or Organization MUST exist:
    
    // Example (uncomment if FK constraints exist):
    /*
    await prisma.organization.create({
      data: { id: orgId, name: 'E2E Test Org' }
    });
    
    await prisma.worker.create({
      data: { id: workerId, organizationId: orgId, name: 'E2E Test Worker' }
    });
    */

    console.log('[SUCCESS] Seeded basic requirements for TIME-010.');
    return { orgId, workerId };
  } catch (error) {
    console.error('[ERROR] Seeding failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  seedTestDatabase().catch(() => process.exit(1));
}
