/**
 * dfme-engine.ts — GoMyTruck Pan-India Algorithmic Freight Pricing & Market-Discovery Engine (DFME v2.6)
 * =====================================================================================================
 * Native TypeScript implementation providing sub-millisecond in-memory pricing for high concurrency.
 * Calibrated against GoMyTruck 8 Core Evidence & Operational Datasets:
 *   1. vehicle_master_spec.xlsx (46 Catalogue Categories, 7 IHMCL Toll Classes, 9 MoRTH Axle Rules)
 *   2. route_and_toll_network.xlsx (1,221 Plazas, 6,331 Class Tariffs, 74 Industrial Hubs)
 *   3. GMT_pan_india_evidence_2026-10-28.xlsx (PPAC Metro Diesel, 37 State Tax Rules)
 *   4. GMT_pan_india_competitor_evidence_2026-10-29.xlsx (891 Corridors, 1,780 FR8 Benchmarks)
 *   5. lane_imbalance_and_return_loads.xlsx (Directional Asymmetry & Backhaul Floor)
 *   6. seasonality_and_margin_rules.xlsx (341-month Shriram Seasonality, Monsoon Hill Penalties)
 *   7. cargo_and_ptl_modifiers.xlsx (Volumetric CFT, Docket, FOV, ODA surcharges)
 *   8. historical_transactions_and_bids.csv (576 Historical Enquiries & Bookings backfilled)
 */

export interface VehicleSpec {
  catId: string;
  gmtId: string;
  appCode: string;
  bodyGroup: string;
  displayName: string;
  lengthFt: number;
  payloadTonnes: number;
  oemRefIds: string;
  tollClass: string;
  axles: number;
  mileageKmpl: number;
  intracityBaseInr: number;
  intracityPerKmInr: number;
  freeLoadMins: number;
  detentionPerHrInr: number;
  affineFixedF0Inr: number;
  affineSlopeC1Inr: number;
  powerA: number;
  powerBeta: number;
  dailyCrewMaintInr: number;
  tyreMaintPerKmInr: number;
  governanceFlag: string;
}

export interface ShipmentRequest {
  enquiryId: string;
  originCity: string;
  originState: string;
  destinationCity: string;
  destinationState: string;
  tripDistanceKm: number;
  estimatedDurationMin?: number;
  vehicleCode: string;
  goodsType?: string;
  goodsWeightKg?: number;
  stopsCount?: number;
  channel?: 'CUSTOMER_APP' | 'MAIN_WEB' | 'WHATSAPP_ASSISTED' | 'ENTERPRISE_API' | string;
  bookingMode?: 'INSTANT' | 'BIDDING' | 'SCHEDULED' | string;
  timestampMonth?: number;
  dayOfMonth?: number;
  deadheadKm?: number;
  loadingWaitMins?: number;
  verifiedRouteTollInr?: number | null;
  liveOperatorBidsInr?: number[];
  isPtl?: boolean;
  ptlLengthCm?: number;
  ptlBreadthCm?: number;
  ptlHeightCm?: number;
  ptlPackages?: number;
  declaredInvoiceValueInr?: number;
  riskType?: 'OWNER_RISK' | 'CARRIER_RISK' | string;
  isOdaRemote?: boolean;
  isHolidayOrSunday?: boolean;
}

export interface QuoteOutput {
  enquiryId: string;
  vehicleCatId: string;
  vehicleDisplayName: string;
  tollClass: string;
  pricingRegime: string;
  distanceKm: number;
  fuelCostInr: number;
  tollCostInr: number;
  crewAndStandingCostInr: number;
  tyreAndMaintCostInr: number;
  deadheadAndRepositionInr: number;
  deterministicCostFloorInr: number;
  baseSpatialBenchmarkInr: number;
  directionalLambda: number;
  dieselIndexMultiplier: number;
  seasonalCalendarMultiplier: number;
  commodityAndStopMultiplier: number;
  detentionAndAccessorialInr: number;
  adjustedMarketBenchmarkInr: number;
  bayesianBidWeight: number;
  operatorBuyTargetInr: number;
  platformMarginPct: number;
  platformMarginInr: number;
  customerSellQuoteInr: number;
  customerQuoteRangeLowInr: number;
  customerQuoteRangeHighInr: number;
  effectiveRatePerKmInr: number;
  confidenceScorePct: number;
  governanceStatus: string;
  auditNotes: string[];
}

// ── Baseline Constants ────────────────────────────────────────────────────────
export const NATIONAL_BASE_DIESEL_INR = 98.10;
export const GATI_DPH_BASE_DIESEL_INR = 98.97;
export const NH_AVG_PLAZA_SPACING_KM = 62.5;

export const PPAC_METRO_DIESEL_2026_10_28: Record<string, number> = {
  Delhi: 95.20,
  Mumbai: 97.83,
  Chennai: 99.55,
  Kolkata: 99.82,
};

export const STATE_DIESEL_RSP_PROXY: Record<string, number> = {
  Delhi: 95.20, "NCT of Delhi": 95.20, Haryana: 95.65, Punjab: 95.80,
  Chandigarh: 94.80, "Himachal Pradesh": 94.90, Uttarakhand: 95.50,
  "Uttar Pradesh": 95.40, Rajasthan: 97.10, Gujarat: 96.80,
  Maharashtra: 97.83, Goa: 96.20, "Madhya Pradesh": 98.40,
  Chhattisgarh: 98.90, Karnataka: 96.50, "Tamil Nadu": 99.55,
  Telangana: 99.90, "Andhra Pradesh": 100.10, Kerala: 99.70,
  Puducherry: 95.30, "West Bengal": 99.82, Odisha: 99.40,
  Bihar: 99.60, Jharkhand: 99.20, Assam: 96.90,
  Meghalaya: 94.50, Tripura: 95.80, Mizoram: 95.60,
  Manipur: 96.40, Nagaland: 96.70, "Arunachal Pradesh": 94.20,
  Sikkim: 96.10, "Jammu and Kashmir": 95.10, Ladakh: 94.70,
};

export const TOLL_CLASS_STATS_INR: Record<string, { meanPlazaInr: number; medianPlazaInr: number; p75PlazaInr: number; maxPlazaInr: number }> = {
  NH_CAR: { meanPlazaInr: 79.79,  medianPlazaInr: 75.0,  p75PlazaInr: 110.0, maxPlazaInr: 240.0 },
  NH_LCV: { meanPlazaInr: 136.34, medianPlazaInr: 125.0, p75PlazaInr: 180.0, maxPlazaInr: 390.0 },
  NH_BUS: { meanPlazaInr: 284.34, medianPlazaInr: 265.0, p75PlazaInr: 375.0, maxPlazaInr: 820.0 },
  NH_3:   { meanPlazaInr: 328.30, medianPlazaInr: 305.0, p75PlazaInr: 425.0, maxPlazaInr: 955.0 },
  NH_46:  { meanPlazaInr: 445.35, medianPlazaInr: 415.0, p75PlazaInr: 585.0, maxPlazaInr: 1285.0 },
  NH_HCM: { meanPlazaInr: 447.07, medianPlazaInr: 415.0, p75PlazaInr: 585.0, maxPlazaInr: 1285.0 },
  NH_7:   { meanPlazaInr: 540.93, medianPlazaInr: 500.0, p75PlazaInr: 710.0, maxPlazaInr: 1560.0 },
};

// ── 46 Vehicle Catalogue ──────────────────────────────────────────────────────
export const VEHICLE_CATALOGUE: VehicleSpec[] = [
  { catId: "CAT000A", gmtId: "GMT-000A", appCode: "BIKE", bodyGroup: "Micro", displayName: "2-Wheeler Delivery / Courier", lengthFt: 3.0, payloadTonnes: 0.04, oemRefIds: "N/A", tollClass: "NH_CAR", axles: 2, mileageKmpl: 45.0, intracityBaseInr: 65.0, intracityPerKmInr: 9.5, freeLoadMins: 25, detentionPerHrInr: 60.0, affineFixedF0Inr: 120.0, affineSlopeC1Inr: 8.50, powerA: 28.0, powerBeta: 0.720, dailyCrewMaintInr: 550.0, tyreMaintPerKmInr: 0.80, governanceFlag: "CONDITIONAL_REFERENCE" },
  { catId: "CAT000B", gmtId: "GMT-000B", appCode: "THREE_WHEELER", bodyGroup: "Micro", displayName: "3-Wheeler Auto / Cargo (0.5 Ton)", lengthFt: 5.5, payloadTonnes: 0.50, oemRefIds: "N/A", tollClass: "NH_CAR", axles: 2, mileageKmpl: 22.0, intracityBaseInr: 175.0, intracityPerKmInr: 14.5, freeLoadMins: 60, detentionPerHrInr: 100.0, affineFixedF0Inr: 450.0, affineSlopeC1Inr: 11.20, powerA: 85.0, powerBeta: 0.680, dailyCrewMaintInr: 750.0, tyreMaintPerKmInr: 1.40, governanceFlag: "CONDITIONAL_REFERENCE" },
  { catId: "CAT000C", gmtId: "GMT-000C", appCode: "MAHINDRA_JEETO", bodyGroup: "Open", displayName: "Mahindra Jeeto (0.6 Ton)", lengthFt: 6.0, payloadTonnes: 0.60, oemRefIds: "S_OEM05", tollClass: "NH_CAR", axles: 2, mileageKmpl: 21.0, intracityBaseInr: 210.0, intracityPerKmInr: 15.5, freeLoadMins: 60, detentionPerHrInr: 120.0, affineFixedF0Inr: 600.0, affineSlopeC1Inr: 12.00, powerA: 105.0, powerBeta: 0.675, dailyCrewMaintInr: 800.0, tyreMaintPerKmInr: 1.60, governanceFlag: "CONDITIONAL_REFERENCE" },
  { catId: "CAT001", gmtId: "GMT-001", appCode: "TATA_ACE", bodyGroup: "Open", displayName: "Tata Ace 7ft (1 Ton)", lengthFt: 7.0, payloadTonnes: 1.0, oemRefIds: "R01; R02", tollClass: "NH_CAR", axles: 2, mileageKmpl: 16.5, intracityBaseInr: 250.0, intracityPerKmInr: 17.5, freeLoadMins: 90, detentionPerHrInr: 150.0, affineFixedF0Inr: 1450.0, affineSlopeC1Inr: 14.80, powerA: 165.0, powerBeta: 0.665, dailyCrewMaintInr: 950.0, tyreMaintPerKmInr: 2.10, governanceFlag: "CONDITIONAL_REFERENCE" },
  { catId: "CAT002", gmtId: "GMT-002", appCode: "BOLERO_PICKUP", bodyGroup: "Open", displayName: "Bolero Pickup 8ft (1.5 Ton)", lengthFt: 8.0, payloadTonnes: 1.5, oemRefIds: "R03; R04; R05; R06", tollClass: "NH_LCV", axles: 2, mileageKmpl: 13.5, intracityBaseInr: 385.0, intracityPerKmInr: 20.5, freeLoadMins: 90, detentionPerHrInr: 150.0, affineFixedF0Inr: 2100.0, affineSlopeC1Inr: 17.80, powerA: 210.0, powerBeta: 0.665, dailyCrewMaintInr: 1100.0, tyreMaintPerKmInr: 2.60, governanceFlag: "CONDITIONAL_REFERENCE" },
  { catId: "CAT003", gmtId: "GMT-003", appCode: "LCV_OPEN_10FT", bodyGroup: "Open", displayName: "10ft Open Truck (2 Ton)", lengthFt: 10.0, payloadTonnes: 2.0, oemRefIds: "R07", tollClass: "NH_LCV", axles: 2, mileageKmpl: 11.5, intracityBaseInr: 550.0, intracityPerKmInr: 23.0, freeLoadMins: 120, detentionPerHrInr: 150.0, affineFixedF0Inr: 2850.0, affineSlopeC1Inr: 20.40, powerA: 240.0, powerBeta: 0.668, dailyCrewMaintInr: 1250.0, tyreMaintPerKmInr: 3.10, governanceFlag: "CONDITIONAL_REFERENCE" },
  { catId: "CAT004", gmtId: "GMT-004", appCode: "TRUCK_14FT_OPEN", bodyGroup: "Open", displayName: "14ft Open Truck (4 Ton)", lengthFt: 14.0, payloadTonnes: 4.0, oemRefIds: "R08", tollClass: "NH_LCV", axles: 2, mileageKmpl: 9.0, intracityBaseInr: 1120.0, intracityPerKmInr: 28.0, freeLoadMins: 120, detentionPerHrInr: 150.0, affineFixedF0Inr: 3900.0, affineSlopeC1Inr: 23.80, powerA: 275.0, powerBeta: 0.672, dailyCrewMaintInr: 1450.0, tyreMaintPerKmInr: 3.80, governanceFlag: "CONDITIONAL_REFERENCE" },
  { catId: "CAT005", gmtId: "GMT-005", appCode: "TRUCK_17FT", bodyGroup: "Open", displayName: "17ft Open Truck (5 Ton)", lengthFt: 17.0, payloadTonnes: 5.0, oemRefIds: "R09; R10", tollClass: "NH_BUS", axles: 2, mileageKmpl: 7.8, intracityBaseInr: 1500.0, intracityPerKmInr: 32.0, freeLoadMins: 120, detentionPerHrInr: 150.0, affineFixedF0Inr: 4650.0, affineSlopeC1Inr: 27.20, powerA: 295.0, powerBeta: 0.678, dailyCrewMaintInr: 1650.0, tyreMaintPerKmInr: 4.40, governanceFlag: "CONDITIONAL_REFERENCE" },
  { catId: "CAT006", gmtId: "GMT-006", appCode: "TRUCK_19FT", bodyGroup: "Open", displayName: "19ft Open Truck (10 Ton)", lengthFt: 19.0, payloadTonnes: 10.0, oemRefIds: "R11", tollClass: "NH_BUS", axles: 2, mileageKmpl: 6.5, intracityBaseInr: 1950.0, intracityPerKmInr: 36.5, freeLoadMins: 120, detentionPerHrInr: 180.0, affineFixedF0Inr: 5444.1, affineSlopeC1Inr: 31.87, powerA: 319.22, powerBeta: 0.6827, dailyCrewMaintInr: 1900.0, tyreMaintPerKmInr: 5.20, governanceFlag: "CONDITIONAL_REFERENCE" },
  { catId: "CAT007", gmtId: "GMT-007", appCode: "TRUCK_20FT_OPEN", bodyGroup: "Open", displayName: "20ft Open Truck (10 Ton)", lengthFt: 20.0, payloadTonnes: 10.0, oemRefIds: "R15", tollClass: "NH_BUS", axles: 2, mileageKmpl: 6.3, intracityBaseInr: 2100.0, intracityPerKmInr: 38.0, freeLoadMins: 120, detentionPerHrInr: 180.0, affineFixedF0Inr: 5750.0, affineSlopeC1Inr: 32.90, powerA: 332.0, powerBeta: 0.681, dailyCrewMaintInr: 1950.0, tyreMaintPerKmInr: 5.40, governanceFlag: "CONDITIONAL_REFERENCE" },
  { catId: "CAT008", gmtId: "GMT-008", appCode: "TRUCK_22FT_OPEN", bodyGroup: "Open", displayName: "22ft Open Truck (10 Ton)", lengthFt: 22.0, payloadTonnes: 10.0, oemRefIds: "R13; R19", tollClass: "NH_BUS", axles: 2, mileageKmpl: 6.0, intracityBaseInr: 2300.0, intracityPerKmInr: 40.0, freeLoadMins: 120, detentionPerHrInr: 200.0, affineFixedF0Inr: 6100.0, affineSlopeC1Inr: 34.50, powerA: 355.0, powerBeta: 0.679, dailyCrewMaintInr: 2050.0, tyreMaintPerKmInr: 5.70, governanceFlag: "CONDITIONAL_REFERENCE" },
  { catId: "CAT009", gmtId: "GMT-009", appCode: "TRUCK_10WHL_22FT", bodyGroup: "Open", displayName: "22ft 10-Tyre Open (18 Ton)", lengthFt: 22.0, payloadTonnes: 18.0, oemRefIds: "R19", tollClass: "NH_3", axles: 3, mileageKmpl: 4.5, intracityBaseInr: 3200.0, intracityPerKmInr: 52.0, freeLoadMins: 180, detentionPerHrInr: 250.0, affineFixedF0Inr: 11589.3, affineSlopeC1Inr: 43.53, powerA: 1075.96, powerBeta: 0.5503, dailyCrewMaintInr: 2500.0, tyreMaintPerKmInr: 7.50, governanceFlag: "CONDITIONAL_REFERENCE" },
  { catId: "CAT010", gmtId: "GMT-010", appCode: "TRUCK_24FT_OPEN", bodyGroup: "Open", displayName: "24ft 12-Tyre Open (25 Ton)", lengthFt: 24.0, payloadTonnes: 25.0, oemRefIds: "R21", tollClass: "NH_46", axles: 4, mileageKmpl: 3.8, intracityBaseInr: 3800.0, intracityPerKmInr: 62.0, freeLoadMins: 180, detentionPerHrInr: 300.0, affineFixedF0Inr: 11865.3, affineSlopeC1Inr: 54.44, powerA: 1096.92, powerBeta: 0.5738, dailyCrewMaintInr: 2850.0, tyreMaintPerKmInr: 9.20, governanceFlag: "CONDITIONAL_REFERENCE" },
  { catId: "CAT011", gmtId: "GMT-011", appCode: "TRUCK_25FT_OPEN", bodyGroup: "Open", displayName: "25ft 12-Tyre Open (25 Ton)", lengthFt: 25.0, payloadTonnes: 25.0, oemRefIds: "R21", tollClass: "NH_46", axles: 4, mileageKmpl: 3.7, intracityBaseInr: 3950.0, intracityPerKmInr: 63.5, freeLoadMins: 180, detentionPerHrInr: 300.0, affineFixedF0Inr: 12200.0, affineSlopeC1Inr: 55.20, powerA: 1120.0, powerBeta: 0.574, dailyCrewMaintInr: 2900.0, tyreMaintPerKmInr: 9.40, governanceFlag: "CONDITIONAL_REFERENCE" },
  { catId: "CAT012", gmtId: "GMT-012", appCode: "TRUCK_28FT_OPEN", bodyGroup: "Open", displayName: "28ft 14-Tyre Open (30 Ton)", lengthFt: 28.0, payloadTonnes: 30.0, oemRefIds: "R22", tollClass: "NH_46", axles: 5, mileageKmpl: 3.3, intracityBaseInr: 4500.0, intracityPerKmInr: 72.0, freeLoadMins: 240, detentionPerHrInr: 350.0, affineFixedF0Inr: 15699.3, affineSlopeC1Inr: 57.97, powerA: 1036.68, powerBeta: 0.6070, dailyCrewMaintInr: 3200.0, tyreMaintPerKmInr: 10.80, governanceFlag: "CONDITIONAL_REFERENCE" },
  { catId: "CAT013", gmtId: "GMT-013", appCode: "TRUCK_30FT_OPEN", bodyGroup: "Open", displayName: "30ft 14-Tyre Open (30 Ton)", lengthFt: 30.0, payloadTonnes: 30.0, oemRefIds: "R22", tollClass: "NH_46", axles: 5, mileageKmpl: 3.2, intracityBaseInr: 4700.0, intracityPerKmInr: 74.0, freeLoadMins: 240, detentionPerHrInr: 350.0, affineFixedF0Inr: 16200.0, affineSlopeC1Inr: 59.50, powerA: 1080.0, powerBeta: 0.606, dailyCrewMaintInr: 3300.0, tyreMaintPerKmInr: 11.10, governanceFlag: "CONDITIONAL_REFERENCE" },
  { catId: "CAT014", gmtId: "GMT-014", appCode: "TRUCK_32FT_OPEN", bodyGroup: "Open", displayName: "32ft Half Daala Open (9 Ton)", lengthFt: 32.0, payloadTonnes: 9.0, oemRefIds: "R17; R18", tollClass: "NH_BUS", axles: 2, mileageKmpl: 5.2, intracityBaseInr: 2900.0, intracityPerKmInr: 46.0, freeLoadMins: 180, detentionPerHrInr: 220.0, affineFixedF0Inr: 7900.0, affineSlopeC1Inr: 34.80, powerA: 520.0, powerBeta: 0.625, dailyCrewMaintInr: 2200.0, tyreMaintPerKmInr: 6.40, governanceFlag: "CONDITIONAL_REFERENCE" },
  { catId: "CAT015", gmtId: "GMT-015", appCode: "MINI_CLOSED_VAN", bodyGroup: "Container", displayName: "7ft Tata Ace Container (0.7 Ton)", lengthFt: 7.0, payloadTonnes: 0.7, oemRefIds: "R01", tollClass: "NH_CAR", axles: 2, mileageKmpl: 15.8, intracityBaseInr: 290.0, intracityPerKmInr: 19.0, freeLoadMins: 90, detentionPerHrInr: 150.0, affineFixedF0Inr: 1650.0, affineSlopeC1Inr: 16.00, powerA: 185.0, powerBeta: 0.662, dailyCrewMaintInr: 980.0, tyreMaintPerKmInr: 2.25, governanceFlag: "CONDITIONAL_REFERENCE" },
  { catId: "CAT016", gmtId: "GMT-016", appCode: "CONTAINER_8FT", bodyGroup: "Container", displayName: "8ft Bolero Container (1 Ton)", lengthFt: 8.0, payloadTonnes: 1.0, oemRefIds: "R03; R04; R05; R06", tollClass: "NH_LCV", axles: 2, mileageKmpl: 13.0, intracityBaseInr: 430.0, intracityPerKmInr: 22.0, freeLoadMins: 90, detentionPerHrInr: 150.0, affineFixedF0Inr: 2350.0, affineSlopeC1Inr: 19.10, powerA: 230.0, powerBeta: 0.662, dailyCrewMaintInr: 1150.0, tyreMaintPerKmInr: 2.75, governanceFlag: "CONDITIONAL_REFERENCE" },
  { catId: "CAT017", gmtId: "GMT-017", appCode: "LCV_BOX_TRUCK", bodyGroup: "Container", displayName: "10ft Container (2 Ton)", lengthFt: 10.0, payloadTonnes: 2.0, oemRefIds: "R07", tollClass: "NH_LCV", axles: 2, mileageKmpl: 11.0, intracityBaseInr: 620.0, intracityPerKmInr: 25.0, freeLoadMins: 120, detentionPerHrInr: 150.0, affineFixedF0Inr: 3150.0, affineSlopeC1Inr: 21.80, powerA: 265.0, powerBeta: 0.664, dailyCrewMaintInr: 1300.0, tyreMaintPerKmInr: 3.30, governanceFlag: "CONDITIONAL_REFERENCE" },
  { catId: "CAT018", gmtId: "GMT-018", appCode: "TRUCK_14FT_CLOSED", bodyGroup: "Container", displayName: "14ft Container (3.5 Ton)", lengthFt: 14.0, payloadTonnes: 3.5, oemRefIds: "R08", tollClass: "NH_LCV", axles: 2, mileageKmpl: 8.6, intracityBaseInr: 1280.0, intracityPerKmInr: 30.5, freeLoadMins: 120, detentionPerHrInr: 150.0, affineFixedF0Inr: 4350.0, affineSlopeC1Inr: 24.50, powerA: 295.0, powerBeta: 0.660, dailyCrewMaintInr: 1500.0, tyreMaintPerKmInr: 4.00, governanceFlag: "CONDITIONAL_REFERENCE" },
  { catId: "CAT019", gmtId: "GMT-019", appCode: "TRUCK_17FT_CLOSED", bodyGroup: "Container", displayName: "17ft Container (4 Ton)", lengthFt: 17.0, payloadTonnes: 4.0, oemRefIds: "R09; R10", tollClass: "NH_BUS", axles: 2, mileageKmpl: 7.4, intracityBaseInr: 1680.0, intracityPerKmInr: 34.0, freeLoadMins: 120, detentionPerHrInr: 150.0, affineFixedF0Inr: 5100.0, affineSlopeC1Inr: 25.10, powerA: 315.0, powerBeta: 0.656, dailyCrewMaintInr: 1700.0, tyreMaintPerKmInr: 4.60, governanceFlag: "CONDITIONAL_REFERENCE" },
  { catId: "CAT020", gmtId: "GMT-020", appCode: "CONTAINER_19FT", bodyGroup: "Container", displayName: "19ft Container (6 Ton)", lengthFt: 19.0, payloadTonnes: 6.0, oemRefIds: "R11", tollClass: "NH_BUS", axles: 2, mileageKmpl: 6.6, intracityBaseInr: 2050.0, intracityPerKmInr: 37.5, freeLoadMins: 120, detentionPerHrInr: 180.0, affineFixedF0Inr: 5650.0, affineSlopeC1Inr: 25.30, powerA: 326.0, powerBeta: 0.654, dailyCrewMaintInr: 1920.0, tyreMaintPerKmInr: 5.10, governanceFlag: "CONDITIONAL_REFERENCE" },
  { catId: "CAT021", gmtId: "GMT-021", appCode: "TRUCK_20FT", bodyGroup: "Container", displayName: "20ft Container (6.5 Ton)", lengthFt: 20.0, payloadTonnes: 6.5, oemRefIds: "R12; R15", tollClass: "NH_BUS", axles: 2, mileageKmpl: 6.4, intracityBaseInr: 2200.0, intracityPerKmInr: 39.0, freeLoadMins: 120, detentionPerHrInr: 180.0, affineFixedF0Inr: 5871.3, affineSlopeC1Inr: 25.51, powerA: 333.88, powerBeta: 0.6530, dailyCrewMaintInr: 1980.0, tyreMaintPerKmInr: 5.30, governanceFlag: "CONDITIONAL_REFERENCE" },
  { catId: "CAT022", gmtId: "GMT-022", appCode: "TRUCK_22FT_CLOSED", bodyGroup: "Container", displayName: "22ft Container (6.5 Ton)", lengthFt: 22.0, payloadTonnes: 6.5, oemRefIds: "R13", tollClass: "NH_BUS", axles: 2, mileageKmpl: 6.1, intracityBaseInr: 2400.0, intracityPerKmInr: 41.0, freeLoadMins: 120, detentionPerHrInr: 200.0, affineFixedF0Inr: 6250.0, affineSlopeC1Inr: 27.10, powerA: 360.0, powerBeta: 0.648, dailyCrewMaintInr: 2080.0, tyreMaintPerKmInr: 5.60, governanceFlag: "CONDITIONAL_REFERENCE" },
  { catId: "CAT023", gmtId: "GMT-023", appCode: "CONTAINER_32FT_SXL", bodyGroup: "Container", displayName: "32ft SXL Container (9 Ton)", lengthFt: 32.0, payloadTonnes: 9.0, oemRefIds: "R17; R18", tollClass: "NH_BUS", axles: 2, mileageKmpl: 5.0, intracityBaseInr: 3100.0, intracityPerKmInr: 49.0, freeLoadMins: 180, detentionPerHrInr: 220.0, affineFixedF0Inr: 8255.4, affineSlopeC1Inr: 33.51, powerA: 549.95, powerBeta: 0.6196, dailyCrewMaintInr: 2350.0, tyreMaintPerKmInr: 6.80, governanceFlag: "CONDITIONAL_REFERENCE" },
  { catId: "CAT024", gmtId: "GMT-024", appCode: "CONTAINER_32FT", bodyGroup: "Container", displayName: "32ft MXL Container (18 Ton)", lengthFt: 32.0, payloadTonnes: 18.0, oemRefIds: "R20", tollClass: "NH_3", axles: 3, mileageKmpl: 4.1, intracityBaseInr: 3500.0, intracityPerKmInr: 58.0, freeLoadMins: 180, detentionPerHrInr: 250.0, affineFixedF0Inr: 12667.5, affineSlopeC1Inr: 41.24, powerA: 626.37, powerBeta: 0.6421, dailyCrewMaintInr: 2750.0, tyreMaintPerKmInr: 8.10, governanceFlag: "CONDITIONAL_REFERENCE" },
  { catId: "CAT025", gmtId: "GMT-025", appCode: "FLATBED_20FT_9T", bodyGroup: "Flat bed 20-32 ft", displayName: "20ft Flat Bed (9 Ton)", lengthFt: 20.0, payloadTonnes: 9.0, oemRefIds: "R15", tollClass: "NH_BUS", axles: 2, mileageKmpl: 5.8, intracityBaseInr: 2500.0, intracityPerKmInr: 42.0, freeLoadMins: 180, detentionPerHrInr: 220.0, affineFixedF0Inr: 6800.0, affineSlopeC1Inr: 33.50, powerA: 395.0, powerBeta: 0.665, dailyCrewMaintInr: 2100.0, tyreMaintPerKmInr: 5.90, governanceFlag: "CONDITIONAL_REFERENCE" },
  { catId: "CAT026", gmtId: "GMT-026", appCode: "FLATBED_22FT_9T", bodyGroup: "Flat bed 20-32 ft", displayName: "22ft Flat Bed (9 Ton)", lengthFt: 22.0, payloadTonnes: 9.0, oemRefIds: "R13; R19", tollClass: "NH_BUS", axles: 2, mileageKmpl: 5.6, intracityBaseInr: 2700.0, intracityPerKmInr: 44.0, freeLoadMins: 180, detentionPerHrInr: 220.0, affineFixedF0Inr: 7200.0, affineSlopeC1Inr: 35.10, powerA: 420.0, powerBeta: 0.662, dailyCrewMaintInr: 2200.0, tyreMaintPerKmInr: 6.20, governanceFlag: "CONDITIONAL_REFERENCE" },
  { catId: "CAT027", gmtId: "GMT-027", appCode: "FLATBED_24FT_9T", bodyGroup: "Flat bed 20-32 ft", displayName: "24ft Flat Bed (9 Ton)", lengthFt: 24.0, payloadTonnes: 9.0, oemRefIds: "R14; R16", tollClass: "NH_BUS", axles: 2, mileageKmpl: 5.4, intracityBaseInr: 2900.0, intracityPerKmInr: 46.0, freeLoadMins: 180, detentionPerHrInr: 240.0, affineFixedF0Inr: 7600.0, affineSlopeC1Inr: 36.80, powerA: 445.0, powerBeta: 0.660, dailyCrewMaintInr: 2300.0, tyreMaintPerKmInr: 6.50, governanceFlag: "CONDITIONAL_REFERENCE" },
  { catId: "CAT028", gmtId: "GMT-028", appCode: "FLATBED_28FT_14T", bodyGroup: "Flat bed 20-32 ft", displayName: "28ft Flat Bed (14 Ton)", lengthFt: 28.0, payloadTonnes: 14.0, oemRefIds: "R22", tollClass: "NH_3", axles: 3, mileageKmpl: 4.4, intracityBaseInr: 3400.0, intracityPerKmInr: 54.0, freeLoadMins: 180, detentionPerHrInr: 260.0, affineFixedF0Inr: 10800.0, affineSlopeC1Inr: 44.20, powerA: 680.0, powerBeta: 0.630, dailyCrewMaintInr: 2600.0, tyreMaintPerKmInr: 7.80, governanceFlag: "CONDITIONAL_REFERENCE" },
  { catId: "CAT029", gmtId: "GMT-029", appCode: "FLATBED_28FT_9T", bodyGroup: "Flat bed 20-32 ft", displayName: "28ft Flat Bed (9 Ton)", lengthFt: 28.0, payloadTonnes: 9.0, oemRefIds: "R22", tollClass: "NH_BUS", axles: 2, mileageKmpl: 4.9, intracityBaseInr: 3100.0, intracityPerKmInr: 49.0, freeLoadMins: 180, detentionPerHrInr: 240.0, affineFixedF0Inr: 8900.0, affineSlopeC1Inr: 39.50, powerA: 560.0, powerBeta: 0.638, dailyCrewMaintInr: 2400.0, tyreMaintPerKmInr: 7.00, governanceFlag: "CONDITIONAL_REFERENCE" },
  { catId: "CAT030", gmtId: "GMT-030", appCode: "FLATBED_32FT_14T", bodyGroup: "Flat bed 20-32 ft", displayName: "32ft Flat Bed (14 Ton)", lengthFt: 32.0, payloadTonnes: 14.0, oemRefIds: "R17; R20", tollClass: "NH_3", axles: 3, mileageKmpl: 4.1, intracityBaseInr: 3700.0, intracityPerKmInr: 58.0, freeLoadMins: 180, detentionPerHrInr: 280.0, affineFixedF0Inr: 12100.0, affineSlopeC1Inr: 47.50, powerA: 740.0, powerBeta: 0.632, dailyCrewMaintInr: 2750.0, tyreMaintPerKmInr: 8.40, governanceFlag: "CONDITIONAL_REFERENCE" },
  { catId: "CAT031", gmtId: "GMT-031", appCode: "FLATBED_32FT_9T", bodyGroup: "Flat bed 20-32 ft", displayName: "32ft Flat Bed (9 Ton)", lengthFt: 32.0, payloadTonnes: 9.0, oemRefIds: "R17; R18", tollClass: "NH_BUS", axles: 2, mileageKmpl: 4.7, intracityBaseInr: 3300.0, intracityPerKmInr: 51.0, freeLoadMins: 180, detentionPerHrInr: 250.0, affineFixedF0Inr: 9600.0, affineSlopeC1Inr: 41.80, powerA: 610.0, powerBeta: 0.635, dailyCrewMaintInr: 2500.0, tyreMaintPerKmInr: 7.30, governanceFlag: "CONDITIONAL_REFERENCE" },
  { catId: "CAT032", gmtId: "GMT-032", appCode: "TRAILER_40FT_SEMI_60T", bodyGroup: "40 ft trailers", displayName: "40ft Semi Bed Trailer (60 Ton ODC)", lengthFt: 40.0, payloadTonnes: 60.0, oemRefIds: "R23; R27; R28; R29", tollClass: "NH_7", axles: 8, mileageKmpl: 1.8, intracityBaseInr: 18000.0, intracityPerKmInr: 260.0, freeLoadMins: 360, detentionPerHrInr: 800.0, affineFixedF0Inr: 45000.0, affineSlopeC1Inr: 185.00, powerA: 3200.0, powerBeta: 0.610, dailyCrewMaintInr: 6500.0, tyreMaintPerKmInr: 24.00, governanceFlag: "SPECIAL_LOAD_REVIEW" },
  { catId: "CAT033", gmtId: "GMT-033", appCode: "TRAILER_40FT_LOW_30T", bodyGroup: "40 ft trailers", displayName: "40ft Low Bed Trailer (30 Ton)", lengthFt: 40.0, payloadTonnes: 30.0, oemRefIds: "R23", tollClass: "NH_46", axles: 5, mileageKmpl: 2.7, intracityBaseInr: 6500.0, intracityPerKmInr: 88.0, freeLoadMins: 240, detentionPerHrInr: 400.0, affineFixedF0Inr: 18500.0, affineSlopeC1Inr: 68.50, powerA: 1380.0, powerBeta: 0.595, dailyCrewMaintInr: 3800.0, tyreMaintPerKmInr: 12.80, governanceFlag: "CONDITIONAL_REFERENCE" },
  { catId: "CAT034", gmtId: "GMT-034", appCode: "TRAILER_40FT_FLAT_60T", bodyGroup: "40 ft trailers", displayName: "40ft Flat Bed Trailer (60 Ton ODC)", lengthFt: 40.0, payloadTonnes: 60.0, oemRefIds: "R23; R24; R25; R26", tollClass: "NH_7", axles: 8, mileageKmpl: 1.9, intracityBaseInr: 17500.0, intracityPerKmInr: 250.0, freeLoadMins: 360, detentionPerHrInr: 800.0, affineFixedF0Inr: 43500.0, affineSlopeC1Inr: 178.00, powerA: 3050.0, powerBeta: 0.610, dailyCrewMaintInr: 6300.0, tyreMaintPerKmInr: 23.00, governanceFlag: "SPECIAL_LOAD_REVIEW" },
  { catId: "CAT035", gmtId: "GMT-035", appCode: "TRAILER_40FT_FLAT_30T", bodyGroup: "40 ft trailers", displayName: "40ft Flat Bed Trailer (30 Ton)", lengthFt: 40.0, payloadTonnes: 30.0, oemRefIds: "R23; R24; R25; R26", tollClass: "NH_46", axles: 5, mileageKmpl: 2.9, intracityBaseInr: 5500.0, intracityPerKmInr: 78.0, freeLoadMins: 240, detentionPerHrInr: 350.0, affineFixedF0Inr: 16500.0, affineSlopeC1Inr: 61.50, powerA: 1260.0, powerBeta: 0.592, dailyCrewMaintInr: 3500.0, tyreMaintPerKmInr: 11.50, governanceFlag: "CONDITIONAL_REFERENCE" },
  { catId: "CAT036", gmtId: "GMT-036", appCode: "TRAILER_40FT_SEMI_32T", bodyGroup: "40 ft trailers", displayName: "40ft Semi Bed Trailer (32 Ton)", lengthFt: 40.0, payloadTonnes: 32.0, oemRefIds: "R23; R27; R28; R29", tollClass: "NH_46", axles: 5, mileageKmpl: 2.7, intracityBaseInr: 6200.0, intracityPerKmInr: 84.0, freeLoadMins: 240, detentionPerHrInr: 380.0, affineFixedF0Inr: 17800.0, affineSlopeC1Inr: 65.80, powerA: 1340.0, powerBeta: 0.594, dailyCrewMaintInr: 3700.0, tyreMaintPerKmInr: 12.20, governanceFlag: "CONDITIONAL_REFERENCE" },
  { catId: "CAT037", gmtId: "GMT-037", appCode: "TRAILER_40FT_LOW_32T", bodyGroup: "40 ft trailers", displayName: "40ft Low Bed Trailer (32 Ton)", lengthFt: 40.0, payloadTonnes: 32.0, oemRefIds: "R23", tollClass: "NH_46", axles: 5, mileageKmpl: 2.6, intracityBaseInr: 6800.0, intracityPerKmInr: 91.0, freeLoadMins: 240, detentionPerHrInr: 420.0, affineFixedF0Inr: 19200.0, affineSlopeC1Inr: 71.20, powerA: 1430.0, powerBeta: 0.595, dailyCrewMaintInr: 3900.0, tyreMaintPerKmInr: 13.20, governanceFlag: "CONDITIONAL_REFERENCE" },
  { catId: "CAT038", gmtId: "GMT-038", appCode: "TRAILER_40FT_FLAT_32T", bodyGroup: "40 ft trailers", displayName: "40ft Flat Bed Trailer (32 Ton)", lengthFt: 40.0, payloadTonnes: 32.0, oemRefIds: "R23; R24; R25; R26", tollClass: "NH_46", axles: 5, mileageKmpl: 2.8, intracityBaseInr: 5800.0, intracityPerKmInr: 81.0, freeLoadMins: 240, detentionPerHrInr: 360.0, affineFixedF0Inr: 17200.0, affineSlopeC1Inr: 63.40, powerA: 1300.0, powerBeta: 0.593, dailyCrewMaintInr: 3600.0, tyreMaintPerKmInr: 11.90, governanceFlag: "CONDITIONAL_REFERENCE" },
  { catId: "CAT039", gmtId: "GMT-039", appCode: "TRAILER_40FT_LOW_35T", bodyGroup: "40 ft trailers", displayName: "40ft Low Bed Trailer (35 Ton)", lengthFt: 40.0, payloadTonnes: 35.0, oemRefIds: "R23", tollClass: "NH_46", axles: 6, mileageKmpl: 2.5, intracityBaseInr: 7200.0, intracityPerKmInr: 96.0, freeLoadMins: 240, detentionPerHrInr: 450.0, affineFixedF0Inr: 20500.0, affineSlopeC1Inr: 75.50, powerA: 1510.0, powerBeta: 0.596, dailyCrewMaintInr: 4100.0, tyreMaintPerKmInr: 13.90, governanceFlag: "CONDITIONAL_REFERENCE" },
  { catId: "CAT040", gmtId: "GMT-040", appCode: "TRAILER_40FT_SEMI_35T", bodyGroup: "40 ft trailers", displayName: "40ft Semi Bed Trailer (35 Ton)", lengthFt: 40.0, payloadTonnes: 35.0, oemRefIds: "R23; R27; R28; R29", tollClass: "NH_46", axles: 6, mileageKmpl: 2.6, intracityBaseInr: 6600.0, intracityPerKmInr: 89.0, freeLoadMins: 240, detentionPerHrInr: 400.0, affineFixedF0Inr: 18900.0, affineSlopeC1Inr: 69.50, powerA: 1410.0, powerBeta: 0.595, dailyCrewMaintInr: 3900.0, tyreMaintPerKmInr: 12.90, governanceFlag: "CONDITIONAL_REFERENCE" },
  { catId: "CAT041", gmtId: "GMT-041", appCode: "TRAILER_40FT_FLATBED", bodyGroup: "40 ft trailers", displayName: "40ft Flat Bed Trailer (35 Ton)", lengthFt: 40.0, payloadTonnes: 35.0, oemRefIds: "R23; R24; R25; R26", tollClass: "NH_46", axles: 6, mileageKmpl: 2.7, intracityBaseInr: 6100.0, intracityPerKmInr: 84.0, freeLoadMins: 240, detentionPerHrInr: 380.0, affineFixedF0Inr: 17592.1, affineSlopeC1Inr: 62.73, powerA: 1419.84, powerBeta: 0.5709, dailyCrewMaintInr: 3750.0, tyreMaintPerKmInr: 12.40, governanceFlag: "CONDITIONAL_REFERENCE" },
  { catId: "CAT042", gmtId: "GMT-042", appCode: "TRAILER_40FT_LOW_60T", bodyGroup: "40 ft trailers", displayName: "40ft Low Bed Trailer (60 Ton ODC)", lengthFt: 40.0, payloadTonnes: 60.0, oemRefIds: "R23", tollClass: "NH_7", axles: 8, mileageKmpl: 1.7, intracityBaseInr: 19500.0, intracityPerKmInr: 280.0, freeLoadMins: 360, detentionPerHrInr: 850.0, affineFixedF0Inr: 48000.0, affineSlopeC1Inr: 195.00, powerA: 3400.0, powerBeta: 0.612, dailyCrewMaintInr: 6800.0, tyreMaintPerKmInr: 25.50, governanceFlag: "SPECIAL_LOAD_REVIEW" },
  { catId: "CAT043", gmtId: "GMT-043", appCode: "TRAILER_40FT_SEMI_30T", bodyGroup: "40 ft trailers", displayName: "40ft Semi Bed Trailer (30 Ton)", lengthFt: 40.0, payloadTonnes: 30.0, oemRefIds: "R23; R27; R28; R29", tollClass: "NH_46", axles: 5, mileageKmpl: 2.8, intracityBaseInr: 6000.0, intracityPerKmInr: 82.0, freeLoadMins: 240, detentionPerHrInr: 380.0, affineFixedF0Inr: 17400.0, affineSlopeC1Inr: 64.20, powerA: 1310.0, powerBeta: 0.594, dailyCrewMaintInr: 3650.0, tyreMaintPerKmInr: 12.00, governanceFlag: "CONDITIONAL_REFERENCE" },
];

export const VEHICLE_BY_ID: Record<string, VehicleSpec> = {};
for (const v of VEHICLE_CATALOGUE) {
  VEHICLE_BY_ID[v.catId] = v;
  VEHICLE_BY_ID[v.gmtId] = v;
  VEHICLE_BY_ID[v.appCode] = v;
}

export const LEGACY_CODE_ALIASES: Record<string, string> = {
  MINI_OPEN_PICKUP: "CAT001",
  MINI_TRUCK: "CAT001",
  ASHOK_LEYLAND_DOST: "CAT002",
  TATA_INTRA: "CAT002",
  TRUCK_14FT: "CAT004",
  TRUCK_14FT_OPEN: "CAT004",
  TRUCK_14FT_CLOSED: "CAT018",
  TRUCK_17FT: "CAT005",
  TRUCK_17FT_CLOSED: "CAT019",
  TRUCK_19FT: "CAT006",
  TRUCK_20FT: "CAT021",
  CONTAINER_32FT: "CAT024",
};
for (const [alias, target] of Object.entries(LEGACY_CODE_ALIASES)) {
  if (!VEHICLE_BY_ID[alias] && VEHICLE_BY_ID[target]) {
    VEHICLE_BY_ID[alias] = VEHICLE_BY_ID[target];
  }
}

// ── Corridor Multipliers & Directional Asymmetry ──────────────────────────────
export const CORRIDOR_PAIR_LAMBDA: Record<string, number> = {
  "Chennai_Bengaluru": 1.150, "Chennai_Bangalore": 1.150,
  "Bengaluru_Chennai": 0.870, "Bangalore_Chennai": 0.870,
  "Kolkata_Patna": 1.240, "Patna_Kolkata": 0.690,
  "Kolkata_Siliguri": 1.320, "Siliguri_Kolkata": 0.680,
  "Kolkata_Guwahati": 1.380, "Guwahati_Kolkata": 0.720,
  "Mumbai_Bengaluru": 1.342, "Mumbai_Bangalore": 1.342,
  "Bengaluru_Mumbai": 0.668, "Bangalore_Mumbai": 0.668,
  "Delhi_Bhiwandi": 0.766, "Bhiwandi_Delhi": 1.234,
  "Delhi_Mumbai": 0.880, "Mumbai_Delhi": 1.140,
  "Delhi_Chennai": 1.040, "Chennai_Delhi": 0.820,
  "Delhi_Bengaluru": 1.080, "Delhi_Bangalore": 1.080,
  "Bengaluru_Delhi": 0.810, "Bangalore_Delhi": 0.810,
  "Ahmedabad_Mumbai": 1.060, "Mumbai_Ahmedabad": 0.940,
  "Ahmedabad_Bengaluru": 1.220, "Ahmedabad_Bangalore": 1.220,
};

export const HUB_DIRECTIONAL_LAMBDA: Record<string, number> = {
  Mumbai: 1.1939, "Navi Mumbai": 1.1890, Thane: 1.1850, Bhiwandi: 1.1900,
  Chennai: 1.1634, Sriperumbudur: 1.1558, Ahmedabad: 1.1397, Pune: 1.1301,
  Surat: 1.1121, Vadodara: 1.1050, Vapi: 1.1150, Malur: 1.0741,
  Ranchi: 1.0059, Delhi: 1.0500, "New Delhi": 1.0500, Noida: 1.0200,
  Ghaziabad: 1.0100, Faridabad: 1.0100, Hyderabad: 0.9925, Bengaluru: 0.9885,
  Bangalore: 0.9885, Visakhapatnam: 0.9810, Kolkata: 1.0400, Dankuni: 1.0400,
  Howrah: 1.0300, Barrackpore: 1.0200, Durgapur: 1.0100, Tirupur: 0.9207,
  Coimbatore: 0.9350, Nagpur: 0.8901, Hosur: 0.8835, Mysuru: 0.8746,
  Gurgaon: 0.9800, Gurugram: 0.9800, Perundurai: 0.8659, Bhubaneswar: 0.8376,
  Trichy: 0.8205, Pondicherry: 0.8158, Vijayawada: 0.7893, Cochin: 0.7842,
  Kochi: 0.7842, Thrissur: 0.7900, Salem: 0.7559, Tuticorin: 0.7526,
  Calicut: 0.7154, Guwahati: 0.7027, Siliguri: 0.7450, Patna: 0.7800,
  Jaipur: 0.9600, Indore: 0.9750, Bhopal: 0.9400, Raipur: 0.9850,
  Ludhiana: 1.0350, Ambala: 0.9700,
};

export const STATE_DIRECTIONAL_LAMBDA: Record<string, number> = {
  Maharashtra: 1.155, Gujarat: 1.135, "Tamil Nadu": 1.085, Delhi: 1.040,
  "NCT of Delhi": 1.040, Haryana: 1.010, Punjab: 1.015, Karnataka: 0.975,
  Telangana: 0.990, "West Bengal": 1.020, Jharkhand: 1.005, Chhattisgarh: 0.990,
  "Madhya Pradesh": 0.955, Rajasthan: 0.965, "Uttar Pradesh": 0.945, Odisha: 0.885,
  "Andhra Pradesh": 0.895, Bihar: 0.810, Kerala: 0.775, Assam: 0.725,
  Meghalaya: 0.740, Tripura: 0.715, "Himachal Pradesh": 0.890, Uttarakhand: 0.920,
  Goa: 0.860, "Jammu and Kashmir": 0.760,
};

export const SHRIRAM_MONTHLY_SEASONALITY: Record<number, number> = {
  1: 1.0049, 2: 1.0067, 3: 0.9920, 4: 0.9931,
  5: 0.9936, 6: 1.0000, 7: 1.0053, 8: 1.0148,
  9: 1.0193, 10: 0.9851, 11: 0.9855, 12: 0.9906,
};

export const COMMODITY_MODIFIERS: Record<string, [number, string]> = {
  "General Goods": [1.000, "STANDARD_ELIGIBLE"],
  "General Cargo": [1.000, "STANDARD_ELIGIBLE"],
  "General Commercial Goods": [1.000, "STANDARD_ELIGIBLE"],
  "Textiles / Garments": [1.000, "STANDARD_ELIGIBLE"],
  "Paper / Plywood / Timber": [1.015, "STANDARD_ELIGIBLE"],
  "Building Materials": [1.025, "STANDARD_ELIGIBLE"],
  "FMCG/Food": [1.020, "STANDARD_ELIGIBLE"],
  "Machines / Equipment / Spare Parts": [1.045, "HEAVY_HANDLING_CHECK"],
  "Furniture": [1.040, "VOLUMETRIC_PADDING_CHECK"],
  "Furniture / Home Furnishings": [1.040, "VOLUMETRIC_PADDING_CHECK"],
  "House Shifting": [1.065, "MULTI_FLOOR_LABOR_CHECK"],
  "Household Goods": [1.065, "MULTI_FLOOR_LABOR_CHECK"],
  "Household Goods & Shifting": [1.065, "MULTI_FLOOR_LABOR_CHECK"],
  "Household": [1.065, "MULTI_FLOOR_LABOR_CHECK"],
  "Electronics": [1.055, "HIGH_VALUE_FOV_REQUIRED"],
  "Electronics / Consumer Durables": [1.055, "HIGH_VALUE_FOV_REQUIRED"],
  "Fragile Items": [1.075, "OWNER_RISK_NO_PUBLIC_CARRIER_RATE"],
  "Hazardous / Chemicals": [1.150, "RESTRICTED_SPECIAL_APPROVAL"],
  "Cold Chain / Perishables": [1.280, "REEFER_BESPOKE_QUOTE"],
  "Other": [1.010, "STANDARD_ELIGIBLE"],
};

// ── Private Math Utilities ────────────────────────────────────────────────────
function toTitleCase(str: string): string {
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

function roundTo(val: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round((val + Number.EPSILON) * factor) / factor;
}

function calcP25(sortedValues: number[]): number {
  if (sortedValues.length === 0) return 0.0;
  const k = (sortedValues.length - 1) * 0.25;
  const f = Math.floor(k);
  const c = Math.ceil(k);
  if (f === c) return sortedValues[f];
  return sortedValues[f] * (c - k) + sortedValues[c] * (k - f);
}

// ── The Core Engine Class ─────────────────────────────────────────────────────
export class DFMEPricingEngine {
  /**
   * Resolve catalogue specification by ID, GMT code, application enum, or natural language name.
   */
  public resolveVehicle(code: string): VehicleSpec {
    const clean = String(code || '').trim();
    if (VEHICLE_BY_ID[clean]) {
      return VEHICLE_BY_ID[clean];
    }
    for (const [k, v] of Object.entries(VEHICLE_BY_ID)) {
      if (k === clean || clean.toLowerCase() === v.displayName.toLowerCase()) {
        return v;
      }
    }
    const u = clean.toUpperCase();
    const isContainer = u.includes("CONTAINER") || u.includes("CLOSED") || u.includes("BOX");
    if (u.includes("32")) {
      return isContainer ? VEHICLE_BY_ID["CAT024"] : VEHICLE_BY_ID["CAT014"];
    }
    if (u.includes("28")) return VEHICLE_BY_ID["CAT012"];
    if (u.includes("24") || u.includes("25")) return VEHICLE_BY_ID["CAT010"];
    if (u.includes("22")) return isContainer ? VEHICLE_BY_ID["CAT022"] : VEHICLE_BY_ID["CAT008"];
    if (u.includes("20")) return isContainer ? VEHICLE_BY_ID["CAT021"] : VEHICLE_BY_ID["CAT007"];
    if (u.includes("19")) return isContainer ? VEHICLE_BY_ID["CAT020"] : VEHICLE_BY_ID["CAT006"];
    if (u.includes("17")) return isContainer ? VEHICLE_BY_ID["CAT019"] : VEHICLE_BY_ID["CAT005"];
    if (u.includes("14")) return isContainer ? VEHICLE_BY_ID["CAT018"] : VEHICLE_BY_ID["CAT004"];
    if (u.includes("10") && (u.includes("FT") || u.includes("FEET"))) {
      return isContainer ? VEHICLE_BY_ID["CAT017"] : VEHICLE_BY_ID["CAT003"];
    }
    if (u.includes("BOLERO") || u.includes("PICKUP") || u.includes("DOST") || u.includes("INTRA")) {
      return VEHICLE_BY_ID["CAT002"];
    }
    if (u.includes("ACE") || u.includes("CHOTA HATHI") || u.includes("7FT") || u.includes("7 FT")) {
      return VEHICLE_BY_ID["CAT001"];
    }
    if (u.includes("TRAILER") || u.includes("40FT") || u.includes("40 FT")) {
      return VEHICLE_BY_ID["CAT035"];
    }
    return VEHICLE_BY_ID["CAT004"];
  }

  /**
   * Computes directional corridor imbalance multiplier (Lambda O -> D)
   */
  public computeDirectionalLambda(
    originCity: string, originState: string, destCity: string, destState: string, distanceKm: number
  ): number {
    if (distanceKm <= 50.0) {
      return 1.000;
    }
    const oCity = toTitleCase(String(originCity || '').trim());
    const dCity = toTitleCase(String(destCity || '').trim());
    const pairKey = `${oCity}_${dCity}`;
    if (CORRIDOR_PAIR_LAMBDA[pairKey] !== undefined) {
      return CORRIDOR_PAIR_LAMBDA[pairKey];
    }
    const oState = String(originState || '').trim();
    const dState = String(destState || '').trim();
    const lamO = HUB_DIRECTIONAL_LAMBDA[oCity] ?? STATE_DIRECTIONAL_LAMBDA[oState] ?? 1.000;
    const lamD = HUB_DIRECTIONAL_LAMBDA[dCity] ?? STATE_DIRECTIONAL_LAMBDA[dState] ?? 1.000;

    const rawAsymmetry = 0.65 * lamO + 0.35 * (2.0 - lamD);
    const wDist = Math.min(1.0, Math.max(0.0, (distanceKm - 50.0) / 200.0));
    const lamFinal = 1.0 + wDist * (rawAsymmetry - 1.0);
    return roundTo(Math.min(1.45, Math.max(0.65, lamFinal)), 4);
  }

  /**
   * Computes state diesel RSP and pass-through elasticity index (Phi diesel)
   */
  public computeDieselIndex(originState: string, isPtl: boolean = false): { rsp: number; phi: number } {
    const stateKey = String(originState || '').trim();
    const rsp = STATE_DIESEL_RSP_PROXY[stateKey] ?? NATIONAL_BASE_DIESEL_INR;
    if (isPtl) {
      const steps = Math.max(0.0, Math.floor((rsp - GATI_DPH_BASE_DIESEL_INR) / 0.50));
      return { rsp, phi: roundTo(1.0 + 0.01 * steps, 4) };
    } else {
      const gammaFuel = 0.45;
      const phi = 1.0 + gammaFuel * ((rsp - NATIONAL_BASE_DIESEL_INR) / NATIONAL_BASE_DIESEL_INR);
      return { rsp, phi: roundTo(phi, 4) };
    }
  }

  /**
   * Computes monthly Shriram index, end-of-month volume surge, and monsoon hill penalty
   */
  public computeSeasonalityMultiplier(month: number, dayOfMonth: number, destState: string): number {
    const sM = SHRIRAM_MONTHLY_SEASONALITY[Math.floor(month)] ?? 1.000;
    const mEom = Math.floor(dayOfMonth) >= 26 ? 1.025 : 1.000;
    const hillNeStates = new Set([
      "Assam", "Meghalaya", "Tripura", "Mizoram", "Manipur", "Nagaland",
      "Arunachal Pradesh", "Sikkim", "Himachal Pradesh", "Uttarakhand", "Jammu and Kashmir", "Kerala"
    ]);
    const isMonsoon = [6, 7, 8, 9].includes(Math.floor(month));
    const mMonsoon = (isMonsoon && hillNeStates.has(String(destState || '').trim())) ? 1.045 : 1.000;
    return roundTo(sM * mEom * mMonsoon, 4);
  }

  /**
   * PTL (Part-Truck-Load / Surface Express) Volumetric Pricing Engine
   */
  public pricePtlShipment(req: ShipmentRequest, spec: VehicleSpec): QuoteOutput {
    const notes: string[] = ["PTL Mode: Calibrated to Allcargo/Gati (V001, C001-C033) & Eshopbox (V003, C034-C049) reference rules."];
    const ptlLength = req.ptlLengthCm ?? 0.0;
    const ptlBreadth = req.ptlBreadthCm ?? 0.0;
    const ptlHeight = req.ptlHeightCm ?? 0.0;
    const ptlPackages = Math.max(1, req.ptlPackages ?? 1);
    const goodsWeight = req.goodsWeightKg ?? 1000.0;

    const volCft = (ptlLength * ptlBreadth * ptlHeight * ptlPackages) / 27000.0;
    const volWeightKg = volCft * 10.0;
    const chargeableWeightKg = Math.max(20.0, goodsWeight, volWeightKg);

    const d = Math.max(10.0, req.tripDistanceKm);
    const basePerKg = Math.max(3.50, Math.min(14.50, 3.20 + 0.0048 * d - 0.0000006 * Math.pow(d, 2)));
    const baseFreight = Math.max(350.0, chargeableWeightKg * basePerKg);

    const docketFee = 150.0;
    const declaredValue = req.declaredInvoiceValueInr ?? 50000.0;
    const fovCharge = req.riskType === "CARRIER_RISK"
      ? Math.max(300.0, 0.0020 * declaredValue)
      : Math.max(100.0, 0.0010 * declaredValue);

    let geoSurcharge = 0.0;
    const neStates = new Set(["Assam", "Meghalaya", "Tripura", "Mizoram", "Manipur", "Nagaland", "Arunachal Pradesh", "Sikkim"]);
    if (neStates.has(req.destinationState) || neStates.has(req.originState)) {
      geoSurcharge += Math.max(750.0, 8.0 * chargeableWeightKg);
    } else if (["Jammu and Kashmir", "Kerala", "Ladakh", "Himachal Pradesh"].includes(req.destinationState)) {
      geoSurcharge += Math.max(400.0, 4.0 * chargeableWeightKg);
    }
    if ((req.originState && req.originState.includes("Delhi")) || (req.destinationState && req.destinationState.includes("Delhi"))) {
      geoSurcharge += Math.max(100.0, 1.0 * chargeableWeightKg);
    }

    const odaSurcharge = req.isOdaRemote ? Math.max(700.0, 3.0 * chargeableWeightKg) : 0.0;
    const holidaySurcharge = req.isHolidayOrSunday ? Math.max(1000.0, 5.0 * chargeableWeightKg) : 0.0;

    const { phi: phiDiesel } = this.computeDieselIndex(req.originState, true);
    const subtotal = Math.max(d > 100 ? 600.0 : 400.0, (baseFreight + fovCharge) * phiDiesel);
    const accessorialTotal = docketFee + fovCharge + geoSurcharge + odaSurcharge + holidaySurcharge;
    const totalSell = roundTo(subtotal + docketFee + geoSurcharge + odaSurcharge + holidaySurcharge, 2);
    const buyTarget = roundTo(totalSell * 0.88, 2);
    const costFloor = roundTo(totalSell * 0.80, 2);

    return {
      enquiryId: req.enquiryId,
      vehicleCatId: spec.catId,
      vehicleDisplayName: `PTL Surface Express (${chargeableWeightKg.toFixed(1)} kg chargeable)`,
      tollClass: spec.tollClass,
      pricingRegime: "PTL_VOLUMETRIC",
      distanceKm: d,
      fuelCostInr: roundTo(costFloor * 0.45, 2),
      tollCostInr: roundTo(costFloor * 0.08, 2),
      crewAndStandingCostInr: roundTo(costFloor * 0.27, 2),
      tyreAndMaintCostInr: roundTo(costFloor * 0.10, 2),
      deadheadAndRepositionInr: roundTo(costFloor * 0.10, 2),
      deterministicCostFloorInr: costFloor,
      baseSpatialBenchmarkInr: roundTo(baseFreight, 2),
      directionalLambda: 1.000,
      dieselIndexMultiplier: phiDiesel,
      seasonalCalendarMultiplier: 1.000,
      commodityAndStopMultiplier: 1.000,
      detentionAndAccessorialInr: roundTo(accessorialTotal, 2),
      adjustedMarketBenchmarkInr: totalSell,
      bayesianBidWeight: 0.0,
      operatorBuyTargetInr: buyTarget,
      platformMarginPct: 12.0,
      platformMarginInr: roundTo(totalSell - buyTarget, 2),
      customerSellQuoteInr: totalSell,
      customerQuoteRangeLowInr: roundTo(totalSell * 0.95, 2),
      customerQuoteRangeHighInr: roundTo(totalSell * 1.06, 2),
      effectiveRatePerKmInr: roundTo(totalSell / d, 2),
      confidenceScorePct: 82.0,
      governanceStatus: "REFERENCE_PTL_TARIFF",
      auditNotes: notes,
    };
  }

  /**
   * Main 5-Layer Econometric Pricing Dispatcher
   */
  public priceShipment(req: ShipmentRequest): QuoteOutput {
    const spec = this.resolveVehicle(req.vehicleCode);
    if (req.isPtl) {
      return this.pricePtlShipment(req, spec);
    }
    const notes: string[] = [];
    const d = Math.max(1.0, req.tripDistanceKm || 15.0);
    const durMin = req.estimatedDurationMin ?? (d * 2.2);
    const reqTonnes = (req.goodsWeightKg ?? 500.0) / 1000.0;

    let overloadPenalty = 1.000;
    if (spec.governanceFlag === "SPECIAL_LOAD_REVIEW" || reqTonnes > 55.0) {
      notes.push("SPECIAL_LOAD_REVIEW: Payload >55T GCW limit (MoRTH Rule W09); ODC hydraulic modular permit & escort required.");
    } else if (reqTonnes > spec.payloadTonnes * 1.05) {
      notes.push(`OVERLOAD_WARNING: Requested ${reqTonnes.toFixed(2)}T exceeds listed ${spec.payloadTonnes.toFixed(2)}T capacity; recommend upgrading vehicle class.`);
      overloadPenalty = 1.08;
    }

    const { rsp: rspDiesel, phi: phiDiesel } = this.computeDieselIndex(req.originState, false);
    const effectiveMileage = spec.mileageKmpl * (d <= 40.0 ? 0.82 : 1.00);
    const fuelCost = (d / effectiveMileage) * rspDiesel;

    let tollCost = 0.0;
    if (req.verifiedRouteTollInr !== undefined && req.verifiedRouteTollInr !== null) {
      tollCost = Number(req.verifiedRouteTollInr);
      notes.push("TOLL_EXACT: Using verified plaza sequence tariff sum.");
    } else {
      if (d < 35.0) {
        tollCost = 0.0;
      } else {
        const plazaMean = TOLL_CLASS_STATS_INR[spec.tollClass]?.meanPlazaInr ?? 79.79;
        const nhFraction = Math.min(0.90, Math.max(0.45, 0.45 + (d - 35.0) / 600.0));
        const expectedPlazas = (d * nhFraction) / NH_AVG_PLAZA_SPACING_KM;
        tollCost = expectedPlazas * plazaMean;
      }
      notes.push(`TOLL_CONDITIONAL: ${spec.tollClass} statistical NH expectation (Rs.${(TOLL_CLASS_STATS_INR[spec.tollClass]?.meanPlazaInr ?? 79.79).toFixed(2)}/plaza).`);
    }

    const loadingWait = req.loadingWaitMins ?? 60.0;
    const tripDays = d <= 50.0
      ? Math.max(0.22, (durMin + Math.max(60.0, loadingWait)) / (9.0 * 60.0))
      : (d / 380.0 + 0.45);
    const crewStandingCost = tripDays * spec.dailyCrewMaintInr;
    const tyreMaintCost = d * spec.tyreMaintPerKmInr;

    const deadheadKm = (req.deadheadKm && req.deadheadKm > 0)
      ? req.deadheadKm
      : (d <= 30.0 ? 3.5 : Math.min(25.0, 0.06 * d));
    const deadheadCost = deadheadKm * ((rspDiesel / effectiveMileage) + spec.tyreMaintPerKmInr);
    const lamDir = this.computeDirectionalLambda(req.originCity, req.originState, req.destinationCity, req.destinationState, d);
    const repositionBuffer = Math.max(0.0, (lamDir - 1.0) * 0.35 * (fuelCost + tyreMaintCost));
    const deadheadAndRepo = deadheadCost + repositionBuffer;

    const backhaulRecoveryFactor = Math.min(1.0, Math.pow(lamDir, 1.8));
    const costFloor = fuelCost + tollCost + backhaulRecoveryFactor * (crewStandingCost + tyreMaintCost + deadheadAndRepo);

    let pricingRegime = "";
    let baseSpatial = 0.0;

    if (d <= 50.0) {
      pricingRegime = "INTRACITY_METERED";
      const billableKm = Math.max(0.0, d - 2.0);
      const kmTier1 = Math.min(13.0, billableKm);
      const kmTier2 = Math.max(0.0, billableKm - 13.0);
      const distCharge = kmTier1 * spec.intracityPerKmInr + kmTier2 * (spec.intracityPerKmInr * 0.88);
      const expectedFreeflowMin = (d / 20.0) * 60.0;
      const congestionDelayMin = Math.max(0.0, durMin - expectedFreeflowMin);
      const congestionCharge = congestionDelayMin * (spec.detentionPerHrInr / 60.0) * 0.75;
      baseSpatial = spec.intracityBaseInr + distCharge + congestionCharge;
    } else {
      pricingRegime = d <= 500.0 ? "REGIONAL_GRID" : "INTERSTATE_DECAY";
      const pAffine = spec.affineFixedF0Inr + spec.affineSlopeC1Inr * d;
      const pPower = spec.powerA * Math.pow(d, spec.powerBeta);
      const wPower = Math.min(0.65, Math.max(0.25, (d - 50.0) / 1200.0));
      baseSpatial = (1.0 - wPower) * pAffine + wPower * pPower;
      const intracityAt50 = spec.intracityBaseInr + 13.0 * spec.intracityPerKmInr + 35.0 * (spec.intracityPerKmInr * 0.88);
      baseSpatial = Math.max(intracityAt50 * 1.05, baseSpatial);
    }

    const month = req.timestampMonth ?? (new Date().getMonth() + 1);
    const day = req.dayOfMonth ?? new Date().getDate();
    const mSeason = this.computeSeasonalityMultiplier(month, day, req.destinationState);

    const [commMult, commFlag] = COMMODITY_MODIFIERS[req.goodsType ?? "General Goods"] ?? [1.010, "STANDARD_ELIGIBLE"];
    if (commFlag !== "STANDARD_ELIGIBLE") {
      notes.push(`CARGO_MODIFIER: ${req.goodsType} -> ${commFlag} (x${commMult.toFixed(3)}).`);
    }

    const extraStops = Math.max(0, (req.stopsCount ?? 1) - 1);
    const stopMult = 1.0 + (0.045 * extraStops);
    const totalCommStopMult = roundTo(commMult * stopMult * overloadPenalty, 4);

    const billableDetentionMins = Math.max(0.0, loadingWait - spec.freeLoadMins);
    let detentionInr = (billableDetentionMins / 60.0) * spec.detentionPerHrInr;
    if (req.isHolidayOrSunday && d > 50.0) {
      detentionInr += 1000.0;
    }

    const adjustedBenchmark = baseSpatial * lamDir * phiDiesel * mSeason * totalCommStopMult + detentionInr;
    const benchmarkOperatorBuy = adjustedBenchmark * 0.920;

    const liveBids = req.liveOperatorBidsInr ?? [];
    const nBids = liveBids.length;
    let wBid = 0.0;
    let rawBuyTarget = benchmarkOperatorBuy;

    if (nBids > 0) {
      const sortedBids = [...liveBids].sort((a, b) => a - b);
      const q25Bid = calcP25(sortedBids);
      wBid = roundTo(nBids / (nBids + 2.0), 4);
      rawBuyTarget = wBid * q25Bid + (1.0 - wBid) * benchmarkOperatorBuy;
      notes.push(`LIVE_BID_FUSION: Fused ${nBids} live operator bids (P25=Rs.${q25Bid.toFixed(0)}, weight=${wBid.toFixed(2)}).`);
    }

    const operatorBuyTarget = Math.max(costFloor * 1.02, rawBuyTarget);

    let targetMarginPct = 0.0;
    let minMarginInr = 0.0;

    if (d <= 50.0) {
      targetMarginPct = 0.110;
      minMarginInr = spec.payloadTonnes <= 0.6 ? 65.0 : 140.0;
    } else if (d <= 500.0) {
      targetMarginPct = 0.085;
      minMarginInr = 650.0;
    } else {
      targetMarginPct = 0.075;
      minMarginInr = 1500.0;
    }

    if (req.channel === "WHATSAPP_ASSISTED") {
      targetMarginPct += 0.005;
    }

    let rawSellQuote = operatorBuyTarget / (1.0 - targetMarginPct);
    if ((rawSellQuote - operatorBuyTarget) < minMarginInr) {
      rawSellQuote = operatorBuyTarget + minMarginInr;
    }

    const customerSellQuote = roundTo(rawSellQuote, 2);
    const platformMarginInr = roundTo(customerSellQuote - operatorBuyTarget, 2);
    const realizedMarginPct = roundTo((platformMarginInr / customerSellQuote) * 100.0, 2);

    const halfBand = nBids >= 2 ? 0.045 : (d <= 500.0 ? 0.055 : 0.065);
    const quoteLow = roundTo(customerSellQuote * (1.0 - halfBand), 2);
    const quoteHigh = roundTo(customerSellQuote * (1.0 + halfBand), 2);

    let baseConf = d <= 500.0 ? 78.0 : 74.0;
    if (req.verifiedRouteTollInr !== undefined && req.verifiedRouteTollInr !== null) {
      baseConf += 8.0;
    }
    if (nBids > 0) {
      baseConf += Math.min(12.0, nBids * 4.0);
    }

    let govStatus = "";
    if (spec.governanceFlag === "SPECIAL_LOAD_REVIEW") {
      baseConf -= 25.0;
      govStatus = "HOLD_SPECIAL_LOAD_60T_ODC_REVIEW";
    } else if (commFlag === "RESTRICTED_SPECIAL_APPROVAL" || commFlag === "REEFER_BESPOKE_QUOTE") {
      baseConf -= 20.0;
      govStatus = `HOLD_${commFlag}`;
    } else if (baseConf >= 82.0) {
      govStatus = "INSTANT_QUOTE_ELIGIBLE";
    } else {
      govStatus = "INDICATIVE_RANGE_TRIGGER_LIVE_BIDDING";
    }

    return {
      enquiryId: req.enquiryId,
      vehicleCatId: spec.catId,
      vehicleDisplayName: spec.displayName,
      tollClass: spec.tollClass,
      pricingRegime,
      distanceKm: roundTo(d, 2),
      fuelCostInr: roundTo(fuelCost, 2),
      tollCostInr: roundTo(tollCost, 2),
      crewAndStandingCostInr: roundTo(crewStandingCost * backhaulRecoveryFactor, 2),
      tyreAndMaintCostInr: roundTo(tyreMaintCost * backhaulRecoveryFactor, 2),
      deadheadAndRepositionInr: roundTo(deadheadAndRepo * backhaulRecoveryFactor, 2),
      deterministicCostFloorInr: roundTo(costFloor, 2),
      baseSpatialBenchmarkInr: roundTo(baseSpatial, 2),
      directionalLambda: lamDir,
      dieselIndexMultiplier: phiDiesel,
      seasonalCalendarMultiplier: mSeason,
      commodityAndStopMultiplier: totalCommStopMult,
      detentionAndAccessorialInr: roundTo(detentionInr, 2),
      adjustedMarketBenchmarkInr: roundTo(adjustedBenchmark, 2),
      bayesianBidWeight: wBid,
      operatorBuyTargetInr: roundTo(operatorBuyTarget, 2),
      platformMarginPct: realizedMarginPct,
      platformMarginInr,
      customerSellQuoteInr: customerSellQuote,
      customerQuoteRangeLowInr: quoteLow,
      customerQuoteRangeHighInr: quoteHigh,
      effectiveRatePerKmInr: roundTo(customerSellQuote / d, 2),
      confidenceScorePct: roundTo(Math.min(99.0, Math.max(35.0, baseConf)), 1),
      governanceStatus: govStatus,
      auditNotes: notes,
    };
  }
}

export const dfmePricingEngine = new DFMEPricingEngine();
