'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext'; // Pfade müssen korrekt sein
import { RegistrationProvider } from '@/contexts/registrationContext';

export function Providers({ children }: { children: ReactNode }) {
    // Alle Provider, die du vorher in _app.tsx hattest, kommen hier rein.
    return (
        <AuthProvider>
            <RegistrationProvider>
                {children}
            </RegistrationProvider>
        </AuthProvider>
    );
}
