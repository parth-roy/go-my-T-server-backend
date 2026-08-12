import { Router } from 'express';
import { ShiftSwapController } from '../../controllers/scheduling/ShiftSwapController';

export const shiftSwapRouter = Router();
const controller = new ShiftSwapController();

shiftSwapRouter.post('/propose', controller.proposeSwap.bind(controller));
shiftSwapRouter.post('/:id/approve', controller.approveSwap.bind(controller));
