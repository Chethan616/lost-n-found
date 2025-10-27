/**
 * Application configuration
 * Handles different environments (local development vs GitHub Pages)
 */

// When deployed to GitHub Pages, we need a separate backend URL
// For local development, the backend runs on the same server (port 5000)
export const API_BASE_URL = import.meta.env.PROD 
  ? '' // Empty string means "no backend available" - need to deploy backend separately
  : ''; // Local development uses same origin

/**
 * Check if the app is running in production (GitHub Pages)
 */
export const isProduction = import.meta.env.PROD;

/**
 * Check if backend is available
 * On GitHub Pages, backend won't be available unless deployed separately
 */
export const hasBackend = !isProduction || API_BASE_URL !== '';

/**
 * Get the full API URL
 */
export function getApiUrl(endpoint: string): string {
  if (!endpoint.startsWith('/')) {
    endpoint = '/' + endpoint;
  }
  return API_BASE_URL + endpoint;
}
