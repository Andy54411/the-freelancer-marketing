/**
 * Temporary PKCE Storage for Development
 * In production, this should be replaced with Redis or a database
 */

export interface PKCEData {
  codeVerifier: string;
  nonce: string;
  timestamp: number;
  companyId?: string;
}

// In-memory storage for development (use Redis/Database in production)
const pkceStore = new Map<string, PKCEData>();

/**
 * Store PKCE data temporarily (10 minutes max)
 */
export function storePKCEData(state: string, data: PKCEData): void {
  // Clean expired entries first
  cleanExpiredEntries();

  // Store new data
  pkceStore.set(state, {
    ...data,
    timestamp: Date.now(),
  });

  console.log('Stored PKCE data for state:', state.substring(0, 20) + '...');
}

/**
 * Retrieve and remove PKCE data
 */
export function retrievePKCEData(state: string): PKCEData | null {
  const data = pkceStore.get(state);

  if (!data) {
    console.error('PKCE data not found for state:', state.substring(0, 20) + '...');
    return null;
  }

  // Check if expired (10 minutes)
  const now = Date.now();
  const maxAge = 10 * 60 * 1000; // 10 minutes

  if (now - data.timestamp > maxAge) {
    console.error('PKCE data expired for state:', state.substring(0, 20) + '...');
    pkceStore.delete(state);
    return null;
  }

  // Remove after retrieval (one-time use)
  pkceStore.delete(state);

  console.log('Retrieved PKCE data for state:', state.substring(0, 20) + '...');
  return data;
}

/**
 * Clean expired entries from storage
 */
function cleanExpiredEntries(): void {
  const now = Date.now();
  const maxAge = 10 * 60 * 1000; // 10 minutes

  for (const [state, data] of pkceStore.entries()) {
    if (now - data.timestamp > maxAge) {
      pkceStore.delete(state);
    }
  }
}

/**
 * Get current storage stats (for debugging)
 */
export function getPKCEStorageStats(): { total: number; states: string[] } {
  cleanExpiredEntries();

  return {
    total: pkceStore.size,
    states: Array.from(pkceStore.keys()).map(state => state.substring(0, 20) + '...'),
  };
}
