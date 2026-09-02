import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '@shared/utils/response';
import * as service from './lead-unlock.service';
import {
  InitiateLeadUnlockSchema,
  VerifyLeadUnlockSchema,
  PreviewNearbyExpertsSchema,
} from './lead-unlock.schema';

export async function initiate(req: Request, res: Response, next: NextFunction) {
  try {
    const input = InitiateLeadUnlockSchema.parse(req.body);
    const result = await service.initiateLeadUnlock(req.user!.id, input);
    sendSuccess(res, result, 'Lead unlock initiated');
  } catch (err) {
    next(err);
  }
}

export async function verify(req: Request, res: Response, next: NextFunction) {
  try {
    const input = VerifyLeadUnlockSchema.parse(req.body);
    const result = await service.verifyLeadUnlock(req.user!.id, input);
    sendSuccess(res, result, 'Lead unlock verified and experts revealed');
  } catch (err) {
    next(err);
  }
}

export async function getUnlocked(req: Request, res: Response, next: NextFunction) {
  try {
    const transactionId = Array.isArray(req.params.transactionId)
      ? req.params.transactionId[0]
      : req.params.transactionId;
    const result = await service.getUnlockedWorkers(req.user!.id, transactionId);
    sendSuccess(res, result, 'Unlocked workers retrieved');
  } catch (err) {
    next(err);
  }
}

export async function preview(req: Request, res: Response, next: NextFunction) {
  try {
    const input = PreviewNearbyExpertsSchema.parse(req.query);
    const result = await service.previewNearbyExperts(input);
    sendSuccess(res, result, 'Nearby experts preview');
  } catch (err) {
    next(err);
  }
}
