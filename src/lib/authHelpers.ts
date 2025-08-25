// src/lib/authHelpers.ts
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/firebase/clients';

/**
 * Hilfsfunktion für onAuthStateChanged, die mit null-auth umgeht
 */
export function onAuthStateChangedSafe(
  callback: (user: User | null) => void | Promise<void>
): (() => void) | null {
  if (!auth) {

    // Rufe Callback mit null auf, um zu signalisieren, dass kein User vorhanden ist
    callback(null);
    return null; // Kein Cleanup nötig
  }

  return onAuthStateChanged(auth, callback);
}

/**
 * Hook-ähnliche Funktion für useEffect mit sicherer auth-Behandlung
 */
export function useAuthStateListener(
  callback: (user: User | null) => void | Promise<void>,
  dependencies?: any[]
): () => void {
  // Diese Funktion kann in useEffect verwendet werden
  const unsubscribe = onAuthStateChangedSafe(callback);

  // Return cleanup function
  return () => {
    if (unsubscribe) {
      unsubscribe();
    }
  };
}
