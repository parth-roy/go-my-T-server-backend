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

export async function getAdminAgents(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await BrokerService.getAdminAgents(req.query as any);
    sendSuccess(res, result.agents, 'Agents fetched', 200, result.meta);
  } catch (err) {
    next(err);
  }
}

export async function updateAgentKyc(req: Request, res: Response, next: NextFunction) {
  try {
    const agent = await BrokerService.updateAgentKyc(req.params.agentId as string, req.user!.id, req.body);
    sendSuccess(res, agent, 'Agent KYC status updated');
  } catch (err) {
    next(err);
  }
}

export async function getBrokerConfig(req: Request, res: Response, next: NextFunction) {
  try {
    const config = await BrokerService.getBrokerConfig();
    sendSuccess(res, config, 'Broker configuration fetched');
  } catch (err) {
    next(err);
  }
}

export async function updateBrokerConfig(req: Request, res: Response, next: NextFunction) {
  try {
    const config = await BrokerService.updateBrokerConfig(req.user!.id, req.body);
    sendSuccess(res, config, 'Broker configuration updated');
  } catch (err) {
    next(err);
  }
}

export async function getAgentProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = await BrokerService.getAgentProfile(req.user!.id);
    sendSuccess(res, profile, 'Agent profile fetched');
  } catch (err) {
    next(err);
  }
}

export async function updateAgentProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = await BrokerService.updateAgentProfile(req.user!.id, req.body);
    sendSuccess(res, profile, 'Agent profile updated');
  } catch (err) {
    next(err);
  }
}

export async function getAgentWallet(req: Request, res: Response, next: NextFunction) {
  try {
    const wallet = await BrokerService.getAgentWallet(req.user!.id);
    sendSuccess(res, wallet, 'Agent wallet fetched');
  } catch (err) {
    next(err);
  }
}

export async function getAgentTracking(req: Request, res: Response, next: NextFunction) {
  try {
    const tracking = await BrokerService.getAgentTracking(req.user!.id);
    sendSuccess(res, tracking, 'Agent tracking fetched');
  } catch (err) {
    next(err);
  }
}

export async function adminCreateAgent(req: Request, res: Response, next: NextFunction) {
  try {
    const agent = await BrokerService.adminCreateAgent(req.user!.id, req.body);
    sendCreated(res, agent, 'Transport Agent registered successfully');
  } catch (err) {
    next(err);
  }
}

export async function getAdminAgentById(req: Request, res: Response, next: NextFunction) {
  try {
    const agent = await BrokerService.getAdminAgentById(req.params.agentId as string);
    sendSuccess(res, agent, 'Agent details fetched');
  } catch (err) {
    next(err);
  }
}

export async function adminUpdateAgent(req: Request, res: Response, next: NextFunction) {
  try {
    const agent = await BrokerService.adminUpdateAgent(req.params.agentId as string, req.user!.id, req.body);
    sendSuccess(res, agent, 'Agent profile updated');
  } catch (err) {
    next(err);
  }
}

export async function adminToggleAgentStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const agent = await BrokerService.adminToggleAgentStatus(req.params.agentId as string, req.user!.id, req.body);
    sendSuccess(res, agent, 'Agent status updated');
  } catch (err) {
    next(err);
  }
}

export async function adminDeleteAgent(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await BrokerService.adminDeleteAgent(req.params.agentId as string, req.user!.id);
    sendSuccess(res, result, 'Agent deleted successfully');
  } catch (err) {
    next(err);
  }
}

export async function adminBulkDeleteAgents(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await BrokerService.adminBulkDeleteAgents(req.user!.id, req.body);
    sendSuccess(res, result, 'Bulk delete processed');
  } catch (err) {
    next(err);
  }
}

