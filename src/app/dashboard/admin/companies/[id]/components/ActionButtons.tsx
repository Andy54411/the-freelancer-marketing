"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner'; // Geändert von use-toast zu sonner
import { useRouter } from 'next/navigation';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '@/contexts/AuthContext';


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
            const functions = getFunctions();
            const deleteCompanyAccount = httpsCallable(functions, 'deleteCompanyAccount');
            
            console.log(`[ActionButtons] Aufruf der Cloud Function 'deleteCompanyAccount' für companyId: ${companyId}`);
            await deleteCompanyAccount({ companyId: companyId });
            console.log('[ActionButtons] Cloud Function erfolgreich aufgerufen');

            toast.success(`Die Firma "${companyName}" wurde erfolgreich gelöscht.`);
            router.push('/dashboard/admin/companies');
            router.refresh();
        } catch (error: any) {
            console.error('[ActionButtons] Fehler beim Löschen der Firma:', error);
            toast.error('Fehler beim Löschen', {
                description: error.message || 'Ein unbekannter Fehler ist aufgetreten.',
            });
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