import { z } from "zod";

export const createManualBookingSchema = z.object({
  bookingNumber: z.string().optional(),
  source: z.string().optional(),

  customerName: z.string().optional().nullable(),
  customerPhone: z.string().optional().nullable(),
  customerEmail: z.string().optional().nullable(),
  customerCompany: z.string().optional().nullable(),
  customerGstin: z.string().optional().nullable(),

  receiverName: z.string().optional().nullable(),
  receiverPhone: z.string().optional().nullable(),

  pickupAddress: z.string().optional().nullable(),
  pickupCity: z.string().optional().nullable(),
  pickupDistrict: z.string().optional().nullable(),
  pickupState: z.string().optional().nullable(),
  pickupPincode: z.string().optional().nullable(),
  pickupLandmark: z.string().optional().nullable(),
  pickupDateTime: z.union([z.string(), z.date()]).optional().nullable(),
  pickupLat: z.number().optional().nullable(),
  pickupLng: z.number().optional().nullable(),

  dropoffAddress: z.string().optional().nullable(),
  dropoffCity: z.string().optional().nullable(),
  dropoffDistrict: z.string().optional().nullable(),
  dropoffState: z.string().optional().nullable(),
  dropoffPincode: z.string().optional().nullable(),
  dropoffLandmark: z.string().optional().nullable(),
  dropoffDateTime: z.union([z.string(), z.date()]).optional().nullable(),
  dropoffLat: z.number().optional().nullable(),
  dropoffLng: z.number().optional().nullable(),

  estimatedDistanceKm: z.number().optional().nullable(),
  routeDescription: z.string().optional().nullable(),

  vehicleType: z.string().optional().nullable(),
  vehicleNumber: z.string().optional().nullable(),
  truckCount: z.number().optional().nullable(),
  bodyType: z.string().optional().nullable(),

  driverName: z.string().optional().nullable(),
  driverPhone: z.string().optional().nullable(),
  driverDlNumber: z.string().optional().nullable(),
  transporterName: z.string().optional().nullable(),
  transporterPhone: z.string().optional().nullable(),

  goodsType: z.string().optional().nullable(),
  goodsDescription: z.string().optional().nullable(),
  goodsWeightKg: z.number().optional().nullable(),
  goodsWeightTons: z.number().optional().nullable(),
  goodsQuantity: z.number().optional().nullable(),
  goodsDeclaredValue: z.number().optional().nullable(),
  handlingInstructions: z.string().optional().nullable(),

  quotedAmount: z.number().optional().nullable(),
  driverPayoutAmount: z.number().optional().nullable(),
  advanceReceived: z.number().optional().nullable(),
  balanceAmount: z.number().optional().nullable(),
  paymentStatus: z.string().optional().nullable(),
  paymentMode: z.string().optional().nullable(),
  invoiceNumber: z.string().optional().nullable(),

  status: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const updateManualBookingSchema = createManualBookingSchema.partial();
