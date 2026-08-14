const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const { DepartmentController } = require('./dist/modules/organization/presentation/controllers/department.controller');
const { CreateDepartmentUseCase } = require('./dist/modules/organization/application/use-cases/create-department.use-case');
const { UpdateDepartmentUseCase } = require('./dist/modules/organization/application/use-cases/update-department.use-case');
const { ArchiveDepartmentUseCase } = require('./dist/modules/organization/application/use-cases/archive-department.use-case');
const { GetDepartmentUseCase } = require('./dist/modules/organization/application/use-cases/get-department.use-case');
const { ListDepartmentsUseCase } = require('./dist/modules/organization/application/use-cases/list-departments.use-case');

const { PrismaDepartmentRepository } = require('./dist/modules/organization/infrastructure/repositories/department.repository');
const { PrismaBranchRepository } = require('./dist/modules/organization/infrastructure/repositories/branch.repository');
const { OrganizationMembershipRepository } = require('./dist/modules/organization/infrastructure/repositories/membership.repository');
const { DepartmentManagerValidatorDomainService } = require('./dist/modules/organization/domain/services/department-manager-validator.domain-service');

const departmentRepo = new PrismaDepartmentRepository(prisma);
const branchRepo = new PrismaBranchRepository(prisma);
const membershipRepo = new OrganizationMembershipRepository();
const managerValidator = new DepartmentManagerValidatorDomainService(membershipRepo);

const createUseCase = new CreateDepartmentUseCase(departmentRepo, branchRepo, managerValidator);
const updateUseCase = new UpdateDepartmentUseCase(departmentRepo, managerValidator);
const archiveUseCase = new ArchiveDepartmentUseCase(departmentRepo);
const getUseCase = new GetDepartmentUseCase(departmentRepo);
const listUseCase = new ListDepartmentsUseCase(departmentRepo);

const controller = new DepartmentController(createUseCase, updateUseCase, archiveUseCase, getUseCase, listUseCase);

const req = {
  params: { branchId: "36b4eee8-2ce1-4c33-aa1c-91819371b290" },
  query: { limit: "20" },
  context: {
    platformIdentity: { type: 'ORGANIZATION_MEMBER', role: 'PRIMARY_OWNER' },
    organization: { id: "631f488a-b898-41db-9bc6-a874e5f234a2" },
  }
};

const res = {
  status: function(code) { this.statusCode = code; return this; },
  json: function(data) { console.log("SUCCESS:", JSON.stringify(data, null, 2)); return this; }
};

const next = function(err) {
  if (err) {
    console.error("NEXT CALLED WITH ERROR:");
    console.error(err.stack || err);
  } else {
    console.log("NEXT CALLED WITH NO ERROR");
  }
};

async function main() {
  await controller.list(req, res, next);
}

main().then(() => process.exit(0)).catch(e => { console.error("UNHANDLED:", e); process.exit(1); });
