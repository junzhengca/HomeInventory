/**
 * Decode JWT token without verification
 * Returns the payload as an object
 */
export const decodeJWT = (token: string): Record<string, unknown> | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.warn('[JWT] Invalid token format, expected 3 parts');
      return null;
    }

    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch (error) {
    console.error('[JWT] Error decoding JWT:', error);
    return null;
  }
};

/**
 * Check if a JWT token is expired
 * Returns true if token is expired or invalid
 * @param token - The JWT token to check
 * @param isRefreshToken - Whether this is a refresh token (default: false)
 *                       Refresh tokens without exp claim are considered valid
 */
export const isTokenExpired = (token: string | null, isRefreshToken = false): boolean => {
  if (!token) {
    console.warn('[JWT] Token is null or empty');
    return true;
  }

  const decoded = decodeJWT(token);
  if (!decoded) {
    console.warn('[JWT] Failed to decode token');
    return true;
  }

  // Refresh tokens without exp claim are considered valid (they don't expire)
  if (isRefreshToken && !decoded.exp) {
    return false;
  }

  // For access tokens, they must have exp claim
  if (!decoded.exp) {
    console.warn('[JWT] Access token has no exp claim');
    return true;
  }

  const expirationTime = decoded.exp as number;
  const currentTime = Math.floor(Date.now() / 1000);
  const secondsUntilExpiration = expirationTime - currentTime;

  // Add 60 second buffer to refresh before actual expiration
  const isExpired = secondsUntilExpiration < 60;

  // Only log if token is about to expire or has expired
  if (isExpired || secondsUntilExpiration < 300) {
    console.log(`[JWT] Token ${isExpired ? 'expired' : 'expiring soon'}: ${secondsUntilExpiration}s remaining (${isRefreshToken ? 'refresh' : 'access'} token)`);
  }

  return isExpired;
};

