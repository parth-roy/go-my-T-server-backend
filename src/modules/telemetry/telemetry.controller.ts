import { Request, Response, NextFunction } from 'express';
import { sendSuccess, sendCreated } from '@shared/utils/response';
import { TelemetryService } from './telemetry.service';
import type { DriverEngagementInput, DisintermediationFeedQuery } from './telemetry.schema';

export class TelemetryController {
    static async recordEngagement(req: Request, res: Response, next: NextFunction) {
        try {
            const audit = await TelemetryService.recordDriverEngagement(
                req.user!.id,
                req.body as DriverEngagementInput
            );
            return sendCreated(res, audit, 'Engagement action recorded successfully');
        } catch (error) {
            next(error);
        }
    }

    static async getDisintermediationFeed(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await TelemetryService.getDisintermediationFeed(
                req.query as unknown as DisintermediationFeedQuery
            );
            return sendSuccess(res, result.items, 'Disintermediation telemetry feed fetched', 200, result.pagination);
        } catch (error) {
            next(error);
        }
    }
}
