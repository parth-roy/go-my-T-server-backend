import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { ShiftController } from './controllers/shift.controller';
import { TriggerShiftGenerationUseCase } from '../application/use-cases/trigger-shift-generation.use-case';
import { ApplyShiftOverrideUseCase } from '../application/use-cases/apply-shift-override.use-case';
import { 
  PrismaShiftGenerationJobRepository, 
  PrismaShiftInstanceRepository, 
  PrismaShiftOverrideRepository 
} from '../infrastructure/repositories/shift.repository';
import { PrismaEmploymentAssignmentRepository } from '../infrastructure/repositories/employment-assignment.repository';
import { PrismaWorkScheduleTemplateVersionRepository, PrismaScheduleAssignmentRepository } from '../infrastructure/repositories/schedule.repository';
import { ScheduleResolutionDomainService } from '../domain/services/schedule-resolution.domain-service';
import { ShiftGenerationService } from '../application/services/shift-generation.service';

const prisma = new PrismaClient(); // In a real app this is injected

export const shiftRouter = Router();

const jobRepo = new PrismaShiftGenerationJobRepository(prisma);
const shiftRepo = new PrismaShiftInstanceRepository(prisma);
const overrideRepo = new PrismaShiftOverrideRepository(prisma);
const assignmentRepo = new PrismaEmploymentAssignmentRepository(prisma);
const versionRepo = new PrismaWorkScheduleTemplateVersionRepository(prisma);
const scheduleAssignmentRepo = new PrismaScheduleAssignmentRepository(prisma);

const resolutionService = new ScheduleResolutionDomainService(scheduleAssignmentRepo, versionRepo, assignmentRepo);
const generationService = new ShiftGenerationService(jobRepo, shiftRepo, assignmentRepo, resolutionService);

const triggerGenerationUseCase = new TriggerShiftGenerationUseCase(jobRepo, generationService);
const applyOverrideUseCase = new ApplyShiftOverrideUseCase(overrideRepo, shiftRepo);

const shiftController = new ShiftController(triggerGenerationUseCase, applyOverrideUseCase, prisma);

// Routes
shiftRouter.get('/me', shiftController.listMine);
shiftRouter.get('/', shiftController.list);

shiftRouter.post('/generate', shiftController.triggerGeneration);
shiftRouter.post('/:shiftId/overrides', shiftController.applyOverride);
