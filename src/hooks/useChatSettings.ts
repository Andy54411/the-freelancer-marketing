'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Chat-Einstellungen Interface
 * Alle Einstellungen die im ChatSettingsModal konfiguriert werden können
 */
export interface ChatSettings {
  // Benachrichtigungen
  desktopNotifications: boolean;
  reactionNotifications: boolean;
  notificationSound: string;
  emailNotifications: boolean;
  incomingCallNotifications: boolean;
  
  // Medien
  autoPlayGifs: boolean;
  autoPlayVideos: boolean;
  showLinkPreviews: boolean;
  imageQuality: 'low' | 'medium' | 'high';
  
  // Darstellung
  compactMode: boolean;
  showAvatars: boolean;
  fontSize: 'small' | 'medium' | 'large';
  
  // Barrierefreiheit
  reduceMotion: boolean;
  highContrast: boolean;
  screenReaderOptimized: boolean;
  
  // Zugriff
  allowDirectMessages: 'everyone' | 'contacts' | 'nobody';
  allowSpaceInvites: 'everyone' | 'contacts' | 'nobody';
  showOnlineStatus: boolean;
  
  // Datenschutz
  readReceipts: boolean;
  typingIndicators: boolean;
  sharePresence: boolean;
  
  // Meet
  autoJoinAudio: boolean;
  autoJoinVideo: boolean;
  
  // Bitte nicht stören
  dndEnabled: boolean;
  dndSchedule: {
    weekdayStart: string;
    weekdayEnd: string;
    weekendStart: string;
    weekendEnd: string;
    weekdayDays: string[];
    weekendDays: string[];
  };
  dndTimezoneSync: boolean;
}

/**
 * Standard-Einstellungen
 */
export const defaultChatSettings: ChatSettings = {
  desktopNotifications: true,
  reactionNotifications: true,
  notificationSound: 'default',
  emailNotifications: true,
  incomingCallNotifications: true,
  autoPlayGifs: true,
  autoPlayVideos: false,
  showLinkPreviews: true,
  imageQuality: 'high',
  compactMode: false,
  showAvatars: true,
  fontSize: 'medium',
  reduceMotion: false,
  highContrast: false,
  screenReaderOptimized: false,
  allowDirectMessages: 'everyone',
  allowSpaceInvites: 'everyone',
  showOnlineStatus: true,
  readReceipts: true,
  typingIndicators: true,
  sharePresence: true,
  autoJoinAudio: true,
  autoJoinVideo: false,
  dndEnabled: false,
  dndSchedule: {
    weekdayStart: '19:00',
    weekdayEnd: '07:00',
    weekendStart: '00:00',
    weekendEnd: '00:00',
    weekdayDays: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr'],
    weekendDays: ['Sa', 'So'],
  },
  dndTimezoneSync: true,
};

/**
 * Notification Sound URLs
 * Falls die Dateien nicht existieren, wird Web Audio API verwendet
 */
const NOTIFICATION_SOUNDS: Record<string, string> = {
  default: '/sounds/chat-notification.mp3',
  chime: '/sounds/chat-chime.mp3',
  ping: '/sounds/chat-ping.mp3',
  pop: '/sounds/chat-pop.mp3',
  none: '',
};

/**
 * Web Audio API Fallback für Benachrichtigungstöne
 * Generiert synthetische Töne wenn keine Sound-Dateien vorhanden
 */
function playWebAudioNotification(type: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof window.AudioContext }).webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // Verschiedene Töne je nach Typ
    switch (type) {
      case 'chime':
        oscillator.frequency.setValueAtTime(880, ctx.currentTime); // A5
        oscillator.frequency.setValueAtTime(1047, ctx.currentTime + 0.1); // C6
        oscillator.type = 'sine';
        break;
      case 'ping':
        oscillator.frequency.setValueAtTime(1200, ctx.currentTime);
        oscillator.type = 'sine';
        break;
      case 'pop':
        oscillator.frequency.setValueAtTime(400, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.1);
        oscillator.type = 'sine';
        break;
      default:
        // Standard: Zweiklang wie Google Chat
        oscillator.frequency.setValueAtTime(523, ctx.currentTime); // C5
        oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.1); // E5
        oscillator.type = 'sine';
    }
    
    // Sanfter Fade-Out
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.3);
    
    // Cleanup nach dem Abspielen
    setTimeout(() => {
      ctx.close();
    }, 500);
  } catch {
    // Web Audio API nicht verfügbar - ignorieren
  }
}

interface UseChatSettingsOptions {
  email?: string;
  enabled?: boolean;
}

interface UseChatSettingsReturn {
  settings: ChatSettings;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  
  // Einstellungen aktualisieren
  updateSetting: <K extends keyof ChatSettings>(key: K, value: ChatSettings[K]) => Promise<void>;
  updateSettings: (updates: Partial<ChatSettings>) => Promise<void>;
  
  // Benachrichtigungen
  playNotificationSound: () => void;
  showDesktopNotification: (title: string, body: string, icon?: string) => void;
  canShowNotifications: () => boolean;
  requestNotificationPermission: () => Promise<boolean>;
  
  // Status-Check
  isDndActive: () => boolean;
  shouldShowPresence: () => boolean;
  shouldSendReadReceipts: () => boolean;
  shouldShowTypingIndicator: () => boolean;
  
  // UI-Helpers
  getFontSizeClass: () => string;
  getImageQualityParams: () => { width: number; quality: number };
  
  // Neu laden
  reload: () => Promise<void>;
}

/**
 * Hook für Chat-Einstellungen
 * Lädt, speichert und verwaltet alle Chat-bezogenen Einstellungen
 */
export function useChatSettings({ 
  email, 
  enabled = true 
}: UseChatSettingsOptions = {}): UseChatSettingsReturn {
  const [settings, setSettings] = useState<ChatSettings>(defaultChatSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Audio-Referenz für Benachrichtigungstöne
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Einstellungen laden
  const loadSettings = useCallback(async () => {
    if (!email || !enabled) {
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(
        `/api/webmail/chat/settings?email=${encodeURIComponent(email)}`
      );
      const data = await response.json();
      
      if (data.success && data.settings) {
        setSettings({ ...defaultChatSettings, ...data.settings });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Einstellungen');
    } finally {
      setIsLoading(false);
    }
  }, [email, enabled]);
  
  // Initial laden
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);
  
  // Audio-Element für Benachrichtigungstöne initialisieren
  useEffect(() => {
    if (typeof window !== 'undefined' && !audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.volume = 0.5;
    }
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);
  
  // Einzelne Einstellung aktualisieren
  const updateSetting = useCallback(async <K extends keyof ChatSettings>(
    key: K, 
    value: ChatSettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    
    if (!email) return;
    
    try {
      setIsSaving(true);
      await fetch('/api/webmail/chat/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, settings: newSettings }),
      });
    } catch {
      // Fehler stillschweigend ignorieren, lokaler State bleibt
    } finally {
      setIsSaving(false);
    }
  }, [email, settings]);
  
  // Mehrere Einstellungen aktualisieren
  const updateSettings = useCallback(async (updates: Partial<ChatSettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    
    if (!email) return;
    
    try {
      setIsSaving(true);
      await fetch('/api/webmail/chat/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, settings: newSettings }),
      });
    } catch {
      // Fehler stillschweigend ignorieren
    } finally {
      setIsSaving(false);
    }
  }, [email, settings]);
  
  // Prüfen ob DND aktiv ist
  const isDndActiveCheck = useCallback(() => {
    if (!settings.dndEnabled) return false;
    
    const now = new Date();
    const currentDay = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][now.getDay()];
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    // Prüfen ob heute ein Wochenendtag ist
    const isWeekend = settings.dndSchedule.weekendDays.includes(currentDay);
    
    if (isWeekend) {
      const { weekendStart, weekendEnd } = settings.dndSchedule;
      if (weekendStart === '00:00' && weekendEnd === '00:00') {
        // Ganztägig DND am Wochenende
        return true;
      }
      return currentTime >= weekendStart || currentTime < weekendEnd;
    } else {
      const { weekdayStart, weekdayEnd } = settings.dndSchedule;
      // DND von weekdayStart bis weekdayEnd (kann über Mitternacht gehen)
      if (weekdayStart > weekdayEnd) {
        // Über Mitternacht: 19:00 - 07:00
        return currentTime >= weekdayStart || currentTime < weekdayEnd;
      }
      return currentTime >= weekdayStart && currentTime < weekdayEnd;
    }
  }, [settings.dndEnabled, settings.dndSchedule]);
  
  // Benachrichtigungston abspielen
  const playNotificationSound = useCallback(() => {
    if (settings.notificationSound === 'none') return;
    
    // Prüfen ob DND aktiv ist
    if (isDndActiveCheck()) return;
    
    const soundUrl = NOTIFICATION_SOUNDS[settings.notificationSound] || NOTIFICATION_SOUNDS.default;
    
    // Versuche zuerst Audio-Datei abzuspielen
    if (soundUrl && audioRef.current) {
      audioRef.current.src = soundUrl;
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Audio-Datei nicht gefunden oder blockiert - Web Audio API als Fallback
        playWebAudioNotification(settings.notificationSound);
      });
    } else {
      // Kein Audio-Element - Web Audio API verwenden
      playWebAudioNotification(settings.notificationSound);
    }
  }, [settings.notificationSound, isDndActiveCheck]);
  
  // Desktop-Benachrichtigung anzeigen
  const showDesktopNotification = useCallback((
    title: string, 
    body: string, 
    icon?: string
  ) => {
    if (!settings.desktopNotifications) return;
    if (isDndActiveCheck()) return;
    
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: icon || '/images/taskilo-icon.png',
        tag: 'taskilo-chat',
      });
      
      // Sound abspielen wenn aktiviert
      playNotificationSound();
    }
  }, [settings.desktopNotifications, isDndActiveCheck, playNotificationSound]);
  
  // Prüfen ob Benachrichtigungen erlaubt sind
  const canShowNotifications = useCallback(() => {
    if (typeof window === 'undefined') return false;
    if (!('Notification' in window)) return false;
    return Notification.permission === 'granted';
  }, []);
  
  // Benachrichtigungsberechtigung anfordern
  const requestNotificationPermission = useCallback(async () => {
    if (typeof window === 'undefined') return false;
    if (!('Notification' in window)) return false;
    
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }, []);
  
  // Status-Checks
  const shouldShowPresence = useCallback(() => {
    return settings.sharePresence && settings.showOnlineStatus;
  }, [settings.sharePresence, settings.showOnlineStatus]);
  
  const shouldSendReadReceipts = useCallback(() => {
    return settings.readReceipts;
  }, [settings.readReceipts]);
  
  const shouldShowTypingIndicator = useCallback(() => {
    return settings.typingIndicators;
  }, [settings.typingIndicators]);
  
  // UI-Helpers
  const getFontSizeClass = useCallback(() => {
    switch (settings.fontSize) {
      case 'small': return 'text-xs';
      case 'large': return 'text-base';
      default: return 'text-sm';
    }
  }, [settings.fontSize]);
  
  const getImageQualityParams = useCallback(() => {
    switch (settings.imageQuality) {
      case 'low': return { width: 400, quality: 60 };
      case 'medium': return { width: 800, quality: 75 };
      default: return { width: 1200, quality: 90 };
    }
  }, [settings.imageQuality]);
  
  return {
    settings,
    isLoading,
    isSaving,
    error,
    updateSetting,
    updateSettings,
    playNotificationSound,
    showDesktopNotification,
    canShowNotifications,
    requestNotificationPermission,
    isDndActive: isDndActiveCheck,
    shouldShowPresence,
    shouldSendReadReceipts,
    shouldShowTypingIndicator,
    getFontSizeClass,
    getImageQualityParams,
    reload: loadSettings,
  };
}

/**
 * Kontext-Provider für globale Chat-Einstellungen
 */
export { defaultChatSettings as DEFAULT_CHAT_SETTINGS };
