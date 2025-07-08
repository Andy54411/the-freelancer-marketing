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
import { lockAccount, unlockAccount, deactivateCompany, deleteCompany } from '../actions';
import { getSessionCookie } from '@/lib/get-session-cookie';


interface ActionButtonsProps {
    companyId: string;
    isLocked: boolean;
    status: 'active' | 'locked' | 'deactivated' | 'unknown';
}

export default function ActionButtons({ companyId, isLocked, status }: ActionButtonsProps) {
    const [isPending, startTransition] = useTransition();

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

    const handleDelete = () => {
        startTransition(() => {
            getSessionCookie().then((sessionCookie) => {
                if (!sessionCookie) {
                    toast.error("Fehler", { description: "Sitzung nicht gefunden. Bitte neu anmelden." });
                    return;
                }
                deleteCompany(companyId, sessionCookie).then((result) => {
                    if (result.error) {
                        toast.error("Fehler", { description: result.error });
                    } else {
                        toast.success("Erfolg", { description: "Das Firmenkonto wurde endgültig gelöscht." });
                        // Leitet den Benutzer nach erfolgreicher Löschung zur Übersichtsseite weiter.
                        window.location.href = '/dashboard/admin/companies';
                    }
                });
            });
        });
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
                        <AlertDialogAction onClick={handleDelete} disabled={isPending} className="bg-red-600 hover:bg-red-700">
                            {isPending ? <FiLoader className="animate-spin" /> : 'Endgültig löschen'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}