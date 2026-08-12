import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkerComplianceController } from '../controllers/WorkerComplianceController';
import { CreateWorkerComplianceCommand } from '../../../application/compliance/commands/ComplianceCommands';

describe('WorkerComplianceController', () => {
  let appService: any;
  let getQueryHandler: any;
  let controller: WorkerComplianceController;
  let req: any;
  let res: any;

  beforeEach(() => {
    appService = {
      createWorkerCompliance: vi.fn(),
      evaluateWorkerCompliance: vi.fn()
    };
    getQueryHandler = {
      handle: vi.fn()
    };
    controller = new WorkerComplianceController(appService, getQueryHandler);
    
    req = {
      body: {},
      params: {}
    };
    
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
  });

  it('should create worker compliance and return 201', async () => {
    req.body = { workerId: 'w-1', organizationId: 'org-1' };
    
    await controller.createCompliance(req, res);
    
    expect(appService.createWorkerCompliance).toHaveBeenCalledWith(
      expect.objectContaining({ workerId: 'w-1', organizationId: 'org-1' })
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Worker compliance initialized.',
      data: null
    });
  });

  it('should return standardized enterprise error on application failure', async () => {
    req.body = { workerId: 'w-1', organizationId: 'org-1' };
    
    const domainError = new Error('Worker already exists');
    (domainError as any).code = 'DUPLICATE_RESOURCE';
    
    appService.createWorkerCompliance.mockRejectedValue(domainError);
    
    await controller.createCompliance(req, res);
    
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Worker already exists',
        code: 'DUPLICATE_RESOURCE',
        errorCategory: 'Validation',
        errorId: expect.any(String),
        occurredAt: expect.any(String)
      })
    );
  });

  it('should evaluate compliance and return 200', async () => {
    req.params.workerId = 'w-1';
    
    await controller.evaluateCompliance(req, res);
    
    expect(appService.evaluateWorkerCompliance).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should get compliance and return 200', async () => {
    req.params.workerId = 'w-1';
    getQueryHandler.handle.mockResolvedValue({ id: 'w-1', status: 'COMPLIANT' });
    
    await controller.getCompliance(req, res);
    
    expect(getQueryHandler.handle).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { id: 'w-1', status: 'COMPLIANT' }
    });
  });

  it('should handle errors in evaluateCompliance', async () => {
    req.params.workerId = 'w-1';
    appService.evaluateWorkerCompliance.mockRejectedValue(new Error('Evaluation failed'));
    await controller.evaluateCompliance(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should handle errors in getCompliance', async () => {
    req.params.workerId = 'w-1';
    getQueryHandler.handle.mockRejectedValue(new Error('Not found'));
    await controller.getCompliance(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
