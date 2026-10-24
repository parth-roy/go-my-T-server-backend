import { Request, Response, NextFunction } from 'express';
import { googleProviderService } from './googleProvider.service';

// ─────────────────────────────────────────────────────────────────────────────
// Google provider controller (GOOGLE_MAPS_MIGRATION_EXECUTION.md — T-0.3).
//
// Envelopes and 400 messages are BYTE-PARITY with maps.controller.ts so the
// customer client can swap base paths (/maps/* → /maps/g/*) with zero model or
// error-handling changes (Phase 2, decision D-5: same public auth model +
// per-route rate limits from T-0.4).
// ─────────────────────────────────────────────────────────────────────────────

const MAX_ROUTE_POINTS = 12;

export const googleProviderController = {
  autocomplete: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = req.query.input as string | undefined;
      if (!input) return res.status(400).json({ success: false, message: 'input query is required' });
      const sessionToken = typeof req.query.sessionToken === 'string' ? req.query.sessionToken : undefined;
      const predictions = await googleProviderService.autocomplete(input, sessionToken);
      res.status(200).json({ success: true, data: predictions });
    } catch (error) { next(error); }
  },

  placeDetails: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const placeId = req.query.placeId as string | undefined;
      if (!placeId) return res.status(400).json({ success: false, message: 'placeId is required' });
      const sessionToken = typeof req.query.sessionToken === 'string' ? req.query.sessionToken : undefined;
      const details = await googleProviderService.placeDetails(placeId, sessionToken);
      res.status(200).json({ success: true, data: details });
    } catch (error) { next(error); }
  },

  reverseGeocode: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { lat, lng } = req.query;
      if (lat === undefined || lng === undefined) return res.status(400).json({ success: false, message: 'lat and lng are required' });
      const result = await googleProviderService.reverseGeocode(parseFloat(lat as string), parseFloat(lng as string));
      res.status(200).json({ success: true, data: result });
    } catch (error) { next(error); }
  },

  /**
   * GET /maps/g/route?points=lat,lng;lat,lng[;lat,lng…]
   * Points ordered origin → stops → destination (mirrors legacy input contract).
   * Returns { distanceKm, durationMinutes, polyline } (polyline = Google encoded
   * polyline string, decision D-3 — client decodes).
   */
  route: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const raw = req.query.points as string | undefined;
      if (!raw) return res.status(400).json({ success: false, message: 'points is required (format: lat,lng;lat,lng)' });

      const points: Array<{ lat: number; lng: number }> = [];
      for (const pair of raw.split(';')) {
        const [latStr, lngStr] = pair.split(',');
        const lat = parseFloat((latStr ?? '').trim());
        const lng = parseFloat((lngStr ?? '').trim());
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          return res.status(400).json({ success: false, message: 'points must be "lat,lng" pairs separated by ";"' });
        }
        points.push({ lat, lng });
      }

      if (points.length < 2 || points.length > MAX_ROUTE_POINTS) {
        return res.status(400).json({ success: false, message: `points must contain between 2 and ${MAX_ROUTE_POINTS} coordinates` });
      }

      const result = await googleProviderService.route(points);
      res.status(200).json({ success: true, data: result });
    } catch (error) { next(error); }
  },
};
