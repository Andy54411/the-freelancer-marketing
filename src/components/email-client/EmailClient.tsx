'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { db } from '@/firebase/clients';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { EmailList } from './EmailList';
import { EmailViewer } from './EmailViewer';
import { EmailCompose } from './EmailCompose';
import type { 
  EmailMessage, 
  EmailFolder, 
  EmailFilter,
  EmailCompose as EmailComposeType
} from './types';
import { cn } from '@/lib/utils';
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
          timestamp: new Date().toISOString()
        });
        
        localStorage.setItem(storageKey, JSON.stringify(history.slice(0, 100)));
      },
      
      trackCacheEvent: (event: any) => {
        const storageKey = `gmail_cache_events_${userId}`;
        const stored = localStorage.getItem(storageKey);
        const events = stored ? JSON.parse(stored) : [];
        
        events.unshift({
          ...event,
          timestamp: new Date().toISOString()
        });
        
        localStorage.setItem(storageKey, JSON.stringify(events.slice(0, 100)));
      }
    };
  }
};

interface EmailClientProps {
  companyId: string;
  initialFolder?: string;
  autoCompose?: boolean;
  className?: string;
}

export function EmailClient({ companyId, initialFolder = 'inbox', autoCompose = false, className }: EmailClientProps) {
  // State
  const [folders, setFolders] = useState<EmailFolder[]>([
    { id: 'inbox', name: 'Posteingang', type: 'inbox', count: 0, unreadCount: 0 },
    { id: 'sent', name: 'Gesendet', type: 'sent', count: 0, unreadCount: 0 },
    { id: 'drafts', name: 'Entwürfe', type: 'drafts', count: 0, unreadCount: 0 },
    { id: 'spam', name: 'Spam', type: 'spam', count: 0, unreadCount: 0 },
    { id: 'trash', name: 'Papierkorb', type: 'trash', count: 0, unreadCount: 0 }
  ]);
  
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [selectedFolder, setSelectedFolder] = useState(initialFolder);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeMode, setComposeMode] = useState<'new' | 'reply' | 'replyAll' | 'forward'>('new');
  const [replyToEmail, setReplyToEmail] = useState<EmailMessage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<EmailFilter>({});
  const [authError, setAuthError] = useState<string | null>(null);
  const [requiresReauth, setRequiresReauth] = useState(false);

  // Vereinfachte Email State ohne Hook
  const [cachedEmails, setCachedEmails] = useState<EmailMessage[]>([]);
  const [cacheLoading, setCacheLoading] = useState(false);
  const [cacheError, setCacheError] = useState<string | null>(null);
  const [cacheSource, setCacheSource] = useState<'local' | 'api' | 'cache'>('local');
  const [newEmailsCount, setNewEmailsCount] = useState(0);
  const [cacheHitRatio, setCacheHitRatio] = useState(0);
  
  const refreshCachedEmails = useCallback(async (forceRefresh = false) => {
    console.log('🔄 Loading emails from API...', { forceRefresh, companyId, selectedFolder });
    
    setCacheLoading(true);
    setCacheError(null);
    
    try {
      // Lade E-Mails von der API
      const response = await fetch(`/api/company/${companyId}/emails?folder=${selectedFolder}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.emails && Array.isArray(data.emails)) {
        console.log(`✅ Loaded ${data.emails.length} emails from API`);
        
        // Sortiere E-Mails nach Datum (neueste zuerst)
        const sortedEmails = data.emails.sort((a: any, b: any) => {
          const getTimestamp = (email: any) => {
            // Firestore Timestamp (in Sekunden, konvertiere zu Millisekunden)
            if (email.timestamp && email.timestamp._seconds) {
              return email.timestamp._seconds * 1000;
            }
            // Gmail internalDate (string of milliseconds)
            if (email.internalDate && typeof email.internalDate === 'string') {
              return parseInt(email.internalDate);
            }
            // Date string
            if (email.date) {
              return new Date(email.date).getTime();
            }
            // Number timestamp
            if (typeof email.timestamp === 'number') {
              // Wenn in Sekunden (< Jahr 2100), konvertiere zu Millisekunden
              return email.timestamp < 4102444800 ? email.timestamp * 1000 : email.timestamp;
            }
            return 0;
          };
          
          const timestampA = getTimestamp(a);
          const timestampB = getTimestamp(b);
          
          console.log(`📧 Sorting: A(${a.subject?.substring(0, 30)}): ${timestampA}, B(${b.subject?.substring(0, 30)}): ${timestampB}`);
          
          return timestampB - timestampA; // Neueste zuerst (B > A)
        });
        
        setCachedEmails(sortedEmails);
        setCacheSource('api');
        setNewEmailsCount(sortedEmails.length);
      } else {
        console.warn('⚠️ No emails in API response:', data);
        setCachedEmails([]);
      }
      
    } catch (error) {
      console.error('❌ Failed to load emails:', error);
      setCacheError(error instanceof Error ? error.message : 'Fehler beim Laden der E-Mails');
      // Fallback: Try to load from localStorage cache
      try {
        const cachedData = localStorage.getItem(`gmail_cache_${companyId}_${selectedFolder}`);
        if (cachedData) {
          const parsedData = JSON.parse(cachedData);
          const emails = parsedData.emails || [];
          
          // Sortiere auch Cache-E-Mails nach Datum (neueste zuerst)
          const sortedEmails = emails.sort((a: any, b: any) => {
            const getTimestamp = (email: any) => {
              // Firestore Timestamp (in Sekunden, konvertiere zu Millisekunden)
              if (email.timestamp && email.timestamp._seconds) {
                return email.timestamp._seconds * 1000;
              }
              // Gmail internalDate (string of milliseconds)
              if (email.internalDate && typeof email.internalDate === 'string') {
                return parseInt(email.internalDate);
              }
              // Date string
              if (email.date) {
                return new Date(email.date).getTime();
              }
              // Number timestamp
              if (typeof email.timestamp === 'number') {
                // Wenn in Sekunden (< Jahr 2100), konvertiere zu Millisekunden
                return email.timestamp < 4102444800 ? email.timestamp * 1000 : email.timestamp;
              }
              return 0;
            };
            
            const timestampA = getTimestamp(a);
            const timestampB = getTimestamp(b);
            
            return timestampB - timestampA; // Neueste zuerst (B > A)
          });
          
          setCachedEmails(sortedEmails);
          setCacheSource('cache');
          console.log('📦 Loaded emails from cache fallback');
        }
      } catch (cacheError) {
        console.error('Cache fallback failed:', cacheError);
      }
    } finally {
      setCacheLoading(false);
    }
  }, [companyId, selectedFolder]);

  // Sync cached emails with component state
  useEffect(() => {
    console.log('📧 Syncing cached emails to UI:', cachedEmails.length);
    setEmails(cachedEmails);
    
    // Nur loading beenden wenn wir nicht gerade laden
    if (!cacheLoading) {
      setIsLoading(false);
    }
  }, [cachedEmails, cacheLoading]);

  // Performance Logging
  useEffect(() => {
    if (cacheSource && cacheHitRatio !== undefined) {
      console.log(`⚡ Gmail Performance: ${cacheSource} source, ${Math.round(cacheHitRatio * 100)}% cache hit`);
      if (newEmailsCount > 0) {
        console.log(`🆕 ${newEmailsCount} neue E-Mails geladen`);
      }
    }
  }, [cacheSource, cacheHitRatio, newEmailsCount]);

  // 🔥 REAL-TIME: Gmail Push Notifications Listener
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [lastActivity, setLastActivity] = useState<Date | null>(null);

  useEffect(() => {
    console.log('🎯 Setting up Gmail Real-time listener for:', companyId);
    
    // Hör auf neue Gmail Events in der SUBCOLLECTION
    const realtimeQuery = query(
      collection(db, `companies/${companyId}/realtime_events`),
      where('event_type', '==', 'new_emails'),
      orderBy('timestamp', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(realtimeQuery, (snapshot) => {
      if (!snapshot.empty) {
        const latestEvent = snapshot.docs[0].data();
        console.log('🔥 REAL-TIME Gmail Event empfangen:', latestEvent);
        
        if (latestEvent.data?.userEmail && latestEvent.data.userEmail.includes(companyId)) {
          console.log('✅ Event für diese Company - aktualisiere E-Mails sofort!');
          setLastActivity(new Date());
          setIsRealtimeConnected(true);
          
          // Force refresh der E-Mails
          refreshCachedEmails(true);
        }
      }
    }, (error) => {
      console.error('❌ Real-time listener error:', error);
      setIsRealtimeConnected(false);
    });

    return () => unsubscribe();
  }, [companyId, refreshCachedEmails]);
  
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

  // Initial load - einmalig beim Start, dann nur über Webhooks
  useEffect(() => {
    // Nur einmal laden beim ersten Start der Komponente
    console.log('📱 EmailClient: Initaler Load beim Start für:', companyId);
    setIsLoading(true);
    refreshCachedEmails(false);
  }, [companyId, refreshCachedEmails]);

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
      console.log('👀 App focus detected - Webhook-System übernimmt E-Mail-Updates');
      
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
      if (event.key === 'F5' || 
          ((event.metaKey || event.ctrlKey) && event.key === 'r')) {
        event.preventDefault();
        console.log('⌨️ Keyboard refresh triggered');
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
    console.log(`⚡ SMART CACHE: ${forceRefresh ? 'Force refresh' : 'Smart load'} für ${companyId}/${selectedFolder}`);
    
    try {
      // Use optimized cache service
      await refreshCachedEmails(forceRefresh);
      
      // Update folder counts (approximate)
      setFolders(prev => prev.map(folder => 
        folder.id === selectedFolder 
          ? { ...folder, count: cachedEmails.length, unreadCount: cachedEmails.filter(e => !e.read).length }
          : folder
      ));

    } catch (error) {
      console.error('Smart Cache Load Fehler:', error);
      setAuthError(error instanceof Error ? error.message : 'Fehler beim Laden der E-Mails');
    } finally {
      setIsLoading(false);
    }
  };

  // Manual refresh function
  const handleRefresh = () => {
    console.log('🔄 Manual email refresh triggered');
    loadEmails(true);
  };

  // Debug function für Webhook-Testing (nur für Development)
  const testWebhookRefresh = () => {
    console.log('🧪 TEST: Simulating webhook refresh event');
    loadEmails(true).then(() => {
      console.log('✅ TEST: Webhook refresh simulation completed');
    });
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
        companyId: companyId
      };

    }
  }, []); // Removed realtime dependencies

  // Event handlers
  const handleFolderSelect = (folderId: string) => {
    console.log('📁 Folder selected:', folderId);
    setSelectedFolder(folderId);
    setSelectedEmail(null);
    setSelectedEmails([]);
    
    // Load emails for new folder
    setIsLoading(true);
    refreshCachedEmails(false);
  };

  const handleEmailSelect = (emailId: string) => {
    setSelectedEmails(prev => 
      prev.includes(emailId) 
        ? prev.filter(id => id !== emailId)
        : [...prev, emailId]
    );
  };

  const handleSelectAll = (selected: boolean) => {
    setSelectedEmails(selected ? emails.map(e => e.id) : []);
  };

  const handleEmailClick = async (email: EmailMessage) => {
    setSelectedEmail(email);
    
    // Mark as read if unread
    if (!email.read) {
      await handleMarkAsRead([email.id], true);
    }
  };

  const handleCompose = (mode: 'new' | 'reply' | 'replyAll' | 'forward' = 'new', email?: EmailMessage) => {
    setComposeMode(mode);
    setReplyToEmail(email || null);
    setIsComposeOpen(true);
  };

  const handleSendEmail = async (emailData: EmailComposeType) => {
    try {
      // TODO: Implement new send email API
      console.log('Send email not implemented in new API yet');
      return;
      const response = await fetch(`/api/company/${companyId}/emails/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailData)
      });

      if (response.ok) {
        // Refresh emails
        await loadEmails();
        setIsComposeOpen(false);
      } else {
        throw new Error('Fehler beim Senden der E-Mail');
      }
    } catch (error) {
      console.error('Fehler beim Senden:', error);
      throw error;
    }
  };

  const handleSaveDraft = async (emailData: EmailComposeType) => {
    try {
      // TODO: Implement new draft email API
      console.log('Draft email not implemented in new API yet');
      return;
      const response = await fetch(`/api/company/${companyId}/emails/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailData)
      });

      if (!response.ok) {
        throw new Error('Fehler beim Speichern des Entwurfs');
      }
    } catch (error) {
      console.error('Fehler beim Speichern des Entwurfs:', error);
      throw error;
    }
  };

  const handleStarEmail = async (emailId: string) => {
    try {
      const email = emails.find(e => e.id === emailId);
      if (!email) return;

      // TODO: Implement new star email API
      console.log('Star email not implemented in new API yet');
      return;
      const response = await fetch(`/api/company/${companyId}/emails/${emailId}/star`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ starred: !email?.starred })
      });

      if (response.ok) {
        setEmails(prev => prev.map(e => 
          e.id === emailId ? { ...e, starred: !e.starred } : e
        ));
        
        if (selectedEmail?.id === emailId) {
          setSelectedEmail(prev => prev ? { ...prev, starred: !prev.starred } : null);
        }
      }
    } catch (error) {
      console.error('Fehler beim Markieren mit Stern:', error);
    }
  };

  const handleArchiveEmails = async (emailIds: string[]) => {
    try {
      const response = await fetch(`/api/company/${companyId}/emails/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailIds })
      });

      if (response.ok) {
        setEmails(prev => prev.filter(e => !emailIds.includes(e.id)));
        setSelectedEmails([]);
        // @ts-ignore - selectedEmail is checked
        if (selectedEmail && selectedEmail.id && emailIds.includes(selectedEmail.id)) {
          setSelectedEmail(null);
        }
      }
    } catch (error) {
      console.error('Fehler beim Archivieren:', error);
    }
  };

  const handleDeleteEmails = async (emailIds: string[]) => {
    try {
      // TODO: Implement new delete email API
      console.log('Delete email not implemented in new API yet');
      return;
      const response = await fetch(`/api/company/${companyId}/emails/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailIds })
      });

      if (response.ok) {
        setEmails(prev => prev.filter(e => !emailIds.includes(e.id)));
        setSelectedEmails([]);
        // @ts-ignore - selectedEmail is checked
        if (selectedEmail && selectedEmail.id && emailIds.includes(selectedEmail.id)) {
          setSelectedEmail(null);
        }
      }
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
    }
  };

  const handleMarkAsRead = async (emailIds: string[], read: boolean) => {
    try {
      // TODO: Implement new mark-read email API
      console.log('Mark-read email not implemented in new API yet');
      return;
      const response = await fetch(`/api/company/${companyId}/emails/mark-read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailIds, read })
      });

      if (response.ok) {
        setEmails(prev => prev.map(e => 
          emailIds.includes(e.id) ? { ...e, read } : e
        ));
        
        // @ts-ignore - selectedEmail is checked
        if (selectedEmail && selectedEmail.id && emailIds.includes(selectedEmail.id)) {
          setSelectedEmail(prev => prev ? { ...prev, read } : null);
        }
      } else if (response.status === 403) {
        const errorData = await response.json();
        if (errorData.error === 'insufficient_scope') {
          // Gmail Berechtigung unzureichend - zeige Re-Autorisierungs-Dialog
          const shouldReconnect = confirm(
            'Gmail-Berechtigung unzureichend für diese Aktion.\n\n' +
            'Möchten Sie Gmail mit erweiterten Berechtigungen erneut verbinden?'
          );
          
          if (shouldReconnect) {
            // Get Gmail connect URL from new API
            const connectResponse = await fetch(`/api/gmail/connect?uid=${companyId}`);
            const connectData = await connectResponse.json();
            if (connectData.authUrl) {
              window.location.href = connectData.authUrl;
            }
          }
        } else {
          console.error('Fehler beim Markieren:', errorData.message);
        }
      }
    } catch (error) {
      console.error('Fehler beim Markieren als gelesen/ungelesen:', error);
    }
  };

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
      <div className={cn("h-full flex items-center justify-center bg-gray-50", className)}>
        <Card className="w-full max-w-md p-6 text-center">
          <div className="mb-4">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Gmail-Authentifizierung erforderlich
            </h3>
            <p className="text-gray-600 mb-6">
              {authError || 'Ihre Gmail-Verbindung ist abgelaufen. Bitte melden Sie sich erneut an, um E-Mails zu laden.'}
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

  return (
    <div className={cn("h-screen w-screen flex bg-white", className)}>
      {/* Email List - Fixed Width */}
      <div className={cn(
        "bg-white flex flex-col overflow-hidden border-r border-gray-200",
        selectedEmail ? "w-80" : "flex-1"
      )}>
        <EmailList
          emails={emails}
          selectedEmails={selectedEmails}
          onSelectEmail={handleEmailSelect}
          onSelectAll={handleSelectAll}
          onEmailClick={handleEmailClick}
          onStarEmail={handleStarEmail}
          onArchiveEmails={handleArchiveEmails}
          onDeleteEmails={handleDeleteEmails}
          onMarkAsRead={handleMarkAsRead}
          filter={filter}
          onFilterChange={setFilter}
          onSync={handleRefresh}
          isLoading={isLoading}
          isCompact={!!selectedEmail}
          realtimeStatus={{
            connected: isRealtimeConnected,
            lastActivity: lastActivity
          }}
        />
      </div>

      {/* Email Viewer - Takes Remaining Space */}
      {selectedEmail && (
        <div className="flex-1 bg-white overflow-hidden">
          <EmailViewer
            email={selectedEmail}
            onClose={() => setSelectedEmail(null)}
            onReply={(email) => handleCompose('reply', email)}
            onReplyAll={(email) => handleCompose('replyAll', email)}
            onForward={(email) => handleCompose('forward', email)}
            onArchive={(emailId) => handleArchiveEmails([emailId])}
            onDelete={(emailId) => handleDeleteEmails([emailId])}
            onStar={handleStarEmail}
            onMarkAsRead={(emailId, read) => handleMarkAsRead([emailId], read)}
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
        replyTo={composeMode === 'reply' || composeMode === 'replyAll' ? replyToEmail || undefined : undefined}
        forwardEmail={composeMode === 'forward' ? replyToEmail || undefined : undefined}
      />
    </div>
  );
}