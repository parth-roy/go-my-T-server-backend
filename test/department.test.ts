import { CreateDepartmentUseCase } from '../src/modules/organization/application/use-cases/create-department.use-case';
import { DepartmentCodeGeneratorDomainService } from '../src/modules/organization/domain/services/department-code-generator.domain-service';
import { DepartmentStatus } from '../src/modules/organization/domain/enums/department-status.enum';
import { BranchStatus } from '../src/modules/organization/domain/enums/branch-status.enum';
import { AppError } from '../src/shared/errors/app.error';

describe('Department Management', () => {
  let departmentRepo: any;
  let branchRepo: any;
  let managerValidator: any;
  let createUseCase: CreateDepartmentUseCase;

  const mockContext = {
    platformIdentity: { role: 'OWNER' },
    organization: { id: 'org-123' },
  } as any;

  beforeEach(() => {
    departmentRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      findByCode: jest.fn(),
      findByName: jest.fn(),
      list: jest.fn(),
    };
    branchRepo = {
      findById: jest.fn(),
    };
    managerValidator = {
      validateManager: jest.fn(),
    };

    createUseCase = new CreateDepartmentUseCase(departmentRepo, branchRepo, managerValidator);
  });

  describe('CreateDepartmentUseCase', () => {
    it('should create a department successfully', async () => {
      branchRepo.findById.mockResolvedValue({ id: 'branch-1', status: BranchStatus.ACTIVE });
      departmentRepo.findByName.mockResolvedValue(null);
      departmentRepo.findByCode.mockResolvedValue(null);
      managerValidator.validateManager.mockResolvedValue();

      const result = await createUseCase.execute(mockContext, 'branch-1', {
        name: 'Sales',
        code: 'SALES-01',
        description: 'Sales team',
        managerId: 'manager-123',
      });

      expect(result).toMatchObject({
        name: 'Sales',
        code: 'SALES-01',
        description: 'Sales team',
        managerId: 'manager-123',
        status: DepartmentStatus.ACTIVE,
      });
      expect(departmentRepo.save).toHaveBeenCalledTimes(1);
    });

    it('should throw error if branch is not active', async () => {
      branchRepo.findById.mockResolvedValue({ id: 'branch-1', status: BranchStatus.INACTIVE });

      await expect(
        createUseCase.execute(mockContext, 'branch-1', { name: 'Sales' })
      ).rejects.toThrow(AppError);
    });

    it('should throw error on duplicate name', async () => {
      branchRepo.findById.mockResolvedValue({ id: 'branch-1', status: BranchStatus.ACTIVE });
      departmentRepo.findByName.mockResolvedValue({ id: 'dept-old' });

      await expect(
        createUseCase.execute(mockContext, 'branch-1', { name: 'Sales' })
      ).rejects.toThrow(AppError);
    });

    it('should throw error on duplicate code', async () => {
      branchRepo.findById.mockResolvedValue({ id: 'branch-1', status: BranchStatus.ACTIVE });
      departmentRepo.findByName.mockResolvedValue(null);
      departmentRepo.findByCode.mockResolvedValue({ id: 'dept-old' });

      await expect(
        createUseCase.execute(mockContext, 'branch-1', { name: 'Sales', code: 'SALES' })
      ).rejects.toThrow(AppError);
    });

    it('should throw error on invalid manager', async () => {
      branchRepo.findById.mockResolvedValue({ id: 'branch-1', status: BranchStatus.ACTIVE });
      departmentRepo.findByName.mockResolvedValue(null);
      departmentRepo.findByCode.mockResolvedValue(null);
      managerValidator.validateManager.mockRejectedValue(AppError.badRequest('Manager must belong to the organization'));

      await expect(
        createUseCase.execute(mockContext, 'branch-1', { name: 'Sales', managerId: 'invalid' })
      ).rejects.toThrow(AppError);
    });
  });

  describe('DepartmentCodeGeneratorDomainService', () => {
    it('should accept valid preferred code', () => {
      expect(DepartmentCodeGeneratorDomainService.generateCode('SALES')).toBe('SALES');
      expect(DepartmentCodeGeneratorDomainService.generateCode('hr-dept')).toBe('HR-DEPT');
    });

    it('should generate random code if preferred code is invalid or absent', () => {
      const code1 = DepartmentCodeGeneratorDomainService.generateCode();
      expect(code1).toMatch(/^DEPT-[A-Z0-9]{6}$/);

      const code2 = DepartmentCodeGeneratorDomainService.generateCode('x'); // too short
      expect(code2).toMatch(/^DEPT-[A-Z0-9]{6}$/);
    });
  });
});
