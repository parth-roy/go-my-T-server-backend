const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { PrismaDepartmentRepository } = require('./dist/modules/organization/infrastructure/repositories/department.repository.js');
const { PrismaBranchRepository } = require('./dist/modules/organization/infrastructure/repositories/branch.repository.js');
const { ListDepartmentsUseCase } = require('./dist/modules/organization/application/use-cases/list-departments.use-case.js');
const { DepartmentController } = require('./dist/modules/organization/presentation/controllers/department.controller.js');

async function main() {
  const repo = new PrismaDepartmentRepository(prisma);
  const listUC = new ListDepartmentsUseCase(repo);
  // We need to pass null/mock for the others
  const controller = new DepartmentController(null, null, null, null, listUC);

  const req = {
    context: {
      platformIdentity: { role: "PRIMARY_OWNER" },
      organization: { id: "631f488a-b898-41db-9bc6-a874e5f234a2" }
    },
    params: { branchId: "36b4eee8-2ce1-4c33-aa1c-91819371b290" },
    query: {}
  };

  const res = {
    status: function(code) { this.code = code; return this; },
    json: function(obj) { console.log("RES:", this.code, obj); }
  };

  const next = function(err) {
    console.log("NEXT CALLED WITH ERROR:", err.message);
    console.log(err.stack);
  };

  await controller.list(req, res, next);
  await prisma.$disconnect();
}
main().catch(console.error);
