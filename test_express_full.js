const express = require('express');
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

const { ListDepartmentsSchema } = require('./dist/modules/organization/presentation/validators/department.validator');
const { validate } = require('./dist/shared/middleware/validate');

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

const app = express();

app.use((req, res, next) => {
  req.context = {
    platformIdentity: { type: 'ORGANIZATION_MEMBER', role: 'PRIMARY_OWNER' },
    organization: { id: "631f488a-b898-41db-9bc6-a874e5f234a2" },
  };
  next();
});

const router = express.Router({ mergeParams: true });
router.get('/', validate(ListDepartmentsSchema, 'query'), controller.list);

app.use('/organizations/branches/:branchId/departments', router);

app.use((err, req, res, next) => {
  console.log("EXPRESS ERROR HANDLER CAUGHT:");
  console.log(err);
  res.status(500).json({ error: err.message });
});

app.listen(8887, async () => {
  console.log("Listening on 8887");
  try {
    const res = await fetch('http://localhost:8887/organizations/branches/36b4eee8-2ce1-4c33-aa1c-91819371b290/departments');
    console.log("STATUS:", res.status);
    console.log("BODY:", await res.text());
  } catch(e) {
    console.log("FETCH ERR:", e);
  }
  process.exit(0);
});
