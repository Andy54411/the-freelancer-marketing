'use client';

import * as React from 'react';
import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { lockAccount, unlockAccount } from '../actions';
import { FiLoader, FiLock, FiUnlock } from 'react-icons/fi';

export interface ActionButtonsProps {
    companyId: string;
    isLocked: boolean;
}

export default function ActionButtons({ companyId, isLocked }: ActionButtonsProps) {
    const [isPending, startTransition] = useTransition();

    const handleLock = () => {
        startTransition(async () => {
            const result = await lockAccount(companyId);
            if (result.error) {
                // Consider using a toast notification library like sonner for better UX
                alert(`Fehler: ${result.error}`);
            }
        });
    };

    const handleUnlock = () => {
        startTransition(async () => {
            const result = await unlockAccount(companyId);
            if (result.error) {
                alert(`Fehler: ${result.error}`);
            }
        });
    };

    return (
        <div className="flex items-center gap-2">
            {isLocked ? (
                <Button onClick={handleUnlock} disabled={isPending} variant="outline">
                    {isPending ? <FiLoader className="animate-spin mr-2" /> : <FiUnlock className="mr-2" />}
                    Konto entsperren
                </Button>
            ) : (
                <Button onClick={handleLock} disabled={isPending} variant="destructive">
                    {isPending ? <FiLoader className="animate-spin mr-2" /> : <FiLock className="mr-2" />}
                    Konto sperren
                </Button>
            )}
        </div>
    );
}