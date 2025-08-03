'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  PlusCircle,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Loader2,
  User,
  CreditCard,
  Building2,
  Mail,
  Lock,
  FileText,
  Download,
  Upload,
} from 'lucide-react';

interface Bank {
  id: number;
  name: string;
  bic?: string;
  blz?: string;
  location?: string;
  isTestBank?: boolean;
}

export default function FinAPISetupPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const uid = params.uid as string;

  const [step, setStep] = useState<'connect-bank' | 'complete'>('connect-bank');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Bank Connection State
  const [availableBanks, setAvailableBanks] = useState<Bank[]>([]);
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [bankCredentials, setBankCredentials] = useState({
    bankingUserId: '',
    bankingPin: '',
  });

  // Check existing connections on component mount
  useEffect(() => {
    loadAvailableBanks();
  }, []);

  // Autorisierung prüfen
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

  // Load Available Banks using Taskilo's finAPI Account
  const loadAvailableBanks = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/finapi/banks?credentialType=sandbox');

      if (!response.ok) {
        throw new Error('Fehler beim Laden der Banken');
      }

      const data = await response.json();
      setAvailableBanks(data.banks || []);
    } catch (error) {
      console.error('Fehler beim Laden der Banken:', error);
      setError('Fehler beim Laden der verfügbaren Banken');
    } finally {
      setLoading(false);
    }
  };

  // Connect Bank Account using finAPI Web Form 2.0
  const connectBankAccount = async () => {
    try {
      setLoading(true);
      setError(null);

      // Generate Web Form for bank connection (no credentials needed upfront)
      const response = await fetch('/api/finapi/import-bank', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bankId: selectedBank?.id, // Optional - user can choose in web form
          userId: user.uid, // Use Firebase user ID to identify the user
          credentialType: 'sandbox',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.details || errorData.error || 'Web Form Erstellung fehlgeschlagen'
        );
      }

      const data = await response.json();

      if (data.success && data.webForm?.url) {
        setSuccess('Web Form erstellt! Sie werden zur sicheren Bank-Authentifizierung weitergeleitet...');
        console.log('Web Form created:', data.webForm);

        // Redirect to finAPI Web Form for secure bank authentication
        setTimeout(() => {
          window.location.href = data.webForm.url;
        }, 2000);
      } else {
        throw new Error('Keine Web Form URL erhalten');
      }

    } catch (error) {
      console.error('Fehler beim Erstellen der Web Form:', error);
      setError(error instanceof Error ? error.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  };

  // Complete setup and redirect to banking dashboard
  const completeSetup = () => {
    router.push(`/dashboard/company/${uid}/finance/banking/accounts`);
  };

  const renderConnectBankStep = () => (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <Building2 className="h-12 w-12 text-[#14ad9f] mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900">Bank verbinden</h2>
        <p className="text-gray-600 mt-2">
          Verbinden Sie Ihr Bankkonto sicher über unsere finAPI-Integration
        </p>
      </div>

      <div className="space-y-6">
        {loading && !availableBanks.length ? (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 text-[#14ad9f] animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Lade verfügbare Banken...</p>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Verfügbare Demo-Banken
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {availableBanks.map(bank => (
                <div
                  key={bank.id}
                  onClick={() => setSelectedBank(bank)}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedBank?.id === bank.id
                      ? 'border-[#14ad9f] bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <h3 className="font-medium text-gray-900">{bank.name}</h3>
                  {bank.location && <p className="text-sm text-gray-500">{bank.location}</p>}
                  {bank.isTestBank && (
                    <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                      Test-Bank
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedBank && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">
              Bank-Verbindung für {selectedBank.name}
            </h3>

            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <h4 className="font-medium text-green-900 mb-2">🔒 Sichere finAPI Web Form</h4>
              <p className="text-green-700 text-sm">
                Ihre Bankdaten werden sicher über finAPI&apos;s verschlüsselte Web Form verarbeitet.
                <br />• <strong>Keine Dateneingabe hier:</strong> Alles erfolgt sicher bei finAPI
                <br />• <strong>Bank-Authentifizierung:</strong> Direkt bei Ihrer Bank
                <br />• <strong>Höchste Sicherheit:</strong> PCI-DSS & DSGVO konform
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-md">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center p-3 bg-green-50 border border-green-200 rounded-md">
            <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
            <span className="text-green-700">{success}</span>
          </div>
        )}

        <button
          onClick={connectBankAccount}
          disabled={loading || !selectedBank}
          className="w-full bg-[#14ad9f] text-white py-2 px-4 rounded-md hover:bg-[#129488] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Erstelle sichere Web Form...' : 'Sichere Bank-Verbindung starten'}
        </button>
      </div>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="max-w-md mx-auto text-center">
      <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Setup abgeschlossen!</h2>
      <p className="text-gray-600 mb-6">
        Ihre Bank wurde erfolgreich verbunden. Sie können jetzt echte Banking-Daten in der
        Konten-Übersicht abrufen.
      </p>

      <div className="bg-gray-50 border border-gray-200 rounded-md p-4 mb-6">
        <h3 className="font-medium text-gray-900 mb-2">Banking-Integration:</h3>
        <p className="text-sm text-gray-600">
          <strong>Status:</strong> Aktiv
          <br />
          <strong>Bank:</strong> {selectedBank?.name || 'Unbekannt'}
          <br />
          <strong>Integration:</strong> finAPI Sandbox
        </p>
      </div>

      <button
        onClick={completeSetup}
        className="w-full bg-[#14ad9f] text-white py-2 px-4 rounded-md hover:bg-[#129488] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f]"
      >
        Zu den Bankkonten
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Banking Setup</h1>
        <p className="text-gray-600 mt-1">Verbinden Sie Ihr Bankkonto mit Taskilo</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {step === 'connect-bank' && renderConnectBankStep()}
        {step === 'complete' && renderCompleteStep()}
      </div>
    </div>
  );
}
