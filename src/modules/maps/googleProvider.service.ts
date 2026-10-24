import axios from 'axios';
import { GOOGLE_MAPS_API_KEY } from '@config/maps';
import { AppError } from '@shared/errors/AppError';
import { logger } from '@shared/logger';
import { getRedis } from '@config/redis';
import type { ReverseGeocodeResult } from './maps.service';

// ─────────────────────────────────────────────────────────────────────────────
// Google Maps provider (GOOGLE_MAPS_MIGRATION_EXECUTION.md — T-0.2).
//
// NEW FILE — maps.service.ts (Mapbox) is FROZEN (decisions D-1/D-2). This
// service backs only the additive /maps/g/* endpoints that serve the customer
// app. Driver, workforce, workforce_web, main-GMT-page and admin are unaffected.
//
// Response shapes are contract-parity with legacy maps.service.ts so the client
// can switch base paths without any model/UI changes (Phase 2).
//
// COST RULES (enforced here + asserted by test/maps-google.contract.test.js):
//  • Place Details field mask = Essentials allow-list ONLY — NEVER displayName (Pro).
//  • Routes: NEVER send routingPreference (TRAFFIC_AWARE = Pro SKU).
//  • Autocomplete: ALWAYS thread session token; ALWAYS includedRegionCodes ['in'].
//  • One server-side key (GOOGLE_MAPS_API_KEY); key values are never logged.
// ─────────────────────────────────────────────────────────────────────────────

// TTLs mirror legacy maps.service.ts exactly (same cache economics, same freshness)
const AUTOCOMPLETE_TTL  = 60 * 60 * 24;        // 24 hours  — place names rarely change
const REVERSE_GEO_TTL   = 60 * 60 * 6;         // 6 hours   — address at coords is stable
const PLACE_DETAILS_TTL = 60 * 60 * 24 * 7;    // 7 days    — place ID → coords is permanent
const ROUTE_TTL         = 120;                 // 120 seconds — short TTL, route is near-static without traffic (decision D-9)

const MAX_RETRIES = 2;                         // mirror legacy (2 attempts, 600ms * attempt backoff)
const REQUEST_TIMEOUT_MS = 5000;               // mirror legacy
const MAX_ROUTE_POINTS = 12;                   // origin + ≤10 waypoints + destination (Routes API DRIVE limit)

// ── Endpoints ────────────────────────────────────────────────────────────────
const AUTOCOMPLETE_URL = 'https://places.googleapis.com/v1/places:autocomplete';
const PLACE_DETAILS_URL = (placeId: string) => `https://places.googleapis.com/v1/places/${placeId}`;
const GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';   // Geocoding v3 REST (decision D-4)
const ROUTES_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';

// ── COST GUARD CONSTANTS (exported so contract tests assert them verbatim) ───
/** Essentials allow-list ONLY. NEVER add displayName / Pro / Enterprise fields. */
export const PLACE_DETAILS_FIELD_MASK = 'places.id,places.formattedAddress,places.location';
/** ComputeRoutes response fields. NEVER add routingPreference/traffic data here. */
export const ROUTE_FIELD_MASK = 'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline';
/** India-only filter for autocomplete (cost + relevance control, decision D-10). */
export const AUTOCOMPLETE_INCLUDED_REGION_CODES = ['in'];

// ── Config guard (T-0.6) ─────────────────────────────────────────────────────
function requireApiKey(): string {
  if (!GOOGLE_MAPS_API_KEY) {
    throw AppError.internal('Google Maps is not configured');
  }
  return GOOGLE_MAPS_API_KEY;
}

// ── Redis cache helpers (identical semantics to maps.service.ts) ─────────────
async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const raw = await getRedis().get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null; // Redis unavailable — fall through to API
  }
}

async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  try {
    await getRedis().setex(key, ttlSeconds, JSON.stringify(value));
  } catch {
    // Redis write failure is non-fatal — next request will call Google
  }
}

// ── Shared error helpers ─────────────────────────────────────────────────────
interface GoogleHttpError {
  response?: { status?: number; data?: any };
  message?: string;
}

function googleErrorStatus(error: GoogleHttpError): string | undefined {
  return error.response?.data?.error?.status;
}

/** Google "no results" conditions → graceful, not an outage. */
function isNoResultsError(error: GoogleHttpError): boolean {
  const status = googleErrorStatus(error);
  return (
    error.response?.status === 400 ||
    error.response?.status === 404 ||
    status === 'NOT_FOUND' ||
    status === 'INVALID_REQUEST' ||
    status === 'ZERO_RESULTS'
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export const googleProviderService = {
  /**
   * Autocomplete predictions via Places API (New).
   * Maps to the exact legacy shape: { placeId, description, mainText, secondaryText }.
   * Cache: 24h keyed by input ONLY (session token excluded from key — a cache hit
   * does not consume the Google session, mirroring legacy cache economics).
   * Graceful degradation: NOT_FOUND/400 → [] (same as legacy Mapbox empty features).
   */
  autocomplete: async (input: string, sessionToken?: string) => {
    const cacheKey = `gmaps:autocomplete:${input.toLowerCase().trim()}`;

    const cached = await cacheGet<Array<{
      placeId: string; description: string; mainText: string; secondaryText: string;
    }>>(cacheKey);
    if (cached) {
      logger.debug(`[GoogleMaps] Autocomplete cache HIT for "${input}"`);
      return cached;
    }

    const apiKey = requireApiKey();

    const body: Record<string, unknown> = {
      input,
      languageCode: 'en',
      includedRegionCodes: AUTOCOMPLETE_INCLUDED_REGION_CODES,
    };
    if (sessionToken) body.sessionToken = sessionToken;

    try {
      const response = await axios.post(AUTOCOMPLETE_URL, body, {
        headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey },
        timeout: REQUEST_TIMEOUT_MS,
      });

      const suggestions: any[] = response.data?.suggestions ?? [];
      const result: Array<{ placeId: string; description: string; mainText: string; secondaryText: string }> = [];

      for (const s of suggestions) {
        const pp = s?.placePrediction;
        if (!pp) continue;
        // PlacePrediction exposes the resource name ("places/ChIJ…"); some
        // responses also carry a bare placeId. Accept both, always store bare.
        const raw = (pp.placeId || pp.place || '').replace(/^places\//, '');
        if (!raw) continue;
        const description: string = pp.text?.text ?? '';
        const mainText: string = pp.structuredFormat?.mainText?.text ?? '';
        // Legacy parity: secondaryText = description minus "mainText, " prefix
        const secondaryText: string =
          pp.structuredFormat?.secondaryText?.text ??
          (mainText && description.startsWith(`${mainText}, `)
            ? description.slice(mainText.length + 2)
            : '');
        result.push({ placeId: raw, description, mainText, secondaryText });
      }

      await cacheSet(cacheKey, result, AUTOCOMPLETE_TTL);
      return result;
    } catch (error: any) {
      if (isNoResultsError(error)) return [];  // legacy returned [] for empty features
      logger.error('Google Autocomplete Error:', error.response?.data || error.message);
      throw AppError.internal('Failed to fetch place suggestions');
    }
  },

  /**
   * Place Details (New) → { lat, lng, name, address } (legacy shape).
   * Field mask = Essentials allow-list only (no displayName — Pro SKU).
   * `name` is derived from the first comma-segment of formattedAddress to keep
   * legacy {name} semantics WITHOUT billing the Pro displayName field.
   * Session token passed as query param (official pattern) so autocomplete→details
   * bill as ONE session (≤12 autos billed, details ends the session).
   * Cache: 7 days keyed by placeId (session token never part of the key).
   */
  placeDetails: async (placeId: string, sessionToken?: string) => {
    const cacheKey = `gmaps:place:${placeId}`;

    const cached = await cacheGet<{ lat: number; lng: number; name: string; address: string }>(cacheKey);
    if (cached) {
      logger.debug(`[GoogleMaps] Place details cache HIT for ${placeId}`);
      return cached;
    }

    const apiKey = requireApiKey();

    try {
      const response = await axios.get(PLACE_DETAILS_URL(placeId), {
        headers: {
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': PLACE_DETAILS_FIELD_MASK,
        },
        params: sessionToken ? { sessionToken } : undefined,   // official session-token pattern
        timeout: REQUEST_TIMEOUT_MS,
      });

      const place = response.data;
      if (!place?.location || !place?.formattedAddress) {
        throw new Error('No geometry found');
      }

      const formattedAddress: string = place.formattedAddress;
      const payload = {
        lat: place.location.latitude as number,
        lng: place.location.longitude as number,
        name: formattedAddress.split(',')[0].trim(),   // first comma-segment (avoids Pro displayName)
        address: formattedAddress,
      };

      await cacheSet(cacheKey, payload, PLACE_DETAILS_TTL);
      return payload;
    } catch (error: any) {
      logger.error('Google Place Details Error:', error.response?.data || error.message);
      throw AppError.internal('Failed to fetch place details');
    }
  },

  /**
   * Reverse geocode lat/lng → exact legacy ReverseGeocodeResult (contract parity,
   * see maps.service.ts interface — type is imported so shapes cannot drift).
   * Geocoding API v3 REST (decision D-4), 4dp rounding + 6h cache (mirror legacy).
   * ZERO_RESULTS / empty results → null (legacy behavior — NOT an error).
   */
  reverseGeocode: async (lat: number, lng: number): Promise<ReverseGeocodeResult | null> => {
    // Round to 4 decimal places (~11m precision) to improve cache hit rate — mirror legacy
    const rLat = Math.round(lat * 10000) / 10000;
    const rLng = Math.round(lng * 10000) / 10000;
    const cacheKey = `gmaps:reverse:${rLat},${rLng}`;

    const cached = await cacheGet<ReverseGeocodeResult>(cacheKey);
    if (cached) {
      logger.debug(`[GoogleMaps] Reverse geocode cache HIT for (${rLat},${rLng})`);
      return cached;
    }

    const apiKey = requireApiKey();

    try {
      const response = await axios.get(GEOCODE_URL, {
        params: { latlng: `${rLat},${rLng}`, key: apiKey, language: 'en' },
        timeout: REQUEST_TIMEOUT_MS,
      });

      const status: string = response.data?.status;
      const results: any[] = response.data?.results ?? [];
      if (status === 'ZERO_RESULTS' || results.length === 0) {
        return null;   // legacy: empty features → null (NOT cached — mirror)
      }

      const first = results[0];
      const components: any[] = first.address_components ?? [];
      const findComponent = (type: string) => components.find((c) => Array.isArray(c.types) && c.types.includes(type));

      const countryCtx  = findComponent('country');
      const stateCtx    = findComponent('administrative_area_level_1');
      const cityCtx     = findComponent('locality') ?? findComponent('administrative_area_level_2');
      const postcodeCtx = findComponent('postal_code');

      const payload: ReverseGeocodeResult = {
        address:     first.formatted_address ?? '',
        placeId:     first.place_id ?? '',
        lat:         rLat,          // legacy returns the rounded coords
        lng:         rLng,
        countryCode: countryCtx?.short_name ?? null,
        country:     countryCtx?.long_name ?? null,
        stateCode:   stateCtx?.short_name ?? null,
        state:       stateCtx?.long_name ?? null,
        city:        cityCtx?.long_name ?? null,
        pincode:     postcodeCtx?.long_name ?? null,
      };

      await cacheSet(cacheKey, payload, REVERSE_GEO_TTL);
      return payload;
    } catch (error: any) {
      logger.error('Google Geocoding Error:', error.response?.data || error.message);
      throw AppError.internal('Failed to reverse geocode coordinates');
    }
  },

  /**
   * Multi-point route via Routes API computeRoutes (DRIVE) →
   * { distanceKm, durationMinutes, polyline }.
   *  • distanceKm / durationMinutes mirror legacy rounding EXACTLY
   *    (distance/1000 raw, Math.round(duration/60)) so pricing-style consumers
   *    see identical semantics to Mapbox-derived values.
   *  • polyline = Google encoded polyline string; client decodes (decision D-3).
   *  • NO routingPreference ever (TRAFFIC_AWARE = Pro SKU) — cost rule.
   *  • Points ordered origin → stops → destination; ≤12 total (≤10 waypoints).
   *  • <2 points → { distanceKm:0, durationMinutes:0 } parity with legacy; the new
   *    `polyline` field is '' (client draws its straight-line fallback).
   *  • Throws on failure after retries (client-side straight-line fallback) —
   *    decision D-9. Cache: 120s keyed by exact points (never rounded).
   */
  route: async (points: Array<{ lat: number; lng: number }>) => {
    if (!points || points.length < 2) {
      return { distanceKm: 0, durationMinutes: 0, polyline: '' };
    }
    if (points.length > MAX_ROUTE_POINTS) {
      throw AppError.badRequest(`A maximum of ${MAX_ROUTE_POINTS} route points is supported`);
    }

    // Exact coords in the key — route coordinates must never be rounded
    const routeKey = points.map((p) => `${p.lat},${p.lng}`).join(';');
    const cacheKey = `gmaps:route:${routeKey}`;

    const cached = await cacheGet<{ distanceKm: number; durationMinutes: number; polyline: string }>(cacheKey);
    if (cached) {
      logger.debug(`[GoogleMaps] Route cache HIT for ${points.length} points`);
      return cached;
    }

    const apiKey = requireApiKey();

    const toLatLng = (p: { lat: number; lng: number }) => ({
      location: { latLng: { latitude: p.lat, longitude: p.lng } },
    });

    const body: Record<string, unknown> = {
      origin: toLatLng(points[0]),
      destination: toLatLng(points[points.length - 1]),
      travelMode: 'DRIVE',
      // routingPreference intentionally omitted — traffic-aware routing is Pro (cost rule)
    };
    if (points.length > 2) {
      body.waypoints = points.slice(1, -1).map(toLatLng);
    }

    let lastError: any;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await axios.post(ROUTES_URL, body, {
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': ROUTE_FIELD_MASK,
          },
          timeout: REQUEST_TIMEOUT_MS,
        });

        const route = response.data?.routes?.[0];
        if (!route) throw new Error('No route found');

        const payload = {
          distanceKm: (route.distanceMeters ?? 0) / 1000,             // mirror legacy: raw /1000
          durationMinutes: Math.round(parseInt(route.duration ?? '0', 10) / 60), // mirror legacy: round(/60)
          polyline: route.polyline?.encodedPolyline ?? '',
        };

        await cacheSet(cacheKey, payload, ROUTE_TTL);
        return payload;
      } catch (error: any) {
        lastError = error;
        if (attempt < MAX_RETRIES) {
          logger.warn(`Google Routes attempt ${attempt} failed — retrying in ${600 * attempt}ms`);
          await sleep(600 * attempt);
        }
      }
    }

    logger.error('Google Routes Error:', lastError?.response?.data || lastError?.message);
    // No server-side haversine fallback (legacy had one) — decision D-9:
    // throw and let the client draw its existing straight-line fallback.
    throw AppError.internal('Failed to fetch route');
  },
};
