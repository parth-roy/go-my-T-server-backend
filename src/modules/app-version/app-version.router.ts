import { Router } from 'express';
import { AppVersionController } from './app-version.controller';

const router = Router();

// GET /api/v1/app-version/check?appId=customer|driver|workforce&platform=android|ios&currentBuild=8
router.get('/check', AppVersionController.checkVersion);

export { router as appVersionRouter };
