// /Users/andystaudinger/Tasko/src/app/providers.tsx
'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
// KORREKTUR: Der Import-Pfad muss exakt dem Dateinamen entsprechen (wahrscheinlich mit Bindestrich)
import { RegistrationProvider } from '@/contexts/Registration-Context';
import { GoogleMapsLoaderProvider } from '@/contexts/GoogleMapsLoaderContext';

export function Providers({ children }: { children: ReactNode }) {
    return (
        <GoogleMapsLoaderProvider>
            <AuthProvider>
                <RegistrationProvider>
                    {children}
                </RegistrationProvider>
            </AuthProvider>
        </GoogleMapsLoaderProvider>
    );
}