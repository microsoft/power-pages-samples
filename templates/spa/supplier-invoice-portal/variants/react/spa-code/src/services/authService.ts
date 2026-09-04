import type { PowerPagesUser } from '../types/powerPages';

const isDevelopment =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// Mock users for local development — auth only works on deployed Power Pages sites
const MOCK_SUPPLIER: PowerPagesUser = {
  userName: 'chris.green@contoso.com',
  firstName: 'Chris',
  lastName: 'Green',
  email: 'chris.green@contoso.com',
  contactId: '00000000-0000-0000-0000-000000000001',
  userRoles: ['Authenticated Users'],
};

const MOCK_REVIEWER: PowerPagesUser = {
  userName: 'sarah.mitchell@contoso.com',
  firstName: 'Sarah',
  lastName: 'Mitchell',
  email: 'sarah.mitchell@contoso.com',
  contactId: '00000000-0000-0000-0000-000000000002',
  userRoles: ['Authenticated Users', 'Reviewer'],
};

export type DevRole = 'supplier' | 'reviewer';

export function getDevRole(): DevRole {
  if (!isDevelopment) return 'supplier';
  return (localStorage.getItem('mock-role') as DevRole) || 'supplier';
}

export function setDevRole(role: DevRole): void {
  localStorage.setItem('mock-role', role);
}

/**
 * Returns the currently logged-in user, or undefined if not authenticated.
 */
export function getCurrentUser(): PowerPagesUser | undefined {
  if (isDevelopment) {
    return getDevRole() === 'reviewer' ? MOCK_REVIEWER : MOCK_SUPPLIER;
  }
  return window.Microsoft?.Dynamic365?.Portal?.User;
}

/**
 * Returns true if a user is currently logged in.
 */
export function isAuthenticated(): boolean {
  const user = getCurrentUser();
  return !!user?.userName;
}

/**
 * Returns the Entra ID tenant ID from the portal configuration.
 */
export function getTenantId(): string | undefined {
  if (isDevelopment) return '00000000-0000-0000-0000-000000000000';
  return window.Microsoft?.Dynamic365?.Portal?.tenant;
}

/**
 * Fetches the anti-forgery token required for the login form POST.
 * The token is embedded in an HTML response from /_layout/tokenhtml.
 */
export async function fetchAntiForgeryToken(): Promise<string> {
  const response = await fetch('/_layout/tokenhtml');
  const html = await response.text();
  const match = html.match(/value="([^"]+)"/);
  if (!match) {
    throw new Error('Failed to extract anti-forgery token from /_layout/tokenhtml');
  }
  return match[1];
}

/**
 * Initiates login by posting a form to the Power Pages external login endpoint.
 * The browser will redirect to Microsoft Entra ID for authentication.
 *
 * @param returnUrl - URL to return to after successful login (defaults to current page)
 */
export async function login(returnUrl?: string): Promise<void> {
  if (isDevelopment) {
    console.warn('[Auth] Login is not available in local development. Using mock user.');
    window.location.reload();
    return;
  }

  const token = await fetchAntiForgeryToken();
  const tenantId = getTenantId();

  const form = document.createElement('form');
  form.method = 'POST';
  form.action = '/Account/Login/ExternalLogin';

  const fields: Record<string, string> = {
    __RequestVerificationToken: token,
    provider: `https://login.windows.net/${tenantId}/`,
    returnUrl: returnUrl || window.location.pathname,
  };

  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
}

/**
 * Attempts local login via fetch to the Power Pages /SignIn endpoint.
 * Returns null on success (and redirects), or an error message string on failure.
 *
 * @param username - The user's email or username
 * @param password - The user's password
 * @param rememberMe - Whether to persist the login session
 * @param returnUrl - URL to return to after successful login (defaults to /)
 */
export async function localLogin(
  username: string,
  password: string,
  rememberMe = false,
  returnUrl?: string,
): Promise<string | null> {
  if (isDevelopment) {
    console.warn('[Auth] Local login is not available in local development. Using mock user.');
    window.location.reload();
    return null;
  }

  const token = await fetchAntiForgeryToken();
  const target = returnUrl || '/';

  const body = new URLSearchParams({
    __RequestVerificationToken: token,
    Username: username,
    PasswordValue: password,
    RememberMe: rememberMe ? 'true' : 'false',
  });

  const response = await fetch(`/SignIn?ReturnUrl=${encodeURIComponent(target)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    redirect: 'manual',
  });

  // A redirect (opaque) means login succeeded — follow it
  if (response.type === 'opaqueredirect' || response.status === 302 || response.status === 301) {
    window.location.href = target;
    return null;
  }

  // Status 200 means the sign-in page was returned with an error
  if (response.status === 200) {
    const html = await response.text();
    // Extract validation error from the returned HTML
    const errorMatch = html.match(/<li[^>]*class="[^"]*validation-summary-errors[^"]*"[^>]*>([\s\S]*?)<\/li>/i)
      || html.match(/<div[^>]*class="[^"]*validation-summary-errors[^"]*"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i);
    if (errorMatch) {
      const errorDocument = new DOMParser().parseFromString(errorMatch[1], 'text/html');
      const errorText = errorDocument.body.textContent?.trim();
      return errorText || 'Invalid username or password.';
    }
    return 'Invalid username or password.';
  }

  return 'Sign-in failed. Please try again.';
}

/**
 * Logs the user out by redirecting to the Power Pages logout endpoint.
 *
 * @param returnUrl - URL to return to after logout (defaults to site root)
 */
export function logout(returnUrl?: string): void {
  if (isDevelopment) {
    console.warn('[Auth] Logout is not available in local development.');
    window.location.reload();
    return;
  }

  const target = returnUrl || '/';
  window.location.href = `/Account/Login/LogOff?returnUrl=${encodeURIComponent(target)}`;
}

/**
 * Returns the user's display name (full name if available, otherwise userName).
 */
export function getUserDisplayName(): string {
  const user = getCurrentUser();
  if (!user) return '';
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
  return fullName || user.userName;
}

/**
 * Returns the user's initials for avatar display.
 */
export function getUserInitials(): string {
  const user = getCurrentUser();
  if (!user) return '';
  if (user.firstName && user.lastName) {
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  }
  return (user.userName?.[0] || '').toUpperCase();
}
