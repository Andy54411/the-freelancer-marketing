'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, Plus, Link as LinkIcon, Loader2 } from 'lucide-react';

export default function GoogleAdsRequestPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.uid as string;

  const [customerId, setCustomerId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'select' | 'connect'>('select'); // 'select' | 'connect'

  const handleCreateAccount = async () => {
    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch(`/api/companies/${companyId}/integrations/google-ads/create-account`, {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        router.push(`/dashboard/company/${companyId}/taskilo-advertising/google-ads`);
      } else {
        setError(result.message || result.error || 'Fehler beim Erstellen des Kontos');
      }
    } catch (err) {
      setError('Ein Fehler ist aufgetreten');
    } finally {
      setIsCreating(false);
    }
  };

  const handleConnectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/companies/${companyId}/integrations/google-ads/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId }),
      });

      const result = await response.json();

      if (result.success) {
        router.push(`/dashboard/company/${companyId}/taskilo-advertising/google-ads`);
      } else {
        if (result.error === 'PRODUCTION_ACCOUNT_NOT_SUPPORTED' || result.isProductionAccount) {
          setError(
            `❌ Production Account erkannt!\n\n` +
            `Customer ID ${customerId} ist ein Production Account.\n` +
            `Bitte nutzen Sie die Funktion "Neues Test-Konto erstellen".`
          );
        } else {
          setError(result.message || result.error || 'Fehler bei der Verbindung');
        }
      }
    } catch (err) {
      setError('Ein Fehler ist aufgetreten');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto pt-8">
        <button
          onClick={() => mode === 'connect' ? setMode('select') : router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück
        </button>

        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Google Ads einrichten
          </h1>
          <p className="text-gray-500 mb-8">
            Starten Sie mit Google Ads für Ihr Unternehmen.
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-300 rounded-lg">
              <p className="text-red-900 font-bold mb-2">⚠️ Fehler</p>
              <p className="text-red-800 whitespace-pre-line text-sm">{error}</p>
            </div>
          )}

          {mode === 'select' ? (
            <div className="space-y-4">
              <button
                onClick={handleCreateAccount}
                disabled={isCreating}
                className="w-full flex items-center justify-between p-4 bg-[#14ad9f]/10 border-2 border-[#14ad9f] rounded-xl hover:bg-[#14ad9f]/20 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[#14ad9f] rounded-full flex items-center justify-center text-white">
                    {isCreating ? <Loader2 className="w-6 h-6 animate-spin" /> : <Plus className="w-6 h-6" />}
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-gray-900">Neues Konto erstellen</h3>
                    <p className="text-sm text-gray-600">Automatisch ein Test-Konto anlegen</p>
                  </div>
                </div>
              </button>

              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="px-2 bg-white text-sm text-gray-500">oder</span>
                </div>
              </div>

              <button
                onClick={() => setMode('connect')}
                className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-gray-400 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 group-hover:bg-gray-200">
                    <LinkIcon className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-gray-900">Bestehendes Konto verbinden</h3>
                    <p className="text-sm text-gray-600">Vorhandene Customer ID eingeben</p>
                  </div>
                </div>
              </button>
            </div>
          ) : (
            <form onSubmit={handleConnectSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Google Ads Customer ID
                </label>
                <input
                  type="text"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  placeholder="123-456-7890"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent"
                  required
                />
                <p className="mt-2 text-sm text-gray-500">
                  Sie finden Ihre Customer ID oben rechts in Ihrem Google Ads Account.
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !customerId.trim()}
                className="w-full bg-[#14ad9f] hover:bg-taskilo-hover disabled:bg-gray-300 text-white font-medium py-3 px-6 rounded-lg transition-colors"
              >
                {isSubmitting ? 'Wird verbunden...' : 'Jetzt verbinden'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
