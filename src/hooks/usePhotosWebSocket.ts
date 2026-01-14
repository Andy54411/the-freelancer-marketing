'use client';

import { useEffect, useRef, useCallback } from 'react';

/**
 * WebSocket-Nachrichtentypen für Photos
 * Server sendet: { type, payload: { ... }, timestamp }
 */
interface PhotoWebSocketMessage {
  type: 'photo_update' | 'photo_classified' | 'categories_changed' | 'auth_success' | 'subscribed';
  payload?: {
    // photo_classified
    photo?: {
      id: string;
      primaryCategory: string;
      primaryCategoryDisplay: string;
      primaryConfidence: number;
    };
    // photo_update
    photoId?: string;
    updates?: {
      primaryCategory?: string;
      primaryCategoryDisplay?: string;
      primaryConfidence?: number;
      locationName?: string;
    };
    // categories_changed
    action?: 'created' | 'deleted' | 'updated';
    category?: {
      key: string;
      display?: string;
      group?: string;
    };
  };
  timestamp?: string;
}

interface UsePhotosWebSocketOptions {
  /** E-Mail-Adresse des Benutzers für die Authentifizierung */
  userEmail: string;
  /** Callback wenn ein Foto klassifiziert wurde */
  onPhotoClassified?: (data: {
    id: string;
    primaryCategory: string;
    primaryCategoryDisplay: string;
    primaryConfidence: number;
  }) => void;
  /** Callback wenn ein Foto aktualisiert wurde */
  onPhotoUpdate?: (photoId: string, updates: Record<string, unknown>) => void;
  /** Callback wenn Kategorien geändert wurden */
  onCategoriesChanged?: (action: 'created' | 'deleted' | 'updated', category: { key: string; display?: string; group?: string }) => void;
  /** Ob die Verbindung aktiv sein soll */
  enabled?: boolean;
}

/**
 * Hook für WebSocket-Realtime-Updates bei Photos
 * Verbindet sich mit dem Hetzner WebSocket-Server und empfängt
 * Benachrichtigungen über Foto-Klassifizierungen und Kategorie-Änderungen.
 */
export function usePhotosWebSocket({
  userEmail,
  onPhotoClassified,
  onPhotoUpdate,
  onCategoriesChanged,
  enabled = true,
}: UsePhotosWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const isConnectingRef = useRef(false);

  // Refs für Callbacks damit diese sich ändern können ohne Reconnect
  const onPhotoClassifiedRef = useRef(onPhotoClassified);
  const onPhotoUpdateRef = useRef(onPhotoUpdate);
  const onCategoriesChangedRef = useRef(onCategoriesChanged);
  
  useEffect(() => {
    onPhotoClassifiedRef.current = onPhotoClassified;
    onPhotoUpdateRef.current = onPhotoUpdate;
    onCategoriesChangedRef.current = onCategoriesChanged;
  }, [onPhotoClassified, onPhotoUpdate, onCategoriesChanged]);

  const connect = useCallback(() => {
    console.log('[PhotosWS] connect() called - userEmail:', userEmail, 'enabled:', enabled);
    if (!userEmail || !enabled) {
      console.log('[PhotosWS] Aborted: userEmail or enabled is falsy');
      return;
    }
    if (isConnectingRef.current) {
      console.log('[PhotosWS] Aborted: already connecting');
      return;
    }
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
      console.log('[PhotosWS] Aborted: already connected or connecting, state:', wsRef.current?.readyState);
      return;
    }

    isConnectingRef.current = true;
    // Verwende /webmail-api/ws weil der /webmail-api/ Location-Block 
    // bereits korrekt für WebSocket-Upgrades konfiguriert ist
    const wsUrl = 'wss://mail.taskilo.de/webmail-api/ws';
    
    console.log('[PhotosWS] Verbinde mit', wsUrl);
    
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      
      ws.onopen = () => {
        isConnectingRef.current = false;
        reconnectAttempts.current = 0;
        console.log('[PhotosWS] Verbunden mit', wsUrl);
        
        // Authentifizierung senden
        ws.send(JSON.stringify({
          type: 'auth',
          email: userEmail,
        }));
        
        // Für Photos-Benachrichtigungen registrieren
        ws.send(JSON.stringify({
          type: 'subscribe',
          channel: 'photos',
        }));
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as PhotoWebSocketMessage;
          const payload = message.payload;
          
          switch (message.type) {
            case 'photo_classified':
              // Server sendet: { type: 'photo_classified', payload: { photo: { id, ... } } }
              if (payload?.photo && onPhotoClassifiedRef.current) {
                console.log('[PhotosWS] Foto klassifiziert:', payload.photo.id, '->', payload.photo.primaryCategoryDisplay);
                onPhotoClassifiedRef.current({
                  id: payload.photo.id,
                  primaryCategory: payload.photo.primaryCategory,
                  primaryCategoryDisplay: payload.photo.primaryCategoryDisplay,
                  primaryConfidence: payload.photo.primaryConfidence,
                });
              }
              break;
              
            case 'photo_update':
              // Server sendet: { type: 'photo_update', payload: { photoId, updates: { ... } } }
              if (payload?.photoId && payload?.updates && onPhotoUpdateRef.current) {
                console.log('[PhotosWS] Foto-Update:', payload.photoId, payload.updates);
                onPhotoUpdateRef.current(payload.photoId, payload.updates);
              }
              break;
              
            case 'categories_changed':
              // Server sendet: { type: 'categories_changed', payload: { action, category } }
              if (payload?.action && onCategoriesChangedRef.current) {
                console.log('[PhotosWS] Kategorien geändert:', payload.action, payload.category);
                onCategoriesChangedRef.current(payload.action, payload.category || { key: '', display: '', group: '' });
              }
              break;
              
            case 'auth_success':
            case 'subscribed':
              // Erfolgsmeldungen loggen
              console.log('[PhotosWS]', message.type, payload);
              break;
          }
        } catch {
          // Nicht-JSON Nachricht ignorieren (z.B. Pings)
        }
      };
      
      ws.onclose = (event) => {
        isConnectingRef.current = false;
        console.log('[PhotosWS] Verbindung geschlossen:', event.code, event.reason);
        
        // Reconnect mit exponential backoff
        if (enabled && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          reconnectAttempts.current++;
          console.log(`[PhotosWS] Reconnect in ${delay}ms (Versuch ${reconnectAttempts.current}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        }
      };
      
      ws.onerror = (error) => {
        isConnectingRef.current = false;
        console.warn('[PhotosWS] Fehler:', error);
      };
      
    } catch (error) {
      isConnectingRef.current = false;
      console.error('[PhotosWS] Verbindungsfehler:', error);
    }
  }, [userEmail, enabled]);

  // Verbindung aufbauen/trennen
  useEffect(() => {
    console.log('[PhotosWS] Effect triggered - enabled:', enabled, 'userEmail:', userEmail);
    if (enabled && userEmail) {
      connect();
    }
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect, enabled, userEmail]);

  // Manuelle Reconnect-Funktion
  const reconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    reconnectAttempts.current = 0;
    connect();
  }, [connect]);

  return {
    /** Manuell reconnecten */
    reconnect,
    /** Ob die Verbindung aktiv ist */
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
  };
}
