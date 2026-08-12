const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$executeRawUnsafe('CREATE DATABASE "db-test"');
    console.log('[SUCCESS] Created db-test');
  } catch (err) {
    console.log('[FAILED] ' + err.message);
  } finally {
    await prisma.$disconnect();
  }
}
main();
