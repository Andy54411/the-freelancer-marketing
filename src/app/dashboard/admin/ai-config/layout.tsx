import { Suspense } from 'react';
import { FiLoader } from 'react-icons/fi';

export const dynamic = 'force-dynamic';

export default function AiConfigLayout({ children }: { children: React.ReactNode }) {
    return (
        <Suspense fallback={
            <div className="flex justify-center items-center h-32">
                <FiLoader className="animate-spin text-2xl" />
                <span className="ml-2">Lade Konfiguration...</span>
            </div>
        }>
            {children}
        </Suspense>
    );
}
