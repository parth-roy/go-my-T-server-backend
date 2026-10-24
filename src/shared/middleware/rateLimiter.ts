import { rateLimit } from 'express-rate-limit';

// ─────────────────────────────────────────────────────────────────────────────
// Per-endpoint rate limiters (GOOGLE_MAPS_MIGRATION_EXECUTION.md — T-0.4).
//
// Scope: used ONLY on the new Google-backed /maps/g/* endpoints. Legacy /maps/*
// routes and the global limiter in app.ts are intentionally untouched — other
// apps (Driver, workforce, workforce_web, main-GMT-page) depend on them
// (cross-app audit risk #4: adding limits to legacy endpoints = separate
// approval required).
//
// Purpose: primary abuse barrier for billed Google Maps APIs. Without it every
// public request translates into Geocoding/Places/Routes quota spend.
// Limits are initial values, tunable without contract changes.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Factory producing a limiter with the standard error envelope used across
 * the app ({ success:false, message, code:'RATE_LIMITED' } — mirrors app.ts).
 */
export function createRateLimiter(windowMs: number, max: number, message: string) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message, code: 'RATE_LIMITED' },
  });
}

const RATE_LIMIT_MESSAGE = 'Too many requests, please try again later.';

/** 40/min — search-as-you-type traffic (heaviest call rate, 24h cache absorbs repeats). */
export const googleAutocompleteLimiter = createRateLimiter(60 * 1000, 40, RATE_LIMIT_MESSAGE);

/** 30/min — one details call per selection; bursts indicate scripted use. */
export const googlePlaceDetailsLimiter = createRateLimiter(60 * 1000, 30, RATE_LIMIT_MESSAGE);

/** 30/min — reverse geocode fires on map-idle; heavy polling is abuse. */
export const googleReverseGeocodeLimiter = createRateLimiter(60 * 1000, 30, RATE_LIMIT_MESSAGE);

/** 10/min — most expensive call (Routes API); client also throttles (T-3.1). */
export const googleRouteLimiter = createRateLimiter(60 * 1000, 10, RATE_LIMIT_MESSAGE);
