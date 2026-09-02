import { prisma } from "@shared/db/prisma";
import { AppError } from "@shared/errors/AppError";

function generateBookingNumber(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `MNL-${dateStr}-${rand}`;
}

export async function createManualBooking(data: any, adminUser?: { id?: string; name?: string }) {
  let bookingNumber = data.bookingNumber?.trim();
  if (!bookingNumber) {
    bookingNumber = generateBookingNumber();
  }

  let existing = await prisma.manualBooking.findUnique({ where: { bookingNumber } });
  let counter = 1;
  while (existing) {
    bookingNumber = `${bookingNumber}-${counter++}`;
    existing = await prisma.manualBooking.findUnique({ where: { bookingNumber } });
  }

  const quoted = typeof data.quotedAmount === "number" ? data.quotedAmount : parseFloat(data.quotedAmount) || null;
  const advance = typeof data.advanceReceived === "number" ? data.advanceReceived : parseFloat(data.advanceReceived) || 0;
  const payout = typeof data.driverPayoutAmount === "number" ? data.driverPayoutAmount : parseFloat(data.driverPayoutAmount) || null;
  const distance = typeof data.estimatedDistanceKm === "number" ? data.estimatedDistanceKm : parseFloat(data.estimatedDistanceKm) || null;
  const weightKg = typeof data.goodsWeightKg === "number" ? data.goodsWeightKg : parseFloat(data.goodsWeightKg) || null;
  const weightTons = typeof data.goodsWeightTons === "number" ? data.goodsWeightTons : parseFloat(data.goodsWeightTons) || null;
  const quantity = typeof data.goodsQuantity === "number" ? data.goodsQuantity : parseInt(data.goodsQuantity) || null;
  const truckCount = typeof data.truckCount === "number" ? data.truckCount : parseInt(data.truckCount) || 1;
  const declaredValue = typeof data.goodsDeclaredValue === "number" ? data.goodsDeclaredValue : parseFloat(data.goodsDeclaredValue) || null;

  let balanceAmount = data.balanceAmount !== undefined && data.balanceAmount !== null && data.balanceAmount !== ""
    ? (typeof data.balanceAmount === "number" ? data.balanceAmount : parseFloat(data.balanceAmount))
    : (quoted !== null ? Math.max(0, quoted - advance) : null);

  const pickupDate = data.pickupDateTime ? new Date(data.pickupDateTime) : null;
  const dropoffDate = data.dropoffDateTime ? new Date(data.dropoffDateTime) : null;

  const record = await prisma.manualBooking.create({
    data: {
      bookingNumber,
      source: data.source || "ADMIN_MANUAL",

      customerName: data.customerName || null,
      customerPhone: data.customerPhone || null,
      customerEmail: data.customerEmail || null,
      customerCompany: data.customerCompany || null,
      customerGstin: data.customerGstin || null,

      receiverName: data.receiverName || null,
      receiverPhone: data.receiverPhone || null,

      pickupAddress: data.pickupAddress || null,
      pickupCity: data.pickupCity || null,
      pickupDistrict: data.pickupDistrict || null,
      pickupState: data.pickupState || null,
      pickupPincode: data.pickupPincode || null,
      pickupLandmark: data.pickupLandmark || null,
      pickupDateTime: pickupDate && !isNaN(pickupDate.getTime()) ? pickupDate : null,
      pickupLat: data.pickupLat ? parseFloat(data.pickupLat) : null,
      pickupLng: data.pickupLng ? parseFloat(data.pickupLng) : null,

      dropoffAddress: data.dropoffAddress || null,
      dropoffCity: data.dropoffCity || null,
      dropoffDistrict: data.dropoffDistrict || null,
      dropoffState: data.dropoffState || null,
      dropoffPincode: data.dropoffPincode || null,
      dropoffLandmark: data.dropoffLandmark || null,
      dropoffDateTime: dropoffDate && !isNaN(dropoffDate.getTime()) ? dropoffDate : null,
      dropoffLat: data.dropoffLat ? parseFloat(data.dropoffLat) : null,
      dropoffLng: data.dropoffLng ? parseFloat(data.dropoffLng) : null,

      estimatedDistanceKm: distance,
      routeDescription: data.routeDescription || null,

      vehicleType: data.vehicleType || null,
      vehicleNumber: data.vehicleNumber || null,
      truckCount,
      bodyType: data.bodyType || null,

      driverName: data.driverName || null,
      driverPhone: data.driverPhone || null,
      driverDlNumber: data.driverDlNumber || null,
      transporterName: data.transporterName || null,
      transporterPhone: data.transporterPhone || null,

      goodsType: data.goodsType || null,
      goodsDescription: data.goodsDescription || null,
      goodsWeightKg: weightKg,
      goodsWeightTons: weightTons,
      goodsQuantity: quantity,
      goodsDeclaredValue: declaredValue,
      handlingInstructions: data.handlingInstructions || null,

      quotedAmount: quoted,
      driverPayoutAmount: payout,
      advanceReceived: advance,
      balanceAmount,
      paymentStatus: data.paymentStatus || "PENDING",
      paymentMode: data.paymentMode || null,
      invoiceNumber: data.invoiceNumber || null,

      status: data.status || "INQUIRY",
      notes: data.notes || null,

      createdByAdminId: adminUser?.id || null,
      createdByAdminName: adminUser?.name || "Admin",
    },
  });

  return record;
}

export async function listManualBookings(params: any = {}) {
  const page = Math.max(1, parseInt(params.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(params.limit) || 25));
  const skip = (page - 1) * limit;

  const where: any = {};

  if (params.search && params.search.trim()) {
    const q = params.search.trim();
    where.OR = [
      { bookingNumber: { contains: q, mode: "insensitive" } },
      { customerName: { contains: q, mode: "insensitive" } },
      { customerPhone: { contains: q, mode: "insensitive" } },
      { customerCompany: { contains: q, mode: "insensitive" } },
      { pickupCity: { contains: q, mode: "insensitive" } },
      { dropoffCity: { contains: q, mode: "insensitive" } },
      { vehicleNumber: { contains: q, mode: "insensitive" } },
      { driverName: { contains: q, mode: "insensitive" } },
      { goodsType: { contains: q, mode: "insensitive" } },
    ];
  }

  if (params.status && params.status !== "ALL") {
    where.status = params.status;
  }

  if (params.paymentStatus && params.paymentStatus !== "ALL") {
    where.paymentStatus = params.paymentStatus;
  }

  if (params.vehicleType && params.vehicleType !== "ALL") {
    where.vehicleType = params.vehicleType;
  }

  if (params.source && params.source !== "ALL") {
    where.source = params.source;
  }

  if (params.pickupCity) {
    where.pickupCity = { contains: params.pickupCity, mode: "insensitive" };
  }

  if (params.dropoffCity) {
    where.dropoffCity = { contains: params.dropoffCity, mode: "insensitive" };
  }

  if (params.pickupState) {
    where.pickupState = { contains: params.pickupState, mode: "insensitive" };
  }

  if (params.dropoffState) {
    where.dropoffState = { contains: params.dropoffState, mode: "insensitive" };
  }

  if (params.startDate || params.endDate) {
    where.createdAt = {};
    if (params.startDate) where.createdAt.gte = new Date(params.startDate);
    if (params.endDate) where.createdAt.lte = new Date(params.endDate);
  }

  const [data, total, totalStats] = await Promise.all([
    prisma.manualBooking.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.manualBooking.count({ where }),
    prisma.manualBooking.aggregate({
      where: {},
      _sum: { quotedAmount: true, advanceReceived: true },
      _count: { id: true },
    }),
  ]);

  const [inTransitCount, confirmedCount] = await Promise.all([
    prisma.manualBooking.count({ where: { status: { in: ["IN_TRANSIT", "LOADING", "TRUCK_ASSIGNED"] } } }),
    prisma.manualBooking.count({ where: { status: "CONFIRMED" } }),
  ]);

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    stats: {
      totalBookings: totalStats._count.id || 0,
      totalQuotedRevenue: totalStats._sum.quotedAmount || 0,
      totalAdvanceReceived: totalStats._sum.advanceReceived || 0,
      inTransitCount,
      confirmedCount,
    },
  };
}

export async function getManualBookingById(id: string) {
  const record = await prisma.manualBooking.findUnique({ where: { id } });
  if (!record) {
    throw new AppError("Manual booking record not found", 404, "NOT_FOUND");
  }
  return record;
}

export async function updateManualBooking(id: string, data: any) {
  const existing = await prisma.manualBooking.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError("Manual booking record not found", 404, "NOT_FOUND");
  }

  const updatePayload: any = {};
  const fields = [
    "bookingNumber", "source", "customerName", "customerPhone", "customerEmail",
    "customerCompany", "customerGstin", "receiverName", "receiverPhone",
    "pickupAddress", "pickupCity", "pickupDistrict", "pickupState", "pickupPincode", "pickupLandmark",
    "dropoffAddress", "dropoffCity", "dropoffDistrict", "dropoffState", "dropoffPincode", "dropoffLandmark",
    "routeDescription", "vehicleType", "vehicleNumber", "bodyType",
    "driverName", "driverPhone", "driverDlNumber", "transporterName", "transporterPhone",
    "goodsType", "goodsDescription", "handlingInstructions", "paymentStatus", "paymentMode",
    "invoiceNumber", "status", "notes"
  ];

  fields.forEach((f) => {
    if (data[f] !== undefined) {
      updatePayload[f] = data[f] === "" ? null : data[f];
    }
  });

  if (data.pickupDateTime !== undefined) {
    updatePayload.pickupDateTime = data.pickupDateTime ? new Date(data.pickupDateTime) : null;
  }
  if (data.dropoffDateTime !== undefined) {
    updatePayload.dropoffDateTime = data.dropoffDateTime ? new Date(data.dropoffDateTime) : null;
  }
  if (data.quotedAmount !== undefined) {
    updatePayload.quotedAmount = data.quotedAmount !== "" && data.quotedAmount !== null ? parseFloat(data.quotedAmount) : null;
  }
  if (data.advanceReceived !== undefined) {
    updatePayload.advanceReceived = data.advanceReceived !== "" && data.advanceReceived !== null ? parseFloat(data.advanceReceived) : 0;
  }
  if (data.driverPayoutAmount !== undefined) {
    updatePayload.driverPayoutAmount = data.driverPayoutAmount !== "" && data.driverPayoutAmount !== null ? parseFloat(data.driverPayoutAmount) : null;
  }
  if (data.estimatedDistanceKm !== undefined) {
    updatePayload.estimatedDistanceKm = data.estimatedDistanceKm !== "" && data.estimatedDistanceKm !== null ? parseFloat(data.estimatedDistanceKm) : null;
  }
  if (data.goodsWeightKg !== undefined) {
    updatePayload.goodsWeightKg = data.goodsWeightKg !== "" && data.goodsWeightKg !== null ? parseFloat(data.goodsWeightKg) : null;
  }
  if (data.goodsWeightTons !== undefined) {
    updatePayload.goodsWeightTons = data.goodsWeightTons !== "" && data.goodsWeightTons !== null ? parseFloat(data.goodsWeightTons) : null;
  }
  if (data.goodsQuantity !== undefined) {
    updatePayload.goodsQuantity = data.goodsQuantity !== "" && data.goodsQuantity !== null ? parseInt(data.goodsQuantity) : null;
  }
  if (data.truckCount !== undefined) {
    updatePayload.truckCount = data.truckCount !== "" && data.truckCount !== null ? parseInt(data.truckCount) : 1;
  }
  if (data.goodsDeclaredValue !== undefined) {
    updatePayload.goodsDeclaredValue = data.goodsDeclaredValue !== "" && data.goodsDeclaredValue !== null ? parseFloat(data.goodsDeclaredValue) : null;
  }

  const finalQuoted = updatePayload.quotedAmount !== undefined ? updatePayload.quotedAmount : existing.quotedAmount;
  const finalAdvance = updatePayload.advanceReceived !== undefined ? updatePayload.advanceReceived : existing.advanceReceived;
  if (data.balanceAmount !== undefined) {
    updatePayload.balanceAmount = data.balanceAmount !== "" && data.balanceAmount !== null ? parseFloat(data.balanceAmount) : null;
  } else if (finalQuoted !== null && finalQuoted !== undefined) {
    updatePayload.balanceAmount = Math.max(0, finalQuoted - (finalAdvance || 0));
  }

  const updated = await prisma.manualBooking.update({
    where: { id },
    data: updatePayload,
  });

  return updated;
}

export async function deleteManualBooking(id: string) {
  const existing = await prisma.manualBooking.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError("Manual booking record not found", 404, "NOT_FOUND");
  }
  await prisma.manualBooking.delete({ where: { id } });
  return { success: true, message: "Manual booking deleted successfully" };
}

export async function exportManualBookingsCsv(params: any = {}) {
  const res = await listManualBookings({ ...params, limit: 5000, page: 1 });
  const records = res.data;

  const headers = [
    "Booking Number", "Source", "Status", "Customer Name", "Customer Phone", "Customer Company",
    "Pickup City", "Pickup State", "Pickup Date", "Dropoff City", "Dropoff State", "Dropoff Date",
    "Vehicle Type", "Vehicle Number", "Driver Name", "Driver Phone",
    "Goods Type", "Goods Description", "Weight (Tons)", "Quoted Fare", "Advance Received",
    "Balance Amount", "Payment Status", "Payment Mode", "Created Date", "Notes"
  ];

  const escapeCsv = (str: any) => {
    if (str === null || str === undefined) return '""';
    const val = String(str).replace(/"/g, '""');
    return `"${val}"`;
  };

  const rows = records.map((r: any) => [
    escapeCsv(r.bookingNumber),
    escapeCsv(r.source),
    escapeCsv(r.status),
    escapeCsv(r.customerName),
    escapeCsv(r.customerPhone),
    escapeCsv(r.customerCompany),
    escapeCsv(r.pickupCity),
    escapeCsv(r.pickupState),
    escapeCsv(r.pickupDateTime ? new Date(r.pickupDateTime).toLocaleDateString("en-IN") : ""),
    escapeCsv(r.dropoffCity),
    escapeCsv(r.dropoffState),
    escapeCsv(r.dropoffDateTime ? new Date(r.dropoffDateTime).toLocaleDateString("en-IN") : ""),
    escapeCsv(r.vehicleType),
    escapeCsv(r.vehicleNumber),
    escapeCsv(r.driverName),
    escapeCsv(r.driverPhone),
    escapeCsv(r.goodsType),
    escapeCsv(r.goodsDescription),
    escapeCsv(r.goodsWeightTons || (r.goodsWeightKg ? (r.goodsWeightKg / 1000).toFixed(2) : "")),
    escapeCsv(r.quotedAmount),
    escapeCsv(r.advanceReceived),
    escapeCsv(r.balanceAmount),
    escapeCsv(r.paymentStatus),
    escapeCsv(r.paymentMode),
    escapeCsv(new Date(r.createdAt).toLocaleDateString("en-IN")),
    escapeCsv(r.notes)
  ].join(","));

  return [headers.join(","), ...rows].join("\n");
}


const CITY_COORDINATES_MAP: Record<string, { lat: number; lng: number }> = {
  // West Bengal
  'barrackpore': { lat: 22.7600, lng: 88.3700 },
  'titagarh': { lat: 22.7400, lng: 88.3750 },
  'sodepur': { lat: 22.6980, lng: 88.3890 },
  'belghoria': { lat: 22.6620, lng: 88.3850 },
  'dum dum': { lat: 22.6420, lng: 88.4310 },
  'barasat': { lat: 22.7230, lng: 88.4800 },
  'naihati': { lat: 22.8900, lng: 88.4250 },
  'chinsurah': { lat: 22.9000, lng: 88.3900 },
  'hooghly': { lat: 22.9000, lng: 88.3900 },
  'serampore': { lat: 22.7500, lng: 88.3400 },
  'rishra': { lat: 22.7100, lng: 88.3500 },
  'dankuni': { lat: 22.6850, lng: 88.2950 },
  'dhulagarh': { lat: 22.5700, lng: 88.2500 },
  'howrah': { lat: 22.5958, lng: 88.2636 },
  'kolkata': { lat: 22.5726, lng: 88.3639 },
  'burrabazar': { lat: 22.5850, lng: 88.3550 },
  'salt lake': { lat: 22.5867, lng: 88.4178 },
  'new town': { lat: 22.5958, lng: 88.4795 },
  'sankrail': { lat: 22.5600, lng: 88.2400 },
  'uluberia': { lat: 22.4700, lng: 87.9800 },
  'bagnan': { lat: 22.4670, lng: 87.9670 },
  'haldia': { lat: 22.0667, lng: 88.0698 },
  'kharagpur': { lat: 22.3400, lng: 87.3200 },
  'durgapur': { lat: 23.5204, lng: 87.3119 },
  'asansol': { lat: 23.6889, lng: 86.9661 },
  'raniganj': { lat: 23.6210, lng: 87.1270 },
  'kalyani': { lat: 22.9760, lng: 88.4340 },
  'malda': { lat: 25.0085, lng: 88.1432 },
  'siliguri': { lat: 26.7271, lng: 88.3953 },

  // Maharashtra
  'mumbai': { lat: 19.0760, lng: 72.8777 },
  'andheri': { lat: 19.1197, lng: 72.8464 },
  'bandra': { lat: 19.0596, lng: 72.8295 },
  'borivali': { lat: 19.2300, lng: 72.8580 },
  'thane': { lat: 19.2183, lng: 72.9781 },
  'navi mumbai': { lat: 19.0330, lng: 73.0297 },
  'vashi': { lat: 19.0771, lng: 72.9986 },
  'panvel': { lat: 18.9894, lng: 73.1175 },
  'bhiwandi': { lat: 19.2967, lng: 73.0631 },
  'kalyan': { lat: 19.2403, lng: 73.1305 },
  'pune': { lat: 18.5204, lng: 73.8567 },
  'chakan': { lat: 18.7606, lng: 73.8587 },
  'bhosari': { lat: 18.6298, lng: 73.8443 },
  'nagpur': { lat: 21.1458, lng: 79.0882 },
  'nashik': { lat: 19.9975, lng: 73.7898 },
  'aurangabad': { lat: 19.8762, lng: 75.3433 },
  'solapur': { lat: 17.6599, lng: 75.9064 },
  'kolhapur': { lat: 16.7050, lng: 74.2433 },

  // Karnataka
  'bengaluru': { lat: 12.9716, lng: 77.5946 },
  'peenya': { lat: 13.0289, lng: 77.5174 },
  'whitefield': { lat: 12.9799, lng: 77.7480 },
  'electronic city': { lat: 12.8399, lng: 77.6770 },
  'hoskote': { lat: 13.0712, lng: 77.8007 },
  'nelamangala': { lat: 13.0984, lng: 77.3934 },
  'tumakuru': { lat: 13.3379, lng: 77.1173 },
  'mysuru': { lat: 12.2958, lng: 76.6394 },

  // Tamil Nadu
  'chennai': { lat: 13.0827, lng: 80.2707 },
  'sriperumbudur': { lat: 12.9699, lng: 79.9400 },
  'oragadam': { lat: 12.8333, lng: 79.9333 },
  'ambattur': { lat: 13.1143, lng: 80.1548 },
  'hosur': { lat: 12.7409, lng: 77.8253 },
  'coimbatore': { lat: 11.0168, lng: 76.9558 },
  'tiruppur': { lat: 11.1085, lng: 77.3411 },
  'madurai': { lat: 9.9252, lng: 78.1198 },

  // Telangana & Andhra Pradesh
  'hyderabad': { lat: 17.3850, lng: 78.4867 },
  'jeedimetla': { lat: 17.5180, lng: 78.4380 },
  'kukatpally': { lat: 17.4947, lng: 78.3996 },
  'madhapur': { lat: 17.4483, lng: 78.3742 },
  'gachibowli': { lat: 17.4401, lng: 78.3489 },
  'balanagar': { lat: 17.4640, lng: 78.4420 },
  'cherlapally': { lat: 17.4720, lng: 78.6010 },
  'autonagar': { lat: 17.3400, lng: 78.5700 },
  'kattedan': { lat: 17.3180, lng: 78.4420 },
  'patancheru': { lat: 17.5290, lng: 78.2642 },
  'medchal': { lat: 17.6288, lng: 78.5278 },
  'visakhapatnam': { lat: 17.6868, lng: 83.2185 },
  'vijayawada': { lat: 16.5062, lng: 80.6480 },
  'guntur': { lat: 16.3067, lng: 80.4365 },

  // Gujarat
  'ahmedabad': { lat: 23.0225, lng: 72.5714 },
  'sanand': { lat: 22.9859, lng: 72.3789 },
  'surat': { lat: 21.1702, lng: 72.8311 },
  'vadodara': { lat: 22.3072, lng: 73.1812 },
  'rajkot': { lat: 22.3039, lng: 70.8022 },
  'morbi': { lat: 22.8173, lng: 70.8378 },
  'mundra': { lat: 22.8427, lng: 69.7258 },
  'gandhidham': { lat: 23.0753, lng: 70.1337 },
  'vapi': { lat: 20.3893, lng: 72.9106 },

  // Delhi NCR & North
  'delhi': { lat: 28.7041, lng: 77.1025 },
  'new delhi': { lat: 28.6139, lng: 77.2090 },
  'noida': { lat: 28.5355, lng: 77.3910 },
  'greater noida': { lat: 28.4744, lng: 77.5040 },
  'ghaziabad': { lat: 28.6692, lng: 77.4538 },
  'gurugram': { lat: 28.4595, lng: 77.0266 },
  'manesar': { lat: 28.3510, lng: 76.9400 },
  'faridabad': { lat: 28.4089, lng: 77.3178 },
  'jaipur': { lat: 26.9124, lng: 75.7873 },
  'chandigarh': { lat: 30.7333, lng: 76.7794 },
  'ludhiana': { lat: 30.9010, lng: 75.8573 },

  // Central & East
  'lucknow': { lat: 26.8467, lng: 80.9462 },
  'kanpur': { lat: 26.4499, lng: 80.3319 },
  'agra': { lat: 27.1767, lng: 78.0081 },
  'patna': { lat: 25.5941, lng: 85.1376 },
  'bhopal': { lat: 23.2599, lng: 77.4126 },
  'indore': { lat: 22.7196, lng: 75.8577 },
  'pithampur': { lat: 22.6000, lng: 75.6800 },
  'raipur': { lat: 21.2514, lng: 81.6296 },
  'ranchi': { lat: 23.3441, lng: 85.3096 },
  'jamshedpur': { lat: 22.8046, lng: 86.2029 },
  'dhanbad': { lat: 23.7957, lng: 86.4304 },
  'bhubaneswar': { lat: 20.2961, lng: 85.8245 },
  'cuttack': { lat: 20.4625, lng: 85.8828 },
  'paradeep': { lat: 20.3167, lng: 86.6167 },
  'kochi': { lat: 9.9312, lng: 76.2673 },
  'guwahati': { lat: 26.1445, lng: 91.7362 },
};

function calculateHaversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

function resolveLocationCoordinates(text: string): { lat: number; lng: number; matchedKey: string } | null {
  if (!text) return null;
  const clean = text.toLowerCase();
  for (const [key, coords] of Object.entries(CITY_COORDINATES_MAP)) {
    if (clean.includes(key)) {
      return { ...coords, matchedKey: key };
    }
  }
  return null;
}

export interface MatchedDriverItem {
  id: string;
  leadId: string;
  name: string;
  phone: string;
  city: string;
  state: string | null;
  transportHub: string | null;
  vehicleType: string;
  vehicleNumber: string;
  distanceKm: number;
  tier: "LOCAL" | "REGIONAL" | "CORRIDOR" | "EXTENDED";
  isExactVehicleMatch: boolean;
  matchScore: number;
  notes: string | null;
  status: string;
  createdAt: Date;
}

export async function getMatchedDriversForBooking(bookingId: string, options: any = {}) {
  const booking = await prisma.manualBooking.findUnique({
    where: { id: bookingId },
  });

  if (!booking) {
    throw new AppError("Manual booking not found", 404);
  }

  // 1. Determine Pickup Coordinates
  let pickupLat = booking.pickupLat;
  let pickupLng = booking.pickupLng;
  let resolvedLocationName = booking.pickupCity || booking.pickupDistrict || booking.pickupAddress || "Unknown";

  if (!pickupLat || !pickupLng) {
    const searchString = `${booking.pickupAddress || ""} ${booking.pickupCity || ""} ${booking.pickupDistrict || ""} ${booking.pickupState || ""}`;
    const resolved = resolveLocationCoordinates(searchString);
    if (resolved) {
      pickupLat = resolved.lat;
      pickupLng = resolved.lng;
      resolvedLocationName = resolved.matchedKey.toUpperCase();
    } else {
      // Default center fallback (India centroid)
      pickupLat = 22.5726;
      pickupLng = 88.3639;
    }
  }

  const requestedVehicle = options.vehicleType || booking.vehicleType || "";
  const maxRadiusKm = options.radiusKm ? Number(options.radiusKm) : null;
  const searchFilter = (options.search || "").toLowerCase().trim();

  // 2. Query Driver Leads
  const driverLeads = await prisma.formDriverLead.findMany({
    orderBy: { createdAt: "desc" },
    take: 3000,
  });

  // 3. Proximity & Match Scoring
  const matchedDrivers: MatchedDriverItem[] = [];

  for (const driver of driverLeads) {
    let dLat = driver.givenLat || driver.autoLat;
    let dLng = driver.givenLng || driver.autoLng;

    if (!dLat || !dLng) {
      const resolved = resolveLocationCoordinates(`${driver.city} ${driver.transportHub || ""} ${driver.state || ""}`);
      if (resolved) {
        dLat = resolved.lat;
        dLng = resolved.lng;
      } else {
        dLat = 22.5726;
        dLng = 88.3639;
      }
    }

    const distanceKm = calculateHaversineKm(pickupLat, pickupLng, dLat, dLng);

    // Filter by maxRadius if provided
    if (maxRadiusKm && distanceKm > maxRadiusKm) {
      continue;
    }

    // Text search filter if provided
    if (searchFilter) {
      const matchText = `${driver.name} ${driver.phone} ${driver.city} ${driver.transportHub || ""} ${driver.vehicleType} ${driver.notes || ""}`.toLowerCase();
      if (!matchText.includes(searchFilter)) {
        continue;
      }
    }

    // Determine Tier
    let tier: "LOCAL" | "REGIONAL" | "CORRIDOR" | "EXTENDED";
    if (distanceKm <= 25) {
      tier = "LOCAL";
    } else if (distanceKm <= 60) {
      tier = "REGIONAL";
    } else if (distanceKm <= 150) {
      tier = "CORRIDOR";
    } else {
      tier = "EXTENDED";
    }

    // Vehicle Match Check
    const isExactVehicleMatch = requestedVehicle
      ? driver.vehicleType.toUpperCase() === requestedVehicle.toUpperCase()
      : true;

    // Calculate smart Match Score (0 - 100)
    let matchScore = 100;
    // Distance penalty (decreases score smoothly as distance increases)
    matchScore -= Math.min(60, distanceKm * 0.4);
    // Exact vehicle match bonus
    if (isExactVehicleMatch) {
      matchScore += 30;
    }
    // City name match bonus
    if (
      booking.pickupCity &&
      driver.city.toLowerCase().includes(booking.pickupCity.toLowerCase().trim())
    ) {
      matchScore += 20;
    }

    matchScore = Math.max(10, Math.round(matchScore));

    matchedDrivers.push({
      id: driver.id,
      leadId: driver.dlNumber ? driver.dlNumber.replace("SEED-DL-", "") : driver.id.slice(0, 8),
      name: driver.name,
      phone: driver.phone,
      city: driver.city,
      state: driver.state,
      transportHub: driver.transportHub,
      vehicleType: driver.vehicleType,
      vehicleNumber: driver.vehicleNumber,
      distanceKm,
      tier,
      isExactVehicleMatch,
      matchScore,
      notes: driver.notes,
      status: driver.status,
      createdAt: driver.createdAt,
    });
  }

  // 4. Sort: Exact vehicle match first, then by distance ascending
  matchedDrivers.sort((a, b) => {
    if (a.isExactVehicleMatch !== b.isExactVehicleMatch) {
      return a.isExactVehicleMatch ? -1 : 1;
    }
    return a.distanceKm - b.distanceKm;
  });

  // 5. Summary metrics
  const localCount = matchedDrivers.filter((d) => d.tier === "LOCAL").length;
  const regionalCount = matchedDrivers.filter((d) => d.tier === "REGIONAL").length;
  const corridorCount = matchedDrivers.filter((d) => d.tier === "CORRIDOR").length;
  const extendedCount = matchedDrivers.filter((d) => d.tier === "EXTENDED").length;

  return {
    booking: {
      id: booking.id,
      bookingNumber: booking.bookingNumber,
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
      pickupCity: booking.pickupCity,
      pickupAddress: booking.pickupAddress,
      dropoffCity: booking.dropoffCity,
      dropoffAddress: booking.dropoffAddress,
      vehicleType: booking.vehicleType,
      goodsType: booking.goodsType,
      quotedAmount: booking.quotedAmount,
      pickupDateTime: booking.pickupDateTime,
      status: booking.status,
    },
    pickupCoords: {
      lat: pickupLat,
      lng: pickupLng,
      resolvedLocationName,
    },
    summary: {
      totalMatched: matchedDrivers.length,
      localCount,
      regionalCount,
      corridorCount,
      extendedCount,
    },
    drivers: matchedDrivers.slice(0, 150), // Return top 150 closest matched drivers
  };
}
