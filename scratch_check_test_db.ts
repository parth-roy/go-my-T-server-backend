import { PrismaClient } from '@prisma/client';

const TEST_DB_URL = "postgresql://neondb_owner:npg_GZ8CXA1SBFJQ@ep-crimson-union-ayr0jmgp.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: TEST_DB_URL
    }
  }
});

async function main() {
  try {
    const cols = await prisma.$queryRawUnsafe(`SELECT column_name FROM information_schema.columns WHERE table_name = 'User' OR table_name = 'users'`);
    console.log('User Columns:', cols);
  } catch (e) {
    console.error('Error:', e.message);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
