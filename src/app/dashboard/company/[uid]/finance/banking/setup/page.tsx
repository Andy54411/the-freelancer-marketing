'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { FinAPITokenManager } from '@/lib/finapi-token-manager';
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
} from 'lucide-react';

interface FinAPIUser {
  id: string;
  email: string;
  isAutoUpdateEnabled: boolean;
}

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
  const { user } = useAuth();
  const uid = params.uid as string;

  const [step, setStep] = useState<'register' | 'connect-bank' | 'complete'>('register');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // User Registration State
  const [userForm, setUserForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });

  // finAPI User State
  const [finAPIUser, setFinAPIUser] = useState<FinAPIUser | null>(null);
  const [userToken, setUserToken] = useState<string | null>(null);

  // Bank Connection State
  const [availableBanks, setAvailableBanks] = useState<Bank[]>([]);
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [bankCredentials, setBankCredentials] = useState({
    bankingUserId: '',
    bankingPin: '',
  });

  // Check existing token on component mount
  useEffect(() => {
    const checkExistingToken = () => {
      const existingToken = FinAPITokenManager.getUserToken();
      const existingUserData = FinAPITokenManager.getUserData();

      if (existingToken && existingUserData) {
        console.log('Existing finAPI token found, skipping to bank connection');
        setFinAPIUser({
          id: existingUserData.id,
          email: existingUserData.email,
          isAutoUpdateEnabled: existingUserData.isAutoUpdateEnabled,
        });
        setUserToken(existingToken.access_token);
        setStep('connect-bank');
        loadAvailableBanks(existingToken.access_token);
      }
    };

    checkExistingToken();
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

  // Step 1: Create finAPI User
  const createFinAPIUser = async () => {
    try {
      setLoading(true);
      setError(null);

      if (userForm.password !== userForm.confirmPassword) {
        setError('Passwörter stimmen nicht überein');
        return;
      }

      if (userForm.password.length < 6) {
        setError('Passwort muss mindestens 6 Zeichen lang sein');
        return;
      }

      const response = await fetch('/api/finapi/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userForm.email,
          password: userForm.password,
          credentialType: 'sandbox',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Handle existing user scenario more gracefully
        if (response.status === 422 && errorData.type === 'EXISTING_USER_AUTH_ERROR') {
          setError(
            'Benutzer existiert bereits, aber Passwort ist falsch. Bitte verwenden Sie das korrekte Passwort oder eine andere E-Mail-Adresse.'
          );
        } else {
          setError(errorData.details || 'Fehler beim Erstellen/Authentifizieren des finAPI-Users');
        }
        return;
      }

      const data = await response.json();
      setFinAPIUser(data.user);
      setUserToken(data.access_token);

      // Store token in localStorage for future use
      FinAPITokenManager.storeUserToken({
        access_token: data.access_token,
        token_type: data.token_type || 'Bearer',
        expires_in: data.expires_in || 3600,
        refresh_token: data.refresh_token,
        user: {
          id: data.user.id,
          email: data.user.email,
          isAutoUpdateEnabled: data.user.isAutoUpdateEnabled,
          created_at: new Date().toISOString(),
        },
      });

      // Show appropriate success message
      setSuccess(data.message || 'finAPI-User erfolgreich eingerichtet!');

      // Load available banks
      await loadAvailableBanks(data.access_token);
      setStep('connect-bank');
    } catch (error) {
      console.error('Fehler beim Erstellen des finAPI-Users:', error);
      setError(error instanceof Error ? error.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  };

  // Load Available Banks
  const loadAvailableBanks = async (token: string) => {
    try {
      const response = await fetch('/api/finapi/banks?credentialType=sandbox', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Fehler beim Laden der Banken');
      }

      const data = await response.json();
      setAvailableBanks(data.banks || []);
    } catch (error) {
      console.error('Fehler beim Laden der Banken:', error);
      setError('Fehler beim Laden der verfügbaren Banken');
    }
  };

  // Step 2: Connect Bank Account
  const connectBankAccount = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!selectedBank) {
        setError('Bitte wählen Sie eine Bank aus');
        return;
      }

      if (!bankCredentials.bankingUserId || !bankCredentials.bankingPin) {
        setError('Bitte geben Sie Ihre Bankzugangsdaten ein');
        return;
      }

      const response = await fetch('/api/finapi/bank-connections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bankId: selectedBank.id,
          loginCredentials: bankCredentials,
          access_token: userToken,
          credentialType: 'sandbox',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Fehler beim Verbinden der Bank');
      }

      const data = await response.json();
      setSuccess('Bank erfolgreich verbunden!');
      setStep('complete');
    } catch (error) {
      console.error('Fehler beim Verbinden der Bank:', error);
      setError(error instanceof Error ? error.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  };

  // Complete setup and redirect to banking dashboard
  const completeSetup = () => {
    router.push(`/dashboard/company/${uid}/finance/banking/accounts`);
  };

  const renderRegisterStep = () => (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-6">
        <User className="h-12 w-12 text-[#14ad9f] mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900">finAPI-User erstellen</h2>
        <p className="text-gray-600 mt-2">
          Erstellen Sie einen finAPI-Sandbox-User für echte Banking-Tests
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Mail className="h-4 w-4 inline mr-2" />
            E-Mail-Adresse
          </label>
          <input
            type="email"
            value={userForm.email}
            onChange={e => setUserForm({ ...userForm, email: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#14ad9f] focus:border-[#14ad9f]"
            placeholder="ihre.email@beispiel.de"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Lock className="h-4 w-4 inline mr-2" />
            Passwort
          </label>
          <input
            type="password"
            value={userForm.password}
            onChange={e => setUserForm({ ...userForm, password: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#14ad9f] focus:border-[#14ad9f]"
            placeholder="Mindestens 6 Zeichen"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Lock className="h-4 w-4 inline mr-2" />
            Passwort bestätigen
          </label>
          <input
            type="password"
            value={userForm.confirmPassword}
            onChange={e => setUserForm({ ...userForm, confirmPassword: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#14ad9f] focus:border-[#14ad9f]"
            placeholder="Passwort wiederholen"
            required
          />
        </div>

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
          onClick={createFinAPIUser}
          disabled={loading || !userForm.email || !userForm.password}
          className="w-full bg-[#14ad9f] text-white py-2 px-4 rounded-md hover:bg-[#129488] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Erstelle User...' : 'finAPI-User erstellen'}
        </button>
      </div>
    </div>
  );

  const renderConnectBankStep = () => (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <Building2 className="h-12 w-12 text-[#14ad9f] mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900">Bank verbinden</h2>
        <p className="text-gray-600 mt-2">Wählen Sie eine Demo-Bank und geben Sie Testdaten ein</p>
      </div>

      <div className="space-y-6">
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

        {selectedBank && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">
              Zugangsdaten für {selectedBank.name}
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Banking-User-ID / Login
              </label>
              <input
                type="text"
                value={bankCredentials.bankingUserId}
                onChange={e =>
                  setBankCredentials({ ...bankCredentials, bankingUserId: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                placeholder="demo (für Test-Banken)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Banking-PIN</label>
              <input
                type="password"
                value={bankCredentials.bankingPin}
                onChange={e =>
                  setBankCredentials({ ...bankCredentials, bankingPin: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                placeholder="demo (für Test-Banken)"
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h4 className="font-medium text-blue-900 mb-2">💡 Demo-Zugangsdaten</h4>
              <p className="text-blue-700 text-sm">
                Für Test-Banken verwenden Sie typischerweise:
                <br />• <strong>User-ID:</strong> demo
                <br />• <strong>PIN:</strong> demo
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

        <div className="flex space-x-3">
          <button
            onClick={() => setStep('register')}
            className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
          >
            Zurück
          </button>
          <button
            onClick={connectBankAccount}
            disabled={
              loading ||
              !selectedBank ||
              !bankCredentials.bankingUserId ||
              !bankCredentials.bankingPin
            }
            className="flex-1 bg-[#14ad9f] text-white py-2 px-4 rounded-md hover:bg-[#129488] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Verbinde Bank...' : 'Bank verbinden'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="max-w-md mx-auto text-center">
      <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Setup abgeschlossen!</h2>
      <p className="text-gray-600 mb-6">
        Ihr finAPI-User wurde erstellt und die Bank wurde erfolgreich verbunden. Sie können jetzt
        echte Banking-Daten in der Konten-Übersicht abrufen.
      </p>

      {finAPIUser && (
        <div className="bg-gray-50 border border-gray-200 rounded-md p-4 mb-6">
          <h3 className="font-medium text-gray-900 mb-2">Ihre finAPI-Details:</h3>
          <p className="text-sm text-gray-600">
            <strong>User-ID:</strong> {finAPIUser.id}
            <br />
            <strong>E-Mail:</strong> {finAPIUser.email}
            <br />
            <strong>Auto-Update:</strong>{' '}
            {finAPIUser.isAutoUpdateEnabled ? 'Aktiviert' : 'Deaktiviert'}
          </p>
        </div>
      )}

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
        <h1 className="text-2xl font-bold text-gray-900">finAPI Banking Setup</h1>
        <p className="text-gray-600 mt-1">Richten Sie echte Banking-Integration mit finAPI ein</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {step === 'register' && renderRegisterStep()}
        {step === 'connect-bank' && renderConnectBankStep()}
        {step === 'complete' && renderCompleteStep()}
      </div>
    </div>
  );
}
