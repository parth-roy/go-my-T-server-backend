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
