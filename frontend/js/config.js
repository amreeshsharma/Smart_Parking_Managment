/**
 * ParkSmart - Application Configuration
 *
 * Controls whether the application operates using in-memory mock data
 * persisted to localStorage, or connects to the live REST API backend.
 */
const getApiBaseUrl = () => {
  if (typeof window === 'undefined') return 'http://localhost:5000/api';
  const { port, origin } = window.location;
  // If served from Express backend directly (e.g. localhost:5000) or cloud host (Render, etc.)
  if (port === '5000' || (origin && !['5500', '5501', '3000'].includes(port) && origin.startsWith('http') && !origin.includes('file:'))) {
    return `${origin}/api`;
  }
  // If served from frontend dev server (ports 5500, 5501, 3000)
  return 'http://localhost:5000/api';
};

export const CONFIG = {
  API_BASE_URL: getApiBaseUrl(),
  USE_MOCK: false,
  APP_NAME: 'ParkSmart',
  STORAGE_PREFIX: 'parksmart_'
};
