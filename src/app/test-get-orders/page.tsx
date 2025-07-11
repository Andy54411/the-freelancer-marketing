'use client';

import { useState } from 'react';
import { callHttpsFunction } from '@/lib/httpsFunctions';
import { useAuth } from '@/contexts/AuthContext';

export default function TestGetOrders() {
    const { user } = useAuth();
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const testGetProviderOrders = async () => {
        if (!user) {
            setError('Kein Benutzer angemeldet');
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            console.log('Teste getProviderOrders mit GET-Anfrage...');
            const response = await callHttpsFunction('getProviderOrders', {
                providerId: user.uid
            }, 'GET');

            console.log('Antwort erhalten:', response);
            setResult(response);
        } catch (err: any) {
            console.error('Fehler beim Aufruf:', err);
            setError(err.message || 'Unbekannter Fehler');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Test getProviderOrders</h1>

            <div className="mb-4">
                <p>Angemeldeter Benutzer: {user?.email || 'Nicht angemeldet'}</p>
                <p>Benutzer-ID: {user?.uid || 'Keine ID'}</p>
            </div>

            <button
                onClick={testGetProviderOrders}
                disabled={loading || !user}
                className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-300"
            >
                {loading ? 'Lade...' : 'Test getProviderOrders'}
            </button>

            {error && (
                <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                    <h3 className="font-bold">Fehler:</h3>
                    <p>{error}</p>
                </div>
            )}

            {result && (
                <div className="mt-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
                    <h3 className="font-bold">Erfolg:</h3>
                    <pre className="mt-2 text-sm overflow-x-auto">
                        {JSON.stringify(result, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
}
