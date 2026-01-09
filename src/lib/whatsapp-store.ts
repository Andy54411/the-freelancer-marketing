/**
 * WhatsApp Store (Zustand)
 * 
 * Globaler State für WhatsApp-Modul
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface WhatsAppContact {
  id: string;
  phone: string;
  name?: string;
  profilePicUrl?: string;
  lastMessage?: {
    text: string;
    timestamp: Date;
    direction: 'incoming' | 'outgoing';
  };
  unreadCount: number;
  tags?: string[];
  assignedTo?: string;
  isBlocked?: boolean;
  notes?: string;
}

export interface WhatsAppMessage {
  id: string;
  wamid?: string;
  from: string;
  to?: string;
  direction: 'incoming' | 'outgoing';
  type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker' | 'location' | 'contacts' | 'interactive' | 'template' | 'reaction';
  content: {
    text?: string;
    caption?: string;
    mediaUrl?: string;
    mimeType?: string;
    filename?: string;
    latitude?: number;
    longitude?: number;
    locationName?: string;
    address?: string;
    contacts?: Array<{
      name: { formatted_name: string };
      phones?: Array<{ phone: string }>;
    }>;
    interactive?: {
      type: 'button_reply' | 'list_reply';
      button_reply?: { id: string; title: string };
      list_reply?: { id: string; title: string; description?: string };
    };
    reaction?: {
      emoji: string;
      message_id: string;
    };
    template?: {
      name: string;
      language: string;
    };
  };
  status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: Date | string;
  replyTo?: {
    id: string;
    text?: string;
    from?: string;
  };
  reactions?: Array<{
    emoji: string;
    from: string;
  }>;
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  language: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  components: Array<{
    type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
    text?: string;
    format?: string;
    buttons?: Array<{
      type: string;
      text: string;
      url?: string;
      phone_number?: string;
    }>;
  }>;
}

export interface WhatsAppConnection {
  isConnected: boolean;
  phoneNumberId?: string;
  displayPhoneNumber?: string;
  businessAccountId?: string;
  accessToken?: string;
  verifiedName?: string;
  qualityRating?: string;
  messagingLimit?: string;
}

interface WhatsAppState {
  // Connection
  connection: WhatsAppConnection;
  setConnection: (connection: Partial<WhatsAppConnection>) => void;

  // Conversations
  conversations: WhatsAppContact[];
  setConversations: (conversations: WhatsAppContact[]) => void;
  addConversation: (conversation: WhatsAppContact) => void;
  updateConversation: (phone: string, updates: Partial<WhatsAppContact>) => void;
  removeConversation: (phone: string) => void;

  // Active Conversation
  activeConversation: string | null;
  setActiveConversation: (phone: string | null) => void;

  // Messages
  messages: Record<string, WhatsAppMessage[]>;
  setMessages: (phone: string, messages: WhatsAppMessage[]) => void;
  addMessage: (phone: string, message: WhatsAppMessage) => void;
  updateMessage: (phone: string, messageId: string, updates: Partial<WhatsAppMessage>) => void;

  // Templates
  templates: WhatsAppTemplate[];
  setTemplates: (templates: WhatsAppTemplate[]) => void;

  // UI State
  isComposerOpen: boolean;
  setComposerOpen: (open: boolean) => void;
  replyToMessage: WhatsAppMessage | null;
  setReplyToMessage: (message: WhatsAppMessage | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedFilter: 'all' | 'unread' | 'starred' | 'assigned';
  setSelectedFilter: (filter: 'all' | 'unread' | 'starred' | 'assigned') => void;

  // Loading States
  isLoadingConversations: boolean;
  setLoadingConversations: (loading: boolean) => void;
  isLoadingMessages: boolean;
  setLoadingMessages: (loading: boolean) => void;
  isSending: boolean;
  setSending: (sending: boolean) => void;

  // Error State
  error: string | null;
  setError: (error: string | null) => void;

  // Reset
  reset: () => void;
}

const initialState = {
  connection: { isConnected: false },
  conversations: [],
  activeConversation: null,
  messages: {},
  templates: [],
  isComposerOpen: false,
  replyToMessage: null,
  searchQuery: '',
  selectedFilter: 'all' as const,
  isLoadingConversations: false,
  isLoadingMessages: false,
  isSending: false,
  error: null,
};

export const useWhatsAppStore = create<WhatsAppState>()(
  persist(
    (set, _get) => ({
      ...initialState,

      // Connection
      setConnection: (connection) => 
        set((state) => ({ 
          connection: { ...state.connection, ...connection } 
        })),

      // Conversations
      setConversations: (conversations) => set({ conversations }),
      
      addConversation: (conversation) => 
        set((state) => {
          const exists = state.conversations.find(c => c.phone === conversation.phone);
          if (exists) {
            return {
              conversations: state.conversations.map(c =>
                c.phone === conversation.phone ? { ...c, ...conversation } : c
              ),
            };
          }
          return { conversations: [conversation, ...state.conversations] };
        }),
      
      updateConversation: (phone, updates) =>
        set((state) => ({
          conversations: state.conversations.map(c =>
            c.phone === phone ? { ...c, ...updates } : c
          ),
        })),
      
      removeConversation: (phone) =>
        set((state) => ({
          conversations: state.conversations.filter(c => c.phone !== phone),
        })),

      // Active Conversation
      setActiveConversation: (phone) => set({ activeConversation: phone }),

      // Messages
      setMessages: (phone, messages) =>
        set((state) => ({
          messages: { ...state.messages, [phone]: messages },
        })),
      
      addMessage: (phone, message) =>
        set((state) => {
          const existingMessages = state.messages[phone] || [];
          const exists = existingMessages.find(m => m.id === message.id);
          if (exists) {
            return state;
          }
          return {
            messages: {
              ...state.messages,
              [phone]: [...existingMessages, message],
            },
          };
        }),
      
      updateMessage: (phone, messageId, updates) =>
        set((state) => ({
          messages: {
            ...state.messages,
            [phone]: (state.messages[phone] || []).map(m =>
              m.id === messageId ? { ...m, ...updates } : m
            ),
          },
        })),

      // Templates
      setTemplates: (templates) => set({ templates }),

      // UI State
      setComposerOpen: (isComposerOpen) => set({ isComposerOpen }),
      setReplyToMessage: (replyToMessage) => set({ replyToMessage }),
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setSelectedFilter: (selectedFilter) => set({ selectedFilter }),

      // Loading States
      setLoadingConversations: (isLoadingConversations) => set({ isLoadingConversations }),
      setLoadingMessages: (isLoadingMessages) => set({ isLoadingMessages }),
      setSending: (isSending) => set({ isSending }),

      // Error
      setError: (error) => set({ error }),

      // Reset
      reset: () => set(initialState),
    }),
    {
      name: 'whatsapp-store',
      partialize: (state) => ({
        // Nur bestimmte Felder persistieren
        connection: state.connection,
        searchQuery: state.searchQuery,
        selectedFilter: state.selectedFilter,
      }),
    }
  )
);

// Selektoren
export const useActiveConversationMessages = () => {
  const { activeConversation, messages } = useWhatsAppStore();
  if (!activeConversation) return [];
  return messages[activeConversation] || [];
};

export const useFilteredConversations = () => {
  const { conversations, searchQuery, selectedFilter } = useWhatsAppStore();
  
  let filtered = conversations;

  // Filter anwenden
  if (selectedFilter === 'unread') {
    filtered = filtered.filter(c => c.unreadCount > 0);
  } else if (selectedFilter === 'assigned') {
    filtered = filtered.filter(c => c.assignedTo);
  }

  // Suche anwenden
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(c =>
      c.name?.toLowerCase().includes(query) ||
      c.phone.includes(query) ||
      c.lastMessage?.text.toLowerCase().includes(query)
    );
  }

  return filtered;
};

export const useUnreadCount = () => {
  const { conversations } = useWhatsAppStore();
  return conversations.reduce((sum, c) => sum + c.unreadCount, 0);
};
