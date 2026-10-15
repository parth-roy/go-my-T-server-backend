import { Router } from 'express';
import { authenticate } from '@shared/middleware/auth.middleware';
import { uploadController, upload } from './upload.controller';

export const uploadRouter = Router();

// All upload routes require a valid JWT (no anonymous uploads)
uploadRouter.use(authenticate);

// POST /api/v1/upload/single   — single file, folder in body
uploadRouter.post('/single', upload.single('file'), uploadController.uploadSingle);

// POST /api/v1/upload/multiple — up to 10 files, folder in body
uploadRouter.post('/multiple', upload.array('files', 10), uploadController.uploadMultiple);

// GET /api/v1/upload/view-url  — retrieve authorized signed URL (query: key or url)
uploadRouter.get('/view-url', uploadController.getSignedViewUrl);
uploadRouter.get('/signed-url', uploadController.getSignedViewUrl);

// DELETE /api/v1/upload/:key  — key is URL-encoded S3 object key
uploadRouter.delete('/:key', uploadController.deleteFile);