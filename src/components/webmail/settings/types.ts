'use client';

// Signatur-Interface für mehrere Signaturen
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

export interface UserSettings {
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
  
  notifications: {
    email: boolean;
    desktop: boolean;
    sound: boolean;
  };
  appearance: {
    theme: 'light' | 'dark' | 'system';
    compactMode: boolean;
  };
  privacy: {
    readReceipts: boolean;
    showOnlineStatus: boolean;
  };
  inbox: {
    type: 'default' | 'important-first' | 'unread-first' | 'starred-first' | 'priority';
    categories: boolean;
    promotionsCategory: boolean;
    socialCategory: boolean;
    updatesCategory: boolean;
    forumsCategory: boolean;
  };
  filters: {
    importFiltersFrom: string;
  };
  forwarding: {
    enabled: boolean;
    address: string;
    keepCopy: boolean;
  };
  vacation: {
    enabled: boolean;
    subject: string;
    message: string;
    startDate: string;
    endDate: string;
    contactsOnly: boolean;
  };
}

export const defaultSettings: UserSettings = {
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
    { id: 'yellow-bang', color: '#f4b400', icon: 'exclamation', inUse: false },
    { id: 'red-bang', color: '#ea4335', icon: 'exclamation', inUse: false },
    { id: 'blue-info', color: '#4285f4', icon: 'info', inUse: false },
    { id: 'green-check', color: '#34a853', icon: 'check', inUse: false },
    { id: 'purple-question', color: '#a142f4', icon: 'question', inUse: false },
  ],
  personalLevelIndicators: false,
  snippets: true,
  
  // Neue Einstellungen
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
  
  notifications: {
    email: true,
    desktop: true,
    sound: true,
  },
  appearance: {
    theme: 'light',
    compactMode: false,
  },
  privacy: {
    readReceipts: true,
    showOnlineStatus: true,
  },
  inbox: {
    type: 'default',
    categories: true,
    promotionsCategory: true,
    socialCategory: true,
    updatesCategory: true,
    forumsCategory: true,
  },
  filters: {
    importFiltersFrom: '',
  },
  forwarding: {
    enabled: false,
    address: '',
    keepCopy: true,
  },
  vacation: {
    enabled: false,
    subject: '',
    message: '',
    startDate: '',
    endDate: '',
    contactsOnly: false,
  },
};

export interface SettingsTabProps {
  settings: UserSettings;
  onSettingsChange: (settings: Partial<UserSettings>) => void;
  isDark: boolean;
  session: {
    email: string;
    isAuthenticated: boolean;
  } | null;
}

// Gmail-ähnliche Tab-Definitionen
export const settingsTabs = [
  { id: 'general', label: 'Allgemein' },
  { id: 'labels', label: 'Labels' },
  { id: 'inbox', label: 'Posteingang' },
  { id: 'accounts', label: 'Konten & Import' },
  { id: 'domains', label: 'Eigene Domains' },
  { id: 'filters', label: 'Filter & blockierte Adressen' },
  { id: 'forwarding', label: 'Weiterleitung & POP/IMAP' },
  { id: 'addons', label: 'Add-ons' },
  { id: 'chat', label: 'Chat & Meet' },
  { id: 'advanced', label: 'Erweitert' },
  { id: 'offline', label: 'Offline' },
  { id: 'themes', label: 'Designs' },
] as const;

export type SettingsTabId = typeof settingsTabs[number]['id'];
