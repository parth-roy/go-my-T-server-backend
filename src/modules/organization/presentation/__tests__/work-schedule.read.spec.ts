import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkScheduleTemplateController } from '../controllers/work-schedule-template.controller';

describe('WorkScheduleTemplateController (Read)', () => {
  let req: any;
  let res: any;
  let next: any;
  let prismaMock: any;
  let controller: WorkScheduleTemplateController;

  beforeEach(() => {
    req = { context: { organizationId: 'org-1' }, params: {} };
    res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    next = vi.fn();
    
    prismaMock = {
      workScheduleTemplate: {
        findMany: vi.fn(),
        findFirst: vi.fn()
      }
    };

    controller = new WorkScheduleTemplateController({} as any, {} as any, prismaMock);
  });

  it('should list templates for the organization', async () => {
    prismaMock.workScheduleTemplate.findMany.mockResolvedValue([
      {
        id: 'tpl-1',
        name: 'Standard Shift',
        isActive: true,
        versions: [{ versionNumber: 1 }]
      }
    ]);

    await controller.list(req, res, next);

    expect(prismaMock.workScheduleTemplate.findMany).toHaveBeenCalledWith({
      where: { organizationId: 'org-1' },
      include: expect.any(Object),
      orderBy: { name: 'asc' }
    });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [
        {
          id: 'tpl-1',
          name: 'Standard Shift',
          isActive: true,
          code: undefined,
          type: undefined,
          currentVersion: undefined
        }
      ]
    });
  });

  it('should get template detail by id', async () => {
    prismaMock.workScheduleTemplate.findFirst.mockResolvedValue({
      id: 'tpl-1',
      name: 'Standard Shift',
      versions: []
    });

    req.params = { id: 'tpl-1' };
    await controller.getDetail(req, res, next);

    expect(prismaMock.workScheduleTemplate.findFirst).toHaveBeenCalledWith({
      where: { id: 'tpl-1', organizationId: 'org-1' },
      include: { versions: { orderBy: { versionNumber: 'desc' } } }
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should return 404 if template not found', async () => {
    prismaMock.workScheduleTemplate.findFirst.mockResolvedValue(null);

    req.params = { id: 'tpl-1' };
    await controller.getDetail(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 404,
      message: 'Work Schedule Template not found'
    }));
  });
});
