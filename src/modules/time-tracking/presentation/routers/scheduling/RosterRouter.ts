import { Router } from 'express';
import { RosterController } from '../../controllers/scheduling/RosterController';

export const rosterRouter = Router();
const controller = new RosterController();

rosterRouter.post('/draft', controller.draftRoster.bind(controller));
rosterRouter.post('/:id/auto-schedule', controller.runAutoScheduler.bind(controller));
rosterRouter.post('/:id/publish', controller.publishRoster.bind(controller));
