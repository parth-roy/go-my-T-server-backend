import { Router } from 'express';
import { TeamController } from './controllers/team.controller';
import { CreateTeamUseCase } from '../application/use-cases/create-team.use-case';
import { UpdateTeamUseCase } from '../application/use-cases/update-team.use-case';
import { ArchiveTeamUseCase } from '../application/use-cases/archive-team.use-case';
import { GetTeamUseCase } from '../application/use-cases/get-team.use-case';
import { ListTeamsUseCase } from '../application/use-cases/list-teams.use-case';
import { PrismaTeamRepository } from '../infrastructure/repositories/team.repository';
import { PrismaDepartmentRepository } from '../infrastructure/repositories/department.repository';
import { PrismaBranchRepository } from '../infrastructure/repositories/branch.repository';
import { OrganizationMembershipRepository } from '../infrastructure/repositories/membership.repository';
import { TeamCodeGeneratorDomainService } from '../domain/services/team-code-generator.domain-service';
import { TeamLeaderValidatorDomainService } from '../domain/services/team-leader-validator.domain-service';
import { validate } from '@shared/middleware/validate';
import { createTeamSchema, updateTeamSchema, listTeamsSchema } from './validators/team.validator';
import { prisma } from '@shared/db/prisma';

const router = Router({ mergeParams: true });

// Instantiate repositories
const teamRepo = new PrismaTeamRepository(prisma);
const departmentRepo = new PrismaDepartmentRepository(prisma);
const branchRepo = new PrismaBranchRepository(prisma);
const membershipRepo = new OrganizationMembershipRepository();

// Instantiate domain services
const codeGenerator = new TeamCodeGeneratorDomainService(teamRepo);
const leaderValidator = new TeamLeaderValidatorDomainService(membershipRepo);

// Instantiate use cases
const createTeamUseCase = new CreateTeamUseCase(teamRepo, departmentRepo, branchRepo, codeGenerator, leaderValidator);
const updateTeamUseCase = new UpdateTeamUseCase(teamRepo, leaderValidator);
const archiveTeamUseCase = new ArchiveTeamUseCase(teamRepo);
const getTeamUseCase = new GetTeamUseCase(teamRepo);
const listTeamsUseCase = new ListTeamsUseCase(teamRepo);

// Instantiate controller
const controller = new TeamController(
  createTeamUseCase,
  updateTeamUseCase,
  archiveTeamUseCase,
  getTeamUseCase,
  listTeamsUseCase
);


// Routes
router.post('/', validate(createTeamSchema), controller.create);
router.get('/', validate(listTeamsSchema, 'query'), controller.list);
router.get('/:teamId', controller.get);
router.patch('/:teamId', validate(updateTeamSchema), controller.update);
router.delete('/:teamId', controller.archive);

export { router as teamRouter };
