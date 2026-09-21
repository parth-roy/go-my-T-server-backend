import axios from 'axios';
import { MAPBOX_API_KEY, GOOGLE_MAPS_API_KEY } from '@config/maps';
import { AppError } from '@shared/errors/AppError';
import { logger } from '@shared/logger';
import { getRedis } from '@config/redis';

// ── Exported type so serviceability.service.ts can safely destructure ─────────
export interface ReverseGeocodeResult {
  address:     string;
  placeId:     string;
  lat:         number;
  lng:         number;
  countryCode: string | null;
  country:     string | null;
  stateCode:   string | null;
  state:       string | null;
  city:        string | null;
  pincode:     string | null;
}

export interface CitySearchResult {
  city: string;
  state: string;
  description: string;
  placeId: string;
}

export const DEFAULT_INDIAN_CITIES: CitySearchResult[] = [
  { city: 'Kolkata', state: 'West Bengal, India', description: 'Kolkata, West Bengal, India', placeId: 'ChIJZ_YISduC-DkRvCxsj-Yw40M' },
  { city: 'Howrah', state: 'West Bengal, India', description: 'Howrah, West Bengal, India', placeId: 'ChIJ2cQ72fKD-DkRs_p9e5mQW80' },
  { city: 'Durgapur', state: 'West Bengal, India', description: 'Durgapur, West Bengal, India', placeId: 'ChIJVf_8wU2s9DkRff7M-fQnS8I' },
  { city: 'Asansol', state: 'West Bengal, India', description: 'Asansol, West Bengal, India', placeId: 'ChIJG6e00YyA9DkR0T1J7O3eQjI' },
  { city: 'Siliguri', state: 'West Bengal, India', description: 'Siliguri, West Bengal, India', placeId: 'ChIJ-993d0_v5jkR9p8eOa7G58M' },
  { city: 'Bardhaman', state: 'West Bengal, India', description: 'Bardhaman, West Bengal, India', placeId: 'ChIJyfeLg0vR9DkRCVv3q3c4X0s' },
  { city: 'Habra', state: 'West Bengal, India', description: 'Habra, West Bengal, India', placeId: 'ChIJj7H6k2-9-DkR_0-3G2n_95M' },
  { city: 'Dankuni', state: 'West Bengal, India', description: 'Dankuni, West Bengal, India', placeId: 'ChIJ-b5Z6P-D-DkRZ9z79f3N_w4' },
  { city: 'Kharagpur', state: 'West Bengal, India', description: 'Kharagpur, West Bengal, India', placeId: 'ChIJ29bQYk2YAjwR5975e5mQW80' },
  { city: 'Delhi', state: 'Delhi, India', description: 'Delhi, India', placeId: 'ChIJL_P_CXMEDTkRw0ZiBfdNngx' },
  { city: 'Mumbai', state: 'Maharashtra, India', description: 'Mumbai, Maharashtra, India', placeId: 'ChIJwe1EZFl-Dz0RAWD_IDpTrxQ' },
  { city: 'Bengaluru', state: 'Karnataka, India', description: 'Bengaluru, Karnataka, India', placeId: 'ChIJbU60yXAWrjsR4E9-Ule3vzs' },
  { city: 'Hyderabad', state: 'Telangana, India', description: 'Hyderabad, Telangana, India', placeId: 'ChIJx9LrOqZynzsRAFf4-f5fsmY' },
  { city: 'Ahmedabad', state: 'Gujarat, India', description: 'Ahmedabad, Gujarat, India', placeId: 'ChIJS_kU8k8zXzkRIc4yM0yV1k4' },
  { city: 'Chennai', state: 'Tamil Nadu, India', description: 'Chennai, Tamil Nadu, India', placeId: 'ChIJmQvfvu5YUrwRBk634j4Uq-U' },
  { city: 'Pune', state: 'Maharashtra, India', description: 'Pune, Maharashtra, India', placeId: 'ChIJARFGZy6_wjsRQ-OnvUzs328' },
  { city: 'Jaipur', state: 'Rajasthan, India', description: 'Jaipur, Rajasthan, India', placeId: 'ChIJgeepUXm4bTkR-fd1tdcaqx8' },
  { city: 'Lucknow', state: 'Uttar Pradesh, India', description: 'Lucknow, Uttar Pradesh, India', placeId: 'ChIJw92b1bC9mzkR9k7e8v3mN-Y' },
  { city: 'Patna', state: 'Bihar, India', description: 'Patna, Bihar, India', placeId: 'ChIJm7_k30a08TkR0jM15gM7rV0' },
  { city: 'Bhubaneswar', state: 'Odisha, India', description: 'Bhubaneswar, Odisha, India', placeId: 'ChIJtX5G72-B-zkR8q17T2h-93s' },
  { city: 'Guwahati', state: 'Assam, India', description: 'Guwahati, Assam, India', placeId: 'ChIJW8pD7d_mVTcR5r5r6s4h5eU' },
];


// ── Cache TTL constants ────────────────────────────────────────────────────────
const AUTOCOMPLETE_TTL  = 60 * 60 * 24;     // 24 hours — place names rarely change
const REVERSE_GEO_TTL   = 60 * 60 * 6;      // 6 hours  — address at coords is stable
const PLACE_DETAILS_TTL = 60 * 60 * 24 * 7; // 7 days   — place ID → coords is permanent

// ── Redis cache helpers ────────────────────────────────────────────────────────

async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const raw = await getRedis().get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null; // Redis unavailable — fall through to API
  }
}

async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  try {
    await getRedis().setex(key, ttlSeconds, JSON.stringify(value));
  } catch {
    // Redis write failure is non-fatal — next request will call Mapbox
  }
}

export const mapsService = {
  /**
   * Get autocomplete predictions for a given input string using Mapbox Geocoding API.
   * Results are cached in local Redis for 24 hours.
   */
  autocomplete: async (input: string, sessionToken?: string) => {
    const cacheKey = `mapbox:autocomplete:${input.toLowerCase().trim()}`;

    // Try cache first (sub-1ms response for repeated searches)
    const cached = await cacheGet<any[]>(cacheKey);
    if (cached) {
      logger.debug(`[Maps] Autocomplete cache HIT for "${input}"`);
      return cached;
    }

    try {
      const response = await axios.get(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(input)}.json`,
        {
          params: {
            access_token: MAPBOX_API_KEY,
            autocomplete: true,
            // country: 'in', // Temporarily disabled for emulator testing in USA
            limit: 5,
          },
        }
      );

      const result = response.data.features.map((f: any) => ({
        placeId: f.id,
        description: f.place_name,
        mainText: f.text,
        secondaryText: f.place_name.replace(`${f.text}, `, ''),
      }));

      await cacheSet(cacheKey, result, AUTOCOMPLETE_TTL);
      return result;
    } catch (error: any) {
      logger.error('Mapbox Autocomplete Error:', error.response?.data || error.message);
      throw AppError.internal('Failed to fetch place suggestions');
    }
  },

  /**
   * Get detailed information (geometry/location) for a place.
   * Results are cached in local Redis for 7 days (place ID → coords never changes).
   */
  placeDetails: async (placeId: string, sessionToken?: string) => {
    const cacheKey = `mapbox:place:${placeId}`;

    const cached = await cacheGet<object>(cacheKey);
    if (cached) {
      logger.debug(`[Maps] Place details cache HIT for ${placeId}`);
      return cached;
    }

    try {
      const response = await axios.get(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(placeId)}.json`,
        {
          params: {
            access_token: MAPBOX_API_KEY,
          },
        }
      );

      const features = response.data.features;
      if (!features || features.length === 0) {
        throw new Error('No geometry found');
      }

      const result = features[0];
      const payload = {
        lat: result.center[1], // Mapbox returns [lng, lat]
        lng: result.center[0],
        name: result.text,
        address: result.place_name,
      };

      await cacheSet(cacheKey, payload, PLACE_DETAILS_TTL);
      return payload;
    } catch (error: any) {
      logger.error('Mapbox Place Details Error:', error.response?.data || error.message);
      throw AppError.internal('Failed to fetch place details');
    }
  },

  /**
   * Get a formatted address and structured geographic context from lat/lng.
   * Results are cached in local Redis for 6 hours.
   */
  reverseGeocode: async (lat: number, lng: number): Promise<ReverseGeocodeResult | null> => {
    // Round to 4 decimal places (~11m precision) to improve cache hit rate
    const rLat = Math.round(lat * 10000) / 10000;
    const rLng = Math.round(lng * 10000) / 10000;
    const cacheKey = `mapbox:reverse:${rLat},${rLng}`;

    const cached = await cacheGet<ReverseGeocodeResult>(cacheKey);
    if (cached) {
      logger.debug(`[Maps] Reverse geocode cache HIT for (${rLat},${rLng})`);
      return cached;
    }

    try {
      const response = await axios.get(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${rLng},${rLat}.json`,
        {
          params: {
            access_token: MAPBOX_API_KEY,
            limit: 1,
            types: 'address,place,region,country',
          },
        }
      );

      const features = response.data.features;
      if (!features || features.length === 0) {
        return null;
      }

      const feature = features[0];
      const context: Array<{ id: string; text: string; short_code?: string }> = feature.context ?? [];

      const getContext = (prefix: string) => context.find(c => c.id.startsWith(prefix));

      const countryCtx  = getContext('country.');
      const regionCtx   = getContext('region.');
      const placeCtx    = getContext('place.');
      const postcodeCtx = getContext('postcode.');

      const payload = {
        address:     feature.place_name,
        placeId:     feature.id,
        lat:         rLat,
        lng:         rLng,
        countryCode: countryCtx?.short_code ?? null,
        country:     countryCtx?.text ?? null,
        stateCode:   regionCtx?.short_code ?? null,
        state:       regionCtx?.text ?? null,
        city:        placeCtx?.text ?? null,
        pincode:     postcodeCtx?.text ?? null,
      };

      await cacheSet(cacheKey, payload, REVERSE_GEO_TTL);
      return payload;
    } catch (error: any) {
      logger.error('Mapbox Reverse Geocode Error:', error.response?.data || error.message);
      throw AppError.internal('Failed to reverse geocode coordinates');
    }
  },

  /**
   * Calculate distance and duration between two points using Mapbox Directions API.
   * NOTE: Directions are NOT cached (route depends on live traffic conditions).
   */
  getDistanceMatrix: async (originLat: number, originLng: number, destLat: number, destLng: number) => {
    const MAX_RETRIES = 2;
    let lastError: any;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await axios.get(
          `https://api.mapbox.com/directions/v5/mapbox/driving/${originLng},${originLat};${destLng},${destLat}`,
          {
            params: { access_token: MAPBOX_API_KEY, geometries: 'geojson', overview: 'false' },
            timeout: 5000,
          }
        );
        const route = response.data.routes[0];
        if (!route) throw new Error('No route found');
        return {
          distanceKm: route.distance / 1000,
          durationMinutes: Math.round(route.duration / 60),
        };
      } catch (error: any) {
        lastError = error;
        if (attempt < MAX_RETRIES) {
          logger.warn(`Mapbox Directions attempt ${attempt} failed — retrying in ${600 * attempt}ms`);
          await new Promise(r => setTimeout(r, 600 * attempt));
        }
      }
    }

    // Fallback: Haversine straight-line distance with 25% road-factor approximation
    logger.error('Mapbox Directions failed after retries — using Haversine fallback:', lastError?.message);
    const R = 6371;
    const dLat = ((destLat - originLat) * Math.PI) / 180;
    const dLng = ((destLng - originLng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((originLat * Math.PI) / 180) *
      Math.cos((destLat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
    const straightLineKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const estimatedRoadKm = Math.round(straightLineKm * 1.25 * 10) / 10;
    const estimatedMinutes = Math.round((estimatedRoadKm / 30) * 60);
    return { distanceKm: estimatedRoadKm, durationMinutes: estimatedMinutes };
  },

  /**
   * Search Indian cities using Google Places Autocomplete API with types=(cities) and country:in.
   * Results are cached in Redis for 24 hours. If query is empty or < 2 characters,
   * returns top curated Indian hub cities.
   */
  searchCities: async (query?: string): Promise<CitySearchResult[]> => {
    const q = (query || '').trim();
    if (q.length < 2) {
      return DEFAULT_INDIAN_CITIES;
    }

    const cacheKey = `google:cities:${q.toLowerCase()}`;
    const cached = await cacheGet<CitySearchResult[]>(cacheKey);
    if (cached) {
      logger.debug(`[Maps] City search cache HIT for "${q}"`);
      return cached;
    }

    const apiKey = GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      logger.warn('[Maps] GOOGLE_MAPS_API_KEY not set — using default city filter');
      return DEFAULT_INDIAN_CITIES.filter(
        c => c.city.toLowerCase().includes(q.toLowerCase()) || c.state.toLowerCase().includes(q.toLowerCase())
      );
    }

    try {
      const response = await axios.get(
        'https://maps.googleapis.com/maps/api/place/autocomplete/json',
        {
          params: {
            input: q,
            types: '(cities)',
            components: 'country:in',
            key: apiKey,
          },
          timeout: 4500,
        }
      );

      if (response.data.status === 'OK' && Array.isArray(response.data.predictions)) {
        const results: CitySearchResult[] = response.data.predictions.map((p: any) => ({
          city: p.structured_formatting?.main_text || p.description.split(',')[0].trim(),
          state: p.structured_formatting?.secondary_text || '',
          description: p.description,
          placeId: p.place_id,
        }));

        await cacheSet(cacheKey, results, AUTOCOMPLETE_TTL);
        return results;
      }

      if (response.data.status === 'ZERO_RESULTS') {
        return [];
      }

      logger.warn(`Google Places Cities returned status: ${response.data.status}, message: ${response.data.error_message}`);
      return DEFAULT_INDIAN_CITIES.filter(
        c => c.city.toLowerCase().includes(q.toLowerCase()) || c.state.toLowerCase().includes(q.toLowerCase())
      );
    } catch (error: any) {
      logger.error('Google Places Cities Search Error:', error.response?.data || error.message);
      return DEFAULT_INDIAN_CITIES.filter(
        c => c.city.toLowerCase().includes(q.toLowerCase()) || c.state.toLowerCase().includes(q.toLowerCase())
      );
    }
  },
};

