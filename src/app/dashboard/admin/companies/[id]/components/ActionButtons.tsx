'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { httpsCallable } from 'firebase/functions';
import { useAuth } from '@/contexts/AuthContext';
import { functions } from '@/firebase/clients';

interface ActionButtonsProps {
  companyId: string;
  companyName: string;
  status?: string;
}

export default function ActionButtons({ companyId, companyName, status }: ActionButtonsProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  const handleStatusToggle = async () => {
    if (!user) {
      toast.error('Authentifizierung fehlgeschlagen. Bitte melden Sie sich erneut an.');
      return;
    }

    const newStatus = status === 'locked' ? 'active' : 'locked';
    const actionText = newStatus === 'active' ? 'freischalten' : 'sperren';

    if (!confirm(`Möchten Sie die Firma "${companyName}" wirklich ${actionText}?`)) {
      return;
    }

    setIsUpdatingStatus(true);
    try {
      const updateCompanyStatus = httpsCallable(functions, 'updateCompanyStatus');

      await updateCompanyStatus({
        companyId: companyId,
        status: newStatus,
      });

      toast.success(
        `Die Firma "${companyName}" wurde erfolgreich ${newStatus === 'active' ? 'freigeschaltet' : 'gesperrt'}.`
      );
      router.refresh();
    } catch (error: any) {
      console.error('[ActionButtons] Fehler beim Aktualisieren des Status:', error);
      toast.error('Fehler beim Aktualisieren', {
        description: error.message || 'Ein unbekannter Fehler ist aufgetreten.',
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDelete = async () => {
    if (!user) {
      toast.error('Authentifizierung fehlgeschlagen. Bitte melden Sie sich erneut an.');
      return;
    }

    if (
      !confirm(
        `Sind Sie sicher, dass Sie die Firma "${companyName}" und alle zugehörigen Daten endgültig löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.`
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      const deleteCompanyAccount = httpsCallable(functions, 'deleteCompanyAccount');

      console.log(
        `[ActionButtons] Aufruf der Cloud Function 'deleteCompanyAccount' für companyId: ${companyId}`
      );
      await deleteCompanyAccount({ companyId: companyId });
      console.log('[ActionButtons] Cloud Function erfolgreich aufgerufen');

      toast.success(`Die Firma "${companyName}" wurde erfolgreich gelöscht.`);
      router.push('/dashboard/admin/companies');
      router.refresh();
    } catch (error: any) {
      // Wenn der Fehler "nicht gefunden" lautet, bedeutet das, dass die Firma bereits gelöscht wurde.
      // Wir behandeln dies als Erfolg, um die Benutzeroberfläche zu aktualisieren.
      if (error.code === 'functions/not-found') {
        console.log(
          '[ActionButtons] Firma war bereits gelöscht oder wurde gerade erfolgreich gelöscht. Behandle als Erfolg.'
        );
        toast.success(`Die Firma "${companyName}" wurde erfolgreich gelöscht.`);
        router.push('/dashboard/admin/companies');
        router.refresh();
      } else {
        console.error('[ActionButtons] Fehler beim Löschen der Firma:', error);
        toast.error('Fehler beim Löschen', {
          description: error.message || 'Ein unbekannter Fehler ist aufgetreten.',
        });
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex justify-end space-x-4">
      <Button
        variant={status === 'locked' ? 'default' : 'outline'}
        onClick={handleStatusToggle}
        disabled={isUpdatingStatus}
      >
        {isUpdatingStatus
          ? 'Wird aktualisiert...'
          : status === 'locked'
            ? 'Firma freischalten'
            : 'Firma sperren'}
      </Button>
      <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
        {isDeleting ? 'Wird gelöscht...' : 'Firma löschen'}
      </Button>
    </div>
  );
}
