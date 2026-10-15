import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { s3Service, UploadFolder, extractS3Key, isPrivateUpload } from './upload.service';
import { prisma } from '@shared/db/prisma';
import { logger } from '@shared/logger';

// ── Multer: store uploads in memory, then stream straight to DO Spaces ─────
const storage = multer.memoryStorage();

// General upload middleware (10 MB cap)
export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

// Strict profile avatar middleware: 3 MB, single image only
export const uploadAvatar = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3 MB cap for profile pictures
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG or WEBP images are allowed for profile pictures'));
    }
  },
});

/**
 * Verify whether an authenticated caller owns a private document.
 */
async function checkDocumentOwnership(userId: string | undefined, keyOrUrl: string): Promise<boolean> {
  if (!userId) return false;
  const key = extractS3Key(keyOrUrl);
  if (!key) return false;

  // Fast-path: key includes userId in path prefix (e.g. documents/user-123/uuid.jpg)
  if (key.includes(`/${userId}/`)) return true;

  // 1. Check Driver Document
  const driverDoc = await prisma.driverDocument.findFirst({
    where: {
      fileUrl: { contains: key },
      driver: { userId },
    },
  });
  if (driverDoc) return true;

  // 2. Check Workforce Worker Document
  const workerDoc = await prisma.workerDocument.findFirst({
    where: {
      fileUrl: { contains: key },
      worker: { userId },
    },
  });
  if (workerDoc) return true;

  // 3. Check Fleet Truck Document
  const truckDoc = await prisma.fleetTruckDocument.findFirst({
    where: {
      fileUrl: { contains: key },
      truck: { fleetOwner: { userId } },
    },
  });
  if (truckDoc) return true;

  // 4. Check Booking POD
  const stop = await prisma.bookingStop.findFirst({
    where: {
      podPhotoUrl: { contains: key },
      booking: {
        OR: [
          { customerId: userId },
          { driver: { userId } },
          { awardedFleetOwner: { userId } },
        ],
      },
    },
  });
  if (stop) return true;

  return false;
}

export const uploadController = {
  /**
   * POST /api/v1/upload/single
   * Upload a single file to the specified folder.
   * Body: multipart/form-data — field "file" + optional "folder" text field.
   */
  uploadSingle: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ success: false, message: 'No file provided' });
      }

      // Validate folder param against allowed values; sanitize safe folder name or fall back to 'documents'
      const rawFolder = (req.body.folder as string | undefined)?.trim().toLowerCase() ?? '';
      const safeFolder = rawFolder.replace(/[^a-z0-9_-]/g, '');
      const allowedFolders = Object.values(UploadFolder) as string[];
      const folder = allowedFolders.includes(safeFolder)
        ? safeFolder
        : (safeFolder.length > 0 ? safeFolder : UploadFolder.DOCUMENTS);

      const userId = req.user?.id;
      const result = await s3Service.uploadFile(
        file.buffer,
        file.originalname,
        file.mimetype,
        folder,
        undefined,
        userId,
      );

      if (!result.success) {
        return res.status(422).json({ success: false, message: result.error ?? 'Upload failed' });
      }

      return res.status(200).json({
        success: true,
        data: {
          url: result.url,
          key: result.key,
          signedUrl: result.signedUrl,
          isPrivate: result.isPrivate,
        },
        message: 'File uploaded successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/upload/multiple
   * Upload up to 10 files to the specified folder.
   * Body: multipart/form-data — field "files[]" + optional "folder" text field.
   */
  uploadMultiple: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ success: false, message: 'No files provided' });
      }

      const allowedFolders = Object.values(UploadFolder) as string[];
      const rawFolder = (req.body.folder as string | undefined)?.trim().toLowerCase() ?? '';
      const folder = allowedFolders.includes(rawFolder) ? rawFolder : UploadFolder.UPLOADS;
      const userId = req.user?.id;

      const results = await s3Service.uploadMultiple(
        files.map((f) => ({ buffer: f.buffer, fileName: f.originalname, contentType: f.mimetype })),
        folder,
        userId,
      );

      const successful = results
        .filter((r) => r.success)
        .map((r) => ({
          url: r.url,
          key: r.key,
          signedUrl: r.signedUrl,
          isPrivate: r.isPrivate,
        }));
      const failedCount = results.filter((r) => !r.success).length;

      return res.status(200).json({
        success: failedCount === 0,
        data: { files: successful, totalUploaded: successful.length, failedCount },
        message:
          failedCount === 0
            ? 'All files uploaded successfully'
            : `${successful.length} uploaded, ${failedCount} failed`,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/upload/view-url
   * Generate an authorized viewable signed URL for an S3 key or stored URL.
   * Verifies that the caller owns the document or has ADMIN role.
   */
  getSignedViewUrl: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const keyOrUrl = (req.query.key as string || req.query.url as string || '').trim();
      if (!keyOrUrl) {
        return res.status(400).json({ success: false, message: 'key or url query parameter is required' });
      }

      const key = extractS3Key(keyOrUrl);
      const firstSegment = key.split('/')[0] || '';

      // If it's a private document folder, enforce object authorization
      if (isPrivateUpload(firstSegment)) {
        const userId = req.user?.id;
        const userRole = req.user?.role;

        if (userRole !== 'ADMIN') {
          const isOwner = await checkDocumentOwnership(userId, keyOrUrl);
          if (!isOwner) {
            return res.status(403).json({ success: false, message: 'Access denied to this document' });
          }
        }
      }

      const signedUrl = await s3Service.resolveViewableUrl(keyOrUrl, 7200);
      return res.status(200).json({
        success: true,
        data: { url: signedUrl, key },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/v1/upload/:key
   * Delete a file by its S3 key (URL-encoded, e.g. profile%2Fuuid-photo.jpg).
   * Verifies that the caller owns the file, audit-critical evidence (POD, verified KYC)
   * cannot be deleted, and synchronizes database state for profile avatars.
   */
  deleteFile: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = req.params.key;
      if (!key) {
        return res.status(400).json({ success: false, message: 'File key is required' });
      }

      // Decode URI component in case key contains '/' encoded as '%2F'
      const decodedKey = decodeURIComponent(String(key));
      const cleanKey = extractS3Key(decodedKey);
      if (!cleanKey) {
        return res.status(400).json({ success: false, message: 'Invalid file key' });
      }

      const userId = req.user?.id;
      const userRole = req.user?.role;

      // Non-admins must strictly prove ownership and cannot destroy audit/compliance records
      if (userRole !== 'ADMIN') {
        if (!userId) {
          return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        // 1. Audit Immutability: Proof of Delivery (POD) records cannot be deleted
        const stop = await prisma.bookingStop.findFirst({
          where: { podPhotoUrl: { contains: cleanKey } },
        });
        if (stop) {
          return res.status(403).json({
            success: false,
            message: 'Proof of Delivery records are immutable audit records and cannot be deleted',
          });
        }

        // 2. Audit Immutability: Submitted or verified KYC documents cannot be deleted directly
        const driverDoc = await prisma.driverDocument.findFirst({
          where: { fileUrl: { contains: cleanKey } },
        });
        if (driverDoc && (driverDoc.status === 'VERIFIED' || driverDoc.status === 'PENDING')) {
          return res.status(403).json({
            success: false,
            message: 'Submitted or verified KYC documents cannot be deleted directly. Re-upload to update.',
          });
        }

        const workerDoc = await prisma.workerDocument.findFirst({
          where: { fileUrl: { contains: cleanKey } },
        });
        if (workerDoc && (workerDoc.status === 'VERIFIED' || workerDoc.status === 'PENDING')) {
          return res.status(403).json({
            success: false,
            message: 'Submitted or verified worker documents cannot be deleted directly. Re-upload to update.',
          });
        }

        const truckDoc = await prisma.fleetTruckDocument.findFirst({
          where: { fileUrl: { contains: cleanKey } },
        });
        if (truckDoc) {
          return res.status(403).json({
            success: false,
            message: 'Fleet truck documents cannot be deleted directly. Re-upload to update.',
          });
        }

        // 3. Strict Ownership Verification
        const isOwner = await checkDocumentOwnership(userId, cleanKey);
        const isUserAvatar = await prisma.user.findFirst({
          where: { id: userId, profileImageUrl: { contains: cleanKey } },
        });
        const hasUserPrefix = cleanKey.includes(`/${userId}/`);

        if (!isOwner && !isUserAvatar && !hasUserPrefix) {
          return res.status(403).json({
            success: false,
            message: 'Access denied: You do not own this file',
          });
        }

        // 4. Synchronize database if user deleted their own avatar
        if (isUserAvatar) {
          await prisma.user.update({
            where: { id: userId },
            data: { profileImageUrl: null },
          });
        }
      }

      const result = await s3Service.deleteFile(cleanKey);

      if (!result.success) {
        return res.status(422).json({ success: false, message: result.error ?? 'Delete failed' });
      }

      return res.status(200).json({ success: true, message: 'File deleted successfully' });
    } catch (error) {
      next(error);
    }
  },
};