/**
 * useConversations Hook
 * 
 * Lädt und verwaltet WhatsApp-Konversationen
 */

import { useEffect, useCallback } from 'react';
import { useWhatsAppStore, WhatsAppContact } from '@/lib/whatsapp-store';

interface UseConversationsOptions {
  companyId: string;
  autoLoad?: boolean;
  pollInterval?: number;
}

export function useConversations({ companyId, autoLoad = true, pollInterval }: UseConversationsOptions) {
  const {
    conversations,
    setConversations,
    addConversation,
    updateConversation,
    isLoadingConversations,
    setLoadingConversations,
    setError,
  } = useWhatsAppStore();

  const loadConversations = useCallback(async () => {
    if (!companyId) return;

    setLoadingConversations(true);
    try {
      const response = await fetch(`/api/whatsapp/conversations?companyId=${companyId}`);
      const data = await response.json();

      if (data.success) {
        setConversations(data.conversations || []);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Fehler beim Laden der Konversationen');
    } finally {
      setLoadingConversations(false);
    }
  }, [companyId, setConversations, setLoadingConversations, setError]);

  const createConversation = useCallback(async (phone: string, name?: string) => {
    const newConversation: WhatsAppContact = {
      id: `conv_${Date.now()}`,
      phone,
      name,
      unreadCount: 0,
    };

    addConversation(newConversation);
    return newConversation;
  }, [addConversation]);

  const markAsRead = useCallback(async (phone: string) => {
    updateConversation(phone, { unreadCount: 0 });

    try {
      await fetch('/api/whatsapp/conversations/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, phone }),
      });
    } catch {
      // Fehler ignorieren
    }
  }, [companyId, updateConversation]);

  const assignConversation = useCallback(async (phone: string, userId: string | null) => {
    updateConversation(phone, { assignedTo: userId || undefined });

    try {
      await fetch('/api/whatsapp/conversations/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, phone, userId }),
      });
    } catch {
      // Fehler ignorieren
    }
  }, [companyId, updateConversation]);

  const addTag = useCallback(async (phone: string, tag: string) => {
    const conversation = conversations.find(c => c.phone === phone);
    const newTags = [...(conversation?.tags || []), tag];
    updateConversation(phone, { tags: newTags });

    try {
      await fetch('/api/whatsapp/conversations/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, phone, tags: newTags }),
      });
    } catch {
      // Fehler ignorieren
    }
  }, [companyId, conversations, updateConversation]);

  const removeTag = useCallback(async (phone: string, tag: string) => {
    const conversation = conversations.find(c => c.phone === phone);
    const newTags = (conversation?.tags || []).filter(t => t !== tag);
    updateConversation(phone, { tags: newTags });

    try {
      await fetch('/api/whatsapp/conversations/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, phone, tags: newTags }),
      });
    } catch {
      // Fehler ignorieren
    }
  }, [companyId, conversations, updateConversation]);

  const blockContact = useCallback(async (phone: string, blocked: boolean) => {
    updateConversation(phone, { isBlocked: blocked });

    try {
      await fetch('/api/whatsapp/conversations/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, phone, blocked }),
      });
    } catch {
      // Fehler ignorieren
    }
  }, [companyId, updateConversation]);

  // Auto-Load bei Mount
  useEffect(() => {
    if (autoLoad) {
      loadConversations();
    }
  }, [autoLoad, loadConversations]);

  // Polling
  useEffect(() => {
    if (!pollInterval) return;

    const interval = setInterval(loadConversations, pollInterval);
    return () => clearInterval(interval);
  }, [pollInterval, loadConversations]);

  return {
    conversations,
    isLoading: isLoadingConversations,
    loadConversations,
    createConversation,
    markAsRead,
    assignConversation,
    addTag,
    removeTag,
    blockContact,
  };
}
