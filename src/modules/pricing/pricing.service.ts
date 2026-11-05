/**
 * pricing.service.ts — GoMyTruck Pricing Engine (Stage 1)
 *
 * Formula:
 *   P_total = (P_base + D_trip × C_dist + T_est × C_time + FS) × M(θ) + L_charge + I_charge
 *   P_customer = P_total × (1 + GST)
 *   P_driver = P_total × (1 - τ) + toll + waiting
 *
 * Surge multiplier M(θ) = 1.0 in Stage 1 (activated in Stage 2).
 * Server is always the source of truth for fare. Client estimate is validation-only.
 */

import { prisma } from '@shared/db/prisma';
import { AppError } from '@shared/errors/AppError';
import { mapsService } from '@modules/maps/maps.service';
import { logger } from '@shared/logger';
import { getRedis } from '@config/redis';
import crypto from 'crypto';
import { dfmePricingEngine } from './dfme-engine';
import type {
  FareEstimateRequest,
  FareEstimateResponse,
  FareComponents,
  VehicleInfo,
  PricingConfigMap,
  WaitingChargeResult,
} from './pricing.types';

// ── Constants (never configurable via UI — requires code deploy to change) ────
const GST_FREIGHT  = 0.05;  // 5%  — HSN 9965 (freight transport)
const GST_SERVICES = 0.18;  // 18% — HSN 8428/9983/9971 (loading, insurance, platform fee)
const INDIA_LAT_MIN = 6.4;  const INDIA_LAT_MAX = 37.6;
const INDIA_LNG_MIN = 68.1; const INDIA_LNG_MAX = 97.4;
const SAME_LOCATION_THRESHOLD_KM = 0.05; // 50 metres

// ── Cache keys & TTLs ─────────────────────────────────────────────────────────
const VEHICLE_CACHE_KEY = 'pricing:vehicles:all';
const CONFIG_CACHE_KEY  = 'pricing:config';
const VEHICLE_CACHE_TTL = 300;  // 5 minutes
const CONFIG_CACHE_TTL  = 120;  // 2 minutes

// ─────────────────────────────────────────────
// PRIVATE HELPERS
// ─────────────────────────────────────────────

function round(value: number, decimals = 0): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isInIndia(lat: number, lng: number): boolean {
  // Andaman & Nicobar exception
  if (lat >= 6.0 && lat <= 14.5 && lng >= 92.0 && lng <= 94.5) return true;
  return lat >= INDIA_LAT_MIN && lat <= INDIA_LAT_MAX &&
         lng >= INDIA_LNG_MIN && lng <= INDIA_LNG_MAX;
}

function isSameLocation(lat1: number, lng1: number, lat2: number, lng2: number): boolean {
  return haversineKm(lat1, lng1, lat2, lng2) < SAME_LOCATION_THRESHOLD_KM;
}

async function getVehiclePricingCached() {
  const redis = getRedis();
  try {
    const cached = await redis.get(VEHICLE_CACHE_KEY);
    if (cached) return JSON.parse(cached);
  } catch { /* Redis unavailable — fall through to DB */ }

  const vehicles = await prisma.vehicleTypePricing.findMany({ where: { isActive: true } });
  try {
    await redis.setex(VEHICLE_CACHE_KEY, VEHICLE_CACHE_TTL, JSON.stringify(vehicles));
  } catch { /* non-fatal */ }
  return vehicles;
}

async function getPricingConfig(): Promise<PricingConfigMap> {
  const redis = getRedis();
  try {
    const cached = await redis.get(CONFIG_CACHE_KEY);
    if (cached) return JSON.parse(cached) as PricingConfigMap;
  } catch { /* Redis unavailable — fall through to DB */ }

  const rows = await (prisma as any).pricingConfig.findMany();
  const raw: Record<string, string> = Object.fromEntries(rows.map((r: any) => [r.key, r.value]));

  const config: PricingConfigMap = {
    platform_commission_rate:              parseFloat(raw.platform_commission_rate               ?? '0.10'),
    commission_lifecycle_stage:            raw.commission_lifecycle_stage                        ?? 'MARKET_ENTRY',
    insurance_base_charge:                 parseFloat(raw.insurance_base_charge                  ?? '49'),
    diesel_baseline_price:                 parseFloat(raw.diesel_baseline_price                  ?? '90'),
    diesel_current_price:                  parseFloat(raw.diesel_current_price                   ?? '90'),
    fuel_surcharge_enabled:               (raw.fuel_surcharge_enabled                            ?? 'true') === 'true',
    fuel_surcharge_threshold_pct:          parseFloat(raw.fuel_surcharge_threshold_pct           ?? '5'),
    fuel_surcharge_max_pct_of_distance_fare: parseFloat(raw.fuel_surcharge_max_pct_of_distance_fare ?? '20'),
    gst_rate_freight:                      parseFloat(raw.gst_rate_freight                       ?? '0.05'),
    gst_rate_services:                     parseFloat(raw.gst_rate_services                      ?? '0.18'),
    surge_enabled:                        (raw.surge_enabled                                     ?? 'false') === 'true',
    surge_k_parameter:                     parseFloat(raw.surge_k_parameter                      ?? '0.25'),
    festival_modifier_active:             (raw.festival_modifier_active                          ?? 'false') === 'true',
    festival_modifier_value:               parseFloat(raw.festival_modifier_value                ?? '1.35'),
    time_charge_enabled:                  (raw.time_charge_enabled                               ?? 'true') === 'true',
    waiting_charge_block_minutes:          parseFloat(raw.waiting_charge_block_minutes            ?? '30'),
    max_trip_distance_km:                  parseFloat(raw.max_trip_distance_km                   ?? '500'),
    min_trip_distance_km:                  parseFloat(raw.min_trip_distance_km                   ?? '1'),
    max_coin_redemption_pct:               parseFloat(raw.max_coin_redemption_pct                ?? '20'),
    coin_to_rupee_rate:                    parseFloat(raw.coin_to_rupee_rate                     ?? '0.90'),
  };

  try {
    await redis.setex(CONFIG_CACHE_KEY, CONFIG_CACHE_TTL, JSON.stringify(config));
  } catch { /* non-fatal */ }

  return config;
}

function computeFuelSurcharge(distanceFare: number, config: PricingConfigMap): number {
  if (!config.fuel_surcharge_enabled) return 0;
  const ratio = config.diesel_current_price / config.diesel_baseline_price;
  const threshold = 1 + config.fuel_surcharge_threshold_pct / 100;
  if (ratio <= threshold) return 0;
  const surchargeMultiplier = (ratio - threshold) * 2;
  const raw = distanceFare * surchargeMultiplier;
  const cap = distanceFare * (config.fuel_surcharge_max_pct_of_distance_fare / 100);
  return Math.min(raw, cap);
}

function computeTimeFare(durationMinutes: number, freeMinutes: number, ratePerMin: number, enabled: boolean): number {
  if (!enabled) return 0;
  const billableMinutes = Math.max(0, durationMinutes - freeMinutes);
  const raw = billableMinutes * ratePerMin;
  // Cap: timeFare cannot exceed 2× distance fare (applied by caller)
  return raw;
}

async function getSurgeMultiplier(
  pickupLat: number, pickupLng: number,
  vehicleType: string, config: PricingConfigMap,
): Promise<{ multiplier: number; surgeActive: boolean; surgeReason: string | null }> {
  // Stage 1: surge always disabled
  if (!config.surge_enabled) {
    return { multiplier: 1.0, surgeActive: false, surgeReason: null };
  }

  // Stage 2+: read from Redis zone cache
  try {
    const redis = getRedis();
    // Zone key would be computed from H3 geohash of pickup location
    // For now, return 1.0 until H3 library is integrated
    const zoneKey = `surge:multiplier:placeholder:${vehicleType}`;
    const cached = await redis.get(zoneKey);
    if (cached) {
      const multiplier = parseFloat(cached);
      return {
        multiplier,
        surgeActive: multiplier > 1.0,
        surgeReason: multiplier > 1.0 ? 'High demand in your area' : null,
      };
    }
  } catch { /* Redis down — default to 1.0 */ }

  return { multiplier: 1.0, surgeActive: false, surgeReason: null };
}

async function enforceDriverMPP(
  driverPayoutGross: number,
  totalFare: number,
  commissionRate: number,
  distanceKm: number,
  tcoPerKm: number,
  bookingId?: string,
): Promise<{ finalPayout: number; effectiveCommission: number; subsidyAmount: number }> {
  const minimumPayout = distanceKm * tcoPerKm;

  if (driverPayoutGross >= minimumPayout) {
    return { finalPayout: driverPayoutGross, effectiveCommission: commissionRate, subsidyAmount: 0 };
  }

  // Step 1: Compress commission to 0%
  const payoutAtZeroCommission = totalFare;
  if (payoutAtZeroCommission >= minimumPayout) {
    logger.info(`[Pricing] MPP: commission compressed to 0% for ${distanceKm}km trip (was ${commissionRate * 100}%)`);
    return { finalPayout: totalFare, effectiveCommission: 0, subsidyAmount: 0 };
  }

  // Step 2: Platform subsidy
  const subsidyAmount = minimumPayout - payoutAtZeroCommission;
  logger.warn(`[Pricing] MPP: platform subsidy ₹${subsidyAmount} required for ${distanceKm}km trip`);

  // Log subsidy
  try {
    await (prisma as any).driverPayoutSubsidy.create({
      data: {
        bookingId: bookingId ?? null,
        vehicleType: 'UNKNOWN', // caller fills this
        distanceKm,
        originalCommission: commissionRate,
        effectiveCommission: 0,
        subsidyAmount,
        totalFare,
        driverPayout: minimumPayout,
        reason: 'MPP_FLOOR',
      },
    });
  } catch { /* non-fatal */ }

  return { finalPayout: minimumPayout, effectiveCommission: 0, subsidyAmount };
}

async function writePricingAuditLog(
  req: FareEstimateRequest,
  components: FareComponents,
  source: 'estimate' | 'booking_confirm' | 'admin',
): Promise<string | undefined> {
  try {
    const auditLog = await (prisma as any).pricingAuditLog.create({
      data: {
        bookingId:        req.bookingId ?? null,
        vehicleType:      req.vehicleType,
        pickupLat:        req.pickupLat,
        pickupLng:        req.pickupLng,
        dropLat:          req.dropLat,
        dropLng:          req.dropLng,
        distanceKm:       components.distanceKm,
        durationMinutes:  components.durationMinutes,
        baseFare:         components.baseFare,
        distanceFare:     components.distanceFare,
        timeFare:         components.timeFare,
        fuelSurcharge:    components.fuelSurcharge,
        surgeMultiplier:  components.surgeMultiplier,
        loadingCharge:    components.loadingCharge,
        insuranceCharge:  components.insuranceCharge,
        subtotal:         components.subtotal,
        totalFare:        components.totalFare,
        freightGst:       components.freightGst,
        loadingGst:       components.loadingGst,
        insuranceGst:     components.insuranceGst,
        totalGst:         components.totalGst,
        grandTotal:       components.grandTotal,
        commissionRate:   components.commissionRate,
        commissionAmount: components.commissionAmount,
        driverPayout:     components.driverPayout,
        subsidyAmount:    components.subsidyAmount,
        source,
        distanceSource:   components.distanceSource,
      },
    });
    return auditLog.id;
  } catch (err) {
    logger.error('[Pricing] Failed to write audit log:', err);
    // Non-fatal — do not block fare estimation
    return undefined;
  }
}

// ─────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────

export const pricingService = {

  // ── Get all active vehicle types (cached) ────────────────────────────────
  getVehicleTypes: async (): Promise<VehicleInfo[]> => {
    const vehicles = await getVehiclePricingCached();
    return vehicles.map((v: any) => ({
      vehicleType:           v.vehicleType,
      displayName:           v.displayName,
      baseFare:              v.baseFare,
      baseIncludesKm:        v.baseIncludesKm ?? 3,
      pricePerKm:            v.pricePerKm,
      minFare:               v.minFare,
      capacityKg:            v.capacityKg,
      capacityDesc:          v.capacityDesc,
      estimatedEta:          v.estimatedEta,
      imageUrl:              v.imageUrl ?? null,
      waitingFreeMinutes:    v.waitingFreeMinutes ?? 30,
      waitingChargePerBlock: v.waitingChargePerBlock ?? 100,
      loadingChargePerHelper:v.loadingChargePerHelper ?? 400,
      maxHelpers:            v.maxHelpers ?? 2,
      surgeHardCap:          v.surgeHardCap ?? 1.5,
    }));
  },

  // ── Main fare estimation ─────────────────────────────────────────────────
  estimateFare: async (req: FareEstimateRequest): Promise<FareEstimateResponse> => {
    const {
      pickupLat, pickupLng, dropLat, dropLng, vehicleType,
      hasLoadingService, helperCount, insuranceOpted,
    } = req;

    // ── [1] Coordinate validation ─────────────────────────────────────────
    if (!isInIndia(pickupLat, pickupLng)) {
      throw AppError.badRequest('Pickup location must be within India', 'OUT_OF_SERVICE_AREA');
    }

    const normalizedStops: Array<{ lat: number; lng: number }> = [];
    if (req.stops && req.stops.length > 0) {
      for (let i = 0; i < req.stops.length; i++) {
        const s = req.stops[i];
        const sLat = s.latitude ?? s.lat;
        const sLng = s.longitude ?? s.lng;
        if (sLat === undefined || sLng === undefined) continue;
        if (!isInIndia(sLat, sLng)) {
          throw AppError.badRequest(`Delivery stop ${i + 1} must be within India`, 'OUT_OF_SERVICE_AREA');
        }
        normalizedStops.push({ lat: sLat, lng: sLng });
      }
    }

    if (normalizedStops.length === 0) {
      if (!isInIndia(dropLat, dropLng)) {
        throw AppError.badRequest('Delivery location must be within India', 'OUT_OF_SERVICE_AREA');
      }
      if (isSameLocation(pickupLat, pickupLng, dropLat, dropLng)) {
        throw AppError.badRequest('Pickup and delivery location cannot be the same', 'SAME_LOCATION');
      }
      normalizedStops.push({ lat: dropLat, lng: dropLng });
    } else {
      if (isSameLocation(pickupLat, pickupLng, normalizedStops[0].lat, normalizedStops[0].lng)) {
        throw AppError.badRequest('Pickup and delivery location cannot be the same', 'SAME_LOCATION');
      }
      for (let i = 0; i < normalizedStops.length - 1; i++) {
        if (isSameLocation(normalizedStops[i].lat, normalizedStops[i].lng, normalizedStops[i + 1].lat, normalizedStops[i + 1].lng)) {
          throw AppError.badRequest(`Stop ${i + 1} and Stop ${i + 2} cannot be the same location`, 'SAME_LOCATION');
        }
      }
    }

    // ── [2] Vehicle lookup ────────────────────────────────────────────────
    const vehicles = await getVehiclePricingCached();
    const vehicle = vehicles.find((v: any) => v.vehicleType === vehicleType);
    if (!vehicle) {
      throw AppError.badRequest('Invalid or inactive vehicle type', 'INVALID_VEHICLE_TYPE');
    }

    // ── [3] Helper count validation ───────────────────────────────────────
    const helpers = helperCount ?? (hasLoadingService ? 1 : 0);
    // Removed maxHelpers check: Customer can now request any number of helpers.

    // ── [4] Distance & duration ───────────────────────────────────────────
    const routePoints = [{ lat: pickupLat, lng: pickupLng }, ...normalizedStops];
    const { distanceKm, durationMinutes } = await mapsService.getRouteDistanceMatrix(routePoints);

    // Get pricing config
    const config = await getPricingConfig();

    // ── Maximum distance validation removed for all-India service ──────────────
    if (distanceKm < config.min_trip_distance_km) {
      throw AppError.badRequest(
        `Minimum trip distance is ${config.min_trip_distance_km} km`,
        'DISTANCE_TOO_SHORT'
      );
    }

    const distanceSource = (distanceKm > 0 ? 'mapbox' : 'haversine_fallback') as 'mapbox' | 'haversine_fallback';

    // ── [DFME v2.6] Algorithmic Pricing Engine Execution ─────────────────
    let originCity = req.originCity || '';
    let originState = req.originState || '';
    let destCity = req.destinationCity || '';
    let destState = req.destinationState || '';

    // Fast geocode reverse fallback if not provided
    if (!originCity || !originState) {
      try {
        const geoO = await mapsService.reverseGeocode(pickupLat, pickupLng);
        if (geoO) {
          originCity = geoO.city || originCity;
          originState = geoO.state || originState;
        }
      } catch {}
    }
    if (!destCity || !destState) {
      try {
        const lastPt = normalizedStops[normalizedStops.length - 1];
        const geoD = await mapsService.reverseGeocode(lastPt.lat, lastPt.lng);
        if (geoD) {
          destCity = geoD.city || destCity;
          destState = geoD.state || destState;
        }
      } catch {}
    }

    const dfmeQuote = dfmePricingEngine.priceShipment({
      enquiryId: req.bookingId ?? `ENQ-${Date.now()}`,
      originCity,
      originState,
      destinationCity: destCity,
      destinationState: destState,
      tripDistanceKm: distanceKm,
      estimatedDurationMin: durationMinutes,
      vehicleCode: vehicleType,
      goodsType: req.goodsType ?? 'General Goods',
      goodsWeightKg: req.goodsWeightKg ?? vehicle.capacityKg,
      stopsCount: normalizedStops.length,
      channel: 'CUSTOMER_APP',
      isPtl: req.isPtl,
      ptlLengthCm: req.ptlLengthCm,
      ptlBreadthCm: req.ptlBreadthCm,
      ptlHeightCm: req.ptlHeightCm,
      ptlPackages: req.ptlPackages,
      declaredInvoiceValueInr: req.declaredInvoiceValueInr,
      riskType: req.riskType,
      isOdaRemote: req.isOdaRemote,
      isHolidayOrSunday: req.isHolidayOrSunday,
    });

    // Core fare governed by DFME sell quote (with minimum fare floor safeguard)
    const coreFare = dfmeQuote.customerSellQuoteInr;
    const baseFare = round(Math.min(vehicle.baseFare, coreFare * 0.30));
    const distanceFare = round(Math.max(0, coreFare - baseFare));
    const timeFare = 0; // Integrated in DFME spatial congestion model
    const fuelSurcharge = round(dfmeQuote.fuelCostInr);
    const effectiveSurge = 1.0;

    // ── [11] Add-ons (not surged) ─────────────────────────────────────────
    const loadingCharge   = helpers * (vehicle.loadingChargePerHelper ?? 400);
    const insuranceCharge = insuranceOpted ? config.insurance_base_charge : 0;

    // ── [12–13] Subtotal + minimum fare floor ─────────────────────────────
    const subtotal  = round(coreFare + loadingCharge + insuranceCharge);
    const totalFare = Math.max(subtotal, vehicle.minFare + loadingCharge + insuranceCharge);

    // ── [14] GST ──────────────────────────────────────────────────────────
    const freightBase  = totalFare - loadingCharge - insuranceCharge;
    const freightGst   = round(freightBase    * config.gst_rate_freight);
    const loadingGst   = round(loadingCharge  * config.gst_rate_services);
    const insuranceGst = round(insuranceCharge * config.gst_rate_services);
    const totalGst     = freightGst + loadingGst + insuranceGst;
    const grandTotal   = round(totalFare + totalGst);

    // ── [15] Driver Payout & Platform Margin (Guaranteed by DFME Operating Floor & Buy Target) ──
    const dfmeDriverTarget = round(dfmeQuote.operatorBuyTargetInr + loadingCharge);
    const driverPayoutGross = Math.max(dfmeDriverTarget, totalFare - round(totalFare * config.platform_commission_rate));
    const commissionAmount = round(Math.max(0, totalFare - driverPayoutGross));
    const effectiveCommission = totalFare > 0 ? round(commissionAmount / totalFare, 4) : 0;

    // ── [16] MPP enforcement ──────────────────────────────────────────────
    const { finalPayout, subsidyAmount } = await enforceDriverMPP(
      driverPayoutGross,
      totalFare,
      effectiveCommission,
      distanceKm,
      vehicle.tcoPerKm ?? 15,
      req.bookingId,
    );

    // ── Ephemeral Quote Token (15-min cache for 0% price disruption on booking) ──
    const quoteToken = `qt_${crypto.randomUUID()}`;
    try {
      const redis = getRedis();
      const quoteCache = {
        quoteToken,
        pickupLat,
        pickupLng,
        dropLat,
        dropLng,
        vehicleType,
        totalFare,
        grandTotal,
        driverPayout: finalPayout,
        estimatedDistanceKm: round(distanceKm, 1),
        estimatedDurationMinutes: durationMinutes,
        createdAt: Date.now(),
      };
      await redis.setex(`pricing:quote:${quoteToken}`, 900, JSON.stringify(quoteCache));
    } catch { /* non-fatal if Redis down */ }

    // ── Assemble components for audit log ─────────────────────────────────
    const components: FareComponents = {
      distanceKm: round(distanceKm, 1),
      durationMinutes,
      distanceSource,
      baseFare: round(baseFare),
      baseIncludesKm: vehicle.baseIncludesKm ?? 3,
      distanceFare: round(distanceFare),
      timeFare: round(timeFare),
      fuelSurcharge: round(fuelSurcharge),
      surgeMultiplier: effectiveSurge,
      loadingCharge,
      insuranceCharge,
      subtotal: round(subtotal),
      totalFare: round(totalFare),
      freightGst,
      loadingGst,
      insuranceGst,
      totalGst,
      grandTotal,
      commissionRate: effectiveCommission,
      commissionAmount: round(commissionAmount),
      driverPayout: round(finalPayout),
      subsidyAmount: round(subsidyAmount),
    };

    // ── [17] Audit log ────────────────────────────────────────────────────
    const auditLogId = await writePricingAuditLog(
      req,
      components,
      req.bookingId ? 'booking_confirm' : 'estimate',
    );

    // ── [18] Build response ───────────────────────────────────────────────
    const vehicleInfo: VehicleInfo = {
      vehicleType:           vehicle.vehicleType,
      displayName:           vehicle.displayName,
      baseFare:              vehicle.baseFare,
      baseIncludesKm:        vehicle.baseIncludesKm ?? 3,
      pricePerKm:            vehicle.pricePerKm,
      minFare:               vehicle.minFare,
      capacityKg:            vehicle.capacityKg,
      capacityDesc:          vehicle.capacityDesc,
      estimatedEta:          vehicle.estimatedEta,
      imageUrl:              vehicle.imageUrl ?? null,
      waitingFreeMinutes:    vehicle.waitingFreeMinutes ?? 30,
      waitingChargePerBlock: vehicle.waitingChargePerBlock ?? 100,
      loadingChargePerHelper:vehicle.loadingChargePerHelper ?? 400,
      maxHelpers:            vehicle.maxHelpers ?? 2,
      surgeHardCap:          vehicle.surgeHardCap ?? 1.5,
    };

    const response: FareEstimateResponse = {
      estimatedDistanceKm:      components.distanceKm,
      estimatedDurationMinutes: durationMinutes,
      auditLogId,

      fareBreakdown: {
        baseFare:        components.baseFare,
        baseIncludesKm:  components.baseIncludesKm,
        distanceFare:    components.distanceFare,
        timeFare:        components.timeFare,
        fuelSurcharge:   components.fuelSurcharge,
        surgeMultiplier: components.surgeMultiplier,
        surgeActive:     false,
        surgeReason:     null,
        loadingCharge:   components.loadingCharge,
        insuranceCharge: components.insuranceCharge,
        subtotal:        components.subtotal,
      },

      totalFare:   components.totalFare,

      gstBreakdown: {
        freightGst:   components.freightGst,
        loadingGst:   components.loadingGst,
        insuranceGst: components.insuranceGst,
        totalGst:     components.totalGst,
      },

      grandTotal: components.grandTotal,

      waitingInfo: {
        freeMinutes:          vehicle.waitingFreeMinutes ?? 30,
        chargePerBlock:       vehicle.waitingChargePerBlock ?? 100,
        blockDurationMinutes: 30,
        note: `₹${vehicle.waitingChargePerBlock ?? 100} charged per 30 min after ${vehicle.waitingFreeMinutes ?? 30} min free window`,
      },

      tollInfo: {
        estimatedToll: round(dfmeQuote.tollCostInr),
        note: dfmeQuote.tollCostInr > 0
          ? `₹${round(dfmeQuote.tollCostInr)} estimated FASTag toll included across route`
          : 'Actual toll charges will be added at trip end based on FASTag records',
      },

      driverPayout:    components.driverPayout,
      platformRevenue: round(components.totalFare * effectiveCommission),

      vehicle: vehicleInfo,
      distanceSource: components.distanceSource,
      surgeActive: false,
      estimatedAt: new Date().toISOString(),

      quoteToken,
      quoteRangeLow: dfmeQuote.customerQuoteRangeLowInr,
      quoteRangeHigh: dfmeQuote.customerQuoteRangeHighInr,
      confidenceScore: dfmeQuote.confidenceScorePct,
      governanceStatus: dfmeQuote.governanceStatus,
      dfmeQuote: {
        regime: dfmeQuote.pricingRegime,
        costFloor: dfmeQuote.deterministicCostFloorInr,
        buyTarget: dfmeQuote.operatorBuyTargetInr,
        sellQuote: dfmeQuote.customerSellQuoteInr,
        quoteRangeLow: dfmeQuote.customerQuoteRangeLowInr,
        quoteRangeHigh: dfmeQuote.customerQuoteRangeHighInr,
        directionalLambda: dfmeQuote.directionalLambda,
        dieselIndex: dfmeQuote.dieselIndexMultiplier,
        seasonality: dfmeQuote.seasonalCalendarMultiplier,
        commodityMultiplier: dfmeQuote.commodityAndStopMultiplier,
        detentionInr: dfmeQuote.detentionAndAccessorialInr,
        confidenceScore: dfmeQuote.confidenceScorePct,
        governanceStatus: dfmeQuote.governanceStatus,
        auditNotes: dfmeQuote.auditNotes,
      },
    };

    try {
      const redis = getRedis();
      await redis.setex(`pricing:quote:${quoteToken}`, 900, JSON.stringify(response));
    } catch { /* non-fatal if Redis down */ }

    logger.info(
      `[Pricing] ${vehicleType} ${components.distanceKm}km → ` +
      `fare: ₹${components.totalFare} | grand: ₹${components.grandTotal} | ` +
      `driver: ₹${components.driverPayout} | surge: ${effectiveSurge}×`
    );

    return response;
  },

  // ── Waiting charge calculator (called when driver marks PICKED_UP) ───────
  calculateWaitingCharge: (
    arrivedAt: Date,
    pickedUpAt: Date,
    vehicle: any,
  ): WaitingChargeResult => {
    const waitingMinutes = (pickedUpAt.getTime() - arrivedAt.getTime()) / 60000;
    const freeMinutes    = vehicle.waitingFreeMinutes ?? 30;
    const billableMinutes = Math.max(0, waitingMinutes - freeMinutes);
    const blockMinutes   = 30;
    const blocks         = Math.ceil(billableMinutes / blockMinutes);
    const waitingCharge  = blocks * (vehicle.waitingChargePerBlock ?? 100);

    return {
      waitingMinutes:  round(waitingMinutes, 1),
      freeMinutes,
      billableMinutes: round(billableMinutes, 1),
      blocks,
      waitingCharge,
      driverEarns:  waitingCharge, // 100% to driver
      platformEarns: 0,
    };
  },

  // ── Invalidate vehicle pricing cache (called by admin after update) ───────
  invalidateVehicleCache: async (): Promise<void> => {
    try {
      const redis = getRedis();
      await redis.del(VEHICLE_CACHE_KEY);
    } catch { /* non-fatal */ }
  },

  // ── Invalidate pricing config cache (called by admin after update) ────────
  invalidateConfigCache: async (): Promise<void> => {
    try {
      const redis = getRedis();
      await redis.del(CONFIG_CACHE_KEY);
    } catch { /* non-fatal */ }
  },

  // ── Expose config for GET /pricing/config (public-safe fields only) ───────
  getPublicConfig: async (): Promise<object> => {
    const config = await getPricingConfig();
    return {
      commissionRate:     config.platform_commission_rate,
      gstRateFreight:     config.gst_rate_freight,
      gstRateServices:    config.gst_rate_services,
      fuelSurchargeActive: config.fuel_surcharge_enabled &&
        (config.diesel_current_price > config.diesel_baseline_price * (1 + config.fuel_surcharge_threshold_pct / 100)),
      dieselBaselinePrice: config.diesel_baseline_price,
      dieselCurrentPrice:  config.diesel_current_price,
      surgeEnabled:        config.surge_enabled,
      insuranceBaseCharge: config.insurance_base_charge,
      coinToRupeeRate:     config.coin_to_rupee_rate,
      maxCoinRedemptionPct: config.max_coin_redemption_pct,
    };
  },

  // ── Bulk estimate: one Mapbox call → price all active vehicles ──────────
  // Used by the vehicle selection screen to show real prices in the list.
  // No audit log written (display-only). No loading/insurance add-ons assumed.
  estimateAll: async (
    pickupLat: number,
    pickupLng: number,
    dropLat: number,
    dropLng: number,
    stops?: Array<{ latitude?: number; longitude?: number; lat?: number; lng?: number }>,
  ): Promise<{ vehicleType: string; grandTotal: number; totalFare: number; distanceKm: number; durationMinutes: number; surgeActive: boolean }[]> => {

    // ── [1] Validate coordinates ──────────────────────────────────────────
    if (!isInIndia(pickupLat, pickupLng)) {
      throw AppError.badRequest('Pickup location must be within India', 'OUT_OF_SERVICE_AREA');
    }

    const normalizedStops: Array<{ lat: number; lng: number }> = [];
    if (stops && stops.length > 0) {
      for (let i = 0; i < stops.length; i++) {
        const s = stops[i];
        const sLat = s.latitude ?? s.lat;
        const sLng = s.longitude ?? s.lng;
        if (sLat === undefined || sLng === undefined) continue;
        if (!isInIndia(sLat, sLng)) {
          throw AppError.badRequest(`Delivery stop ${i + 1} must be within India`, 'OUT_OF_SERVICE_AREA');
        }
        normalizedStops.push({ lat: sLat, lng: sLng });
      }
    }

    if (normalizedStops.length === 0) {
      if (!isInIndia(dropLat, dropLng)) {
        throw AppError.badRequest('Delivery location must be within India', 'OUT_OF_SERVICE_AREA');
      }
      if (isSameLocation(pickupLat, pickupLng, dropLat, dropLng)) {
        throw AppError.badRequest('Pickup and delivery location cannot be the same', 'SAME_LOCATION');
      }
      normalizedStops.push({ lat: dropLat, lng: dropLng });
    }

    // ── [2] Fetch route ONCE from Mapbox ─────────────────────────────────
    const routePoints = [{ lat: pickupLat, lng: pickupLng }, ...normalizedStops];
    const { distanceKm, durationMinutes } = await mapsService.getRouteDistanceMatrix(routePoints);

    // Resolve city/state for directional multiplier
    let originCity = '';
    let originState = '';
    let destCity = '';
    let destState = '';
    try {
      const [geoO, geoD] = await Promise.all([
        mapsService.reverseGeocode(pickupLat, pickupLng),
        mapsService.reverseGeocode(normalizedStops[normalizedStops.length - 1].lat, normalizedStops[normalizedStops.length - 1].lng),
      ]);
      if (geoO) { originCity = geoO.city || ''; originState = geoO.state || ''; }
      if (geoD) { destCity = geoD.city || ''; destState = geoD.state || ''; }
    } catch {}

    // ── [3] Load config + vehicles from cache (no extra DB/API calls) ─────
    const [vehicles, config] = await Promise.all([
      getVehiclePricingCached(),
      getPricingConfig(),
    ]);

    // ── Maximum distance validation removed for all-India service ──────────────
    if (distanceKm < config.min_trip_distance_km) {
      throw AppError.badRequest(`Minimum trip distance is ${config.min_trip_distance_km} km`, 'DISTANCE_TOO_SHORT');
    }

    // ── [4] Compute price for each vehicle type via DFME v2.6 in memory ──
    const results = await Promise.all(
      (vehicles as any[]).map(async (vehicle) => {
        const dfmeQuote = dfmePricingEngine.priceShipment({
          enquiryId: `BULK-${Date.now()}`,
          originCity,
          originState,
          destinationCity: destCity,
          destinationState: destState,
          tripDistanceKm: distanceKm,
          estimatedDurationMin: durationMinutes,
          vehicleCode: vehicle.vehicleType,
          goodsWeightKg: vehicle.capacityKg,
          stopsCount: normalizedStops.length,
          channel: 'CUSTOMER_APP',
        });

        // Core fare from DFME sell quote (with minimum fare floor safeguard)
        const totalFare = Math.max(dfmeQuote.customerSellQuoteInr, vehicle.minFare as number);

        // GST on freight only (no loading/insurance in bulk display)
        const freightGst = round(totalFare * config.gst_rate_freight);
        const grandTotal = round(totalFare + freightGst);

        return {
          vehicleType:      vehicle.vehicleType as string,
          displayName:      vehicle.displayName,
          capacityKg:       vehicle.capacityKg,
          capacityDesc:     vehicle.capacityDesc,
          grandTotal,
          totalFare:        round(totalFare),
          distanceKm:       round(distanceKm, 1),
          durationMinutes,
          surgeActive:      false,
          buyTarget:        dfmeQuote.operatorBuyTargetInr,
          quoteRangeLow:    dfmeQuote.customerQuoteRangeLowInr,
          quoteRangeHigh:   dfmeQuote.customerQuoteRangeHighInr,
          confidenceScore:  dfmeQuote.confidenceScorePct,
          estimatedToll:    round(dfmeQuote.tollCostInr),
        };
      })
    );

    logger.info(
      `[Pricing] estimateAll: ${results.length} vehicles | ${round(distanceKm, 1)}km | ` +
      results.map(r => `${r.vehicleType}=₹${r.grandTotal}`).join(' | ')
    );

    return results;
  },
};

// Re-export for backward compatibility with existing imports
export type { FareEstimateRequest, FareEstimateResponse };
