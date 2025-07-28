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
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
  }

  // Beendet die Presence-Überwachung
  async cleanupPresence(): Promise<void> {
    if (!this.userId) return;

    // Stoppe den Aktivitäts-Timer
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Setze den Benutzer als offline
    const userPresenceRef = ref(realtimeDb, `presence/${this.userId}`);
    await set(userPresenceRef, {
      isOnline: false,
      lastSeen: serverTimestamp(),
      status: 'offline',
    });

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
