import { Router } from 'express';
import { prisma } from '@shared/db/prisma';
import { authenticate } from '@shared/middleware/auth.middleware';
import { resolveContext } from '@shared/middleware/context.middleware';
import { validate } from '@shared/middleware/validate';
import { DesignationController } from './controllers/designation.controller';
import { PrismaDesignationRepository } from '../infrastructure/repositories/designation.repository';
import { DesignationCodeGeneratorDomainService } from '../domain/services/designation-code-generator.domain-service';
import { CreateDesignationUseCase } from '../application/use-cases/create-designation.use-case';
import { UpdateDesignationUseCase } from '../application/use-cases/update-designation.use-case';
import { ArchiveDesignationUseCase } from '../application/use-cases/archive-designation.use-case';
import { GetDesignationUseCase } from '../application/use-cases/get-designation.use-case';
import { ListDesignationsUseCase } from '../application/use-cases/list-designations.use-case';
import {
  createDesignationSchema,
  updateDesignationSchema,
  designationIdParamSchema,
  listDesignationsQuerySchema
} from './validators/designation.validator';

const designationRouter = Router({ mergeParams: true });

// Setup dependencies
const designationRepo = new PrismaDesignationRepository(prisma);
const codeGenerator = new DesignationCodeGeneratorDomainService(designationRepo);

const createUseCase = new CreateDesignationUseCase(designationRepo, codeGenerator);
const updateUseCase = new UpdateDesignationUseCase(designationRepo);
const archiveUseCase = new ArchiveDesignationUseCase(designationRepo);
const getUseCase = new GetDesignationUseCase(designationRepo);
const listUseCase = new ListDesignationsUseCase(designationRepo);

const controller = new DesignationController(
  createUseCase,
  updateUseCase,
  archiveUseCase,
  getUseCase,
  listUseCase
);

designationRouter.post(
  '/',
  authenticate,
  resolveContext,
  validate(createDesignationSchema, 'body'),
  controller.create
);

designationRouter.get(
  '/',
  authenticate,
  resolveContext,
  validate(listDesignationsQuerySchema, 'query'),
  controller.list
);

designationRouter.get(
  '/:designationId',
  authenticate,
  resolveContext,
  validate(designationIdParamSchema, 'params'),
  controller.get
);

designationRouter.patch(
  '/:designationId',
  authenticate,
  resolveContext,
  validate(designationIdParamSchema, 'params'),
  validate(updateDesignationSchema, 'body'),
  controller.update
);

designationRouter.delete(
  '/:designationId',
  authenticate,
  resolveContext,
  validate(designationIdParamSchema, 'params'),
  controller.archive
);

export { designationRouter };
