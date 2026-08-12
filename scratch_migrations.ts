import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const migs = await prisma.$queryRawUnsafe(`SELECT * FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 5`);
  console.log('Migrations:', migs);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
