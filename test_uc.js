const API = "https://api-test.gomytruck.com/api/v1";
const ORG_ID = "631f488a-b898-41db-9bc6-a874e5f234a2";
const BRANCH_ID = "36b4eee8-2ce1-4c33-aa1c-91819371b290";

async function req() {
  // Let's first test if my token is still valid. Wait, I can just use a local test to trigger the controller logic.
  // Actually, I can just write a short script that initializes the ListDepartmentsUseCase and passes mock data!
  const { PrismaDepartmentRepository } = require('./dist/modules/organization/infrastructure/repositories/department.repository.js');
  const { ListDepartmentsUseCase } = require('./dist/modules/organization/application/use-cases/list-departments.use-case.js');
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  const repo = new PrismaDepartmentRepository(prisma);
  const useCase = new ListDepartmentsUseCase(repo);
  
  try {
    const context = {
      platformIdentity: { role: "PRIMARY_OWNER" },
      organization: { id: "631f488a-b898-41db-9bc6-a874e5f234a2" }
    };
    const res = await useCase.execute(context, "36b4eee8-2ce1-4c33-aa1c-91819371b290", { limit: 20 });
    console.log("SUCCESS");
  } catch (e) {
    console.log("ERROR IS:", e.message);
    console.log(e.stack);
  } finally {
    await prisma.$disconnect();
  }
}
req().catch(console.error);
