import React, { Suspense } from 'react';
import { FiLoader } from 'react-icons/fi';
import AdminLayout from './components/AdminLayout';
import AdminSupportChat from './components/AdminSupportChat';

export const dynamic = "force-dynamic";

export default function Page() {
    return (
        <AdminLayout>
            {/* 
              Suspense ist notwendig, da AdminSupportChat `useSearchParams` verwendet.
              Dadurch kann der Rest der Seite auf dem Server gerendert werden, während diese Komponente auf dem Client geladen wird.
            */}
            <Suspense fallback={<div className="flex h-full items-center justify-center"><FiLoader className="animate-spin text-2xl" /></div>}>
                <AdminSupportChat />
            </Suspense>
        </AdminLayout>
    );
}