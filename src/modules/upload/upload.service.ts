import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '@config/env';
import { logger } from '@shared/logger';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

// ── Folder constants (maps usage type to DO Spaces subfolder) ──────────────
export const UploadFolder = {
  PROFILE:       'profile',
  PROFILES:      'profiles',
  BOOKINGS:      'bookings',
  DOCUMENTS:     'documents',
  BANNERS:       'banners',
  IDENTITY_DOCS: 'identity_docs',
  DL_DOCS:       'dl_docs',
  RC_DOCS:       'rc_docs',
  FITNESS_DOCS:  'fitness_docs',
  PERMIT_DOCS:   'permit_docs',
  SELFIES:       'selfies',
  UPLOADS:       'uploads',   // fallback / generic
} as const;

export type UploadFolderType = typeof UploadFolder[keyof typeof UploadFolder];

export const PUBLIC_FOLDERS = new Set<string>(['profile', 'profiles', 'banners']);

/**
 * Determine if an upload folder contains sensitive/private documents (KYC, DL, RC, POD, etc.)
 * Default to private unless explicitly declared as a public asset folder.
 */
export function isPrivateUpload(folder: string): boolean {
  if (!folder) return true;
  const clean = folder.trim().toLowerCase();
  return !PUBLIC_FOLDERS.has(clean);
}

// ── S3 client configured for DigitalOcean Spaces ──────────────────────────
// DO Spaces is S3-compatible but requires:
//   1. Custom endpoint (not *.amazonaws.com)
//   2. forcePathStyle: false  → virtual-hosted style URLs
//   3. region = the slug before .digitaloceanspaces.com (e.g. 'sgp1')
const s3Client = new S3Client({
  region: 'sgp1',
  endpoint: env.DO_SPACES_ENDPOINT,
  credentials: {
    accessKeyId: env.DO_SPACES_KEY || '',
    secretAccessKey: env.DO_SPACES_SECRET || '',
  },
  forcePathStyle: false,
});

const BUCKET = env.DO_SPACES_BUCKET;
// CDN base: https://gomytruck.sgp1.digitaloceanspaces.com
const CDN_BASE = env.DO_SPACES_CDN_ENDPOINT;

// ── Allowed MIME types & their extensions ─────────────────────────────────
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
]);

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB global cap

// ── Result types ──────────────────────────────────────────────────────────
export interface UploadResult {
  success: boolean;
  url?: string;       // canonical CDN URL (stored in database)
  key?: string;       // S3 key (folder/uuid-filename.ext)
  signedUrl?: string; // presigned viewable URL (if private or requested)
  isPrivate?: boolean;
  error?: string;
}

/**
 * Extract the pure S3 object key from either a full URL or a relative path.
 * e.g. "https://gomytruck.sgp1.digitaloceanspaces.com/documents/abc.jpg" -> "documents/abc.jpg"
 */
export function extractS3Key(urlOrKey: string): string {
  if (!urlOrKey) return '';
  const trimmed = urlOrKey.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return trimmed.replace(/^\/+/, '');
  }
  try {
    const parsed = new URL(trimmed);
    let pathname = decodeURIComponent(parsed.pathname).replace(/^\/+/, '');
    if (BUCKET && pathname.startsWith(`${BUCKET}/`)) {
      pathname = pathname.substring(BUCKET.length + 1);
    }
    return pathname;
  } catch {
    return trimmed.replace(/^\/+/, '');
  }
}

/**
 * Build a sanitised object key.
 * e.g. documents/user-uuid/a3f1c2d4-...-photo.jpg
 */
function buildKey(folder: string, originalName: string, userId?: string): string {
  // Sanitise filename: strip path separators, keep only the extension
  const ext  = path.extname(originalName).toLowerCase() || '';
  const safe = path.basename(originalName, ext).replace(/[^a-zA-Z0-9._-]/g, '_');
  const userPrefix = userId ? `${userId}/` : '';
  return `${folder}/${userPrefix}${uuidv4()}-${safe}${ext}`;
}

/**
 * Resolves content type from filename extension if rawContentType is generic/missing.
 */
export function resolveContentType(fileName: string, rawContentType?: string): string {
  const normalized = (rawContentType || '').trim().toLowerCase();
  if (normalized && normalized !== 'application/octet-stream' && ALLOWED_MIME_TYPES.has(normalized)) {
    return normalized;
  }
  const ext = path.extname(fileName).toLowerCase();
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    case '.pdf':
      return 'application/pdf';
    default:
      return normalized || 'application/octet-stream';
  }
}

/**
 * Validate file before upload.
 * Returns an error message string, or null if valid.
 */
function validate(buffer: Buffer, contentType: string, maxBytes = MAX_SIZE_BYTES): string | null {
  if (buffer.length === 0) return 'File buffer is empty';
  if (buffer.length > maxBytes) return `File too large (max ${maxBytes / (1024 * 1024)} MB)`;
  if (!ALLOWED_MIME_TYPES.has(contentType)) {
    return `Unsupported file type: ${contentType}. Allowed: JPEG, PNG, WEBP, GIF, PDF`;
  }
  return null;
}

export const s3Service = {
  /**
   * Upload a single file to DigitalOcean Spaces.
   * Sensitive folders (documents, identity, dl, rc, pod) default to private ACL.
   * Public folders (profile, banners) are public-read with CDN caching.
   */
  uploadFile: async (
    file: Buffer,
    fileName: string,
    rawContentType: string,
    folder: UploadFolderType | string = UploadFolder.UPLOADS,
    maxBytes?: number,
    userId?: string,
  ): Promise<UploadResult> => {
    const contentType = resolveContentType(fileName, rawContentType);
    // Validate
    const validationError = validate(file, contentType, maxBytes);
    if (validationError) {
      logger.warn(`Upload validation failed: ${validationError}`);
      return { success: false, error: validationError };
    }

    const isPrivate = isPrivateUpload(folder);
    const key = buildKey(folder, fileName, userId);

    try {
      const command = new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: file,
        ContentType: contentType,
        // Sensitive documents are private; only public profile pictures and banners have public-read ACL
        ACL: isPrivate ? 'private' : 'public-read',
        // Cache public assets on CDN for 1 year; private documents must never be cached publicly by CDNs/browsers
        CacheControl: isPrivate ? 'private, no-cache, no-store, must-revalidate' : 'max-age=31536000',
      });

      await s3Client.send(command);

      const url = `${CDN_BASE}/${key}`;
      let signedUrl: string | undefined;
      if (isPrivate) {
        signedUrl = (await s3Service.getSignedUrl(key)) || undefined;
      }

      logger.info(`[S3] Uploaded (${isPrivate ? 'private' : 'public'}) → ${url}`);
      return { success: true, url, key, signedUrl, isPrivate };
    } catch (error: any) {
      logger.error('[S3] Upload error:', { message: error.message, code: error.Code });
      return { success: false, error: error.message ?? 'Upload failed' };
    }
  },

  /**
   * Upload multiple files to the same folder.
   */
  uploadMultiple: async (
    files: Array<{ buffer: Buffer; fileName: string; contentType: string }>,
    folder: UploadFolderType | string = UploadFolder.UPLOADS,
    userId?: string,
  ): Promise<Array<UploadResult>> => {
    const results: Array<UploadResult> = [];
    for (const f of files) {
      const result = await s3Service.uploadFile(f.buffer, f.fileName, f.contentType, folder, undefined, userId);
      results.push(result);
    }
    return results;
  },

  /**
   * Delete a file from Spaces by its key.
   */
  deleteFile: async (key: string): Promise<{ success: boolean; error?: string }> => {
    if (!key || typeof key !== 'string') {
      return { success: false, error: 'Invalid key' };
    }
    try {
      const cleanKey = extractS3Key(key);
      await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: cleanKey }));
      logger.info(`[S3] Deleted → ${cleanKey}`);
      return { success: true };
    } catch (error: any) {
      logger.error('[S3] Delete error:', { message: error.message });
      return { success: false, error: error.message ?? 'Delete failed' };
    }
  },

  /**
   * Generate a time-limited pre-signed URL for private file access.
   * @param key       S3 object key or full S3 URL
   * @param expiresIn Seconds until URL expires (default 2 hours)
   */
  getSignedUrl: async (key: string, expiresIn = 7200): Promise<string | null> => {
    try {
      const cleanKey = extractS3Key(key);
      const command = new GetObjectCommand({ Bucket: BUCKET, Key: cleanKey });
      const signed  = await getSignedUrl(s3Client, command, { expiresIn });
      return signed;
    } catch (error: any) {
      logger.error('[S3] Signed URL error:', { message: error.message, key });
      return null;
    }
  },

  /**
   * Resolve a stored URL or key into an accessible viewable URL.
   * If the file is a private document, generates a fresh presigned URL.
   * If the file is public (avatar/banner) or already signed, returns it directly.
   */
  resolveViewableUrl: async (storedUrlOrKey: string | null | undefined, expiresIn = 7200): Promise<string | null> => {
    if (!storedUrlOrKey || typeof storedUrlOrKey !== 'string') return null;
    const trimmed = storedUrlOrKey.trim();
    if (!trimmed) return null;

    // If it's already a presigned URL, return it directly
    if (trimmed.includes('X-Amz-Signature') || trimmed.includes('X-Amz-Credential')) {
      return trimmed;
    }

    const key = extractS3Key(trimmed);
    if (!key) return trimmed;

    // Check if the folder is private
    const firstSegment = key.split('/')[0] || '';
    if (!isPrivateUpload(firstSegment)) {
      return trimmed.startsWith('http') ? trimmed : `${CDN_BASE}/${key}`;
    }

    const signed = await s3Service.getSignedUrl(key, expiresIn);
    return signed || trimmed;
  },

  /**
   * Batch-resolves a list of documents, mapping their `fileUrl` property to a fresh signed URL.
   */
  resolveDocumentsUrls: async <T extends { fileUrl?: string | null }>(docs: T[], expiresIn = 7200): Promise<T[]> => {
    if (!Array.isArray(docs)) return [];
    return Promise.all(
      docs.map(async (doc) => {
        if (!doc || !doc.fileUrl) return doc;
        const viewableUrl = await s3Service.resolveViewableUrl(doc.fileUrl, expiresIn);
        return {
          ...doc,
          fileUrl: viewableUrl || doc.fileUrl,
        };
      })
    );
  },
};