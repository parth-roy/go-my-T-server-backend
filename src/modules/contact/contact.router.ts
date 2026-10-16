import { Router } from 'express';
import { validate } from '@shared/middleware/validate';
import * as ContactController from './contact.controller';
import { createContactMessageSchema, updateContactMessageStatusSchema, contactIdParamSchema } from './contact.schema';
import { authenticate, requireRole } from '@shared/middleware/auth.middleware';

export const publicContactRouter = Router();

publicContactRouter.post(
  '/',
  validate(createContactMessageSchema),
  ContactController.createMessage
);

export const adminContactRouter = Router();

adminContactRouter.use(authenticate, requireRole('ADMIN'));

adminContactRouter.get(
  '/',
  ContactController.getMessages
);

adminContactRouter.patch(
  '/:id/status',
  validate(contactIdParamSchema, 'params'),
  validate(updateContactMessageStatusSchema, 'body'),
  ContactController.updateStatus
);
