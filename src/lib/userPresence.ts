// src/lib/userPresence.ts
import { ref, set, onValue, serverTimestamp, onDisconnect, off } from 'firebase/database';
import { realtimeDb } from '@/firebase/clients';

export class UserPresenceService {
  private static instance: UserPresenceService;
  private userId: string | null = null;
  private isInitialized = false;
  private intervalId: NodeJS.Timeout | null = null;

  static getInstance(): UserPresenceService {
    if (!UserPresenceService.instance) {
      UserPresenceService.instance = new UserPresenceService();
    }
    return UserPresenceService.instance;
  }

  // Initialisiert die Presence-Überwachung für einen Benutzer
  async initializePresence(userId: string): Promise<void> {
    if (this.isInitialized && this.userId === userId) return;

    this.userId = userId;

    // Setze den Benutzer als online
    const userPresenceRef = ref(realtimeDb, `presence/${userId}`);

    await set(userPresenceRef, {
      isOnline: true,
      lastSeen: serverTimestamp(),
      status: 'online',
    });

    // Setze automatisches Offline bei Verbindungsabbruch
    onDisconnect(userPresenceRef).set({
      isOnline: false,
      lastSeen: serverTimestamp(),
      status: 'offline',
    });

    // Starte Aktivitäts-Timer (alle 30 Sekunden)
    this.startActivityTimer();

    // Überwache Sichtbarkeitsänderungen
    this.setupVisibilityChangeHandler();

    this.isInitialized = true;
    console.log(`[UserPresence] Initialized for user: ${userId}`);
  }

  // Startet den Timer für regelmäßige Aktivitätsupdates
  private startActivityTimer(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.intervalId = setInterval(async () => {
      if (this.userId && !document.hidden) {
        const userPresenceRef = ref(realtimeDb, `presence/${this.userId}`);
        await set(userPresenceRef, {
          isOnline: true,
          lastSeen: serverTimestamp(),
          status: 'online',
        });
      }
    }, 30000); // Alle 30 Sekunden
  }

  // Überwacht Sichtbarkeitsänderungen der Seite
  private setupVisibilityChangeHandler(): void {
    const handleVisibilityChange = async () => {
      if (!this.userId) return;

      try {
        const userPresenceRef = ref(realtimeDb, `presence/${this.userId}`);

        if (document.hidden) {
          // Seite ist nicht sichtbar - setze als "away"
          await set(userPresenceRef, {
            isOnline: true,
            lastSeen: serverTimestamp(),
            status: 'away',
          });
        } else {
          // Seite ist wieder sichtbar - setze als "online"
          await set(userPresenceRef, {
            isOnline: true,
            lastSeen: serverTimestamp(),
            status: 'online',
          });
        }
      } catch (error) {
        console.warn('[UserPresence] Visibility change error:', error);
      }
    };

    // TEMPORÄR DEAKTIVIERT: Vereinfachte beforeunload-Behandlung ohne API-Call
    const handleBeforeUnload = () => {
      console.log('[UserPresence] beforeunload triggered - TEMPORARILY DISABLED for debugging');
      /*
      if (this.userId) {
        try {
          // Nur sendBeacon für einfache Offline-Markierung
          const data = new FormData();
          data.append('userId', this.userId);
          navigator.sendBeacon('/api/user-offline', data);
        } catch (error) {
          // Ignoriere Beacon-Fehler, da es nur ein Backup ist
          console.debug('[UserPresence] Beacon failed (normal on some browsers)');
        }
      }
      */
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Vereinfachte beforeunload ohne async/await
    window.addEventListener('beforeunload', handleBeforeUnload);
  }

  // Beendet die Presence-Überwachung
  async cleanupPresence(): Promise<void> {
    if (!this.userId) return;

    console.log(`[UserPresence] Cleaning up presence for user: ${this.userId}`);

    // Stoppe den Aktivitäts-Timer
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Setze den Benutzer SOFORT als offline - aber nur wenn User noch authentifiziert ist
    const userPresenceRef = ref(realtimeDb, `presence/${this.userId}`);
    try {
      // Prüfe ob Firebase Auth noch verfügbar ist
      const { auth } = await import('@/firebase/clients');
      if (auth.currentUser) {
        await set(userPresenceRef, {
          isOnline: false,
          lastSeen: serverTimestamp(),
          status: 'offline',
        });
        console.log(`[UserPresence] Successfully set user ${this.userId} offline`);
      } else {
        console.log(`[UserPresence] User already logged out, skipping offline status update`);
      }
    } catch (error) {
      // Ignoriere Permission-Fehler beim Cleanup nach Logout
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'PERMISSION_DENIED'
      ) {
        console.log(
          `[UserPresence] Permission denied during cleanup (user likely logged out) - this is normal`
        );
      } else {
        console.error('[UserPresence] Error setting user offline:', error);
      }
    }

    this.isInitialized = false;
    this.userId = null;
    console.log('[UserPresence] Cleanup completed');
  }

  // Holt den aktuellen Status eines Benutzers
  getUserPresence(
    userId: string,
    callback: (presence: { isOnline: boolean; lastSeen: any; status: string } | null) => void
  ): () => void {
    const userPresenceRef = ref(realtimeDb, `presence/${userId}`);

    const unsubscribe = onValue(userPresenceRef, snapshot => {
      const data = snapshot.val();
      callback(data);
    });

    // Cleanup-Funktion zurückgeben
    return () => off(userPresenceRef, 'value', unsubscribe);
  }
}

// Export für einfache Verwendung
export const userPresence = UserPresenceService.getInstance();
