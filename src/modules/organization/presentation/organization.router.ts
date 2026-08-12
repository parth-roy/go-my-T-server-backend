import { Router } from 'express';
import { authenticate } from '@shared/middleware/auth.middleware';
import { validate } from '@shared/middleware/validate';
import { resolveContext } from '@shared/middleware/context.middleware';
import { OrganizationController } from './controllers/organization.controller';
import { createOrganizationSchema, inviteMemberSchema, updateOrganizationSchema } from './validators/organization.validator';
import { membershipRouter } from './membership.router';
import { branchRouter } from './branch.router';
import { designationRouter } from './designation.router';
import { employmentTypeRouter } from './employment-type.router';
import { employmentAssignmentRouter } from './employment-assignment.router';
import { workScheduleRouter } from './work-schedule.router';
import { shiftRouter } from './shift.router';

/**
 * Organization Domain Router
 *
 * Mounted at /api/v1/organizations behind the ORGANIZATION_DOMAIN_ENABLED feature flag.
 */
const organizationRouter = Router();
const organizationController = new OrganizationController();

// ── Placeholder health route — confirms the module is mounted and responding ──
organizationRouter.get('/status', (_req, res) => {
  res.json({
    success: true,
    message: 'Organization module is mounted and enabled.',
    milestone: 'M1 — Create Organization',
  });
});

// M1: Get My Organizations
organizationRouter.get(
  '/me',
  authenticate,
  organizationController.listMyOrganizations
);

// M1: Create Organization
organizationRouter.post(
  '/',
  authenticate,
  validate(createOrganizationSchema, 'body'),
  organizationController.create
);


organizationRouter.get('/:id', authenticate, resolveContext, organizationController.get);
organizationRouter.put('/:id', authenticate, resolveContext, validate(updateOrganizationSchema, 'body'), organizationController.update);
organizationRouter.delete('/:id', authenticate, resolveContext, organizationController.delete);

// M1: Branch CRUD sub-router
organizationRouter.use(
  '/branches',
  authenticate,
  resolveContext,
  branchRouter
);

// M2: Invitation
organizationRouter.post(
  '/invitations',
  authenticate,
  resolveContext,
  validate(inviteMemberSchema, 'body'),
  organizationController.inviteMember
);

organizationRouter.get(
  '/invitations/:token',
  organizationController.validateInvitation
);

organizationRouter.post(
  '/invitations/:token/accept',
  authenticate,
  organizationController.acceptInvitation
);

// M2: Membership sub-routers
organizationRouter.use('/members', membershipRouter);

// M6: Designation sub-router
organizationRouter.use('/:organizationId/designations', designationRouter);

// M4: Collaboration & Employment
organizationRouter.use('/employment-types', authenticate, resolveContext, employmentTypeRouter);
organizationRouter.use('/employment-assignments', authenticate, resolveContext, employmentAssignmentRouter);

// M5: Project + Shift sub-routers
organizationRouter.use('/work-schedules', authenticate, resolveContext, workScheduleRouter);
organizationRouter.use('/shifts', authenticate, resolveContext, shiftRouter);

export { organizationRouter };
