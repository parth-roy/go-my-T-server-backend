import { CreateTeamUseCase } from '../src/modules/organization/application/use-cases/create-team.use-case';
import { TeamStatus } from '../src/modules/organization/domain/enums/team-status.enum';
import { AppError } from '../src/shared/errors/AppError';

describe('CreateTeamUseCase', () => {
  let useCase: CreateTeamUseCase;
  let mockTeamRepo: any;
  let mockDepartmentRepo: any;
  let mockBranchRepo: any;
  let mockCodeGenerator: any;
  let mockLeaderValidator: any;

  beforeEach(() => {
    mockTeamRepo = {
      create: jest.fn(),
      existsByName: jest.fn().mockResolvedValue(false),
    };
    mockDepartmentRepo = {
      findById: jest.fn(),
    };
    mockBranchRepo = {
      findById: jest.fn(),
    };
    mockCodeGenerator = {
      generate: jest.fn().mockResolvedValue('TEAM-TEST'),
    };
    mockLeaderValidator = {
      validateLeader: jest.fn().mockResolvedValue(undefined),
    };

    useCase = new CreateTeamUseCase(
      mockTeamRepo,
      mockDepartmentRepo,
      mockBranchRepo,
      mockCodeGenerator,
      mockLeaderValidator
    );
  });

  it('should successfully create a team', async () => {
    mockBranchRepo.findById.mockResolvedValue({
      getStatus: () => 'ACTIVE',
    });
    mockDepartmentRepo.findById.mockResolvedValue({
      getStatus: () => 'ACTIVE',
    });
    mockTeamRepo.create.mockImplementation(async (team: any) => team);

    const context = {
      userId: 'user-123',
      organizationId: 'org-123',
      membership: { role: 'PRIMARY_OWNER' }
    };

    const result = await useCase.execute(context as any, 'branch-1', 'dept-1', {
      name: 'Test Team',
      description: 'A test team',
      leaderId: 'leader-123',
    });

    expect(result.name).toBe('Test Team');
    expect(result.code).toBe('TEAM-TEST');
    expect(result.status).toBe(TeamStatus.ACTIVE);
    expect(mockTeamRepo.create).toHaveBeenCalled();
  });

  it('should throw if branch is inactive', async () => {
    mockBranchRepo.findById.mockResolvedValue({
      getStatus: () => 'INACTIVE',
    });

    const context = {
      userId: 'user-123',
      organizationId: 'org-123',
      membership: { role: 'PRIMARY_OWNER' }
    };

    await expect(useCase.execute(context as any, 'branch-1', 'dept-1', {
      name: 'Test Team',
    })).rejects.toThrow(AppError);
  });
});
