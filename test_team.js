const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const items = await prisma.organizationTeam.findMany({
      where: {
        organizationId: "631f488a-b898-41db-9bc6-a874e5f234a2",
        branchId: "36b4eee8-2ce1-4c33-aa1c-91819371b290",
        departmentId: "4bd88b04-230d-481b-acbd-8c3767990837",
        status: { not: 'ARCHIVED' },
        deletedAt: null
      },
      take: 21,
      skip: 0
    });
    console.log("OK:", items.length);
  } catch (e) {
    console.log("FAIL:", e.message);
  }
}
main().finally(() => prisma.$disconnect());
