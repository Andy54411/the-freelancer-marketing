'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, AlertCircle, Building2, CreditCard, CheckCircle } from 'lucide-react';

interface Bank {
  id: number;
  name: string;
  isTestBank?: boolean;
}

export default function ConnectBankPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const uid = params.uid as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availableBanks, setAvailableBanks] = useState<Bank[]>([]);
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    if (user && uid) {
      loadAvailableBanks();
    }
  }, [user, uid]);

  if (!user || user.uid !== uid) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Zugriff verweigert</h2>
          <p className="text-gray-600">Sie sind nicht berechtigt, diese Seite zu sehen.</p>
        </div>
      </div>
    );
  }

  const loadAvailableBanks = async () => {
    setLoading(true);
    setError(null);
    try {
      // This API route needs to be created.
      // It will get a user token and then fetch the banks from finAPI.
      const response = await fetch(`/api/finapi/banks?userId=${uid}`);
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.details || 'Banken konnten nicht geladen werden.');
      }
      const data = await response.json();
      setAvailableBanks(data.banks || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein unbekannter Fehler ist aufgetreten.');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectBank = async () => {
    if (!selectedBank) return;

    setIsConnecting(true);
    setConnectionStatus('idle');
    setConnectionError(null);

    try {
      // This API route needs to be created.
      // It will take the userId and bankId and initiate the bank connection process.
      const response = await fetch('/api/finapi/connect-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid, bankId: selectedBank.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || 'Die Bankverbindung konnte nicht hergestellt werden.');
      }

      if (data.redirectUrl) {
        // Redirect to finAPI's secure web form for credentials
        window.location.href = data.redirectUrl;
      } else {
        // Handle cases where no redirect is needed (less common)
        setConnectionStatus('success');
      }
    } catch (err) {
      setConnectionError(
        err instanceof Error ? err.message : 'Ein unbekannter Fehler ist aufgetreten.'
      );
      setConnectionStatus('error');
    } finally {
      setIsConnecting(false);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 text-[#14ad9f] animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Lade verfügbare Banken...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900">Fehler</h3>
          <p className="text-red-600 mt-2 mb-6">{error}</p>
          <button
            onClick={loadAvailableBanks}
            className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700"
          >
            Erneut versuchen
          </button>
        </div>
      );
    }

    if (connectionStatus === 'success') {
      return (
        <div className="text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Verbindung erfolgreich!</h2>
          <p className="text-gray-600 mb-6">
            Ihre Bank wurde erfolgreich verbunden. Sie können nun Ihre Konten synchronisieren.
          </p>
          <button
            onClick={() => router.push(`/dashboard/company/${uid}/finance/banking/accounts`)}
            className="w-full max-w-xs mx-auto bg-[#14ad9f] text-white py-3 px-6 rounded-lg font-semibold hover:bg-[#129488]"
          >
            Zur Kontenübersicht
          </button>
        </div>
      );
    }

    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <CreditCard className="h-12 w-12 text-[#14ad9f] mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900">Bankverbindung herstellen</h2>
          <p className="text-gray-600 mt-2">
            Wählen Sie Ihre Bank aus, um die Verbindung über finAPI sicher herzustellen.
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Verfügbare Banken
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableBanks.map(bank => (
                <div
                  key={bank.id}
                  onClick={() => setSelectedBank(bank)}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedBank?.id === bank.id
                      ? 'border-[#14ad9f] bg-teal-50 ring-2 ring-[#14ad9f]'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <h3 className="font-medium text-gray-900">{bank.name}</h3>
                  {bank.isTestBank && (
                    <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                      Test-Bank
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {connectionStatus === 'error' && (
            <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <span className="text-red-700">{connectionError}</span>
            </div>
          )}

          <button
            onClick={handleConnectBank}
            disabled={!selectedBank || isConnecting}
            className="w-full bg-[#14ad9f] text-white py-3 px-4 rounded-md hover:bg-[#129488] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f] disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
          >
            {isConnecting ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                <span>Verbindung wird hergestellt...</span>
              </>
            ) : (
              'Bank verbinden'
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Bankverbindung</h1>
        <p className="text-gray-600 mt-1">Stellen Sie eine Verbindung zu Ihrem Bankkonto her.</p>
      </div>

      <div className="bg-white rounded-lg shadow p-8 min-h-[400px] flex items-center justify-center">
        {renderContent()}
      </div>
    </div>
  );
}
