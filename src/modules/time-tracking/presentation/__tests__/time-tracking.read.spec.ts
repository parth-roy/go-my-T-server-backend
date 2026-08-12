import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TimeTrackingStatusController } from '../controllers/TimeTrackingStatusController';

describe('TimeTrackingStatusController', () => {
  let req: any;
  let res: any;
  let prismaMock: any;
  let controller: TimeTrackingStatusController;

  beforeEach(() => {
    req = { user: { id: 'worker-1' }, context: { organizationId: 'org-1' } };
    res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    prismaMock = {
      workerPresence: {
        findUnique: vi.fn()
      }
    };
    controller = new TimeTrackingStatusController(prismaMock);
  });

  it('should return OFF_DUTY if no presence record is found', async () => {
    prismaMock.workerPresence.findUnique.mockResolvedValue(null);

    await controller.getStatus(req, res);

    expect(prismaMock.workerPresence.findUnique).toHaveBeenCalledWith({
      where: { workerId: 'worker-1' }
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        status: 'OFF_DUTY',
        lastSeenAt: null,
        workContext: null
      }
    });
  });

  it('should return PRESENT_IN_OTHER_ORG and redact data if organizationId does not match', async () => {
    prismaMock.workerPresence.findUnique.mockResolvedValue({
      workerId: 'worker-1',
      organizationId: 'org-2',
      status: 'ON_DUTY',
      lastSeenAt: new Date(),
      workContext: { someSecretContext: true }
    });

    await controller.getStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        status: 'PRESENT_IN_OTHER_ORG',
        lastSeenAt: null,
        workContext: null
      }
    });
  });

  it('should return full presence details if organizationId matches', async () => {
    const lastSeenAt = new Date();
    prismaMock.workerPresence.findUnique.mockResolvedValue({
      workerId: 'worker-1',
      organizationId: 'org-1',
      status: 'ON_DUTY',
      lastSeenAt,
      workContext: { contextType: 'SHIFT', contextId: 'shift-1' }
    });

    await controller.getStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        status: 'ON_DUTY',
        lastSeenAt,
        workContext: { contextType: 'SHIFT', contextId: 'shift-1' }
      }
    });
  });

  it('should handle errors gracefully', async () => {
    prismaMock.workerPresence.findUnique.mockRejectedValue(new Error('DB Error'));

    await controller.getStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Failed to retrieve time-tracking status'
    });
  });
});
