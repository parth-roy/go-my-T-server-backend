import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ShiftController } from '../controllers/shift.controller';

describe('ShiftController (Read)', () => {
  let req: any;
  let res: any;
  let next: any;
  let prismaMock: any;
  let controller: ShiftController;

  beforeEach(() => {
    req = { context: { organizationId: 'org-1' }, user: { id: 'u-1' }, query: {} };
    res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    next = vi.fn();
    
    prismaMock = {
      organizationShiftInstance: {
        findMany: vi.fn()
      },
      organizationMembership: {
        findFirst: vi.fn()
      }
    };

    controller = new ShiftController({} as any, {} as any, prismaMock);
  });

  it('should list shifts for management', async () => {
    prismaMock.organizationShiftInstance.findMany.mockResolvedValue([{ id: 'shift-1' }]);

    await controller.list(req, res, next);

    expect(prismaMock.organizationShiftInstance.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: 'org-1' }),
        skip: 0,
        take: 51
      })
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: [{ id: 'shift-1' }] })
    );
  });

  it('should list my shifts', async () => {
    prismaMock.organizationMembership.findFirst.mockResolvedValue({ id: 'mem-1' });
    prismaMock.organizationShiftInstance.findMany.mockResolvedValue([{ id: 'shift-1' }]);

    await controller.listMine(req, res, next);

    expect(prismaMock.organizationMembership.findFirst).toHaveBeenCalledWith({
      where: { organizationId: 'org-1', userId: 'u-1' }
    });
    
    expect(prismaMock.organizationShiftInstance.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: 'org-1',
          membershipId: 'mem-1'
        })
      })
    );
    
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: [{ id: 'shift-1' }] });
  });

  it('should return 401 if membership not found for my shifts', async () => {
    prismaMock.organizationMembership.findFirst.mockResolvedValue(null);

    await controller.listMine(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 401,
      message: 'Membership not found'
    }));
  });
});
