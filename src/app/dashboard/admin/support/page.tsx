'use client';

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import React, { Suspense } from 'react';
import { FiLoader } from 'react-icons/fi';
import AdminSupportChat from './components/AdminSupportChat'; // NEU: Importiere die Hauptkomponente

export default function AdminSupportPage() {
    return (
        // Suspense ist notwendig, da AdminSupportChat jetzt `useSearchParams` verwendet.
        <Suspense fallback={<div className="flex justify-center items-center h-full"><FiLoader className="animate-spin text-2xl" /></div>}>
            <AdminSupportChat />
        </Suspense>
    );
}