// Beispiel: /Users/andystaudinger/Taskilo/src/app/auftrag/layout.tsx
import { RegistrationProvider } from '@/contexts/Registration-Context';
import React from 'react';

export default function AuftragLayout({ children }: { children: React.ReactNode }) {
    return (
        <RegistrationProvider>
            {children}
        </RegistrationProvider>
    );
}
