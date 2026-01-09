/**
 * useMessages Hook
 * 
 * Lädt und verwaltet Nachrichten für eine Konversation
 */

import { useEffect, useCallback, useRef, useMemo } from 'react';
import { useWhatsAppStore, WhatsAppMessage } from '@/lib/whatsapp-store';

interface UseMessagesOptions {
  companyId: string;
  phone: string | null;
  autoLoad?: boolean;
  pollInterval?: number;
}

export function useMessages({ companyId, phone, autoLoad = true, pollInterval }: UseMessagesOptions) {
  const {
    messages,
    setMessages,
    addMessage,
    updateMessage,
    updateConversation,
    isLoadingMessages,
    setLoadingMessages,
    isSending,
    setSending,
    setError,
    replyToMessage,
    setReplyToMessage,
  } = useWhatsAppStore();

  const scrollRef = useRef<HTMLDivElement>(null);

  const currentMessages = useMemo(() => phone ? messages[phone] || [] : [], [phone, messages]);

  const loadMessages = useCallback(async () => {
    if (!companyId || !phone) return;

    setLoadingMessages(true);
    try {
      const response = await fetch(
        `/api/whatsapp/messages?companyId=${companyId}&phone=${encodeURIComponent(phone)}`
      );
      const data = await response.json();

      if (data.success) {
        setMessages(phone, data.messages || []);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Fehler beim Laden der Nachrichten');
    } finally {
      setLoadingMessages(false);
    }
  }, [companyId, phone, setMessages, setLoadingMessages, setError]);

  const sendMessage = useCallback(async (
    content: string | {
      type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'template' | 'location' | 'contacts' | 'interactive';
      text?: string;
      mediaId?: string;
      mediaUrl?: string;
      caption?: string;
      templateName?: string;
      templateLanguage?: string;
      templateVariables?: string[];
      latitude?: number;
      longitude?: number;
      locationName?: string;
      address?: string;
      contacts?: Array<{
        name: { formatted_name: string };
        phones?: Array<{ phone: string }>;
      }>;
      interactive?: {
        type: 'button' | 'list';
        body: string;
        buttons?: Array<{ id: string; title: string }>;
        sections?: Array<{
          title: string;
          rows: Array<{ id: string; title: string; description?: string }>;
        }>;
      };
    }
  ) => {
    if (!companyId || !phone) return;

    setSending(true);

    // Optimistisches Update
    const tempMessage: WhatsAppMessage = {
      id: `temp_${Date.now()}`,
      from: 'me',
      to: phone,
      direction: 'outgoing',
      type: typeof content === 'string' ? 'text' : content.type,
      content: typeof content === 'string' ? { text: content } : {
        text: content.text,
        caption: content.caption,
        mediaUrl: content.mediaUrl,
        latitude: content.latitude,
        longitude: content.longitude,
        locationName: content.locationName,
        address: content.address,
        contacts: content.contacts,
      },
      status: 'pending',
      timestamp: new Date(),
      replyTo: replyToMessage ? {
        id: replyToMessage.id,
        text: replyToMessage.content.text,
        from: replyToMessage.from,
      } : undefined,
    };

    addMessage(phone, tempMessage);
    setReplyToMessage(null);

    try {
      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          to: phone,
          message: typeof content === 'string' ? { type: 'text', text: content } : content,
          replyToMessageId: replyToMessage?.wamid,
        }),
      });

      const data = await response.json();

      if (data.success) {
        updateMessage(phone, tempMessage.id, {
          id: data.messageId,
          wamid: data.wamid,
          status: 'sent',
        });

        // Letzte Nachricht in Konversation aktualisieren
        updateConversation(phone, {
          lastMessage: {
            text: typeof content === 'string' ? content : content.text || '[Medien]',
            timestamp: new Date(),
            direction: 'outgoing',
          },
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      updateMessage(phone, tempMessage.id, { status: 'failed' });
      setError(error instanceof Error ? error.message : 'Fehler beim Senden');
    } finally {
      setSending(false);
    }
  }, [
    companyId,
    phone,
    addMessage,
    updateMessage,
    updateConversation,
    setSending,
    setError,
    replyToMessage,
    setReplyToMessage,
  ]);

  const resendMessage = useCallback(async (messageId: string) => {
    const message = currentMessages.find(m => m.id === messageId);
    if (!message || message.status !== 'failed') return;

    updateMessage(phone!, messageId, { status: 'pending' });
    
    // Nachricht erneut senden - verwende text-Feld falls vorhanden
    const textContent = typeof message.content === 'string' 
      ? message.content 
      : message.content.text;
    if (textContent) {
      await sendMessage(textContent);
    }
  }, [currentMessages, phone, updateMessage, sendMessage]);

  const reactToMessage = useCallback(async (messageId: string, emoji: string) => {
    if (!companyId || !phone) return;

    try {
      await fetch('/api/whatsapp/interactive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          to: phone,
          type: 'reaction',
          messageId,
          emoji,
        }),
      });

      // Reaktion lokal hinzufügen
      const message = currentMessages.find(m => m.id === messageId);
      if (message) {
        const newReactions = [...(message.reactions || []), { emoji, from: 'me' }];
        updateMessage(phone, messageId, { reactions: newReactions });
      }
    } catch {
      setError('Fehler beim Reagieren');
    }
  }, [companyId, phone, currentMessages, updateMessage, setError]);

  const markAsRead = useCallback(async (messageId: string) => {
    if (!companyId || !phone) return;

    try {
      await fetch('/api/whatsapp/interactive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          to: phone,
          type: 'read',
          messageId,
        }),
      });
    } catch {
      // Ignoriere Fehler
    }
  }, [companyId, phone]);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  // Auto-Load bei Telefonnummer-Änderung
  useEffect(() => {
    if (autoLoad && phone) {
      loadMessages();
    }
  }, [autoLoad, phone, loadMessages]);

  // Polling
  useEffect(() => {
    if (!pollInterval || !phone) return;

    const interval = setInterval(loadMessages, pollInterval);
    return () => clearInterval(interval);
  }, [pollInterval, phone, loadMessages]);

  // Scroll nach unten bei neuen Nachrichten
  useEffect(() => {
    scrollToBottom();
  }, [currentMessages.length, scrollToBottom]);

  return {
    messages: currentMessages,
    isLoading: isLoadingMessages,
    isSending,
    loadMessages,
    sendMessage,
    resendMessage,
    reactToMessage,
    markAsRead,
    replyToMessage,
    setReplyToMessage,
    scrollRef,
    scrollToBottom,
  };
}
