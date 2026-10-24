import { Router } from 'express';
import { mapsController } from './maps.controller';
import { googleProviderController } from './googleProvider.controller';
import {
  googleAutocompleteLimiter,
  googlePlaceDetailsLimiter,
  googleReverseGeocodeLimiter,
  googleRouteLimiter,
} from '@shared/middleware/rateLimiter';

export const mapsRouter = Router();

// Place search
mapsRouter.get('/cities', mapsController.searchCities);
mapsRouter.get('/localities', mapsController.searchLocalities);
mapsRouter.get('/autocomplete', mapsController.autocomplete);
mapsRouter.get('/place-details', mapsController.placeDetails);

// Geocoding
mapsRouter.get('/reverse-geocode', mapsController.reverseGeocode);
mapsRouter.get('/geocode', mapsController.geocode);

// Distance / routing
mapsRouter.get('/distance-matrix', mapsController.distanceMatrix);

// Recent searches
mapsRouter.get('/recent-searches', mapsController.getRecentSearches);
mapsRouter.post('/recent-searches', mapsController.addRecentSearch);
mapsRouter.delete('/recent-searches/clear', mapsController.clearRecentSearches);
mapsRouter.delete('/recent-searches/:id', mapsController.deleteRecentSearch);

// ── Google-backed endpoints (ADDITIVE — customer app only; see              ──
//    GOOGLE_MAPS_MIGRATION_EXECUTION.md T-0.3/T-0.4. Legacy routes above are ──
//    intentionally untouched: Driver/workforce/website depend on them.        ──
mapsRouter.get('/g/autocomplete', googleAutocompleteLimiter, googleProviderController.autocomplete);
mapsRouter.get('/g/place-details', googlePlaceDetailsLimiter, googleProviderController.placeDetails);
mapsRouter.get('/g/reverse-geocode', googleReverseGeocodeLimiter, googleProviderController.reverseGeocode);
mapsRouter.get('/g/route', googleRouteLimiter, googleProviderController.route);
