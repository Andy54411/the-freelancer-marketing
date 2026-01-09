/**
 * useWhatsAppWebhook Hook
 * 
 * Verbindet mit WebSocket für Echtzeit-Updates
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { useWhatsAppStore, WhatsAppMessage } from '@/lib/whatsapp-store';

interface UseWhatsAppWebhookOptions {
  companyId: string;
  enabled?: boolean;
  onMessage?: (message: WhatsAppMessage) => void;
  onStatusUpdate?: (messageId: string, status: string) => void;
}

type WebhookEvent = 
  | { type: 'message'; data: WhatsAppMessage }
  | { type: 'status'; data: { messageId: string; status: string } }
  | { type: 'typing'; data: { phone: string; isTyping: boolean } }
  | { type: 'read'; data: { phone: string; messageIds: string[] } };

export function useWhatsAppWebhook({
  companyId,
  enabled = true,
  onMessage,
  onStatusUpdate,
}: UseWhatsAppWebhookOptions) {
  const { addMessage, updateMessage, updateConversation: _updateConversation, addConversation } = useWhatsAppStore();
  
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<WebhookEvent | null>(null);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  // Notification helpers - als refs um Dependencies zu vermeiden
  const playNotificationSoundRef = useRef(() => {
    try {
      const audio = new Audio('/sounds/whatsapp-notification.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {
        // Audio konnte nicht abgespielt werden
      });
    } catch {
      // Ignoriere Fehler
    }
  });

  const showNotificationRef = useRef((phone: string, text: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Neue WhatsApp-Nachricht', {
        body: `${phone}: ${text}`,
        icon: '/whatsapp-icon.png',
        tag: `whatsapp-${phone}`,
      });
    }
  });

  const handleIncomingMessage = useCallback((message: WhatsAppMessage) => {
    const phone = message.from;

    // Nachricht zum Store hinzufügen
    addMessage(phone, message);

    // Konversation aktualisieren oder erstellen
    addConversation({
      id: `conv_${phone}`,
      phone,
      unreadCount: 1,
      lastMessage: {
        text: message.content.text || '[Medien]',
        timestamp: new Date(),
        direction: 'incoming',
      },
    });

    // Audio-Benachrichtigung abspielen
    playNotificationSoundRef.current();

    // Browser-Benachrichtigung
    showNotificationRef.current(phone, message.content.text || 'Neue Nachricht erhalten');
  }, [addMessage, addConversation]);

  const handleStatusUpdate = useCallback((messageId: string, status: string) => {
    // Alle Konversationen durchsuchen und Nachricht aktualisieren
    const { messages } = useWhatsAppStore.getState();
    
    for (const [phone, phoneMessages] of Object.entries(messages)) {
      const message = phoneMessages.find(m => m.wamid === messageId || m.id === messageId);
      if (message) {
        updateMessage(phone, message.id, { 
          status: status as WhatsAppMessage['status'] 
        });
        break;
      }
    }
  }, [updateMessage]);

  const connect = useCallback(() => {
    if (!enabled || !companyId) return;

    // Bestehende Verbindung schließen
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      // Server-Sent Events für Webhook-Updates
      const eventSource = new EventSource(
        `/api/whatsapp/webhook/stream?companyId=${companyId}`
      );

      eventSource.onopen = () => {
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WebhookEvent;
          setLastEvent(data);

          switch (data.type) {
            case 'message':
              handleIncomingMessage(data.data);
              onMessage?.(data.data);
              break;

            case 'status':
              handleStatusUpdate(data.data.messageId, data.data.status);
              onStatusUpdate?.(data.data.messageId, data.data.status);
              break;

            case 'typing':
              // Typing-Indicator nicht direkt unterstützt, aber könnte UI-State setzen
              break;

            case 'read':
              // Lesebestätigung verarbeiten
              break;
          }
        } catch {
          // Parse-Fehler ignorieren
        }
      };

      eventSource.onerror = () => {
        setIsConnected(false);
        eventSource.close();

        // Reconnect mit exponentieller Backoff
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        reconnectAttemptsRef.current++;

        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      };

      eventSourceRef.current = eventSource;
    } catch {
      setIsConnected(false);
    }
  }, [companyId, enabled, onMessage, onStatusUpdate, handleIncomingMessage, handleStatusUpdate]);

  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }, []);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setIsConnected(false);
  }, []);

  // Verbindung bei Mount/enabled-Änderung
  useEffect(() => {
    if (enabled) {
      connect();
      requestNotificationPermission();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect, requestNotificationPermission]);

  return {
    isConnected,
    lastEvent,
    connect,
    disconnect,
    requestNotificationPermission,
  };
}
