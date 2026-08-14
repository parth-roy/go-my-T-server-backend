import { SEO_HUB_DATA, DEFAULT_SEO_DATA } from './seo.data';

export class SeoService {
  public getHubSeoData(slug: string) {
    const data = SEO_HUB_DATA[slug];
    if (data) {
      return data;
    }
    return DEFAULT_SEO_DATA;
  }
}

export const seoService = new SeoService();
