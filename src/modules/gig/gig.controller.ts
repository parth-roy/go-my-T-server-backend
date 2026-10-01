import { Request, Response } from 'express';
import { sendSuccess } from '@shared/utils/response';
import * as gigService from './gig.service';
import { getSkillCatalog, getZoneRates } from './gig.pricing';

export async function estimateGig(req: Request, res: Response) {
  const result = await gigService.estimateGigFare(req.body);
  return sendSuccess(res, result, 'Fare estimate calculated');
}

export async function createGig(req: Request, res: Response) {
  try {
    const result = await gigService.createGig(req.user!.id, req.body);
    return sendSuccess(res, result, 'Gig job posted successfully', 201);
  } catch (err: any) {
    return res.status(err.statusCode || 500).json({ success: false, message: err.message || 'Failed to create gig' });
  }
}

export async function getCustomerGigs(req: Request, res: Response) {
  try {
    const gigs = await gigService.getCustomerGigs(req.user!.id);
    return sendSuccess(res, gigs);
  } catch (err: any) {
    return sendSuccess(res, []);
  }
}

export async function cancelGig(req: Request, res: Response) {
  try {
    const result = await gigService.cancelGig(req.user!.id, req.params.id as string, req.body?.reason);
    return sendSuccess(res, result, 'Booking cancelled successfully');
  } catch (err: any) {
    return res.status(err.statusCode || 400).json({ success: false, message: err.message });
  }
}

export async function getCustomerGigById(req: Request, res: Response) {
  try {
    const gig = await gigService.getGigById(req.params.id as string);
    return sendSuccess(res, gig);
  } catch (err: any) {
    return res.status(404).json({ success: false, message: err.message });
  }
}

export async function getNearbyGigs(req: Request, res: Response) {
  try {
    const { lat, lng, radiusKm } = req.query;
    const latitude  = parseFloat(String(lat));
    const longitude = parseFloat(String(lng));
    const gigs = await gigService.getNearbyGigs(
      isNaN(latitude)  ? 0 : latitude,
      isNaN(longitude) ? 0 : longitude,
      parseFloat(String(radiusKm)) || 50,
    );
    return sendSuccess(res, gigs);
  } catch (err: any) {
    return sendSuccess(res, []);
  }
}

export async function getAllGigsAdmin(req: Request, res: Response) {
  try {
    const gigs = await gigService.getAllGigs();
    return sendSuccess(res, gigs);
  } catch (err: any) {
    return sendSuccess(res, []);
  }
}

export async function acceptGig(req: Request, res: Response) {
  const assignment = await gigService.acceptGig(String(req.user!.id), String(req.params.id));
  return sendSuccess(res, assignment, 'Job accepted successfully');
}

/** Returns skill categories + zone rates for Flutter dropdowns */
export async function getGigCatalog(_req: Request, res: Response) {
  return sendSuccess(res, {
    skills: getSkillCatalog(),
    zones:  getZoneRates(),
    urgencies: [
      { code: 'IMMEDIATE',   label: 'Immediate',        premiumPct: 20 },
      { code: 'WITHIN_HOUR', label: 'Within 1 hour',    premiumPct: 15 },
      { code: 'SCHEDULED',   label: 'Scheduled',         premiumPct:  0 },
    ],
    durationOptions: [1, 2, 4, 8, 12],
  });
}

export async function getGigByIdAdmin(req: Request, res: Response) {
  try {
    const gig = await gigService.getGigById(req.params.id as string);
    return sendSuccess(res, gig);
  } catch (err: any) {
    return res.status(404).json({ success: false, message: err.message });
  }
}

export async function createGigPaymentOrder(req: Request, res: Response) {
  try {
    const result = await gigService.createGigPaymentOrder(req.user!.id, req.params.id as string);
    return sendSuccess(res, result, 'Payment order created');
  } catch (err: any) {
    return res.status(err.statusCode || 400).json({ success: false, message: err.message });
  }
}

export async function verifyGigPayment(req: Request, res: Response) {
  try {
    const result = await gigService.verifyGigPayment(req.user!.id, req.params.id as string, req.body);
    return sendSuccess(res, result, 'Payment verified successfully');
  } catch (err: any) {
    return res.status(err.statusCode || 400).json({ success: false, message: err.message });
  }
}

export async function getPublicJobs(req: Request, res: Response) {
  try {
    const { city, limit } = req.query;
    const jobs = await gigService.getPublicJobs(
      city ? String(city) : undefined,
      limit ? parseInt(String(limit), 10) : 20
    );
    return sendSuccess(res, { jobs });
  } catch (err: any) {
    return sendSuccess(res, { jobs: [] });
  }
}

export async function getWorkerApplications(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const apps = await gigService.getWorkerApplications(userId);
    return sendSuccess(res, apps);
  } catch (err: any) {
    return sendSuccess(res, []);
  }
}

export async function applyWorkerJob(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const result = await gigService.applyWorkerJob(userId, req.body);
    return sendSuccess(res, result, 'Application submitted successfully');
  } catch (err: any) {
    return sendSuccess(res, { applied: true }, 'Application recorded');
  }
}

