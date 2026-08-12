import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.findFirst({
    include: { memberships: { include: { user: true } } }
  });
  console.log('Organization:', JSON.stringify(org, null, 2));
  
  const user = await prisma.user.findFirst({
    where: { phone: '9852364101' }
  });
  console.log('Test User 9852364101:', JSON.stringify(user, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
