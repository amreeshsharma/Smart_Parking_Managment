/**
 * ParkSmart - Application Configuration
 *
 * Controls whether the application operates using in-memory mock data
 * persisted to localStorage, or connects to the live REST API backend.
 *
 * Switch to production/backend mode:
 * 1. Set USE_MOCK to false
 * 2. Update API_BASE_URL with your Express backend address (e.g., http://localhost:5000/api)
 */
export const CONFIG = {
  API_BASE_URL: 'http://localhost:5000/api',
  USE_MOCK: false,
  APP_NAME: 'ParkSmart',
  STORAGE_PREFIX: 'parksmart_'
};
