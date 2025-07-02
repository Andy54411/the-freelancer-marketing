'use client';

import { useTransition } from 'react';
import { lockAccount, unlockAccount } from './actions';
import { Button } from '@/components/ui/button';
import { LoaderCircle } from 'lucide-react';

interface ActionButtonsProps {
    companyId: string;
    status: 'active' | 'locked' | string; // Erlaubt andere Strings für Robustheit
}

export default function ActionButtons({ companyId, status }: ActionButtonsProps) {
    const [isPending, startTransition] = useTransition();

    const handleLock = () => {
        startTransition(async () => {
            const result = await lockAccount(companyId);
            if (result?.error) {
                alert(`Fehler: ${result.error}`); // Später durch eine Toast-Benachrichtigung ersetzen
            }
        });
    };

    const handleUnlock = () => {
        startTransition(async () => {
            const result = await unlockAccount(companyId);
            if (result?.error) {
                alert(`Fehler: ${result.error}`); // Später durch eine Toast-Benachrichtigung ersetzen
            }
        });
    };

    return (
        <div className="flex gap-4 mt-6 border-t pt-6">
            <Button onClick={handleLock} disabled={isPending || status === 'locked'} variant="destructive">
                {isPending && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />} Account sperren
            </Button>
            <Button onClick={handleUnlock} disabled={isPending || status !== 'locked'}>
                {isPending && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />} Account entsperren
            </Button>
        </div>
    );
}