"use client";

import { Button } from "@/components/ui/button";
import { useTransition } from "react";
import { lockAccount, unlockAccount } from "../actions";

interface ActionButtonsProps {
    companyId: string;
    isLocked: boolean;
}

export function ActionButtons({ companyId, isLocked }: ActionButtonsProps) {
    const [isPending, startTransition] = useTransition();

    const handleToggleLock = () => {
        startTransition(async () => {
            const action = isLocked ? unlockAccount : lockAccount;
            const result = await action(companyId);
            if (result?.error) {
                // In einer echten App würden Sie hier ein Toast-Feedback verwenden
                alert(result.error);
            }
        });
    };

    const handleRequestVerification = () => {
        // TODO: Implementiere Server Action zum Anfordern der Verifizierung
        alert(`Fordere Verifizierung an für: ${companyId}`);
    };

    return (
        <div className="flex gap-2">
            <Button
                variant={isLocked ? "secondary" : "destructive"}
                onClick={handleToggleLock}
                disabled={isPending}
            >
                {isPending ? (isLocked ? "Wird entsperrt..." : "Wird gesperrt...") : (isLocked ? "Account entsperren" : "Account sperren")}
            </Button>
            <Button onClick={handleRequestVerification}>
                Verifizierung anfordern
            </Button>
        </div>
    );
}