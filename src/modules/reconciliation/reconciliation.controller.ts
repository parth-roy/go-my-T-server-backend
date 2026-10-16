import { Request, Response, NextFunction } from 'express';
import { ReconciliationService } from './reconciliation.service';
import { ReconciliationCategory, ReconciliationSeverity, ReconciliationStatus } from '@prisma/client';
import { prisma } from '@shared/db/prisma';
import { AppError } from '@shared/errors/AppError';

function ok(res: Response, data: any, statusCode = 200) {
  return res.status(statusCode).json({ success: true, data });
}

export async function runReconciliationNow(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await ReconciliationService.runReconciliationCycle();
    ok(res, result);
  } catch (err) {
    next(err);
  }
}

export async function listExceptions(req: Request, res: Response, next: NextFunction) {
  try {
    const { category, severity, status, page, limit } = req.query;

    const result = await ReconciliationService.listExceptions({
      category: category as ReconciliationCategory | undefined,
      severity: severity as ReconciliationSeverity | undefined,
      status: status as ReconciliationStatus | undefined,
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });

    ok(res, result);
  } catch (err) {
    next(err);
  }
}

export async function getExceptionById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const item = await prisma.reconciliationException.findUnique({
      where: { id: id as string },
    });

    if (!item) {
      throw AppError.notFound('Reconciliation exception not found');
    }

    ok(res, item);
  } catch (err) {
    next(err);
  }
}

export async function resolveException(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const adminId = (req as any).user?.id || 'ADMIN';
    const { resolutionNote } = req.body;

    if (!resolutionNote || typeof resolutionNote !== 'string' || resolutionNote.trim().length < 3) {
      throw AppError.badRequest('A valid resolution note of at least 3 characters is required');
    }

    const updated = await ReconciliationService.resolveException(
      id as string,
      adminId,
      resolutionNote.trim()
    );

    ok(res, updated);
  } catch (err) {
    next(err);
  }
}
