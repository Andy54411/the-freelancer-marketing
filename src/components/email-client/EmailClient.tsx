'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { db } from '@/firebase/clients';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { EmailList, MemoizedEmailList } from './EmailList';
import { EmailViewer } from './EmailViewer';
import { EmailCompose } from './EmailCompose';
import type {
  EmailMessage,
  EmailFolder,
  EmailFilter,
  EmailCompose as EmailComposeType,
} from './types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
// useOptimizedGmail Hook entfernt

// Global Type Declaration für Performance Tracking
declare global {
  interface Window {
    gmailPerformanceTracker?: {
      trackLoadEvent: (event: any) => void;
      trackCacheEvent: (event: any) => void;
    };
  }
}

// Lokale Performance Tracking Funktion (ohne Server-Imports)
const setupGlobalPerformanceTracking = (userId: string) => {
  if (typeof window !== 'undefined') {
    window.gmailPerformanceTracker = {
      trackLoadEvent: (event: any) => {
        const storageKey = `gmail_performance_${userId}`;
        const stored = localStorage.getItem(storageKey);
        const history = stored ? JSON.parse(stored) : [];

        history.unshift({
          ...event,
          timestamp: new Date().toISOString(),
        });

        localStorage.setItem(storageKey, JSON.stringify(history.slice(0, 100)));
      },

      trackCacheEvent: (event: any) => {
        const storageKey = `gmail_cache_events_${userId}`;
        const stored = localStorage.getItem(storageKey);
        const events = stored ? JSON.parse(stored) : [];

        events.unshift({
          ...event,
          timestamp: new Date().toISOString(),
        });

        localStorage.setItem(storageKey, JSON.stringify(events.slice(0, 100)));
      },
    };
  }
};

interface EmailClientProps {
  companyId: string;
  initialFolder?: string;
  autoCompose?: boolean;
  className?: string;
}

export function EmailClient({
  companyId,
  initialFolder = 'inbox',
  autoCompose = false,
  className,
}: EmailClientProps) {
  const searchParams = useSearchParams();
  const searchQuery = searchParams?.get('search') || '';

  // State
  const [folders, setFolders] = useState<EmailFolder[]>([
    { id: 'inbox', name: 'Posteingang', type: 'inbox', count: 0, unreadCount: 0 },
    { id: 'sent', name: 'Gesendet', type: 'sent', count: 0, unreadCount: 0 },
    { id: 'drafts', name: 'Entwürfe', type: 'drafts', count: 0, unreadCount: 0 },
    { id: 'spam', name: 'Spam', type: 'spam', count: 0, unreadCount: 0 },
    { id: 'trash', name: 'Papierkorb', type: 'trash', count: 0, unreadCount: 0 },
    { id: 'starred', name: 'Favoriten', type: 'starred', count: 0, unreadCount: 0 },
    { id: 'archived', name: 'Archiv', type: 'archived', count: 0, unreadCount: 0 },
  ]);

  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [selectedFolder, setSelectedFolder] = useState(initialFolder);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeMode, setComposeMode] = useState<'new' | 'reply' | 'replyAll' | 'forward'>('new');
  const [replyToEmail, setReplyToEmail] = useState<EmailMessage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<EmailFilter>({
    search: searchQuery, // Initialize with search query from URL
  });
  const [authError, setAuthError] = useState<string | null>(null);
  const [requiresReauth, setRequiresReauth] = useState(false);

  // Vereinfachte Email State ohne Hook
  const [cachedEmails, setCachedEmails] = useState<EmailMessage[]>([]);
  const [cacheLoading, setCacheLoading] = useState(false);
  const [cacheError, setCacheError] = useState<string | null>(null);
  const [cacheSource, setCacheSource] = useState<'local' | 'api' | 'cache'>('local');
  const [newEmailsCount, setNewEmailsCount] = useState(0);
  const [cacheHitRatio, setCacheHitRatio] = useState(0);
  const [isInitialLoad, setIsInitialLoad] = useState(true); // Flag für ersten Ladevorgang

  const refreshCachedEmails = useCallback(
    async (forceRefresh = false) => {
      if (!companyId) {
        setCacheError('Keine Company-ID verfügbar');
        setCacheLoading(false);
        return;
      }

      setCacheLoading(true);
      setCacheError(null);

      try {
        // Lade E-Mails von der API
        const apiUrl = `/api/company/${companyId}/emails?folder=${selectedFolder}`;

        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          throw new Error(`API Error ${response.status}: ${errorText}`);
        }

        const data = await response.json();

        if (data.emails && Array.isArray(data.emails)) {
          // Sortiere E-Mails nach Datum (neueste zuerst)
          // WICHTIG: Verwende IMMER internalDate als primären Sort-Key + Email-ID als Tiebreaker
          const sortedEmails = data.emails.sort((a: any, b: any) => {
            const getTimestamp = (email: any) => {
              // PRIORITÄT 1: Gmail internalDate (unveränderlich!)
              if (email.internalDate && typeof email.internalDate === 'string') {
                return parseInt(email.internalDate);
              }
              // PRIORITÄT 2: Firestore Timestamp
              if (email.timestamp && email.timestamp._seconds) {
                return email.timestamp._seconds * 1000;
              }
              // FALLBACK 3: Date string
              if (email.date) {
                return new Date(email.date).getTime();
              }
              // FALLBACK 4: Number timestamp
              if (typeof email.timestamp === 'number') {
                // Wenn in Sekunden (< Jahr 2100), konvertiere zu Millisekunden
                return email.timestamp < 4102444800 ? email.timestamp * 1000 : email.timestamp;
              }
              return 0;
            };

            const timestampA = getTimestamp(a);
            const timestampB = getTimestamp(b);

            // Primärer Sort: Nach Timestamp (neueste zuerst)
            if (timestampB !== timestampA) {
              return timestampB - timestampA;
            }

            // Sekundärer Sort: Nach Email-ID (stabile Sortierung bei gleichem Timestamp!)
            return (b.id || '').localeCompare(a.id || '');
          });

          setCachedEmails(sortedEmails);
          setCacheSource('api');
          setNewEmailsCount(sortedEmails.length);
        } else {
          console.warn('⚠️ No emails in API response:', data);
          setCachedEmails([]);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Fehler beim Laden der E-Mails';
        setCacheError(errorMessage);

        // Check if it's a network error
        if (errorMessage.includes('Failed to fetch')) {
          setCacheError(
            'Netzwerkfehler: Bitte überprüfen Sie Ihre Internetverbindung und Gmail-Konfiguration'
          );
        }

        // NO localStorage fallback - always use fresh data from API
        // This prevents showing stale data after email actions like spam marking
        setCachedEmails([]);
        console.warn('⚠️ Email loading failed, cleared cache to prevent stale data');
      } finally {
        setCacheLoading(false);
      }
    },
    [companyId, selectedFolder]
  );

  // Auto-Polling: NUR beim ersten Laden, wenn keine E-Mails da sind
  useEffect(() => {
    if (isInitialLoad && cachedEmails.length === 0 && !cacheLoading) {
      const pollInterval = setInterval(() => {
        refreshCachedEmails(false);
      }, 2000); // Alle 2 Sekunden

      // Stop polling nach 30 Sekunden oder wenn E-Mails gefunden wurden
      const stopTimeout = setTimeout(() => {
        clearInterval(pollInterval);
        setIsInitialLoad(false); // Markiere als nicht mehr initial
      }, 30000);

      return () => {
        clearInterval(pollInterval);
        clearTimeout(stopTimeout);
      };
    }

    // Wenn E-Mails gefunden wurden, stop polling
    if (cachedEmails.length > 0 && isInitialLoad) {
      setIsInitialLoad(false);
    }

    return undefined;
  }, [cachedEmails.length, cacheLoading, isInitialLoad, refreshCachedEmails]);

  // Sync cached emails with component state
  useEffect(() => {
    // DEBUG: Zeige erste 3 Emails mit read-Status
    if (cachedEmails.length > 0) {
      const preview = cachedEmails.slice(0, 3).map(e => ({
        subject: e.subject?.substring(0, 20),
        read: e.read,
        id: e.id?.substring(0, 8),
      }));
    }

    // Apply search filter if present
    let filteredEmails = cachedEmails;
    if (filter.search && filter.search.trim()) {
      const searchLower = filter.search.toLowerCase();
      filteredEmails = cachedEmails.filter(
        email =>
          email.subject?.toLowerCase().includes(searchLower) ||
          email.body?.toLowerCase().includes(searchLower) ||
          email.from?.email?.toLowerCase().includes(searchLower) ||
          email.from?.name?.toLowerCase().includes(searchLower)
      );
    }

    setEmails(filteredEmails);

    // Nur loading beenden wenn wir nicht gerade laden
    if (!cacheLoading) {
      setIsLoading(false);
    }
  }, [cachedEmails, cacheLoading, filter.search]);

  // Performance Logging
  useEffect(() => {
    if (cacheSource && cacheHitRatio !== undefined) {
      if (newEmailsCount > 0) {
      }
    }
  }, [cacheSource, cacheHitRatio, newEmailsCount]);

  // 🔥 REAL-TIME: Direct Firestore Listener auf emailCache (HAUPTLÖSUNG)
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [lastActivity, setLastActivity] = useState<Date | null>(null);

  useEffect(() => {
    if (!companyId || !selectedFolder) {
      console.warn('⚠️ Direct email listener: No companyId or folder');
      return;
    }

    // DIREKTE Verbindung zur emailCache Collection
    const emailCacheRef = collection(db, 'companies', companyId, 'emailCache');
    // WICHTIG: Sortiere nach internalDate (Gmail Original), NICHT nach timestamp (Firestore Update-Zeit)!
    const emailQuery = query(emailCacheRef, orderBy('internalDate', 'desc'));

    const unsubscribe = onSnapshot(
      emailQuery,
      snapshot => {
        // DEBUG: Welche Dokumente haben sich geändert?
        const changes = snapshot.docChanges();
        if (changes.length > 0) {
          changes.forEach(change => {
            const data = change.doc.data();
          });
        } else {
        }

        setIsRealtimeConnected(true);
        setLastActivity(new Date());

        // Convert Firestore docs to Email objects
        const allEmails = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            // WICHTIG: Verwende IMMER internalDate (Original Gmail Timestamp)
            // NICHT das Firestore timestamp, das sich beim Update ändern kann!
            timestamp: data.internalDate
              ? parseInt(data.internalDate)
              : data.timestamp?._seconds
                ? data.timestamp._seconds * 1000
                : Date.now(),
          } as unknown as EmailMessage;
        });

        // Filter by selected folder
        const filteredEmails = allEmails.filter(email => {
          if (selectedFolder === 'inbox')
            return !email.labels?.includes('TRASH') && !email.labels?.includes('SENT');
          if (selectedFolder === 'sent') return email.labels?.includes('SENT');
          if (selectedFolder === 'trash') return email.labels?.includes('TRASH');
          if (selectedFolder === 'drafts') return email.labels?.includes('DRAFT');
          if (selectedFolder === 'spam') return email.labels?.includes('SPAM');
          if (selectedFolder === 'starred') return email.labels?.includes('STARRED');
          if (selectedFolder === 'archived') return email.labels?.includes('ARCHIVED');
          return true;
        });

        setCachedEmails(filteredEmails);
        setCacheSource('local');
        setNewEmailsCount(filteredEmails.length);
        setCacheLoading(false);
        setIsInitialLoad(false);
      },
      error => {
        console.error('❌ Direct email listener error:', error);
        setIsRealtimeConnected(false);
        setCacheLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [companyId, selectedFolder]);

  // 🔥 BACKUP: Gmail Push Notifications Listener (Fallback)
  useEffect(() => {
    // Hör auf neue Gmail Events in der SUBCOLLECTION
    const realtimeQuery = query(
      collection(db, `companies/${companyId}/realtime_events`),
      where('event_type', '==', 'new_emails'),
      orderBy('timestamp', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(
      realtimeQuery,
      snapshot => {
        if (!snapshot.empty) {
          const latestEvent = snapshot.docs[0].data();

          if (latestEvent.data?.userEmail && latestEvent.data.userEmail.includes(companyId)) {
            setLastActivity(new Date());
            // Der direkte emailCache Listener updated bereits automatisch
          }
        }
      },
      error => {
        console.error('❌ Real-time listener error:', error);
        setIsRealtimeConnected(false);
      }
    );

    return () => unsubscribe();
  }, [companyId]);

  /*
  OLD REALTIME CODE REMOVED
  const { isConnected: isRealtimeConnected, lastActivity } = useRealtimeEmails({
    companyId,
    onNewEmails: () => {
      console.log('🔥 REAL-TIME EVENT RECEIVED: Triggering force refresh of emails!');
      console.log(' Real-time: Neue E-Mails empfangen - aktualisiere sofort');
      
      // Force a complete refresh - clear current emails first
      setEmails([]);
      setIsLoading(true);
      
      loadEmails(true).then(() => {
        console.log('✅ Real-time email refresh completed');
        // Force UI update by triggering a re-render
        setTimeout(() => {
          console.log('🎯 UI refresh triggered after email load');
        }, 100);
      }).catch((error) => {
        console.error('❌ Real-time email refresh failed:', error);
        setIsLoading(false);
      });
    },
    onEmailsUpdated: (emailData) => {
      console.log('🚀 WEBHOOK DIRECT UPDATE: E-Mails direkt vom Webhook erhalten!');
       
      // DIREKT die E-Mail-Daten vom Webhook verwenden - KEINE API-Calls nötig!
      if (emailData.emails && Array.isArray(emailData.emails)) {
        console.log('✅ WEBHOOK: E-Mails direkt in UI übernommen - SOFORT verfügbar!');
        setEmails([...emailData.emails]);
        setIsLoading(false);
        
        // Force UI refresh
        setTimeout(() => {
          console.log('🎯 WEBHOOK: UI-Update abgeschlossen');
        }, 50);
      } else {
  OLD REALTIME CODE REMOVED - END
  */

  // Performance Tracking Setup
  useEffect(() => {
    setupGlobalPerformanceTracking(companyId);
  }, [companyId]);

  // Update filter when search query changes
  useEffect(() => {
    if (searchQuery) {
      setFilter(prev => ({ ...prev, search: searchQuery }));
    }
  }, [searchQuery]);

  // Initial load - einmalig beim Start, dann nur über Webhooks
  useEffect(() => {
    // Nur einmal laden beim ersten Start der Komponente

    setIsLoading(true);
    refreshCachedEmails(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, selectedFolder]);

  // Window Focus Detection - aktualisiere beim Zurückkehren zur App
  useEffect(() => {
    let lastFocusTime = Date.now();

    const handleFocus = () => {
      const now = Date.now();
      const timeSinceLastFocus = now - lastFocusTime;

      // DEAKTIVIERT: Window focus refresh - NUR über Webhooks!
      // if (timeSinceLastFocus > 120000) {
      //   console.log('👀 App focus detected after long absence - refreshing emails');
      //   loadEmails(true);
      // }

      lastFocusTime = now;
    };

    const handleBlur = () => {
      lastFocusTime = Date.now();
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // Keyboard shortcuts für E-Mail Refresh
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // F5 oder Cmd/Ctrl+R für Refresh
      if (event.key === 'F5' || ((event.metaKey || event.ctrlKey) && event.key === 'r')) {
        event.preventDefault();

        handleRefresh();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-open compose dialog if requested
  useEffect(() => {
    if (autoCompose) {
      setIsComposeOpen(true);
      setComposeMode('new');
      setReplyToEmail(null);
    }
  }, [autoCompose]);

  // 🚀 OPTIMIZED: Use Smart Cache statt direkter API-Calls
  const loadEmails = async (forceRefresh = false) => {
    try {
      // Use optimized cache service
      await refreshCachedEmails(forceRefresh);

      // Update folder counts (approximate)
      setFolders(prev =>
        prev.map(folder =>
          folder.id === selectedFolder
            ? {
                ...folder,
                count: cachedEmails.length,
                unreadCount: cachedEmails.filter(e => !e.read).length,
              }
            : folder
        )
      );
    } catch (error) {
      console.error('Smart Cache Load Fehler:', error);
      setAuthError(error instanceof Error ? error.message : 'Fehler beim Laden der E-Mails');
    } finally {
      setIsLoading(false);
    }
  };

  // Manual refresh function
  const handleRefresh = () => {
    loadEmails(true);
  };

  // Debug function für Webhook-Testing (nur für Development)
  const testWebhookRefresh = () => {
    loadEmails(true).then(() => {});
  };

  // Expose test function to window for browser console testing
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).testWebhookRefresh = testWebhookRefresh;
      (window as any).emailClientDebug = {
        testRefresh: testWebhookRefresh,
        loadEmails: () => loadEmails(true),
        isConnected: isRealtimeConnected,
        lastActivity: lastActivity,
        companyId: companyId,
      };
    }
  }, []); // Removed realtime dependencies

  // Event handlers
  const handleFolderSelect = (folderId: string) => {
    setSelectedFolder(folderId);
    setSelectedEmail(null);
    setSelectedEmails([]);

    // Load emails for new folder
    setIsLoading(true);
    refreshCachedEmails(false);
  };

  const handleEmailSelect = useCallback((emailId: string) => {
    setSelectedEmails(prev =>
      prev.includes(emailId) ? prev.filter(id => id !== emailId) : [...prev, emailId]
    );
  }, []);

  const handleSelectAll = useCallback(
    (selected: boolean) => {
      setSelectedEmails(selected ? emails.map(e => e.id) : []);
    },
    [emails]
  );

  // WICHTIG: handleMarkAsRead muss VOR handleEmailClick definiert werden!
  const handleMarkAsRead = useCallback(
    async (emailIds: string[], read: boolean) => {
      try {
        // WICHTIG: Wir updaten NUR das 'read' Feld, NICHT das 'timestamp'!
        // Das verhindert, dass Emails beim Lesen neu sortiert werden
        const batch = writeBatch(db);

        emailIds.forEach(emailId => {
          const emailRef = doc(db, 'companies', companyId, 'emailCache', emailId);

          // NUR das read-Feld updaten - kein merge, kein timestamp update
          batch.update(emailRef, { read: read });
        });

        await batch.commit();

        // DEBUG: Verify the update actually happened in Firestore
        const firstEmailId = emailIds[0];
        const verifyRef = doc(db, 'companies', companyId, 'emailCache', firstEmailId);
        const verifyDoc = await getDoc(verifyRef);
        if (verifyDoc.exists()) {
        }

        // Auswahl aufheben nach erfolgreichem Markieren (nur bei Mehrfachauswahl)
        // WICHTIG: Verzögere das Aufheben, damit der Firestore-Listener zuerst die Änderung erhält
        if (emailIds.length > 1) {
          setTimeout(() => {
            setSelectedEmails([]);
          }, 500); // 500ms Verzögerung
        }

        // NICHT den local state updaten! Der Firestore Listener macht das automatisch
        // und behält die korrekte Sortierung bei
      } catch (error) {
        console.error('❌ [handleMarkAsRead] Error:', error);
      }
    },
    [companyId]
  );

  const handleEmailClick = useCallback(
    async (email: EmailMessage) => {
      setSelectedEmail(email);

      // Mark as read if unread
      if (!email.read) {
        await handleMarkAsRead([email.id], true);
      }
    },
    [handleMarkAsRead]
  );

  const handleCompose = (
    mode: 'new' | 'reply' | 'replyAll' | 'forward' = 'new',
    email?: EmailMessage
  ) => {
    setComposeMode(mode);
    setReplyToEmail(email || null);
    setIsComposeOpen(true);
  };

  const handleSendEmail = async (emailData: EmailComposeType) => {
    try {
      if (!companyId) {
        throw new Error('Company ID missing');
      }

      // Convert File attachments to format accepted by API
      const processedAttachments = emailData.attachments
        ? await Promise.all(
            emailData.attachments.map(async file => {
              const arrayBuffer = await file.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              return {
                filename: file.name,
                content: buffer.toString('base64'),
                mimeType: file.type || 'application/octet-stream',
              };
            })
          )
        : [];

      const response = await fetch(`/api/company/${companyId}/emails/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emailData.to.split(',').map(email => email.trim()),
          cc: emailData.cc ? emailData.cc.split(',').map(email => email.trim()) : undefined,
          bcc: emailData.bcc ? emailData.bcc.split(',').map(email => email.trim()) : undefined,
          subject: emailData.subject,
          body: emailData.body,
          htmlBody: emailData.body.replace(/\n/g, '<br>'), // Simple HTML conversion
          attachments: processedAttachments,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.code === 'GMAIL_AUTH_ERROR') {
          throw new Error('Gmail-Authentifizierung abgelaufen. Bitte Gmail erneut verbinden.');
        }
        throw new Error(result.error || 'Fehler beim Senden der E-Mail');
      }

      // Refresh emails to show sent message
      await loadEmails();
      setIsComposeOpen(false);

      // Show success message
      toast.success('E-Mail erfolgreich gesendet');
    } catch (error) {
      console.error('Fehler beim Senden:', error);
      toast.error(error instanceof Error ? error.message : 'Fehler beim Senden der E-Mail');
      throw error;
    }
  };

  const handleSaveDraft = async (emailData: EmailComposeType) => {
    try {
      // TODO: Implement new draft email API

      return;
      const response = await fetch(`/api/company/${companyId}/emails/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailData),
      });

      if (!response.ok) {
        throw new Error('Fehler beim Speichern des Entwurfs');
      }
    } catch (error) {
      console.error('Fehler beim Speichern des Entwurfs:', error);
      throw error;
    }
  };

  const handleStarEmail = useCallback(
    async (emailId: string) => {
      try {
        const email = emails.find(e => e.id === emailId);
        if (!email) return;

        // Optimistic UI update
        const newStarredState = !email.starred;
        setEmails(prev =>
          prev.map(e => (e.id === emailId ? { ...e, starred: newStarredState } : e))
        );

        if (selectedEmail?.id === emailId) {
          setSelectedEmail(prev => (prev ? { ...prev, starred: newStarredState } : null));
        }

        // API call
        const response = await fetch(`/api/company/${companyId}/emails/${emailId}/star`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ starred: newStarredState }),
        });

        if (!response.ok) {
          // Revert on failure
          setEmails(prev =>
            prev.map(e => (e.id === emailId ? { ...e, starred: !newStarredState } : e))
          );
          if (selectedEmail?.id === emailId) {
            setSelectedEmail(prev => (prev ? { ...prev, starred: !newStarredState } : null));
          }
          toast.error('Fehler beim Markieren der E-Mail');
        } else {
          toast.success(newStarredState ? 'Als Favorit markiert' : 'Favorit entfernt');
          // Reload emails to ensure correct filtering (especially for starred folder)
          await loadEmails();
        }
      } catch (error) {
        console.error('Fehler beim Markieren mit Stern:', error);
        toast.error('Fehler beim Markieren der E-Mail');
      }
    },
    [emails, companyId, selectedEmail, loadEmails]
  );

  const handleMarkAsSpam = useCallback(
    async (emailId: string, isSpam: boolean = true) => {
      try {
        const email = emails.find(e => e.id === emailId);
        if (!email) return;

        // Optimistic UI update
        setEmails(prev => prev.filter(e => e.id !== emailId));
        if (selectedEmail?.id === emailId) {
          setSelectedEmail(null);
        }

        // API call
        const response = await fetch(`/api/company/${companyId}/emails/${emailId}/spam`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ spam: isSpam }),
        });

        if (!response.ok) {
          // Revert on failure
          setEmails(prev => [...prev, email]);
          toast.error('Fehler beim Markieren als Spam');
        } else {
          toast.success(isSpam ? 'Als Spam markiert' : 'Spam-Markierung entfernt');

          // Clear localStorage cache to prevent stale data
          try {
            localStorage.removeItem(`gmail_cache_${companyId}_${selectedFolder}`);
            console.log('🗑️ Cleared localStorage cache after spam action');
          } catch (e) {
            console.warn('Could not clear localStorage:', e);
          }

          // Reload emails to ensure correct filtering
          await loadEmails();
        }
      } catch (error) {
        console.error('Fehler beim Markieren als Spam:', error);
        toast.error('Fehler beim Markieren als Spam');
      }
    },
    [emails, companyId, selectedEmail, selectedFolder, loadEmails]
  );

  const handleArchiveEmails = useCallback(
    async (emailIds: string[]) => {
      try {
        // Archive emails one by one
        for (const emailId of emailIds) {
          const email = emails.find(e => e.id === emailId);
          if (!email) continue;

          // Optimistic UI update
          setEmails(prev => prev.filter(e => e.id !== emailId));
          if (selectedEmail?.id === emailId) {
            setSelectedEmail(null);
          }

          // API call
          const response = await fetch(`/api/company/${companyId}/emails/${emailId}/archive`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ archived: true }),
          });

          if (!response.ok) {
            // Revert on failure
            setEmails(prev => [...prev, email]);
            toast.error('Fehler beim Archivieren');
          }
        }

        // Clear selection and reload emails
        setSelectedEmails([]);
        toast.success(
          emailIds.length === 1 ? 'Archiviert' : `${emailIds.length} E-Mails archiviert`
        );
        await loadEmails();
      } catch (error) {
        console.error('Fehler beim Archivieren:', error);
        toast.error('Fehler beim Archivieren');
      }
    },
    [emails, companyId, selectedEmail, loadEmails]
  );

  const handleDeleteEmails = useCallback(
    async (emailIds: string[]) => {
      try {
        // Move emails to trash one by one
        for (const emailId of emailIds) {
          const email = emails.find(e => e.id === emailId);
          if (!email) continue;

          // Optimistic UI update
          setEmails(prev => prev.filter(e => e.id !== emailId));
          if (selectedEmail?.id === emailId) {
            setSelectedEmail(null);
          }

          // API call
          const response = await fetch(`/api/company/${companyId}/emails/${emailId}/trash`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ trash: true }),
          });

          if (!response.ok) {
            // Revert on failure
            setEmails(prev => [...prev, email]);
            toast.error('Fehler beim Verschieben in den Papierkorb');
          }
        }

        // Clear selection and reload emails
        setSelectedEmails([]);
        toast.success(
          emailIds.length === 1
            ? 'In Papierkorb verschoben'
            : `${emailIds.length} E-Mails in Papierkorb verschoben`
        );
        await loadEmails();
      } catch (error) {
        console.error('Fehler beim Löschen:', error);
        toast.error('Fehler beim Verschieben in den Papierkorb');
      }
    },
    [emails, companyId, selectedEmail, loadEmails]
  );

  // Handler für Gmail Neu-Authentifizierung
  const handleReconnectGmail = async () => {
    try {
      setAuthError(null);
      setRequiresReauth(false);

      // Redirect zu Gmail OAuth
      // Get Gmail connect URL from new API
      const connectResponse = await fetch(`/api/gmail/connect?uid=${companyId}`);
      const connectData = await connectResponse.json();
      if (connectData.authUrl) {
        window.location.href = connectData.authUrl;
      }
    } catch (error) {
      console.error('Fehler bei Gmail-Neuverbindung:', error);
      setAuthError('Fehler bei der Neuverbindung. Bitte versuchen Sie es erneut.');
    }
  };

  // Zeige Authentifizierungs-Fehler UI
  if (requiresReauth) {
    return (
      <div className={cn('h-full flex items-center justify-center bg-gray-50', className)}>
        <Card className="w-full max-w-md p-6 text-center">
          <div className="mb-4">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Gmail-Authentifizierung erforderlich
            </h3>
            <p className="text-gray-600 mb-6">
              {authError ||
                'Ihre Gmail-Verbindung ist abgelaufen. Bitte melden Sie sich erneut an, um E-Mails zu laden.'}
            </p>
            <div className="space-y-3">
              <button
                onClick={handleReconnectGmail}
                className="w-full bg-[#14ad9f] hover:bg-[#129488] text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Gmail neu verbinden
              </button>
              <button
                onClick={() => {
                  setRequiresReauth(false);
                  setAuthError(null);
                  loadEmails();
                }}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Ohne Gmail fortfahren
              </button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Zeige Loading Screen während Initial Polling (nur wenn keine E-Mails da sind)
  if (isInitialLoad && cachedEmails.length === 0) {
    return (
      <div className={cn('h-screen w-screen flex items-center justify-center bg-white', className)}>
        <div className="text-center">
          {/* CSS Spinner Animation */}
          <div className="inline-block w-16 h-16 border-4 border-gray-200 border-t-[#14ad9f] rounded-full animate-spin"></div>
          <p className="mt-6 text-gray-600 text-lg font-medium">E-Mails werden geladen...</p>
          <p className="mt-2 text-gray-400 text-sm">Dies kann bis zu 30 Sekunden dauern</p>
        </div>
      </div>
    );
  }

  // Error Display
  if (cacheError) {
    return (
      <div className={cn('h-screen w-screen flex items-center justify-center bg-white', className)}>
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Fehler beim Laden der E-Mails
          </h3>
          <p className="text-gray-600 mb-6">{cacheError}</p>
          <div className="space-y-3">
            <button
              onClick={() => {
                setCacheError(null);
                handleRefresh();
              }}
              className="w-full px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              Erneut versuchen
            </button>
            <button
              onClick={() =>
                (window.location.href = `/dashboard/company/${companyId}/settings/integrations`)
              }
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Gmail-Einstellungen prüfen
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('h-screen w-screen flex bg-white', className)}>
      {/* Email List - Fixed Width */}
      <div
        className={cn(
          'bg-white flex flex-col overflow-hidden border-r border-gray-200',
          selectedEmail ? 'w-80' : 'flex-1'
        )}
      >
        <MemoizedEmailList
          emails={emails}
          selectedEmails={selectedEmails}
          onSelectEmail={handleEmailSelect}
          onSelectAll={handleSelectAll}
          onEmailClick={handleEmailClick}
          onStarEmail={handleStarEmail}
          onArchiveEmails={handleArchiveEmails}
          onDeleteEmails={handleDeleteEmails}
          onMarkAsRead={handleMarkAsRead}
          onMarkAsSpam={handleMarkAsSpam}
          filter={filter}
          onFilterChange={setFilter}
          onSync={handleRefresh}
          isLoading={isLoading}
          isCompact={!!selectedEmail}
          realtimeStatus={{
            connected: isRealtimeConnected,
            lastActivity: lastActivity,
          }}
        />
      </div>

      {/* Email Viewer - Takes Remaining Space */}
      {selectedEmail && (
        <div className="flex-1 bg-white overflow-hidden">
          <EmailViewer
            email={selectedEmail}
            onClose={() => setSelectedEmail(null)}
            onReply={email => handleCompose('reply', email)}
            onReplyAll={email => handleCompose('replyAll', email)}
            onForward={email => handleCompose('forward', email)}
            onArchive={emailId => handleArchiveEmails([emailId])}
            onDelete={emailId => handleDeleteEmails([emailId])}
            onStar={handleStarEmail}
            onMarkAsRead={(emailId, read) => handleMarkAsRead([emailId], read)}
            onMarkAsSpam={handleMarkAsSpam}
          />
        </div>
      )}

      {/* Compose Modal */}
      <EmailCompose
        isOpen={isComposeOpen}
        onClose={() => {
          setIsComposeOpen(false);
          // Clear URL parameter if it was from autoCompose
          if (autoCompose) {
            const url = new URL(window.location.href);
            url.searchParams.delete('compose');
            window.history.replaceState({}, '', url.toString());
          }
        }}
        onSend={handleSendEmail}
        onSaveDraft={handleSaveDraft}
        companyId={companyId}
        replyTo={
          composeMode === 'reply' || composeMode === 'replyAll'
            ? replyToEmail || undefined
            : undefined
        }
        forwardEmail={composeMode === 'forward' ? replyToEmail || undefined : undefined}
      />
    </div>
  );
}
