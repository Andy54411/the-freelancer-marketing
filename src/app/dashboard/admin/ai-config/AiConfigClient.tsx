'use client';

import AiConfigForm from './AiConfigForm';
import type { AiConfig } from '@/lib/ai-config-data';

interface AiConfigClientProps {
    initialConfig: AiConfig;
}

export default function AiConfigClient({ initialConfig }: AiConfigClientProps) {
    // The data is now passed as a prop, so no more useEffect, useState for data fetching.
    // The form itself handles its own state for updates.
    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-4">Gemini KI Konfiguration</h1>
            <p className="text-gray-600 mb-6">Bearbeite hier die Wissensdatenbank und die Verhaltensregeln für den Chatbot.</p>
            <AiConfigForm config={initialConfig} />
        </div>
    );
}