/**
 * useWhatsAppConnection Hook
 * 
 * Verwaltet die WhatsApp Business API Verbindung
 */

import { useEffect, useCallback } from 'react';
import { useWhatsAppStore } from '@/lib/whatsapp-store';

interface UseWhatsAppConnectionOptions {
  companyId: string;
  autoCheck?: boolean;
}

export function useWhatsAppConnection({ companyId, autoCheck = true }: UseWhatsAppConnectionOptions) {
  const {
    connection,
    setConnection,
    setError,
  } = useWhatsAppStore();

  const checkConnection = useCallback(async () => {
    if (!companyId) return;

    try {
      const response = await fetch(`/api/whatsapp/connection?companyId=${companyId}`);
      const data = await response.json();

      if (data.success && data.connection) {
        setConnection({
          isConnected: data.connection.isConnected,
          phoneNumberId: data.connection.phoneNumberId,
          displayPhoneNumber: data.connection.displayPhoneNumber,
          businessAccountId: data.connection.businessAccountId,
          verifiedName: data.connection.verifiedName,
          qualityRating: data.connection.qualityRating,
          messagingLimit: data.connection.messagingLimit,
        });
      } else {
        setConnection({ isConnected: false });
      }
    } catch {
      setConnection({ isConnected: false });
      setError('Fehler beim Prüfen der Verbindung');
    }
  }, [companyId, setConnection, setError]);

  const connect = useCallback(async (authCode: string) => {
    if (!companyId) return;

    try {
      const response = await fetch('/api/whatsapp/connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, authCode }),
      });

      const data = await response.json();

      if (data.success) {
        await checkConnection();
        return { success: true };
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Verbindung fehlgeschlagen');
      return { success: false, error: error instanceof Error ? error.message : 'Verbindung fehlgeschlagen' };
    }
  }, [companyId, checkConnection, setError]);

  const disconnect = useCallback(async () => {
    if (!companyId) return;

    try {
      const response = await fetch(`/api/whatsapp/connection?companyId=${companyId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setConnection({ isConnected: false });
        return { success: true };
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Trennung fehlgeschlagen');
      return { success: false, error: error instanceof Error ? error.message : 'Trennung fehlgeschlagen' };
    }
  }, [companyId, setConnection, setError]);

  const refreshToken = useCallback(async () => {
    if (!companyId) return;

    try {
      const response = await fetch('/api/whatsapp/connection/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId }),
      });

      const data = await response.json();

      if (data.success) {
        return { success: true };
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Token-Aktualisierung fehlgeschlagen');
      return { success: false };
    }
  }, [companyId, setError]);

  const updateProfile = useCallback(async (profile: {
    about?: string;
    address?: string;
    description?: string;
    email?: string;
    websites?: string[];
    vertical?: string;
  }) => {
    if (!companyId) return;

    try {
      const response = await fetch('/api/whatsapp/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, ...profile }),
      });

      const data = await response.json();

      if (data.success) {
        return { success: true };
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Profil-Update fehlgeschlagen');
      return { success: false };
    }
  }, [companyId, setError]);

  // Auto-Check bei Mount
  useEffect(() => {
    if (autoCheck) {
      checkConnection();
    }
  }, [autoCheck, checkConnection]);

  return {
    connection,
    isConnected: connection.isConnected,
    checkConnection,
    connect,
    disconnect,
    refreshToken,
    updateProfile,
  };
}
