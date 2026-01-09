'use client';

import { useState, useCallback } from 'react';
import { EmailMessage, EmailContent, Mailbox } from '@/services/webmail/types';

interface UseWebmailOptions {
  email: string;
  password: string;
}

interface WebmailState {
  mailboxes: Mailbox[];
  messages: EmailMessage[];
  currentMessage: EmailContent | null;
  currentMailbox: string;
  total: number;
  page: number;
  loading: boolean;
  error: string | null;
  messageError: string | null;
  messageLoading: boolean;
}

// Helper: Absolute URL erstellen um <base href> Probleme in E-Mail-HTML zu vermeiden
function getAbsoluteApiUrl(path: string): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${path}`;
  }
  return path;
}

export function useWebmail({ email, password }: UseWebmailOptions) {
  const [state, setState] = useState<WebmailState>({
    mailboxes: [],
    messages: [],
    currentMessage: null,
    currentMailbox: 'INBOX',
    total: 0,
    page: 1,
    loading: false,
    error: null,
    messageError: null,
    messageLoading: false,
  });

  const setLoading = (loading: boolean) => setState(prev => ({ ...prev, loading }));
  const setError = (error: string | null) => setState(prev => ({ ...prev, error }));
  const setMessageLoading = (messageLoading: boolean) => setState(prev => ({ ...prev, messageLoading }));
  const setMessageError = (messageError: string | null) => setState(prev => ({ ...prev, messageError }));

  const fetchMailboxes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(getAbsoluteApiUrl('/api/webmail/mailboxes'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (data.success) {
        setState(prev => ({ ...prev, mailboxes: data.mailboxes, loading: false }));
      } else {
        setError(data.error);
        setLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch mailboxes');
      setLoading(false);
    }
  }, [email, password]);

  const fetchMessages = useCallback(async (mailbox: string = 'INBOX', page: number = 1) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(getAbsoluteApiUrl('/api/webmail/messages'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, mailbox, page, limit: 50 }),
      });
      const data = await response.json();
      if (data.success) {
        setState(prev => ({
          ...prev,
          messages: data.messages,
          total: data.total,
          page,
          currentMailbox: mailbox,
          loading: false,
        }));
      } else {
        setError(data.error);
        setLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch messages');
      setLoading(false);
    }
  }, [email, password]);

  const fetchMessage = useCallback(async (uid: number, mailbox?: string) => {
    if (!email || !password) {
      setMessageError('Keine Anmeldedaten vorhanden');
      return;
    }
    
    setMessageLoading(true);
    setMessageError(null);
    
    const targetMailbox = mailbox || state.currentMailbox || 'INBOX';
    
    const requestBody = {
      email,
      password,
      mailbox: targetMailbox,
      uid,
    };
    
    // Retry-Logik: Bis zu 3 Versuche
    const maxRetries = 3;
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        // WICHTIG: Absolute URL verwenden, da E-Mail-HTML <base href> Tags enthalten kann
        const response = await fetch(getAbsoluteApiUrl('/api/webmail/message'), {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
          cache: 'no-store',
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
          
          if (response.status >= 500) {
            lastError = new Error(errorData.error || `Serverfehler: ${response.status}`);
            continue;
          }
          
          setMessageError(errorData.error || `Serverfehler: ${response.status}`);
          setMessageLoading(false);
          return;
        }
        
        const data = await response.json();
        
        if (data.success) {
          setState(prev => ({ ...prev, currentMessage: data.message, messageLoading: false, messageError: null }));
          return;
        } else {
          setMessageError(data.error || 'Nachricht konnte nicht geladen werden');
          setMessageLoading(false);
          return;
        }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        
        if (err instanceof Error && err.name === 'AbortError') {
          setMessageError('Zeitüberschreitung beim Laden der Nachricht');
          setMessageLoading(false);
          return;
        }
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, attempt * 500));
        }
      }
    }
    
    setMessageError(lastError?.message || 'Verbindungsfehler beim Laden der Nachricht');
    setMessageLoading(false);
  }, [email, password, state.currentMailbox]);

  const sendEmail = useCallback(async (data: {
    to: string | string[];
    subject: string;
    text?: string;
    html?: string;
    cc?: string[];
    bcc?: string[];
    replyTo?: string;
    inReplyTo?: string;
    references?: string;
    attachments?: File[] | { filename: string; content: string; contentType?: string }[];
  }) => {
    setLoading(true);
    setError(null);
    try {
      // Wenn File-Objekte vorhanden sind, zu Base64 konvertieren
      let processedAttachments: { filename: string; content: string; contentType?: string }[] | undefined;
      
      if (data.attachments && data.attachments.length > 0) {
        processedAttachments = await Promise.all(
          data.attachments.map(async (att) => {
            if (att instanceof File) {
              // Prüfe Dateigröße (max 25MB pro Datei für E-Mail)
              if (att.size > 25 * 1024 * 1024) {
                throw new Error(`Datei "${att.name}" ist zu groß. Maximale Größe: 25MB`);
              }
              
              // Browser-kompatible Base64 Konvertierung mit Chunks für große Dateien
              const arrayBuffer = await att.arrayBuffer();
              const uint8Array = new Uint8Array(arrayBuffer);
              
              // Konvertiere in Chunks um Stack-Overflow zu vermeiden
              const chunkSize = 32768; // 32KB chunks
              let binary = '';
              for (let offset = 0; offset < uint8Array.length; offset += chunkSize) {
                const chunk = uint8Array.subarray(offset, Math.min(offset + chunkSize, uint8Array.length));
                binary += String.fromCharCode.apply(null, Array.from(chunk));
              }
              const base64 = btoa(binary);
              
              return {
                filename: att.name,
                content: base64,
                contentType: att.type || 'application/octet-stream',
              };
            }
            return att;
          })
        );
      }
      
      const response = await fetch(getAbsoluteApiUrl('/api/webmail/send'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          password, 
          ...data,
          attachments: processedAttachments,
        }),
      });
      const result = await response.json();
      setLoading(false);
      if (!result.success) {
        setError(result.error);
      }
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send email');
      setLoading(false);
      return { success: false };
    }
  }, [email, password]);

  const performAction = useCallback(async (
    action: 'markRead' | 'markUnread' | 'delete' | 'move' | 'flag',
    uid: number,
    targetMailbox?: string,
    flagged?: boolean
  ) => {
    try {
      const response = await fetch(getAbsoluteApiUrl('/api/webmail/actions'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          mailbox: state.currentMailbox,
          uid,
          action,
          targetMailbox,
          flagged,
        }),
      });
      const result = await response.json();
      if (result.success) {
        // Refresh messages after action
        await fetchMessages(state.currentMailbox, state.page);
      }
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
      return { success: false };
    }
  }, [email, password, state.currentMailbox, state.page, fetchMessages]);

  const clearCurrentMessage = useCallback(() => {
    setState(prev => ({ ...prev, currentMessage: null, messageError: null }));
  }, []);

  const clearMessageError = useCallback(() => {
    setState(prev => ({ ...prev, messageError: null }));
  }, []);

  return {
    ...state,
    fetchMailboxes,
    fetchMessages,
    fetchMessage,
    sendEmail,
    performAction,
    clearCurrentMessage,
    clearMessageError,
  };
}
