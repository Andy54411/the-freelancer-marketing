/**
 * Taskilo Webmail Proxy - TURN/STUN Service
 * NAT-Traversal für WebRTC Video-Konferenzen
 * 
 * Dieser Service verwaltet TURN/STUN Credentials für sichere Video-Calls
 */

import crypto from 'crypto';

interface TURNCredentials {
  urls: string[];
  username: string;
  credential: string;
  ttl: number;
  expiresAt: number;
}

interface TURNConfig {
  stunServers: string[];
  turnServers: string[];
  turnSecret: string;
  credentialTTL: number; // Sekunden
}

const DEFAULT_CONFIG: TURNConfig = {
  stunServers: [
    'stun:stun.l.google.com:19302',
    'stun:stun1.l.google.com:19302',
    'stun:mail.taskilo.de:3478', // Eigener STUN Server auf mail.taskilo.de
  ],
  turnServers: [
    'turn:mail.taskilo.de:3478',
    'turn:mail.taskilo.de:3478?transport=tcp',
    'turns:mail.taskilo.de:5349',
  ],
  turnSecret: process.env.TURN_SECRET || 'taskilo-turn-secret-change-in-production',
  credentialTTL: 86400, // 24 Stunden
};

class TURNService {
  private config: TURNConfig;
  private credentialCache: Map<string, TURNCredentials> = new Map();
  private stats = {
    credentialsGenerated: 0,
    credentialsCached: 0,
  };

  constructor(config: Partial<TURNConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generiert zeitlich begrenzte TURN-Credentials nach RFC 5766
   * Diese Methode verwendet HMAC-SHA1 für sichere, temporäre Authentifizierung
   */
  generateCredentials(userId: string): TURNCredentials {
    // Check Cache
    const cached = this.credentialCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      this.stats.credentialsCached++;
      return cached;
    }

    // Zeitstempel für Ablauf
    const timestamp = Math.floor(Date.now() / 1000) + this.config.credentialTTL;
    
    // Username Format: timestamp:userId (RFC 5766 TURN REST API)
    const username = `${timestamp}:${userId}`;
    
    // HMAC-SHA1 Credential
    const hmac = crypto.createHmac('sha1', this.config.turnSecret);
    hmac.update(username);
    const credential = hmac.digest('base64');

    const credentials: TURNCredentials = {
      urls: [
        ...this.config.stunServers,
        ...this.config.turnServers,
      ],
      username,
      credential,
      ttl: this.config.credentialTTL,
      expiresAt: timestamp * 1000,
    };

    // Cache speichern
    this.credentialCache.set(userId, credentials);
    this.stats.credentialsGenerated++;

    return credentials;
  }

  /**
   * ICE Server Konfiguration für WebRTC
   */
  getICEServers(userId: string): RTCIceServerConfig[] {
    const turnCreds = this.generateCredentials(userId);

    return [
      // STUN-only Server (öffentlich, kein Auth)
      {
        urls: this.config.stunServers,
      },
      // TURN Server mit temporären Credentials
      {
        urls: this.config.turnServers,
        username: turnCreds.username,
        credential: turnCreds.credential,
      },
    ];
  }

  /**
   * Validiert ob Credentials noch gültig sind
   */
  validateCredentials(username: string, credential: string): boolean {
    // Username Format: timestamp:userId
    const parts = username.split(':');
    if (parts.length < 2) return false;

    const timestamp = parseInt(parts[0], 10);
    if (isNaN(timestamp)) return false;

    // Abgelaufen?
    if (timestamp < Math.floor(Date.now() / 1000)) return false;

    // HMAC verifizieren
    const hmac = crypto.createHmac('sha1', this.config.turnSecret);
    hmac.update(username);
    const expectedCredential = hmac.digest('base64');

    // Timing-Safe Vergleich
    return crypto.timingSafeEqual(
      Buffer.from(credential),
      Buffer.from(expectedCredential)
    );
  }

  /**
   * Cache aufräumen
   */
  cleanupExpiredCredentials(): void {
    const now = Date.now();
    for (const [userId, creds] of this.credentialCache.entries()) {
      if (creds.expiresAt < now) {
        this.credentialCache.delete(userId);
      }
    }
  }

  getStats() {
    return {
      ...this.stats,
      cacheSize: this.credentialCache.size,
    };
  }
}

// RTCIceServer Typ für TypeScript
interface RTCIceServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}

// Singleton
export const turnService = new TURNService();

// Cleanup alle 10 Minuten
setInterval(() => {
  turnService.cleanupExpiredCredentials();
}, 10 * 60 * 1000);

/**
 * COTURN Server Konfiguration für Hetzner
 * 
 * Installiere coturn auf dem Hetzner Server:
 * 
 * apt install coturn
 * 
 * /etc/turnserver.conf:
 * 
 * listening-port=3478
 * tls-listening-port=5349
 * listening-ip=91.99.79.104
 * external-ip=91.99.79.104
 * realm=taskilo.de
 * server-name=turn.taskilo.de
 * use-auth-secret
 * static-auth-secret=<TURN_SECRET>
 * cert=/etc/letsencrypt/live/taskilo.de/fullchain.pem
 * pkey=/etc/letsencrypt/live/taskilo.de/privkey.pem
 * no-cli
 * fingerprint
 * lt-cred-mech
 * no-tlsv1
 * no-tlsv1_1
 * min-port=49152
 * max-port=65535
 * 
 * Firewall öffnen:
 * ufw allow 3478/tcp
 * ufw allow 3478/udp
 * ufw allow 5349/tcp
 * ufw allow 5349/udp
 * ufw allow 49152:65535/udp
 */
