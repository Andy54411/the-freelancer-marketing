'use client';

import { useState, useCallback } from 'react';
import { EmailMessage, EmailContent, Mailbox } from '@/services/webmail/types';

interface UseTaskiloWebmailOptions {
  email: string;
}

interface TaskiloWebmailState {
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

/**
 * Hook für Taskilo E-Mail Zugriff ohne Passwort.
 * Nutzt Dovecot Master User Authentifizierung auf dem Server.
 * Nur für @taskilo.de E-Mail-Adressen.
 */
export function useTaskiloWebmail({ email }: UseTaskiloWebmailOptions) {
  const [state, setState] = useState<TaskiloWebmailState>({
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
    if (!email.endsWith('@taskilo.de')) {
      setError('Nur Taskilo E-Mail-Adressen werden unterstützt');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(getAbsoluteApiUrl('/api/webmail/taskilo-mailboxes'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
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
  }, [email]);

  const fetchMessages = useCallback(async (mailbox: string = 'INBOX', page: number = 1) => {
    if (!email.endsWith('@taskilo.de')) {
      setError('Nur Taskilo E-Mail-Adressen werden unterstützt');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(getAbsoluteApiUrl('/api/webmail/taskilo-messages'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, mailbox, page, limit: 50 }),
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
  }, [email]);

  const fetchMessage = useCallback(async (mailbox: string, uid: number) => {
    if (!email.endsWith('@taskilo.de')) {
      setMessageError('Nur Taskilo E-Mail-Adressen werden unterstützt');
      return;
    }
    
    setMessageLoading(true);
    setMessageError(null);
    try {
      const response = await fetch(getAbsoluteApiUrl('/api/webmail/message'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, mailbox, uid }),
      });
      const data = await response.json();
      if (data.success) {
        setState(prev => ({ ...prev, currentMessage: data.message, messageLoading: false }));
      } else {
        setMessageError(data.error);
        setMessageLoading(false);
      }
    } catch (err) {
      setMessageError(err instanceof Error ? err.message : 'Failed to fetch message');
      setMessageLoading(false);
    }
  }, [email]);

  const performAction = useCallback(async (
    action: 'markRead' | 'markUnread' | 'flag' | 'delete' | 'move',
    uid: number,
    options: { mailbox?: string; targetMailbox?: string; read?: boolean; flagged?: boolean } = {}
  ) => {
    if (!email.endsWith('@taskilo.de')) {
      setError('Nur Taskilo E-Mail-Adressen werden unterstützt');
      return;
    }
    
    try {
      const response = await fetch(getAbsoluteApiUrl('/api/webmail/taskilo-actions'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          action,
          uid,
          mailbox: options.mailbox || state.currentMailbox,
          ...options,
        }),
      });
      const data = await response.json();
      if (!data.success) {
        setError(data.error);
      }
      return data.success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
      return false;
    }
  }, [email, state.currentMailbox]);

  const clearCurrentMessage = useCallback(() => {
    setState(prev => ({ ...prev, currentMessage: null }));
  }, []);

  const clearMessageError = useCallback(() => {
    setState(prev => ({ ...prev, messageError: null }));
  }, []);

  return {
    ...state,
    fetchMailboxes,
    fetchMessages,
    fetchMessage,
    performAction,
    clearCurrentMessage,
    clearMessageError,
  };
}
