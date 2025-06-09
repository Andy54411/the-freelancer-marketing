'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { RegistrationProvider } from '@/contexts/registrationContext';
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