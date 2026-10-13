/**
 * ParkSmart - Authentication & Session Guard Module (auth.js)
 *
 * Manages user authentication state, session storage in localStorage,
 * and client-side route guards for protected User and Admin views.
 */

import { CONFIG } from './config.js';

const AUTH_USER_KEY = `${CONFIG.STORAGE_PREFIX}auth_user`;
const AUTH_TOKEN_KEY = `${CONFIG.STORAGE_PREFIX}auth_token`;

/**
 * Get current authenticated user session object, or null
 */
export function getLoggedInUser() {
  const data = localStorage.getItem(AUTH_USER_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error("Failed to parse user session", e);
    return null;
  }
}

/**
 * Save user session & token
 */
export function setLoggedInUser(user, token = null) {
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  }
}

/**
 * Check if a session exists
 */
export function isAuthenticated() {
  return !!getLoggedInUser();
}

/**
 * Verify user has a specific role ('User' or 'Admin')
 */
export function hasRole(role) {
  const user = getLoggedInUser();
  if (!user || !user.Role) return false;
  return user.Role.toLowerCase() === role.toLowerCase();
}

/**
 * Terminate session and redirect to login page
 */
export function logout() {
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem(AUTH_TOKEN_KEY);

  // Determine correct relative path to login.html
  const path = window.location.pathname;
  if (path.includes('/user/') || path.includes('/admin/')) {
    window.location.href = '../login.html';
  } else {
    window.location.href = './login.html';
  }
}

/**
 * Route guard: Enforce authentication and required role.
 * Call this at the start of protected user/admin page scripts.
 *
 * @param {string} requiredRole - 'User' or 'Admin'
 */
export function requireAuth(requiredRole = null) {
  const user = getLoggedInUser();
  const path = window.location.pathname;
  const loginUrl = (path.includes('/user/') || path.includes('/admin/')) ? '../login.html' : './login.html';

  if (!user) {
    // Store intended destination
    sessionStorage.setItem('redirect_after_login', window.location.href);
    window.location.href = loginUrl;
    return null;
  }

  if (requiredRole && user.Role.toLowerCase() !== requiredRole.toLowerCase()) {
    console.warn(`Unauthorized: Page requires role '${requiredRole}', but user is '${user.Role}'`);
    // Redirect admin to admin dashboard, user to user dashboard
    if (user.Role.toLowerCase() === 'admin') {
      window.location.href = (path.includes('/user/') ? '../admin/dashboard.html' : './admin/dashboard.html');
    } else {
      window.location.href = (path.includes('/admin/') ? '../user/dashboard.html' : './user/dashboard.html');
    }
    return null;
  }

  return user;
}
