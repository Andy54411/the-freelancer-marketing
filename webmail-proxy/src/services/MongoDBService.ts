/**
 * MongoDB Service für Taskilo Webmail-Proxy
 * ==========================================
 * 
 * Verbindet sich mit der MongoDB-Instanz der Taskilo-KI.
 * Ersetzt alle SQLite-Datenbanken für zentrale Datenhaltung.
 * 
 * Collections:
 * - webmail_settings: Benutzereinstellungen
 * - webmail_profiles: Benutzerprofile
 * - webmail_drive_users: Drive-Benutzer
 * - webmail_drive_folders: Drive-Ordner
 * - webmail_drive_files: Drive-Dateien
 * - webmail_tasks: Aufgaben
 * - webmail_task_lists: Aufgabenlisten
 * - webmail_spaces: Chat-Gruppenbereiche
 * - webmail_messages: Chat-Nachrichten
 */

import { MongoClient, Db, Collection, ObjectId, IndexDescription, Document } from 'mongodb';

// MongoDB-Verbindung zur KI-Instanz
// Docker-Container-Namen haben Priorität - localhost nur für lokale Entwicklung
const IS_DOCKER = process.env.NODE_ENV === 'production' || process.env.DOCKER === 'true';

const MONGODB_HOSTS = IS_DOCKER
  ? [
      process.env.MONGODB_URL,
      'mongodb://mongo:27017',           // Docker Compose Service-Name
      'mongodb://taskilo-mongo:27017',   // Container-Name/Alias
    ].filter(Boolean) as string[]
  : [
      process.env.MONGODB_URL,
      'mongodb://localhost:27017',       // Nur für lokale Entwicklung
    ].filter(Boolean) as string[];

const MONGODB_URL = MONGODB_HOSTS[0] || 'mongodb://mongo:27017';
const DB_NAME = process.env.MONGODB_DB || 'taskilo_webmail';

// Retry-Konfiguration
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;
const RECONNECT_INTERVAL_MS = 10000;

// Interfaces
export interface WebmailSettings {
  _id?: ObjectId;
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
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailSignature {
  id: string;
  name: string;
  content: string;
  isDefault: boolean;
}

export interface StarConfig {
  id: string;
  color: string;
  icon: string;
  inUse: boolean;
}

export interface WebmailProfile {
  _id?: ObjectId;
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  phone: string;
  phoneVerified: boolean;
  phoneVerifiedAt: Date | null;
  avatarUrl: string;
  status: string;
  customStatus: string;
  statusEmoji: string;
  twoFactorEnabled: boolean;
  twoFactorMethod: 'sms' | 'authenticator' | null;
  loginHistory: LoginEntry[];
  trustedDevices: TrustedDevice[];
  linkedAccounts?: LinkedAccount[];
  storageUsedBytes?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LinkedAccount {
  email: string;
  name: string;
  addedAt: string;
}

export interface LoginEntry {
  timestamp: Date;
  ip: string;
  userAgent: string;
  location: string;
  success: boolean;
}

export interface TrustedDevice {
  id: string;
  name: string;
  lastUsed: Date;
  userAgent: string;
}

export interface DriveUser {
  _id?: ObjectId;
  email: string;
  plan: 'free' | 'plus' | 'pro';
  storageUsed: number;
  storageLimit: number;
  fileCount: number;
  folderCount: number;
  subscriptionStart: Date | null;
  subscriptionEnd: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DriveFolder {
  _id?: ObjectId;
  userId: string;
  name: string;
  parentId: string | null;
  isDeleted: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DriveFile {
  _id?: ObjectId;
  userId: string;
  folderId: string | null;
  name: string;
  mimeType: string | null;
  size: number;
  storagePath: string;
  isDeleted: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Freigaben für Dateien/Ordner
export interface DriveShare {
  _id?: ObjectId;
  ownerId: string;          // E-Mail des Besitzers
  targetEmail: string;      // E-Mail des Empfängers
  fileId: string | null;    // Freigegebene Datei (oder null wenn Ordner)
  folderId: string | null;  // Freigegebener Ordner (oder null wenn Datei)
  permission: 'view' | 'edit';
  status: 'pending' | 'accepted' | 'rejected';
  token: string;            // Einmaliger Token für E-Mail-Bestätigung
  message?: string;         // Optionale Nachricht vom Besitzer
  acceptedAt: Date | null;
  rejectedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  _id?: ObjectId;
  userId: string;
  listId: string;
  spaceId?: string | null;
  title: string;
  notes: string;
  dueDate: Date | null;
  completed: boolean;
  completedAt: Date | null;
  starred: boolean;
  priority: 'low' | 'medium' | 'high' | null;
  repeat: RepeatConfig | null;
  emailRef?: {
    mailbox: string;
    uid: number;
  };
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RepeatConfig {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  interval: number;
  weekdays?: number[];
  endDate?: Date | null;
}

export interface TaskList {
  _id?: ObjectId;
  userId: string;
  name: string;
  color: string;
  order: number;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Space {
  _id?: ObjectId;
  creatorEmail: string;
  name: string;
  emoji: string;
  description: string;
  members: SpaceMember[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SpaceMember {
  email: string;
  role: 'admin' | 'member';
  joinedAt: Date;
}

export interface EncryptedMessage {
  ciphertext: string;
  iv: string;
  salt: string;
  senderPublicKey: string;
}

export interface SpaceMessage {
  _id?: ObjectId;
  spaceId: string;
  senderEmail: string;
  senderName?: string;
  content: string;
  encrypted?: EncryptedMessage;
  isEncrypted: boolean;
  attachments: MessageAttachment[];
  reactions: MessageReaction[];
  threadId: string | null;
  isEdited: boolean;
  editedAt: Date | null;
  createdAt: Date;
}

export interface MessageAttachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  url: string;
}

export interface MessageReaction {
  emoji: string;
  users: string[];
}

// ==================== PHOTO INTERFACES ====================

export interface PhotoUser {
  _id?: ObjectId;
  id: string;
  plan: 'free' | 'plus' | 'pro' | 'business';
  storageUsed: number;
  storageLimit: number;
  photoCount: number;
  albumCount: number;
  lastSyncAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface PhotoAlbum {
  _id?: ObjectId;
  id: string;
  userId: string;
  name: string;
  description: string | null;
  coverPhotoId: string | null;
  photoCount: number;
  isDefault: boolean;
  isDeleted: boolean;
  deletedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface Photo {
  _id?: ObjectId;
  id: string;
  userId: string;
  albumId: string | null;
  filename: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  storagePath: string;
  thumbnailPath: string | null;
  takenAt: number | null;
  latitude: number | null;
  longitude: number | null;
  locationName: string | null;
  camera: string | null;
  primaryCategory: string | null;
  primaryCategoryDisplay: string | null;
  primaryConfidence: number | null;
  detectedCategories: string | null;
  detectedObjects: string | null;
  metadataCategories: string | null;
  classifiedAt: number | null;
  imageHash: string | null;
  isFavorite: boolean;
  isDeleted: boolean;
  deletedAt: number | null;
  syncedFromApp: boolean;
  appDeviceId: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface PhotoAiCategories {
  primaryCategory: string;
  primaryCategoryDisplay: string;
  primaryConfidence: number;
  detectedCategories: Array<{ category: string; display_name: string; confidence: number }>;
  detectedObjects: Array<{ object: string; confidence: number }>;
  metadataCategories: string[];
  classifiedAt: number;
  imageHash?: string;
}

export interface PhotoCustomCategory {
  _id?: ObjectId;
  id: string;
  userId: string;
  key: string;
  display: string;
  groupName: string;
  createdAt: number;
}

// ==================== NEWSLETTER INTERFACES ====================

export interface NewsletterSubscriber {
  _id?: ObjectId;
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: 'pending' | 'subscribed' | 'unsubscribed' | 'bounced' | 'complained';
  source: 'website' | 'import' | 'api' | 'manual' | 'footer';
  tags: string[];
  confirmationToken: string | null;
  unsubscribeToken: string;
  ipAddress: string | null;
  userAgent: string | null;
  consentGiven: boolean;
  consentTimestamp: number;
  confirmedAt: number | null;
  unsubscribedAt: number | null;
  unsubscribeReason: string | null;
  emailsSent: number;
  emailsOpened: number;
  linksClicked: number;
  lastOpenedAt: number | null;
  lastClickedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface NewsletterCampaign {
  _id?: ObjectId;
  id: string;
  name: string;
  subject: string;
  previewText: string | null;
  fromName: string;
  fromEmail: string;
  replyTo: string | null;
  htmlContent: string;
  textContent: string | null;
  templateId: string | null;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled';
  recipientType: 'all' | 'segment' | 'tags';
  recipientTags: string[];
  scheduledAt: number | null;
  sentAt: number | null;
  totalRecipients: number;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
  complained: number;
  createdBy: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface NewsletterTemplate {
  _id?: ObjectId;
  id: string;
  name: string;
  description: string | null;
  category: string;
  htmlContent: string;
  textContent: string | null;
  thumbnail: string | null;
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface NewsletterSettings {
  _id?: ObjectId;
  id: string;
  defaultFromName: string;
  defaultFromEmail: string;
  defaultReplyTo: string | null;
  doubleOptIn: boolean;
  welcomeEmailEnabled: boolean;
  welcomeEmailTemplateId: string | null;
  unsubscribePageUrl: string | null;
  footerText: string | null;
  companyName: string | null;
  companyAddress: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface NewsletterTracking {
  _id?: ObjectId;
  id: string;
  campaignId: string;
  subscriberId: string;
  eventType: 'open' | 'click' | 'bounce' | 'unsubscribe' | 'complaint';
  linkUrl: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: number;
}

// ==================== CACHE INTERFACE ====================

export interface WebmailCache {
  _id?: ObjectId;
  type: 'mailboxes' | 'messages' | 'message' | 'generic';
  email: string;
  key: string;
  mailbox?: string;
  page?: number;
  uid?: number;
  data: unknown;
  expiresAt: Date;
  updatedAt: Date;
}

// ==================== CUSTOM DOMAIN INTERFACES ====================

export interface CustomDomain {
  _id?: ObjectId;
  id: string;
  email: string;                    // E-Mail des Besitzers
  domain: string;                   // Die Custom Domain (z.B. meinefirma.de)
  status: 'pending' | 'verifying' | 'verified' | 'active' | 'failed' | 'suspended';
  verificationCode: string;         // TXT Record zur Verifizierung
  verificationMethod: 'txt_record';
  dnsProvider: 'hetzner' | 'inwx' | 'external';
  dnsRecordsCreated: boolean;
  mailcowDomainAdded: boolean;
  dkimSelector: string | null;
  dkimPublicKey: string | null;
  maxMailboxes: number;
  maxAliases: number;
  quotaMB: number;
  verifiedAt: Date | null;
  activatedAt: Date | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomDomainMailbox {
  _id?: ObjectId;
  id: string;
  domainId: string;
  email: string;                    // Vollständige E-Mail z.B. info@meinefirma.de
  localPart: string;                // Nur der Teil vor dem @ (z.B. info)
  name: string;
  quotaMB: number;
  active: boolean;
  mailcowMailboxId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

class MongoDBService {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private isConnected = false;
  private connectionPromise: Promise<void> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private currentHostIndex = 0;
  private connectionAttempts = 0;

  // Collections
  private _settings: Collection<WebmailSettings> | null = null;
  private _profiles: Collection<WebmailProfile> | null = null;
  private _driveUsers: Collection<DriveUser> | null = null;
  private _driveFolders: Collection<DriveFolder> | null = null;
  private _driveFiles: Collection<DriveFile> | null = null;
  private _driveShares: Collection<DriveShare> | null = null;
  private _tasks: Collection<Task> | null = null;
  private _taskLists: Collection<TaskList> | null = null;
  private _spaces: Collection<Space> | null = null;
  private _messages: Collection<SpaceMessage> | null = null;
  // Photo Collections
  private _photoUsers: Collection<PhotoUser> | null = null;
  private _photoAlbums: Collection<PhotoAlbum> | null = null;
  private _photos: Collection<Photo> | null = null;
  private _photoCustomCategories: Collection<PhotoCustomCategory> | null = null;
  // Newsletter Collections
  private _newsletterSubscribers: Collection<NewsletterSubscriber> | null = null;
  private _newsletterCampaigns: Collection<NewsletterCampaign> | null = null;
  private _newsletterTemplates: Collection<NewsletterTemplate> | null = null;
  private _newsletterSettings: Collection<NewsletterSettings> | null = null;
  private _newsletterTracking: Collection<NewsletterTracking> | null = null;
  // Cache Collection
  private _cache: Collection<WebmailCache> | null = null;
  // Custom Domain Collections
  private _customDomains: Collection<CustomDomain> | null = null;
  private _customDomainMailboxes: Collection<CustomDomainMailbox> | null = null;

  /**
   * Verbindet mit MongoDB
   */
  async connect(): Promise<void> {
    if (this.isConnected) return;
    
    // Verhindere mehrfache gleichzeitige Verbindungsversuche
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this._connectWithRetry();
    await this.connectionPromise;
    this.connectionPromise = null;
  }

  /**
   * Verbindung mit Retry-Logik über mehrere Hosts
   */
  private async _connectWithRetry(): Promise<void> {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      for (let hostIndex = 0; hostIndex < MONGODB_HOSTS.length; hostIndex++) {
        const host = MONGODB_HOSTS[hostIndex];
        try {
          await this._connect(host);
          this.currentHostIndex = hostIndex;
          this.connectionAttempts = 0;
          return;
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unbekannter Fehler';
          console.warn(`[MongoDB] Verbindung zu ${host} fehlgeschlagen (Versuch ${attempt + 1}/${MAX_RETRIES}): ${errorMsg}`);
          
          // Kurze Pause vor dem nächsten Versuch
          if (hostIndex === MONGODB_HOSTS.length - 1 && attempt < MAX_RETRIES - 1) {
            console.log(`[MongoDB] Warte ${RETRY_DELAY_MS}ms vor erneutem Versuch...`);
            await this.sleep(RETRY_DELAY_MS);
          }
        }
      }
    }
    
    // Alle Versuche fehlgeschlagen - starte Hintergrund-Reconnect
    console.error('[MongoDB] Alle Verbindungsversuche fehlgeschlagen. Starte Hintergrund-Reconnect...');
    this.scheduleReconnect();
    throw new Error('MongoDB-Verbindung konnte nicht hergestellt werden');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Plant einen erneuten Verbindungsversuch
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      this.connectionAttempts++;
      
      console.log(`[MongoDB] Hintergrund-Reconnect-Versuch #${this.connectionAttempts}...`);
      
      try {
        await this._connectWithRetry();
        console.log('[MongoDB] Hintergrund-Reconnect erfolgreich!');
      } catch {
        // Weiter versuchen, aber mit exponentiell steigender Verzögerung
        const delay = Math.min(RECONNECT_INTERVAL_MS * Math.pow(1.5, this.connectionAttempts), 60000);
        console.log(`[MongoDB] Nächster Reconnect-Versuch in ${Math.round(delay / 1000)}s...`);
        this.scheduleReconnect();
      }
    }, RECONNECT_INTERVAL_MS);
  }

  private async _connect(mongoUrl?: string): Promise<void> {
    const url = mongoUrl || MONGODB_URL;
    try {
      console.log('[MongoDB] Verbinde mit:', url);
      
      // Vorherige Verbindung schließen falls vorhanden
      if (this.client) {
        try {
          await this.client.close();
        } catch {
          // Ignorieren
        }
        this.client = null;
        this.db = null;
      }
      
      this.client = new MongoClient(url, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
        minPoolSize: 1,
        retryWrites: true,
        retryReads: true,
      });

      // Event-Handler für Verbindungsprobleme
      this.client.on('close', () => {
        console.warn('[MongoDB] Verbindung geschlossen');
        this.isConnected = false;
        this.scheduleReconnect();
      });

      this.client.on('error', (error) => {
        console.error('[MongoDB] Verbindungsfehler:', error.message);
        this.isConnected = false;
      });

      await this.client.connect();
      this.db = this.client.db(DB_NAME);
      
      // Collections initialisieren
      this._settings = this.db.collection('webmail_settings');
      this._profiles = this.db.collection('webmail_profiles');
      this._driveUsers = this.db.collection('webmail_drive_users');
      this._driveFolders = this.db.collection('webmail_drive_folders');
      this._driveFiles = this.db.collection('webmail_drive_files');
      this._driveShares = this.db.collection('webmail_drive_shares');
      this._tasks = this.db.collection('webmail_tasks');
      this._taskLists = this.db.collection('webmail_task_lists');
      this._spaces = this.db.collection('webmail_spaces');
      this._messages = this.db.collection('webmail_messages');
      // Photo Collections
      this._photoUsers = this.db.collection('webmail_photo_users');
      this._photoAlbums = this.db.collection('webmail_photo_albums');
      this._photos = this.db.collection('webmail_photos');
      this._photoCustomCategories = this.db.collection('webmail_photo_custom_categories');
      // Newsletter Collections
      this._newsletterSubscribers = this.db.collection('webmail_newsletter_subscribers');
      this._newsletterCampaigns = this.db.collection('webmail_newsletter_campaigns');
      this._newsletterTemplates = this.db.collection('webmail_newsletter_templates');
      this._newsletterSettings = this.db.collection('webmail_newsletter_settings');
      this._newsletterTracking = this.db.collection('webmail_newsletter_tracking');
      // Cache Collection
      this._cache = this.db.collection('webmail_cache');
      // Custom Domain Collections
      this._customDomains = this.db.collection('webmail_custom_domains');
      this._customDomainMailboxes = this.db.collection('webmail_custom_domain_mailboxes');

      // Indizes erstellen
      await this.createIndexes();
      
      this.isConnected = true;
      console.log('[MongoDB] Verbindung hergestellt, Datenbank:', DB_NAME);
    } catch (error) {
      console.error('[MongoDB] Verbindungsfehler:', error);
      throw error;
    }
  }

  /**
   * Erstellt alle benötigten Indizes
   */
  private async createIndexes(): Promise<void> {
    if (!this.db) return;

    try {
      // Settings - eindeutiger Index auf Email
      await this._settings?.createIndex({ email: 1 }, { unique: true });

      // Profiles - eindeutiger Index auf Email
      await this._profiles?.createIndex({ email: 1 }, { unique: true });

      // Drive Users
      await this._driveUsers?.createIndex({ email: 1 }, { unique: true });

      // Drive Folders
      await this._driveFolders?.createIndex({ userId: 1 });
      await this._driveFolders?.createIndex({ parentId: 1 });
      await this._driveFolders?.createIndex({ userId: 1, parentId: 1 });

      // Drive Files
      await this._driveFiles?.createIndex({ userId: 1 });
      await this._driveFiles?.createIndex({ folderId: 1 });
      await this._driveFiles?.createIndex({ userId: 1, folderId: 1 });

      // Drive Shares
      await this._driveShares?.createIndex({ ownerId: 1 });
      await this._driveShares?.createIndex({ targetEmail: 1 });
      await this._driveShares?.createIndex({ targetEmail: 1, status: 1 });
      await this._driveShares?.createIndex({ token: 1 }, { unique: true });

      // Tasks
      await this._tasks?.createIndex({ userId: 1 });
      await this._tasks?.createIndex({ listId: 1 });
      await this._tasks?.createIndex({ spaceId: 1 });
      await this._tasks?.createIndex({ userId: 1, listId: 1 });
      await this._tasks?.createIndex({ userId: 1, completed: 1 });

      // Task Lists
      await this._taskLists?.createIndex({ userId: 1 });

      // Spaces
      await this._spaces?.createIndex({ creatorEmail: 1 });
      await this._spaces?.createIndex({ 'members.email': 1 });

      // Messages
      await this._messages?.createIndex({ spaceId: 1 });
      await this._messages?.createIndex({ spaceId: 1, createdAt: -1 });
      await this._messages?.createIndex({ threadId: 1 });

      // Photo Users
      await this._photoUsers?.createIndex({ id: 1 }, { unique: true });

      // Photo Albums
      await this._photoAlbums?.createIndex({ id: 1 }, { unique: true });
      await this._photoAlbums?.createIndex({ userId: 1 });
      await this._photoAlbums?.createIndex({ userId: 1, isDeleted: 1 });

      // Photos
      await this._photos?.createIndex({ id: 1 }, { unique: true });
      await this._photos?.createIndex({ userId: 1 });
      await this._photos?.createIndex({ albumId: 1 });
      await this._photos?.createIndex({ userId: 1, isDeleted: 1 });
      await this._photos?.createIndex({ userId: 1, primaryCategory: 1 });
      await this._photos?.createIndex({ userId: 1, takenAt: -1 });
      await this._photos?.createIndex({ userId: 1, createdAt: -1 });

      // Photo Custom Categories
      await this._photoCustomCategories?.createIndex({ userId: 1, key: 1 }, { unique: true });

      // Newsletter Subscribers
      await this._newsletterSubscribers?.createIndex({ id: 1 }, { unique: true });
      await this._newsletterSubscribers?.createIndex({ email: 1 }, { unique: true });
      await this._newsletterSubscribers?.createIndex({ status: 1 });

      // Newsletter Campaigns
      await this._newsletterCampaigns?.createIndex({ id: 1 }, { unique: true });
      await this._newsletterCampaigns?.createIndex({ status: 1 });

      // Newsletter Templates
      await this._newsletterTemplates?.createIndex({ id: 1 }, { unique: true });
      await this._newsletterTemplates?.createIndex({ category: 1 });

      // Newsletter Tracking
      await this._newsletterTracking?.createIndex({ campaignId: 1 });
      await this._newsletterTracking?.createIndex({ subscriberId: 1 });

      // Custom Domains
      await this._customDomains?.createIndex({ id: 1 }, { unique: true });
      await this._customDomains?.createIndex({ email: 1 });
      await this._customDomains?.createIndex({ domain: 1 }, { unique: true });
      await this._customDomains?.createIndex({ status: 1 });

      // Custom Domain Mailboxes
      await this._customDomainMailboxes?.createIndex({ id: 1 }, { unique: true });
      await this._customDomainMailboxes?.createIndex({ domainId: 1 });
      await this._customDomainMailboxes?.createIndex({ email: 1 }, { unique: true });

      console.log('[MongoDB] Indizes erstellt');
    } catch (error) {
      console.error('[MongoDB] Fehler beim Erstellen der Indizes:', error);
    }
  }

  /**
   * Trennt die Verbindung
   */
  async disconnect(): Promise<void> {
    // Reconnect-Timer stoppen
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      this.isConnected = false;
      console.log('[MongoDB] Verbindung getrennt');
    }
  }

  /**
   * Stellt sicher, dass eine Verbindung besteht
   */
  async ensureConnection(): Promise<void> {
    if (!this.isConnected) {
      try {
        await this.connect();
      } catch {
        // Verbindung fehlgeschlagen, aber nicht fatal - Reconnect läuft im Hintergrund
      }
    }
  }

  /**
   * Prüft ob MongoDB verbunden und bereit ist
   */
  isReady(): boolean {
    return this.isConnected && this.db !== null;
  }

  // ==================== GETTERS ====================

  get settings(): Collection<WebmailSettings> {
    if (!this._settings) throw new Error('MongoDB nicht verbunden');
    return this._settings;
  }

  get profiles(): Collection<WebmailProfile> {
    if (!this._profiles) throw new Error('MongoDB nicht verbunden');
    return this._profiles;
  }

  get driveUsers(): Collection<DriveUser> {
    if (!this._driveUsers) throw new Error('MongoDB nicht verbunden');
    return this._driveUsers;
  }

  get driveFolders(): Collection<DriveFolder> {
    if (!this._driveFolders) throw new Error('MongoDB nicht verbunden');
    return this._driveFolders;
  }

  get driveFiles(): Collection<DriveFile> {
    if (!this._driveFiles) throw new Error('MongoDB nicht verbunden');
    return this._driveFiles;
  }

  get driveShares(): Collection<DriveShare> {
    if (!this._driveShares) throw new Error('MongoDB nicht verbunden');
    return this._driveShares;
  }

  get tasks(): Collection<Task> {
    if (!this._tasks) throw new Error('MongoDB nicht verbunden');
    return this._tasks;
  }

  get taskLists(): Collection<TaskList> {
    if (!this._taskLists) throw new Error('MongoDB nicht verbunden');
    return this._taskLists;
  }

  get spaces(): Collection<Space> {
    if (!this._spaces) throw new Error('MongoDB nicht verbunden');
    return this._spaces;
  }

  get messages(): Collection<SpaceMessage> {
    if (!this._messages) throw new Error('MongoDB nicht verbunden');
    return this._messages;
  }

  // Photo Collection Getters
  getPhotoUsersCollection(): Collection<PhotoUser> {
    if (!this._photoUsers) throw new Error('MongoDB nicht verbunden');
    return this._photoUsers;
  }

  getPhotoAlbumsCollection(): Collection<PhotoAlbum> {
    if (!this._photoAlbums) throw new Error('MongoDB nicht verbunden');
    return this._photoAlbums;
  }

  getPhotosCollection(): Collection<Photo> {
    if (!this._photos) throw new Error('MongoDB nicht verbunden');
    return this._photos;
  }

  getPhotoCustomCategoriesCollection(): Collection<PhotoCustomCategory> {
    if (!this._photoCustomCategories) throw new Error('MongoDB nicht verbunden');
    return this._photoCustomCategories;
  }

  // Newsletter Collection Getters
  getNewsletterSubscribersCollection(): Collection<NewsletterSubscriber> {
    if (!this._newsletterSubscribers) throw new Error('MongoDB nicht verbunden');
    return this._newsletterSubscribers;
  }

  getNewsletterCampaignsCollection(): Collection<NewsletterCampaign> {
    if (!this._newsletterCampaigns) throw new Error('MongoDB nicht verbunden');
    return this._newsletterCampaigns;
  }

  getNewsletterTemplatesCollection(): Collection<NewsletterTemplate> {
    if (!this._newsletterTemplates) throw new Error('MongoDB nicht verbunden');
    return this._newsletterTemplates;
  }

  getNewsletterSettingsCollection(): Collection<NewsletterSettings> {
    if (!this._newsletterSettings) throw new Error('MongoDB nicht verbunden');
    return this._newsletterSettings;
  }

  getNewsletterTrackingCollection(): Collection<NewsletterTracking> {
    if (!this._newsletterTracking) throw new Error('MongoDB nicht verbunden');
    return this._newsletterTracking;
  }

  // Cache Collection Getter
  getCacheCollection(): Collection<WebmailCache> {
    if (!this._cache) throw new Error('MongoDB nicht verbunden');
    return this._cache;
  }

  // Custom Domain Collection Getters
  getCustomDomainsCollection(): Collection<CustomDomain> {
    if (!this._customDomains) throw new Error('MongoDB nicht verbunden');
    return this._customDomains;
  }

  getCustomDomainMailboxesCollection(): Collection<CustomDomainMailbox> {
    if (!this._customDomainMailboxes) throw new Error('MongoDB nicht verbunden');
    return this._customDomainMailboxes;
  }

  // Generischer Collection Getter für beliebige Collections
  getCollection<T extends Document>(name: string): Collection<T> {
    if (!this.db) throw new Error('MongoDB nicht verbunden');
    return this.db.collection<T>(name);
  }

  // Collection Getter mit Datenbank-Auswahl (für Chat/Meeting-Logging in taskilo_ki DB)
  async getCollectionFromDb<T extends Document>(dbName: string, collectionName: string): Promise<Collection<T>> {
    await this.ensureConnection();
    if (!this.client) throw new Error('MongoDB nicht verbunden');
    const db = this.client.db(dbName);
    return db.collection<T>(collectionName);
  }

  // ==================== HEALTH CHECK ====================

  async healthCheck(): Promise<{ status: string; details?: Record<string, unknown> }> {
    try {
      // Falls nicht verbunden, versuche Verbindung
      if (!this.isConnected) {
        await this.ensureConnection();
      }
      
      if (!this.db || !this.isConnected) {
        return { 
          status: 'unhealthy', 
          details: { 
            error: 'Keine Datenbankverbindung',
            reconnecting: this.reconnectTimer !== null,
            attempts: this.connectionAttempts,
            hosts: MONGODB_HOSTS,
          } 
        };
      }

      // Ping-Test
      const pingStart = Date.now();
      await this.db.command({ ping: 1 });
      const pingMs = Date.now() - pingStart;
      
      const stats = await this.db.stats();
      
      return {
        status: 'healthy',
        details: {
          database: DB_NAME,
          host: MONGODB_HOSTS[this.currentHostIndex],
          pingMs,
          collections: stats.collections,
          documents: stats.objects,
          storageMB: Math.round(stats.storageSize / 1024 / 1024 * 100) / 100,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: { 
          error: error instanceof Error ? error.message : 'Unbekannter Fehler',
          reconnecting: this.reconnectTimer !== null,
          attempts: this.connectionAttempts,
        },
      };
    }
  }
}

// Singleton-Instanz
const mongoDBService = new MongoDBService();

// Auto-Connect beim Import mit verzögertem Start
setTimeout(() => {
  mongoDBService.connect().catch((error) => {
    console.error('[MongoDB] Auto-Connect fehlgeschlagen:', error.message);
    console.log('[MongoDB] Reconnect wird im Hintergrund fortgesetzt...');
  });
}, 1000);

export default mongoDBService;
export { mongoDBService, ObjectId };
