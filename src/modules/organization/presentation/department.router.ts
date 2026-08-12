import { Router } from 'express';
import { DepartmentController } from './controllers/department.controller';
import { CreateDepartmentUseCase } from '../application/use-cases/create-department.use-case';
import { UpdateDepartmentUseCase } from '../application/use-cases/update-department.use-case';
import { ArchiveDepartmentUseCase } from '../application/use-cases/archive-department.use-case';
import { GetDepartmentUseCase } from '../application/use-cases/get-department.use-case';
import { ListDepartmentsUseCase } from '../application/use-cases/list-departments.use-case';
import { PrismaDepartmentRepository } from '../infrastructure/repositories/department.repository';
import { PrismaBranchRepository } from '../infrastructure/repositories/branch.repository';
import { OrganizationMembershipRepository } from '../infrastructure/repositories/membership.repository';
import { DepartmentManagerValidatorDomainService } from '../domain/services/department-manager-validator.domain-service';
import { validate } from '@shared/middleware/validate';
import { CreateDepartmentSchema, UpdateDepartmentSchema, ListDepartmentsSchema } from './validators/department.validator';
import { prisma } from '@shared/db/prisma';
import { teamRouter } from './team.router';

const router = Router({ mergeParams: true });

// Setup dependencies
const departmentRepo = new PrismaDepartmentRepository(prisma);
const branchRepo = new PrismaBranchRepository(prisma);
const membershipRepo = new OrganizationMembershipRepository();
const managerValidator = new DepartmentManagerValidatorDomainService(membershipRepo);

const createDepartmentUseCase = new CreateDepartmentUseCase(departmentRepo, branchRepo, managerValidator);
const updateDepartmentUseCase = new UpdateDepartmentUseCase(departmentRepo, managerValidator);
const archiveDepartmentUseCase = new ArchiveDepartmentUseCase(departmentRepo);
const getDepartmentUseCase = new GetDepartmentUseCase(departmentRepo);
const listDepartmentsUseCase = new ListDepartmentsUseCase(departmentRepo);

const controller = new DepartmentController(
  createDepartmentUseCase,
  updateDepartmentUseCase,
  archiveDepartmentUseCase,
  getDepartmentUseCase,
  listDepartmentsUseCase
);

// Routes (assume authentication and context resolution happen upstream in organizationRouter/branchRouter)
router.post('/', validate(CreateDepartmentSchema), controller.create);
router.get('/', validate(ListDepartmentsSchema, 'query'), controller.list);
router.get('/:departmentId', controller.get);
router.patch('/:departmentId', validate(UpdateDepartmentSchema), controller.update);
router.delete('/:departmentId', controller.archive);

// Sub-resources
router.use('/:departmentId/teams', teamRouter);

export { router as departmentRouter };
