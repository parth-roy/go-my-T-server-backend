import { Request, Response } from 'express';
import { seoService } from './seo.service';

export const getHubSeoData = (req: Request, res: Response) => {
  const slug = req.params.slug as string;
  const data = seoService.getHubSeoData(slug);
  res.status(200).json({
    success: true,
    data,
  });
};
