const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const items = await prisma.organizationDepartment.findMany({
      where: {
        organizationId: "631f488a-b898-41db-9bc6-a874e5f234a2",
        branchId: "36b4eee8-2ce1-4c33-aa1c-91819371b290"
      },
      take: 21,
      skip: 0,
      cursor: undefined,
      orderBy: { createdAt: 'desc' }
    });
    console.log("OK:", items.length);
  } catch (e) {
    console.log("FAIL:", e.message);
  }
}
main().finally(() => prisma.$disconnect());
