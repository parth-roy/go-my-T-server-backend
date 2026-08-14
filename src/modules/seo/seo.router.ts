import { Router } from 'express';
import { getHubSeoData } from './seo.controller';

const router = Router();

router.get('/hub/:slug', getHubSeoData);

export const seoRouter = router;
