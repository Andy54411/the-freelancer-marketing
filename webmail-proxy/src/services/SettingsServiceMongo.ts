/**
 * SettingsService - MongoDB-basierte Benutzereinstellungen
 * =========================================================
 * 
 * Ersetzt die SQLite-basierte Version.
 * Speichert alle E-Mail-Einstellungen in MongoDB.
 * Integriert mit Mailcow Sieve für Abwesenheitsnotiz und Filter.
 */

import mongoDBService, { WebmailSettings, EmailSignature, StarConfig } from './MongoDBService';

// Mailcow API Config
const MAILCOW_API_URL = process.env.MAILCOW_API_URL || 'https://mail.taskilo.de/api/v1';
const MAILCOW_API_KEY = process.env.MAILCOW_API_KEY || '';

// Default-Einstellungen
const defaultSettings: Omit<WebmailSettings, '_id' | 'email' | 'createdAt' | 'updatedAt'> = {
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

// Response-Type für API-Kompatibilität
export interface UserSettingsResponse {
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
  inputToolsEnabled: boolean;
  rtlSupport: boolean;
  hoverActions: boolean;
  defaultTextStyle: {
    fontFamily: string;
    fontSize: string;
    textColor: string;
  };
  externalImages: 'always' | 'ask';
  dynamicEmail: boolean;
  grammarSuggestions: boolean;
  autocorrect: boolean;
  smartCompose: boolean;
  smartComposePersonalization: boolean;
  nudges: {
    suggestReplies: boolean;
    suggestFollowUps: boolean;
  };
  smartReply: boolean;
  smartFeatures: boolean;
  smartFeaturesWorkspace: boolean;
  packageTracking: boolean;
  profileImage: string;
  autoCreateContacts: boolean;
  vacation: {
    enabled: boolean;
    subject: string;
    message: string;
    startDate: string;
    endDate: string;
    contactsOnly: boolean;
  };
  forwarding: {
    enabled: boolean;
    address: string;
    keepCopy: boolean;
  };
  inbox: {
    type: 'default' | 'important-first' | 'unread-first' | 'starred-first' | 'priority';
    categories: boolean;
    promotionsCategory: boolean;
    socialCategory: boolean;
    updatesCategory: boolean;
    forumsCategory: boolean;
  };
  createdAt: number;
  updatedAt: number;
}

class SettingsServiceMongo {
  constructor() {
    console.log('[SettingsService] MongoDB-basiert initialisiert');
  }

  /**
   * Einstellungen abrufen
   */
  async getSettings(email: string): Promise<UserSettingsResponse | null> {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      
      await mongoDBService.connect();
      const settings = await mongoDBService.settings.findOne({ email: normalizedEmail });
      
      if (!settings) {
        return null;
      }
      
      return this.mapToResponse(settings);
    } catch (error) {
      console.error('[SettingsService] Fehler beim Abrufen:', error);
      return null;
    }
  }

  /**
   * Einstellungen speichern oder aktualisieren
   */
  async saveSettings(email: string, updates: Partial<WebmailSettings>): Promise<UserSettingsResponse> {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      const now = new Date();
      
      await mongoDBService.connect();
      
      // Bestehende Einstellungen laden
      const existing = await mongoDBService.settings.findOne({ email: normalizedEmail });
      
      if (existing) {
        // Update
        const updateData = {
          ...updates,
          updatedAt: now,
        };
        
        // Email und _id nicht überschreiben
        delete updateData.email;
        delete updateData._id;
        
        await mongoDBService.settings.updateOne(
          { email: normalizedEmail },
          { $set: updateData }
        );
        
        // Abwesenheitsnotiz synchronisieren
        if (updates.vacation !== undefined) {
          await this.syncVacationToMailcow(normalizedEmail, updates.vacation);
        }
        
        // Weiterleitung synchronisieren
        if (updates.forwarding !== undefined) {
          await this.syncForwardingToMailcow(normalizedEmail, updates.forwarding);
        }
        
        const updated = await mongoDBService.settings.findOne({ email: normalizedEmail });
        return this.mapToResponse(updated!);
      } else {
        // Insert - Mit Defaults mergen
        const newSettings: WebmailSettings = {
          ...defaultSettings,
          ...updates,
          email: normalizedEmail,
          createdAt: now,
          updatedAt: now,
        };
        
        await mongoDBService.settings.insertOne(newSettings);
        
        return this.mapToResponse(newSettings);
      }
    } catch (error) {
      console.error('[SettingsService] Fehler beim Speichern:', error);
      throw error;
    }
  }

  /**
   * Einstellungen löschen
   */
  async deleteSettings(email: string): Promise<boolean> {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      
      await mongoDBService.connect();
      const result = await mongoDBService.settings.deleteOne({ email: normalizedEmail });
      
      return result.deletedCount > 0;
    } catch (error) {
      console.error('[SettingsService] Fehler beim Löschen:', error);
      return false;
    }
  }

  /**
   * Signatur hinzufügen
   */
  async addSignature(email: string, signature: Omit<EmailSignature, 'id'>): Promise<EmailSignature> {
    const normalizedEmail = email.toLowerCase().trim();
    
    await mongoDBService.connect();
    const settings = await mongoDBService.settings.findOne({ email: normalizedEmail });
    
    const newSignature: EmailSignature = {
      id: `sig-${Date.now()}`,
      ...signature,
    };
    
    const signatures = settings?.signatures || [];
    signatures.push(newSignature);
    
    await this.saveSettings(email, { signatures });
    
    return newSignature;
  }

  /**
   * Signatur aktualisieren
   */
  async updateSignature(
    email: string, 
    signatureId: string, 
    updates: Partial<EmailSignature>
  ): Promise<EmailSignature | null> {
    const normalizedEmail = email.toLowerCase().trim();
    
    await mongoDBService.connect();
    const settings = await mongoDBService.settings.findOne({ email: normalizedEmail });
    
    if (!settings) return null;
    
    const signatures = settings.signatures || [];
    const index = signatures.findIndex((s: EmailSignature) => s.id === signatureId);
    
    if (index === -1) return null;
    
    signatures[index] = { ...signatures[index], ...updates };
    
    await this.saveSettings(email, { signatures });
    
    return signatures[index];
  }

  /**
   * Signatur löschen
   */
  async deleteSignature(email: string, signatureId: string): Promise<boolean> {
    const normalizedEmail = email.toLowerCase().trim();
    
    await mongoDBService.connect();
    const settings = await mongoDBService.settings.findOne({ email: normalizedEmail });
    
    if (!settings) return false;
    
    const signatures = (settings.signatures || []).filter((s: EmailSignature) => s.id !== signatureId);
    
    await this.saveSettings(email, { signatures });
    
    return true;
  }

  /**
   * Default-Einstellungen zurückgeben
   */
  getDefaultSettings(): Omit<WebmailSettings, '_id' | 'email' | 'createdAt' | 'updatedAt'> {
    return { ...defaultSettings };
  }

  /**
   * Abwesenheitsnotiz mit Mailcow synchronisieren
   */
  private async syncVacationToMailcow(
    email: string,
    vacation: WebmailSettings['vacation']
  ): Promise<void> {
    if (!MAILCOW_API_KEY) {
      console.warn('[SettingsService] Mailcow API key not configured, skipping vacation sync');
      return;
    }

    try {
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
    forwarding: WebmailSettings['forwarding']
  ): Promise<void> {
    if (!MAILCOW_API_KEY) {
      console.warn('[SettingsService] Mailcow API key not configured, skipping forwarding sync');
      return;
    }

    try {
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
   * MongoDB-Dokument zu API-Response mappen
   */
  private mapToResponse(settings: WebmailSettings): UserSettingsResponse {
    // Sichere Konvertierung von Datum zu Timestamp
    const getTimestamp = (dateValue: Date | string | number | undefined): number => {
      if (!dateValue) return Date.now();
      if (typeof dateValue === 'number') return dateValue;
      if (typeof dateValue === 'string') return new Date(dateValue).getTime();
      if (dateValue instanceof Date) return dateValue.getTime();
      // Falls es ein MongoDB Date-Objekt ist
      if (typeof (dateValue as any).getTime === 'function') {
        return (dateValue as any).getTime();
      }
      return Date.now();
    };

    return {
      email: settings.email,
      displayName: settings.displayName,
      signature: settings.signature,
      signatures: settings.signatures,
      defaultSignatureNewEmail: settings.defaultSignatureNewEmail,
      defaultSignatureReply: settings.defaultSignatureReply,
      insertSignatureBeforeQuote: settings.insertSignatureBeforeQuote,
      language: settings.language,
      timezone: settings.timezone,
      maxPageSize: settings.maxPageSize,
      keyboardShortcuts: settings.keyboardShortcuts,
      buttonLabels: settings.buttonLabels,
      undoSendDelay: settings.undoSendDelay,
      defaultReplyBehavior: settings.defaultReplyBehavior,
      conversationView: settings.conversationView,
      sendAndArchive: settings.sendAndArchive,
      spellCheck: settings.spellCheck,
      autoAdvance: settings.autoAdvance,
      desktopNotifications: settings.desktopNotifications,
      notificationSound: settings.notificationSound,
      starPresets: settings.starPresets,
      starConfig: settings.starConfig,
      personalLevelIndicators: settings.personalLevelIndicators,
      snippets: settings.snippets,
      inputToolsEnabled: settings.inputToolsEnabled,
      rtlSupport: settings.rtlSupport,
      hoverActions: settings.hoverActions,
      defaultTextStyle: settings.defaultTextStyle,
      externalImages: settings.externalImages,
      dynamicEmail: settings.dynamicEmail,
      grammarSuggestions: settings.grammarSuggestions,
      autocorrect: settings.autocorrect,
      smartCompose: settings.smartCompose,
      smartComposePersonalization: settings.smartComposePersonalization,
      nudges: settings.nudges,
      smartReply: settings.smartReply,
      smartFeatures: settings.smartFeatures,
      smartFeaturesWorkspace: settings.smartFeaturesWorkspace,
      packageTracking: settings.packageTracking,
      profileImage: settings.profileImage,
      autoCreateContacts: settings.autoCreateContacts,
      vacation: settings.vacation,
      forwarding: settings.forwarding,
      inbox: settings.inbox,
      createdAt: getTimestamp(settings.createdAt),
      updatedAt: getTimestamp(settings.updatedAt),
    };
  }
}

// Singleton-Instanz exportieren
const settingsServiceMongo = new SettingsServiceMongo();
export default settingsServiceMongo;
