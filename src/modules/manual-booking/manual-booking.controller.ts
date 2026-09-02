import { Request, Response, NextFunction } from "express";
import * as service from "./manual-booking.service";

function ok(res: Response, data: any, statusCode = 200, message?: string) {
  return res.status(statusCode).json({ success: true, data, message });
}

export async function createManualBooking(req: Request, res: Response, next: NextFunction) {
  try {
    const adminUser = (req as any).user;
    const result = await service.createManualBooking(req.body, adminUser);
    return ok(res, result, 201, "Manual booking created successfully");
  } catch (err) {
    next(err);
  }
}

export async function listManualBookings(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.listManualBookings(req.query);
    return ok(res, result);
  } catch (err) {
    next(err);
  }
}

export async function getManualBookingById(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.getManualBookingById(req.params.id as string);
    return ok(res, result);
  } catch (err) {
    next(err);
  }
}

export async function updateManualBooking(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.updateManualBooking(req.params.id as string, req.body);
    return ok(res, result, 200, "Manual booking updated successfully");
  } catch (err) {
    next(err);
  }
}

export async function deleteManualBooking(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.deleteManualBooking(req.params.id as string);
    return ok(res, result);
  } catch (err) {
    next(err);
  }
}

export async function exportManualBookingsCsv(req: Request, res: Response, next: NextFunction) {
  try {
    const csvData = await service.exportManualBookingsCsv(req.query);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=manual-bookings-${Date.now()}.csv`);
    return res.status(200).send(csvData);
  } catch (err) {
    next(err);
  }
}

export async function getMatchedDrivers(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.getMatchedDriversForBooking(req.params.id as string, req.query);
    return ok(res, result);
  } catch (err) {
    next(err);
  }
}
