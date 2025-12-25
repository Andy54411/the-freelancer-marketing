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
      const response = await fetch('/api/webmail/mailboxes', {
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
      const response = await fetch('/api/webmail/messages', {
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
    setMessageLoading(true);
    setMessageError(null);
    
    const targetMailbox = mailbox || state.currentMailbox;
    console.log('[fetchMessage] Starting fetch:', { uid, mailbox: targetMailbox, email: email ? 'set' : 'empty' });
    
    try {
      const requestBody = {
        email,
        password,
        mailbox: targetMailbox,
        uid,
      };
      console.log('[fetchMessage] Request body:', { ...requestBody, password: '***' });
      
      const response = await fetch('/api/webmail/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      
      console.log('[fetchMessage] Response status:', response.status);
      const data = await response.json();
      console.log('[fetchMessage] Response data:', { success: data.success, hasMessage: !!data.message });
      
      if (data.success) {
        setState(prev => ({ ...prev, currentMessage: data.message, messageLoading: false, messageError: null }));
      } else {
        setMessageError(data.error || 'Nachricht konnte nicht geladen werden');
        setMessageLoading(false);
      }
    } catch (err) {
      console.error('[fetchMessage] Error:', err);
      setMessageError(err instanceof Error ? err.message : 'Verbindungsfehler beim Laden der Nachricht');
      setMessageLoading(false);
    }
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
  }) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/webmail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, ...data }),
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
      const response = await fetch('/api/webmail/actions', {
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
