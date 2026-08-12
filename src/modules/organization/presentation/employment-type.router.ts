import { Router } from 'express';
import { EmploymentTypeController } from './controllers/employment-type.controller';
import { CreateEmploymentTypeUseCase } from '../application/use-cases/create-employment-type.use-case';
import { UpdateEmploymentTypeUseCase } from '../application/use-cases/update-employment-type.use-case';
import { ArchiveEmploymentTypeUseCase } from '../application/use-cases/archive-employment-type.use-case';
import { GetEmploymentTypeUseCase } from '../application/use-cases/get-employment-type.use-case';
import { ListEmploymentTypesUseCase } from '../application/use-cases/list-employment-types.use-case';
import { PrismaEmploymentTypeRepository } from '../infrastructure/repositories/employment-type.repository';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient(); // In a real app this is injected

export const employmentTypeRouter = Router();

const repository = new PrismaEmploymentTypeRepository(prisma);

const createUseCase = new CreateEmploymentTypeUseCase(repository);
const updateUseCase = new UpdateEmploymentTypeUseCase(repository);
const archiveUseCase = new ArchiveEmploymentTypeUseCase(repository);
const getUseCase = new GetEmploymentTypeUseCase(repository);
const listUseCase = new ListEmploymentTypesUseCase(repository);

const controller = new EmploymentTypeController(
  createUseCase,
  updateUseCase,
  archiveUseCase,
  getUseCase,
  listUseCase
);

// All routes here should be mounted under /api/v1/organization/employment-types
// Workspace middleware is assumed to be mounted at the parent level, resolving req.context
employmentTypeRouter.post('/', controller.create);
employmentTypeRouter.get('/', controller.list);
employmentTypeRouter.get('/:id', controller.get);
employmentTypeRouter.patch('/:id', controller.update);
employmentTypeRouter.delete('/:id', controller.archive);
