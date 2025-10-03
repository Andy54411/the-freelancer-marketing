/**
 * Persistent PKCE Storage for Development
 * Uses file system for persistence across server restarts
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

export interface PKCEData {
  codeVerifier: string;
  nonce: string;
  timestamp: number;
  companyId?: string;
}

// File-based storage for development (persistent across restarts)
const STORAGE_DIR = join(process.cwd(), '.datev-storage');
const STORAGE_FILE = join(STORAGE_DIR, 'pkce-store.json');

// Ensure storage directory exists
if (!existsSync(STORAGE_DIR)) {
  mkdirSync(STORAGE_DIR, { recursive: true });
}

// Load existing data or initialize empty store
function loadPKCEStore(): Map<string, PKCEData> {
  try {
    if (existsSync(STORAGE_FILE)) {
      const data = readFileSync(STORAGE_FILE, 'utf8');
      const parsed = JSON.parse(data);
      return new Map(Object.entries(parsed));
    }
  } catch (error) {}
  return new Map();
}

// Save store to file
function savePKCEStore(store: Map<string, PKCEData>): void {
  try {
    const data = Object.fromEntries(store);
    writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {}
}

// Initialize store from file
const pkceStore = loadPKCEStore();

/**
 * Store PKCE data persistently (10 minutes max)
 */
export function storePKCEData(state: string, data: PKCEData): void {
  // Clean expired entries first
  cleanExpiredEntries();

  // Store new data
  pkceStore.set(state, {
    ...data,
    timestamp: Date.now(),
  });

  // Save to file for persistence
  savePKCEStore(pkceStore);
}

/**
 * Retrieve and remove PKCE data
 */
export function retrievePKCEData(state: string): PKCEData | null {
  // Reload store from file to get latest data
  const freshStore = loadPKCEStore();
  const data = freshStore.get(state);

  if (!data) {
    return null;
  }

  // Check if expired (10 minutes)
  const now = Date.now();
  const maxAge = 10 * 60 * 1000; // 10 minutes

  if (now - data.timestamp > maxAge) {
    freshStore.delete(state);
    savePKCEStore(freshStore);
    return null;
  }

  // Remove after retrieval (one-time use) and save
  freshStore.delete(state);
  savePKCEStore(freshStore);

  return data;
}

/**
 * Clean expired entries from storage
 */
function cleanExpiredEntries(): void {
  const now = Date.now();
  const maxAge = 10 * 60 * 1000; // 10 minutes
  let cleaned = 0;

  for (const [state, data] of pkceStore.entries()) {
    if (now - data.timestamp > maxAge) {
      pkceStore.delete(state);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    savePKCEStore(pkceStore);
  }
}

/**
 * Get current storage stats (for debugging)
 */
export function getPKCEStorageStats(): { total: number; states: string[]; file: string } {
  cleanExpiredEntries();

  return {
    total: pkceStore.size,
    states: Array.from(pkceStore.keys()).map(state => state.substring(0, 20) + '...'),
    file: STORAGE_FILE,
  };
}
