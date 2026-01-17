'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UpdateService } from '@/services/updateService';
import { UpdateNotification } from '@/types/updates';
import { toast } from 'sonner';

export const useUpdateNotifications = () => {
  const { user } = useAuth();
  const [unseenUpdates, setUnseenUpdates] = useState<UpdateNotification[]>([]);
  const [unseenCount, setUnseenCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  // Updates laden
  const loadUnseenUpdates = useCallback(async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      const updates = await UpdateService.getUnseenUpdates(user.uid);
      const count = await UpdateService.getUnseenUpdateCount(user.uid);

      setUnseenUpdates(updates);
      setUnseenCount(count);

      // Zeige Notification, wenn neue Updates verfügbar sind
      if (updates.length > 0) {
        const latestUpdate = updates[0];
        toast.info(`🎉 Neue Updates verfügbar! ${latestUpdate.title}`, {
          action: {
            label: 'Anzeigen',
            onClick: () => setShowNotificationModal(true),
          },
          duration: 10000,
        });
      }
    } catch (error) {
      console.error('Fehler beim Laden der Updates:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  // Update als gesehen markieren
  const markUpdateAsSeen = useCallback(
    async (updateId: string, version: string) => {
      if (!user?.uid) return;

      try {
        await UpdateService.markUpdateAsSeen(user.uid, updateId, version);
        await loadUnseenUpdates(); // Reload nach dem Markieren
      } catch (error) {
        console.error('Fehler beim Markieren des Updates:', error);
      }
    },
    [user?.uid, loadUnseenUpdates]
  );

  // Alle Updates als gesehen markieren
  const markAllAsSeen = useCallback(async () => {
    if (!user?.uid) return;

    try {
      await UpdateService.markAllUpdatesAsSeen(user.uid);
      setUnseenUpdates([]);
      setUnseenCount(0);
      setShowNotificationModal(false);
      toast.success('Alle Updates als gelesen markiert');
    } catch (error) {
      console.error('Fehler beim Markieren aller Updates:', error);
      toast.error('Fehler beim Markieren der Updates');
    }
  }, [user?.uid]);

  // Update verwerfen
  const dismissUpdate = useCallback(
    async (updateId: string, version: string) => {
      if (!user?.uid) return;

      try {
        await UpdateService.dismissUpdate(user.uid, updateId, version);
        await loadUnseenUpdates(); // Reload nach dem Verwerfen
        toast.success('Update verworfen');
      } catch (error) {
        console.error('Fehler beim Verwerfen des Updates:', error);
        toast.error('Fehler beim Verwerfen des Updates');
      }
    },
    [user?.uid, loadUnseenUpdates]
  );

  // Real-Time Subscription zu unseen updates
  useEffect(() => {
    if (!user?.uid) {
      setUnseenUpdates([]);
      setUnseenCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Subscribe zu Real-Time Updates
    const unsubscribe = UpdateService.subscribeToUnseenUpdates(user.uid, (unseenUpdates, count) => {
      setUnseenUpdates(unseenUpdates);
      setUnseenCount(count);
      setLoading(false);

      // Zeige Toast nur wenn neue Updates hinzukommen (nicht beim initialen Load)
      if (count > unseenCount && unseenCount > 0) {
        const latestUpdate = unseenUpdates[0];
        toast.info(`🎉 Neue Updates verfügbar! ${latestUpdate.title}`, {
          action: {
            label: 'Anzeigen',
            onClick: () => setShowNotificationModal(true),
          },
          duration: 10000,
        });
      }
    });

    // Use setTimeout to defer unsubscribe and avoid Firestore internal assertion errors
    return () => {
      setTimeout(() => unsubscribe(), 0);
    };
  }, [user?.uid]); // Entferne loadUnseenUpdates aus deps, da wir es nicht mehr brauchen

  return {
    unseenUpdates,
    unseenCount,
    loading,
    showNotificationModal,
    setShowNotificationModal,
    markUpdateAsSeen,
    markAllAsSeen,
    dismissUpdate,
    refreshUpdates: loadUnseenUpdates,
  };
};
