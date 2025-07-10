'use client';

import { useEffect, useState } from 'react';
import AiConfigForm from './AiConfigForm';
import type { AiConfig } from '@/lib/ai-config-data';
import { FiLoader } from 'react-icons/fi';

interface AiConfigClientProps {
    initialConfig?: AiConfig;
}

export default function AiConfigClient({ initialConfig }: AiConfigClientProps) {
    const [config, setConfig] = useState<AiConfig | null>(initialConfig || null);
    const [loading, setLoading] = useState(!initialConfig);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!initialConfig) {
            fetchConfig();
        }
    }, [initialConfig]);

    const fetchConfig = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch('/api/ai-config');
            if (!response.ok) {
                throw new Error(`Fehler beim Laden der Konfiguration: ${response.status}`);
            }
            const data = await response.json();
            setConfig(data);
        } catch (err) {
            console.error('Fehler beim Laden der AI-Konfiguration:', err);
            setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-32">
                <FiLoader className="animate-spin text-2xl" />
                <span className="ml-2">Lade Konfiguration...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                <strong>Fehler:</strong> {error}
                <button
                    onClick={fetchConfig}
                    className="ml-4 underline hover:no-underline"
                >
                    Erneut versuchen
                </button>
            </div>
        );
    }

    if (!config) {
        return (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
                Keine Konfiguration gefunden.
            </div>
        );
    }

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-4">Gemini KI Konfiguration</h1>
            <p className="text-gray-600 mb-6">Bearbeite hier die Wissensdatenbank und die Verhaltensregeln für den Chatbot.</p>
            <AiConfigForm config={config} />
        </div>
    );
}