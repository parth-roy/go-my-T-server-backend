import { Router } from 'express';
import { BranchController } from './controllers/branch.controller';
import { validate } from '@shared/middleware/validate';
import { createBranchSchema, updateBranchSchema } from './validators/branch.validator';
import { departmentRouter } from './department.router';

const branchRouter = Router({ mergeParams: true });
const branchController = new BranchController();

// Sub-routers
branchRouter.use('/:branchId/departments', departmentRouter);

branchRouter.post(
  '/',
  validate(createBranchSchema, 'body'),
  branchController.create
);

branchRouter.get(
  '/',
  branchController.list
);

branchRouter.get(
  '/:branchId',
  branchController.get
);

branchRouter.put(
  '/:branchId',
  validate(updateBranchSchema, 'body'),
  branchController.update
);

branchRouter.patch(
  '/:branchId/archive',
  branchController.archive
);

export { branchRouter };
