"use client";

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { FiTrash2, FiSlash, FiLoader, FiLock, FiUnlock, FiCheck } from 'react-icons/fi';
import { toast } from 'sonner';
import { lockAccount, unlockAccount, deactivateCompany } from '../actions';
import { useRouter } from 'next/navigation';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth


interface ActionButtonsProps {
    companyId: string;
    isLocked: boolean;
    status: 'active' | 'locked' | 'deactivated' | 'unknown';
    companyName: string;
}

export default function ActionButtons({ companyId, isLocked, status, companyName }: ActionButtonsProps) {
    const [isPending, startTransition] = useTransition();
    const [isDeleting, setIsDeleting] = useState(false);
    const router = useRouter();
    const { user } = useAuth(); // Get the current user

    const handleToggleLock = () => {
        startTransition(() => {
            const action = isLocked ? unlockAccount : lockAccount;
            action(companyId).then((result) => {
                if (result.error) {
                    toast.error("Fehler", { description: result.error });
                } else {
                    toast.success("Erfolg", { description: `Konto wurde erfolgreich ${isLocked ? 'entsperrt' : 'gesperrt'}.` });
                }
            });
        });
    };

    const handleDeactivate = () => {
        startTransition(() => {
            const shouldDeactivate = status !== 'deactivated';
            deactivateCompany(companyId, shouldDeactivate).then((result) => {
                if (result.error) {
                    toast.error("Fehler", { description: result.error });
                } else {
                    toast.success("Erfolg", { description: `Konto wurde erfolgreich ${shouldDeactivate ? 'deaktiviert' : 'reaktiviert'}.` });
                }
            });
        });
    };

    const handleDelete = async () => {
        if (!user) {
            toast({
                title: 'Fehler',
                description: 'Authentifizierung fehlgeschlagen. Bitte melden Sie sich erneut an.',
                variant: 'destructive',
            });
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
            const result = await deleteCompanyAccount({ companyId: companyId });
            console.log('[ActionButtons] Cloud Function erfolgreich aufgerufen', result);

            toast({
                title: 'Erfolg',
                description: `Die Firma "${companyName}" wurde erfolgreich gelöscht.`,
            });
            router.push('/dashboard/admin/companies');
            router.refresh();
        } catch (error: any) {
            console.error('[ActionButtons] Fehler beim Löschen der Firma:', error);
            toast({
                title: 'Fehler beim Löschen',
                description: error.message || 'Ein unbekannter Fehler ist aufgetreten.',
                variant: 'destructive',
            });
        } finally {
            setIsDeleting(false);
        }
    };

    const isDeactivated = status === 'deactivated';

    return (
        <div className="flex items-center gap-2">
            <Button onClick={handleToggleLock} disabled={isPending || isDeactivated} variant={isLocked ? "outline" : "secondary"}>
                {isPending ? <FiLoader className="animate-spin mr-2" /> : (isLocked ? <FiUnlock className="mr-2" /> : <FiLock className="mr-2" />)}
                {isLocked ? 'Entsperren' : 'Sperren'}
            </Button>

            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant={isDeactivated ? "default" : "secondary"} disabled={isPending}>
                        {isPending ? <FiLoader className="animate-spin mr-2" /> : (isDeactivated ? <FiCheck className="mr-2" /> : <FiSlash className="mr-2" />)}
                        {isDeactivated ? 'Reaktivieren' : 'Deaktivieren'}
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Sind Sie sicher?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Möchten Sie dieses Firmenkonto wirklich {isDeactivated ? 'reaktivieren' : 'deaktivieren'}?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeactivate} disabled={isPending}>
                            {isPending ? <FiLoader className="animate-spin" /> : 'Fortfahren'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={isPending}>
                        {isPending ? <FiLoader className="animate-spin mr-2" /> : <FiTrash2 className="mr-2" />}
                        Löschen
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Endgültig löschen?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Diese Aktion kann nicht rückgängig gemacht werden. Dadurch wird das Firmenkonto und alle zugehörigen Daten dauerhaft gelöscht.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={isPending || isDeleting} className="bg-red-600 hover:bg-red-700">
                            {isPending || isDeleting ? <FiLoader className="animate-spin" /> : 'Endgültig löschen'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}