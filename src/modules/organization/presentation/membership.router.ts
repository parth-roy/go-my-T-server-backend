import { Router } from 'express';
import { membershipController } from './controllers/membership.controller';
import { authenticate } from '@shared/middleware/auth.middleware';
import { resolveContext } from '@shared/middleware/context.middleware';
import { validate } from '@shared/middleware/validate';
import { changeMemberRoleSchema } from './validators/membership.validator';

const membershipRouter = Router();

membershipRouter.use(authenticate, resolveContext);

membershipRouter.get('/', membershipController.listMembers);
membershipRouter.get('/:id', membershipController.getMember);

membershipRouter.patch(
  '/:id/role',
  validate(changeMemberRoleSchema, 'body'),
  membershipController.changeMemberRole
);

membershipRouter.post('/:id/suspend', membershipController.suspendMember);
membershipRouter.post('/:id/reactivate', membershipController.reactivateMember);
membershipRouter.post('/:id/terminate', membershipController.terminateMember); // Use POST /terminate as requested

export { membershipRouter };
