import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmploymentAssignmentController } from '../controllers/employment-assignment.controller';

describe('EmploymentAssignmentController (Read)', () => {
  let req: any;
  let res: any;
  let next: any;
  let prismaMock: any;
  let controller: EmploymentAssignmentController;

  beforeEach(() => {
    req = { 
      context: { organizationId: 'org-1' },
      query: {}
    };
    res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    next = vi.fn();
    
    prismaMock = {
      organizationEmploymentAssignment: {
        findMany: vi.fn()
      }
    };

    controller = new EmploymentAssignmentController(
      {} as any,
      {} as any,
      {} as any,
      prismaMock
    );
  });

  it('should list active employment assignments for the organization', async () => {
    prismaMock.organizationEmploymentAssignment.findMany.mockResolvedValue([
      {
        id: 'assignment-1',
        membershipId: 'mem-1',
        status: 'ACTIVE',
        membership: {
          user: { name: 'John Doe', email: 'john@example.com' }
        }
      }
    ]);

    req.query = { page: '1', limit: '10' };
    
    await controller.list(req, res, next);

    expect(prismaMock.organizationEmploymentAssignment.findMany).toHaveBeenCalledWith({
      where: {
        membership: { organizationId: 'org-1' },
        status: 'ACTIVE'
      },
      include: expect.any(Object),
      skip: 0,
      take: 11,
      orderBy: { createdAt: 'desc' }
    });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: expect.arrayContaining([
        expect.objectContaining({
          id: 'assignment-1',
          membershipId: 'mem-1',
          user: { name: 'John Doe', email: 'john@example.com' }
        })
      ]),
      pagination: { page: 1, limit: 10, hasNextPage: false }
    });
  });

  it('should handle pagination correctly', async () => {
    // Return 11 items when limit is 10
    const mockData = Array(11).fill({}).map((_, i) => ({ id: `assignment-${i}` }));
    prismaMock.organizationEmploymentAssignment.findMany.mockResolvedValue(mockData);

    req.query = { page: '2', limit: '10' };
    
    await controller.list(req, res, next);

    expect(prismaMock.organizationEmploymentAssignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 11
      })
    );

    expect(res.status).toHaveBeenCalledWith(200);
    const jsonCall = res.json.mock.calls[0][0];
    expect(jsonCall.data.length).toBe(10);
    expect(jsonCall.pagination.hasNextPage).toBe(true);
  });
});
