// IMPORTANT: Client-side authorization is for UX only, not security.
// Server-side table permissions enforce actual access control.
// Always configure table permissions via /power-pages:integrate-webapi.

import { getCurrentUser, isAuthenticated as checkAuthenticated } from '../services/authService';

/**
 * Returns the current user's web roles as an array of strings.
 */
export function getUserRoles(): string[] {
  const user = getCurrentUser();
  return user?.userRoles ?? [];
}

/**
 * Checks if the current user has a specific role (case-insensitive).
 */
export function hasRole(roleName: string): boolean {
  return getUserRoles().some(
    (role) => role.toLowerCase() === roleName.toLowerCase()
  );
}

/**
 * Checks if the current user has ANY of the specified roles.
 */
export function hasAnyRole(roleNames: string[]): boolean {
  return roleNames.some((role) => hasRole(role));
}

/**
 * Checks if the current user has ALL of the specified roles.
 */
export function hasAllRoles(roleNames: string[]): boolean {
  return roleNames.every((role) => hasRole(role));
}

/**
 * Re-export isAuthenticated for convenience.
 */
export function isAuthenticated(): boolean {
  return checkAuthenticated();
}

/**
 * Checks if the current user has the Administrators role.
 */
export function isAdmin(): boolean {
  return hasRole('Administrators');
}

/**
 * Checks if the user has elevated access (admin or specified additional roles).
 */
export function hasElevatedAccess(additionalRoles: string[] = []): boolean {
  return isAdmin() || hasAnyRole(additionalRoles);
}

/**
 * Checks if the current user has the Reviewer role.
 */
export function isReviewer(): boolean {
  return hasRole('Reviewer');
}

/**
 * Checks if the current user is a supplier (not a reviewer).
 */
export function isSupplier(): boolean {
  return !hasRole('Reviewer');
}
