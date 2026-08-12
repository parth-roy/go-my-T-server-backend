const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasourceUrl: "postgresql://postgres.vwfwhwhwboqtsbjmhyjd:truker010server@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres"
});
async function main() {
  try {
    const res = await prisma.$queryRawUnsafe('SELECT datname FROM pg_database;');
    console.log('[DATABASES] ', res);
  } catch (err) {
    console.log('[FAILED] ' + err.message);
  } finally {
    await prisma.$disconnect();
  }
}
main();
