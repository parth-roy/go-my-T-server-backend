import { Router } from 'express';
import { WorkScheduleTemplateController } from './controllers/work-schedule-template.controller';
import { ScheduleAssignmentController } from './controllers/schedule-assignment.controller';
import { CreateWorkScheduleTemplateUseCase } from '../application/use-cases/create-work-schedule-template.use-case';
import { PublishScheduleTemplateVersionUseCase } from '../application/use-cases/publish-schedule-template-version.use-case';
import { AssignScheduleUseCase } from '../application/use-cases/assign-schedule.use-case';
import { ResolveScheduleUseCase } from '../application/use-cases/resolve-schedule.use-case';
import { PrismaWorkScheduleTemplateRepository, PrismaWorkScheduleTemplateVersionRepository, PrismaScheduleAssignmentRepository } from '../infrastructure/repositories/schedule.repository';
import { ScheduleResolutionDomainService } from '../domain/services/schedule-resolution.domain-service';
import { PrismaEmploymentAssignmentRepository } from '../infrastructure/repositories/employment-assignment.repository';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient(); // In a real app this is injected

export const workScheduleRouter = Router();

const templateRepo = new PrismaWorkScheduleTemplateRepository(prisma);
const versionRepo = new PrismaWorkScheduleTemplateVersionRepository(prisma);
const assignmentRepo = new PrismaScheduleAssignmentRepository(prisma);
const employmentAssignmentRepo = new PrismaEmploymentAssignmentRepository(prisma);

const resolutionService = new ScheduleResolutionDomainService(assignmentRepo, versionRepo, employmentAssignmentRepo);

const createTemplateUseCase = new CreateWorkScheduleTemplateUseCase(templateRepo, versionRepo);
const publishVersionUseCase = new PublishScheduleTemplateVersionUseCase(versionRepo, templateRepo);
const assignScheduleUseCase = new AssignScheduleUseCase(assignmentRepo, versionRepo);
const resolveScheduleUseCase = new ResolveScheduleUseCase(resolutionService);

const templateController = new WorkScheduleTemplateController(createTemplateUseCase, publishVersionUseCase, prisma);
const assignmentController = new ScheduleAssignmentController(assignScheduleUseCase, resolveScheduleUseCase);

// Routes
workScheduleRouter.get('/templates', templateController.list);
workScheduleRouter.post('/templates', templateController.createTemplate);
workScheduleRouter.get('/templates/:id', templateController.getDetail);
workScheduleRouter.post('/templates/:templateId/versions/:versionId/publish', templateController.publishVersion);

workScheduleRouter.post('/assignments', assignmentController.assignSchedule);
workScheduleRouter.get('/assignments/:assignmentId/resolve', assignmentController.resolveSchedule);
