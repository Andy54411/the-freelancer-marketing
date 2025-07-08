"use client";

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
}

export default function ActionButtons({ companyId, companyName }: ActionButtonsProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const router = useRouter();
    const { user } = useAuth();

    const handleDelete = async () => {
        if (!user) {
            toast.error('Authentifizierung fehlgeschlagen. Bitte melden Sie sich erneut an.');
            return;
        }

        if (!confirm(`Sind Sie sicher, dass Sie die Firma "${companyName}" und alle zugehörigen Daten endgültig löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.`)) {
            return;
        }

        setIsDeleting(true);
        try {
            const deleteCompanyAccount = httpsCallable(functions, 'deleteCompanyAccount');

            console.log(`[ActionButtons] Aufruf der Cloud Function 'deleteCompanyAccount' für companyId: ${companyId}`);
            await deleteCompanyAccount({ companyId: companyId });
            console.log('[ActionButtons] Cloud Function erfolgreich aufgerufen');

            toast.success(`Die Firma "${companyName}" wurde erfolgreich gelöscht.`);
            router.push('/dashboard/admin/companies');
            router.refresh();
        } catch (error: any) {
            // Wenn der Fehler "nicht gefunden" lautet, bedeutet das, dass die Firma bereits gelöscht wurde.
            // Wir behandeln dies als Erfolg, um die Benutzeroberfläche zu aktualisieren.
            if (error.code === 'functions/not-found') {
                console.log('[ActionButtons] Firma war bereits gelöscht oder wurde gerade erfolgreich gelöscht. Behandle als Erfolg.');
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
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? 'Wird gelöscht...' : 'Firma löschen'}
            </Button>
        </div>
    );
}