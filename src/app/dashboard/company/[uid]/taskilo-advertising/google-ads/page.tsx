'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import GoogleAdsInterface from '@/components/taskilo-advertising/GoogleAdsInterface';

export default function GoogleAdsPage() {
  const params = useParams();
  const companyId = params.uid as string;
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkConnectionStatus = async () => {
      try {
        // Prüfe direkt in Firebase Collection, ob Google Ads Token existieren
        const response = await fetch(`/api/companies/${companyId}/integrations/google-ads`);
        const data = await response.json();
        
        // Verbunden wenn Access Token vorhanden
        setIsConnected(data.success && data.hasAccessToken);
      } catch (error) {
        console.error('Fehler beim Prüfen der Verbindung:', error);
        setIsConnected(false);
      } finally {
        setIsLoading(false);
      }
    };

    if (companyId) {
      checkConnectionStatus();
    }
  }, [companyId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Prüfe Google Ads Verbindung...</p>
        </div>
      </div>
    );
  }

  // Wenn verbunden, zeige das vollständige Google Ads Interface
  if (isConnected) {
    return <GoogleAdsInterface companyId={companyId} />;
  }

  // Wenn nicht verbunden, zeige Verbindungsseite
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        <div className="w-16 h-16 bg-linear-to-br from-blue-500 via-green-500 to-yellow-500 rounded-lg mx-auto mb-6"></div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Google Ads verbinden</h2>
        <p className="text-gray-600 mb-6">
          Verbinden Sie Ihr Google Ads Konto, um Kampagnen zu verwalten und zu erstellen.
        </p>
        <button
          onClick={() => window.location.href = `/api/multi-platform-advertising/auth/google-ads?companyId=${companyId}`}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
        >
          Mit Google Ads verbinden
        </button>
      </div>
    </div>
  );
}