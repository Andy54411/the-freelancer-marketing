/**
 * SettingsService - Verwaltung von Webmail-Benutzereinstellungen
 * 
 * Speichert alle E-Mail-Einstellungen in SQLite
 * Integriert mit Mailcow Sieve für Abwesenheitsnotiz und Filter
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Database = require('better-sqlite3');
import * as fs from 'fs';
import * as path from 'path';

// Pfade
const DATA_DIR = process.env.DRIVE_DATA_DIR || '/opt/taskilo/webmail-proxy/data';
const DB_PATH = path.join(DATA_DIR, 'settings.db');

// Mailcow API Config
const MAILCOW_API_URL = process.env.MAILCOW_API_URL || 'https://mail.taskilo.de/api/v1';
const MAILCOW_API_KEY = process.env.MAILCOW_API_KEY || '';

// Signatur-Interface
export interface EmailSignature {
  id: string;
  name: string;
  content: string;
  isDefault: boolean;
}

// Stern-Konfiguration
export interface StarConfig {
  id: string;
  color: string;
  icon: string;
  inUse: boolean;
}

// Haupt-Settings Interface
export interface UserSettings {
  email: string;
  displayName: string;
  signature: string;
  signatures: EmailSignature[];
  defaultSignatureNewEmail: string;
  defaultSignatureReply: string;
  insertSignatureBeforeQuote: boolean;
  language: string;
  timezone: string;
  maxPageSize: number;
  keyboardShortcuts: boolean;
  buttonLabels: 'icons' | 'text' | 'hover';
  undoSendDelay: number;
  defaultReplyBehavior: 'reply' | 'reply-all';
  conversationView: boolean;
  sendAndArchive: boolean;
  spellCheck: boolean;
  autoAdvance: 'next-newer' | 'next-older' | 'back-to-list';
  desktopNotifications: 'off' | 'new-mail' | 'important';
  notificationSound: boolean;
  starPresets: string[];
  starConfig: StarConfig[];
  personalLevelIndicators: boolean;
  snippets: boolean;
  
  // Neue Einstellungen
  inputToolsEnabled: boolean;
  rtlSupport: boolean;
  hoverActions: boolean;
  
  // Standardtextstil
  defaultTextStyle: {
    fontFamily: string;
    fontSize: string;
    textColor: string;
  };
  
  // Bilder
  externalImages: 'always' | 'ask';
  
  // Dynamische E-Mails
  dynamicEmail: boolean;
  
  // Grammatik & Autokorrektur
  grammarSuggestions: boolean;
  autocorrect: boolean;
  
  // Intelligentes Schreiben
  smartCompose: boolean;
  smartComposePersonalization: boolean;
  
  // Automatische Erinnerungen
  nudges: {
    suggestReplies: boolean;
    suggestFollowUps: boolean;
  };
  
  // Intelligente Antwort
  smartReply: boolean;
  
  // Smarte Funktionen
  smartFeatures: boolean;
  smartFeaturesWorkspace: boolean;
  
  // Paketverfolgung
  packageTracking: boolean;
  
  // Profilbild
  profileImage: string;
  
  // Kontakte
  autoCreateContacts: boolean;
  
  // Abwesenheitsnotiz (wird auch an Mailcow Sieve gesendet)
  vacation: {
    enabled: boolean;
    subject: string;
    message: string;
    startDate: string;
    endDate: string;
    contactsOnly: boolean;
  };
  
  // Weiterleitung (wird auch an Mailcow gesendet)
  forwarding: {
    enabled: boolean;
    address: string;
    keepCopy: boolean;
  };
  
  // Inbox-Einstellungen
  inbox: {
    type: 'default' | 'important-first' | 'unread-first' | 'starred-first' | 'priority';
    categories: boolean;
    promotionsCategory: boolean;
    socialCategory: boolean;
    updatesCategory: boolean;
    forumsCategory: boolean;
  };
  
  // Timestamps
  createdAt: number;
  updatedAt: number;
}

// Default-Einstellungen
const defaultSettings: Omit<UserSettings, 'email' | 'createdAt' | 'updatedAt'> = {
  displayName: '',
  signature: '',
  signatures: [],
  defaultSignatureNewEmail: '',
  defaultSignatureReply: '',
  insertSignatureBeforeQuote: false,
  language: 'de',
  timezone: 'Europe/Berlin',
  maxPageSize: 50,
  keyboardShortcuts: true,
  buttonLabels: 'icons',
  undoSendDelay: 5,
  defaultReplyBehavior: 'reply',
  conversationView: true,
  sendAndArchive: false,
  spellCheck: true,
  autoAdvance: 'next-newer',
  desktopNotifications: 'off',
  notificationSound: true,
  starPresets: ['yellow'],
  starConfig: [
    { id: 'yellow', color: '#f4b400', icon: 'star', inUse: true },
    { id: 'blue', color: '#4285f4', icon: 'star', inUse: false },
    { id: 'red', color: '#ea4335', icon: 'star', inUse: false },
    { id: 'orange', color: '#fa7b17', icon: 'star', inUse: false },
    { id: 'green', color: '#34a853', icon: 'star', inUse: false },
    { id: 'purple', color: '#a142f4', icon: 'star', inUse: false },
  ],
  personalLevelIndicators: false,
  snippets: true,
  inputToolsEnabled: false,
  rtlSupport: false,
  hoverActions: true,
  defaultTextStyle: {
    fontFamily: 'Sans Serif',
    fontSize: 'normal',
    textColor: '#000000',
  },
  externalImages: 'always',
  dynamicEmail: true,
  grammarSuggestions: true,
  autocorrect: false,
  smartCompose: true,
  smartComposePersonalization: true,
  nudges: {
    suggestReplies: true,
    suggestFollowUps: true,
  },
  smartReply: true,
  smartFeatures: true,
  smartFeaturesWorkspace: false,
  packageTracking: true,
  profileImage: '',
  autoCreateContacts: true,
  vacation: {
    enabled: false,
    subject: '',
    message: '',
    startDate: '',
    endDate: '',
    contactsOnly: false,
  },
  forwarding: {
    enabled: false,
    address: '',
    keepCopy: true,
  },
  inbox: {
    type: 'default',
    categories: true,
    promotionsCategory: true,
    socialCategory: true,
    updatesCategory: true,
    forumsCategory: true,
  },
};

class SettingsService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private db: any;

  constructor() {
    // Verzeichnis erstellen
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // Datenbank initialisieren
    this.db = new Database(DB_PATH);
    this.initDatabase();
  }

  private initDatabase(): void {
    // Tabelle erstellen - wir speichern Settings als JSON für Flexibilität
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_settings (
        email TEXT PRIMARY KEY,
        settings_json TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_settings_email ON user_settings(email);
    `);
    
    console.log('[SettingsService] Database initialized');
  }

  /**
   * Einstellungen abrufen
   */
  getSettings(email: string): UserSettings | null {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      
      const stmt = this.db.prepare('SELECT settings_json, created_at, updated_at FROM user_settings WHERE email = ?');
      const row = stmt.get(normalizedEmail);
      
      if (!row) {
        return null;
      }
      
      const settings = JSON.parse(row.settings_json);
      return {
        email: normalizedEmail,
        ...settings,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      console.error('[SettingsService] Error getting settings:', error);
      return null;
    }
  }

  /**
   * Einstellungen speichern oder aktualisieren
   */
  async saveSettings(email: string, settings: Partial<UserSettings>): Promise<UserSettings> {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      const now = Date.now();
      
      // Bestehende Einstellungen laden
      const existing = this.getSettings(normalizedEmail);
      
      // Mit Defaults und bestehenden Einstellungen mergen
      const mergedSettings = {
        ...defaultSettings,
        ...(existing || {}),
        ...settings,
      };
      
      // Email, createdAt, updatedAt aus dem JSON entfernen (werden separat gespeichert)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { email: _email, createdAt: _createdAt, updatedAt: _updatedAt, ...settingsToSave } = mergedSettings as UserSettings;
      
      const settingsJson = JSON.stringify(settingsToSave);
      
      if (existing) {
        // Update
        const stmt = this.db.prepare('UPDATE user_settings SET settings_json = ?, updated_at = ? WHERE email = ?');
        stmt.run(settingsJson, now, normalizedEmail);
      } else {
        // Insert
        const stmt = this.db.prepare('INSERT INTO user_settings (email, settings_json, created_at, updated_at) VALUES (?, ?, ?, ?)');
        stmt.run(normalizedEmail, settingsJson, now, now);
      }
      
      // Abwesenheitsnotiz an Mailcow synchronisieren wenn geändert
      if (settings.vacation !== undefined) {
        await this.syncVacationToMailcow(normalizedEmail, mergedSettings.vacation);
      }
      
      // Weiterleitung an Mailcow synchronisieren wenn geändert
      if (settings.forwarding !== undefined) {
        await this.syncForwardingToMailcow(normalizedEmail, mergedSettings.forwarding);
      }
      
      return {
        email: normalizedEmail,
        ...mergedSettings,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      } as UserSettings;
    } catch (error) {
      console.error('[SettingsService] Error saving settings:', error);
      throw error;
    }
  }

  /**
   * Einstellungen löschen
   */
  deleteSettings(email: string): boolean {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      const stmt = this.db.prepare('DELETE FROM user_settings WHERE email = ?');
      const result = stmt.run(normalizedEmail);
      return result.changes > 0;
    } catch (error) {
      console.error('[SettingsService] Error deleting settings:', error);
      return false;
    }
  }

  /**
   * Abwesenheitsnotiz mit Mailcow Sieve synchronisieren
   */
  private async syncVacationToMailcow(
    email: string,
    vacation: UserSettings['vacation']
  ): Promise<void> {
    if (!MAILCOW_API_KEY) {
      console.warn('[SettingsService] Mailcow API key not configured, skipping vacation sync');
      return;
    }

    try {
      // Mailcow API: Sieve-Vacation-Regel setzen
      const response = await fetch(`${MAILCOW_API_URL}/edit/user-sieve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': MAILCOW_API_KEY,
        },
        body: JSON.stringify({
          username: email,
          vacation_active: vacation.enabled ? 1 : 0,
          vacation_subject: vacation.subject || 'Abwesenheitsnotiz',
          vacation_msg: vacation.message || '',
          vacation_start: vacation.startDate 
            ? Math.floor(new Date(vacation.startDate).getTime() / 1000)
            : 0,
          vacation_end: vacation.endDate 
            ? Math.floor(new Date(vacation.endDate).getTime() / 1000)
            : 0,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[SettingsService] Mailcow vacation sync failed:', errorText);
      } else {
        console.log('[SettingsService] Vacation synced to Mailcow for:', email);
      }
    } catch (error) {
      console.error('[SettingsService] Error syncing vacation to Mailcow:', error);
    }
  }

  /**
   * Weiterleitung mit Mailcow synchronisieren
   */
  private async syncForwardingToMailcow(
    email: string,
    forwarding: UserSettings['forwarding']
  ): Promise<void> {
    if (!MAILCOW_API_KEY) {
      console.warn('[SettingsService] Mailcow API key not configured, skipping forwarding sync');
      return;
    }

    try {
      // Mailcow API: Weiterleitung setzen
      const response = await fetch(`${MAILCOW_API_URL}/edit/alias`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': MAILCOW_API_KEY,
        },
        body: JSON.stringify({
          address: email,
          goto: forwarding.enabled && forwarding.address 
            ? (forwarding.keepCopy ? `${email},${forwarding.address}` : forwarding.address)
            : email,
          active: 1,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[SettingsService] Mailcow forwarding sync failed:', errorText);
      } else {
        console.log('[SettingsService] Forwarding synced to Mailcow for:', email);
      }
    } catch (error) {
      console.error('[SettingsService] Error syncing forwarding to Mailcow:', error);
    }
  }

  /**
   * Signatur hinzufügen
   */
  async addSignature(email: string, signature: Omit<EmailSignature, 'id'>): Promise<EmailSignature> {
    const settings = this.getSettings(email);
    const signatures = settings?.signatures || [];
    
    const newSignature: EmailSignature = {
      id: `sig-${Date.now()}`,
      ...signature,
    };
    
    signatures.push(newSignature);
    
    await this.saveSettings(email, { signatures });
    
    return newSignature;
  }

  /**
   * Signatur aktualisieren
   */
  async updateSignature(email: string, signatureId: string, updates: Partial<EmailSignature>): Promise<EmailSignature | null> {
    const settings = this.getSettings(email);
    if (!settings) return null;
    
    const signatures = settings.signatures || [];
    const index = signatures.findIndex(s => s.id === signatureId);
    
    if (index === -1) return null;
    
    signatures[index] = { ...signatures[index], ...updates };
    
    await this.saveSettings(email, { signatures });
    
    return signatures[index];
  }

  /**
   * Signatur löschen
   */
  async deleteSignature(email: string, signatureId: string): Promise<boolean> {
    const settings = this.getSettings(email);
    if (!settings) return false;
    
    const signatures = (settings.signatures || []).filter(s => s.id !== signatureId);
    
    await this.saveSettings(email, { signatures });
    
    return true;
  }

  /**
   * Default-Einstellungen zurückgeben
   */
  getDefaultSettings(): Omit<UserSettings, 'email' | 'createdAt' | 'updatedAt'> {
    return { ...defaultSettings };
  }
}

// Singleton-Instanz exportieren
const settingsService = new SettingsService();
export default settingsService;
