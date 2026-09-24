import { Request, Response, NextFunction } from 'express';
import * as BrokerService from './broker.service';
import { sendSuccess, sendCreated } from '@shared/utils/response';
import { UserRole } from '@prisma/client';

export async function postBrokerLoad(req: Request, res: Response, next: NextFunction) {
  try {
    const load = await BrokerService.createBrokerLoad(req.user!.id, req.body);
    sendCreated(res, load, 'Load posted successfully');
  } catch (err) {
    next(err);
  }
}

export async function listBrokerLoads(req: Request, res: Response, next: NextFunction) {
  try {
    const isAdmin = req.user!.role === UserRole.ADMIN;
    const result = await BrokerService.listBrokerLoads(req.query as any, req.user!.id, isAdmin);
    sendSuccess(res, result.loads, 'Loads fetched', 200, result.meta);
  } catch (err) {
    next(err);
  }
}

export async function getBrokerLoad(req: Request, res: Response, next: NextFunction) {
  try {
    const load = await BrokerService.getBrokerLoad(
      req.params.loadId as string,
      req.user!.id,
      req.user!.role as UserRole
    );
    sendSuccess(res, load);
  } catch (err) {
    next(err);
  }
}

export async function submitBrokerQuote(req: Request, res: Response, next: NextFunction) {
  try {
    const quote = await BrokerService.submitBrokerQuote(req.params.loadId as string, req.user!.id, req.body);
    sendCreated(res, quote, 'Quote submitted successfully');
  } catch (err) {
    next(err);
  }
}

export async function reviewBrokerQuote(req: Request, res: Response, next: NextFunction) {
  try {
    const quote = await BrokerService.reviewBrokerQuote(req.params.quoteId as string, req.user!.id, req.body);
    sendSuccess(res, quote, 'Quote reviewed');
  } catch (err) {
    next(err);
  }
}

export async function confirmAdvanceCollected(req: Request, res: Response, next: NextFunction) {
  try {
    const load = await BrokerService.confirmAdvanceCollected(req.params.loadId as string, req.user!.id, req.body);
    sendSuccess(res, load, 'Advance collected');
  } catch (err) {
    next(err);
  }
}

export async function confirmPhysicalLoading(req: Request, res: Response, next: NextFunction) {
  try {
    const load = await BrokerService.confirmPhysicalLoading(req.params.loadId as string, req.user!.phone, req.body);
    sendSuccess(res, load, 'Loading confirmed');
  } catch (err) {
    next(err);
  }
}

export async function markDriverDropout(req: Request, res: Response, next: NextFunction) {
  try {
    const load = await BrokerService.markDriverDropout(req.params.loadId as string, req.user!.id, req.body.reason);
    sendSuccess(res, load, 'Driver dropout marked');
  } catch (err) {
    next(err);
  }
}

export async function settleBounty(req: Request, res: Response, next: NextFunction) {
  try {
    const bounty = await BrokerService.settleBounty(req.params.quoteId as string, req.user!.id, req.body);
    sendSuccess(res, bounty, 'Bounty settled');
  } catch (err) {
    next(err);
  }
}

export async function getAdminBountyDashboard(req: Request, res: Response, next: NextFunction) {
  try {
    const query = {
      status: req.query.status as string,
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 10,
    };
    const result = await BrokerService.getAdminBountyDashboard(query);
    sendSuccess(res, result.ledgers, 'Bounty dashboard fetched', 200, result.meta);
  } catch (err) {
    next(err);
  }
}
