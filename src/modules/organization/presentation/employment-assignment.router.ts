import { Router } from 'express';
import { EmploymentAssignmentController } from './controllers/employment-assignment.controller';
import { CreateEmploymentAssignmentUseCase } from '../application/use-cases/create-employment-assignment.use-case';
import { TransitionEmploymentAssignmentUseCase } from '../application/use-cases/transition-employment-assignment.use-case';
import { GetAssignmentTimelineUseCase } from '../application/use-cases/get-assignment-timeline.use-case';
import { PrismaEmploymentAssignmentRepository } from '../infrastructure/repositories/employment-assignment.repository';
import { PrismaEmploymentTypeRepository } from '../infrastructure/repositories/employment-type.repository';
import { PrismaDesignationRepository } from '../infrastructure/repositories/designation.repository';
import { AssignmentNumberGeneratorDomainService } from '../domain/services/assignment-number-generator.domain-service';
import { EmploymentTransitionPolicy } from '../domain/policies/employment-transition.policy';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient(); // In a real app this is injected

export const employmentAssignmentRouter = Router();

const assignmentRepo = new PrismaEmploymentAssignmentRepository(prisma);
const employmentTypeRepo = new PrismaEmploymentTypeRepository(prisma);
const designationRepo = new PrismaDesignationRepository(prisma);

const numberGenerator = new AssignmentNumberGeneratorDomainService();
const transitionPolicy = new EmploymentTransitionPolicy();

const createUseCase = new CreateEmploymentAssignmentUseCase(assignmentRepo, employmentTypeRepo, designationRepo, numberGenerator, transitionPolicy);
const transitionUseCase = new TransitionEmploymentAssignmentUseCase(assignmentRepo, employmentTypeRepo, designationRepo, numberGenerator, transitionPolicy);
const getTimelineUseCase = new GetAssignmentTimelineUseCase(assignmentRepo);

const controller = new EmploymentAssignmentController(
  createUseCase,
  transitionUseCase,
  getTimelineUseCase
);

// All routes here should be mounted under /api/v1/organization/employment-assignments
// Workspace middleware is assumed to be mounted at the parent level, resolving req.context
employmentAssignmentRouter.post('/', controller.create);
employmentAssignmentRouter.post('/:membershipId/transition', controller.transition);
employmentAssignmentRouter.get('/:membershipId/timeline', controller.getTimeline);
