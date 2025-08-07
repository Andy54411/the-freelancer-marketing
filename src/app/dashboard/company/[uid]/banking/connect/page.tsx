'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import FinAPIWebFormModal from '@/components/FinAPIWebFormModal';
import {
  Loader2,
  AlertCircle,
  Building2,
  CreditCard,
  Search,
  ArrowLeft,
  Zap,
  Shield,
  FlaskConical,
} from 'lucide-react';

interface Bank {
  id: number;
  name: string;
  isTestBank?: boolean;
  blz?: string;
  location?: string;
  city?: string;
  popularity?: number;
  interfaces?: unknown[];
}

export default function ConnectBankPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const uid = params.uid as string;

  const [loading, setLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableBanks, setAvailableBanks] = useState<Bank[]>([]);
  const [filteredBanks, setFilteredBanks] = useState<Bank[]>([]);
  const [connectedBanks, setConnectedBanks] = useState<{ [bankId: string]: boolean }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [preSelectedBankId, setPreSelectedBankId] = useState<string | null>(null);

  // WebForm Modal States
  const [isWebFormModalOpen, setIsWebFormModalOpen] = useState(false);
  const [webFormUrl, setWebFormUrl] = useState<string>('');
  const [webFormBankName, setWebFormBankName] = useState<string>('');

  // Check for bank parameter from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const bankId = urlParams.get('bankId');
    const bankName = urlParams.get('bankName');

    if (bankId) {
      setPreSelectedBankId(bankId);
      console.log('🎯 Pre-selected bank from URL:', { bankId, bankName });
    }
  }, []);

  useEffect(() => {
    loadAvailableBanks();
    loadConnectedBanks();
  }, []);

  // Auto-connect if bank is pre-selected from URL
  useEffect(() => {
    if (preSelectedBankId && availableBanks.length > 0 && !isConnecting) {
      const bank = availableBanks.find(b => b.id.toString() === preSelectedBankId);
      if (bank && !connectedBanks[bank.id.toString()]) {
        console.log('🚀 Auto-connecting to pre-selected bank:', bank.name);
        handleConnectBank(bank);
      }
    }
  }, [preSelectedBankId, availableBanks, connectedBanks, isConnecting]);

  useEffect(() => {
    if (searchTerm.length > 0) {
      const filtered = availableBanks.filter(
        bank =>
          bank.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          bank.city?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredBanks(filtered.slice(0, 10)); // Limit to 10 results
    } else {
      // Show popular banks by default
      const popular = availableBanks
        .filter(bank => bank.popularity && bank.popularity > 50)
        .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
        .slice(0, 15);
      setFilteredBanks(popular);
    }
  }, [searchTerm, availableBanks]);

  const loadAvailableBanks = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load banks with test banks for sandbox environment
      const response = await fetch('/api/finapi/banks?includeTestBanks=true&perPage=50');

      if (!response.ok) {
        throw new Error(`Failed to load banks: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.data && Array.isArray(data.data.banks)) {
        setAvailableBanks(data.data.banks);
      } else if (data.banks && Array.isArray(data.banks)) {
        // Fallback for direct banks array
        setAvailableBanks(data.banks);
      } else {
        throw new Error('Invalid response format - no banks data received');
      }
    } catch (error) {
      console.error('Error loading banks:', error);
      setError(
        'Die Bankliste konnte nicht geladen werden. Bitte prüfen Sie die finAPI Sandbox-Konfiguration.'
      );
    } finally {
      setLoading(false);
    }
  };

  const loadConnectedBanks = async () => {
    try {
      if (!user?.uid) return;

      console.log('🔍 Loading connected banks for user:', user.uid);

      // SCHRITT 1: Versuche zuerst lokale Daten zu laden
      const response = await fetch(
        `/api/finapi/accounts-enhanced?userId=${user.uid}&credentialType=sandbox`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.accounts && data.accounts.length > 0) {
          const connected: { [bankId: string]: boolean } = {};
          data.accounts.forEach((account: any) => {
            if (account.bankId) {
              connected[account.bankId] = true;
            }
          });
          setConnectedBanks(connected);
          console.log('✅ Loaded connected banks from local storage:', Object.keys(connected));
          return;
        }
      }

      // SCHRITT 2: Falls keine lokalen Daten, versuche finAPI-Sync
      console.log('🔄 No local data found, syncing existing finAPI connections...');
      const syncResponse = await fetch('/api/finapi/sync-existing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
          credentialType: 'sandbox',
        }),
      });

      if (syncResponse.ok) {
        const syncData = await syncResponse.json();
        if (syncData.success && syncData.found && syncData.accounts) {
          const connected: { [bankId: string]: boolean } = {};
          syncData.accounts.forEach((account: any) => {
            if (account.bankId) {
              connected[account.bankId] = true;
            }
          });
          setConnectedBanks(connected);
          console.log('✅ Synced and loaded existing finAPI connections:', Object.keys(connected));
        } else {
          console.log('ℹ️ No existing finAPI connections found');
        }
      }
    } catch (error) {
      console.error('Error loading connected banks:', error);
    }
  };

  const handleConnectBank = async (bank: Bank) => {
    if (isConnecting) return;

    // Check if bank is already connected
    if (connectedBanks[bank.id.toString()]) {
      setError(
        `${bank.name} ist bereits verbunden. Sie können diese Bank in Ihren Konten verwalten.`
      );
      return;
    }

    setIsConnecting(true);
    setSelectedBank(bank);
    setError(null);

    try {
      console.log('🔗 Connecting to bank with WebForm 2.0:', bank.name);

      // Use import-bank API for proper Web Form 2.0 integration
      const response = await fetch('/api/finapi/import-bank', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bankId: bank.id.toString(), // Convert to string for API
          userId: uid,
          credentialType: 'sandbox', // Explicit sandbox for testing
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Spezielle Behandlung für "Bank not supported" Fehler
        if (result.error && result.error.includes('BANK_NOT_SUPPORTED')) {
          throw new Error(
            `${bank.name} unterstützt keine Kontoinformationen in der Sandbox. Bitte wählen Sie eine andere Bank.`
          );
        }
        throw new Error(result.error || 'Verbindung zur Bank fehlgeschlagen');
      }

      if (result.webForm && result.webForm.url) {
        console.log('✅ WebForm 2.0 URL received, opening modal...');

        // Open WebForm in Modal instead of redirecting
        setWebFormUrl(result.webForm.url);
        setWebFormBankName(bank.name);
        setIsWebFormModalOpen(true);

        // Reset connecting state since modal is now open
        setIsConnecting(false);
      } else {
        throw new Error('Keine WebForm URL erhalten');
      }
    } catch (err: unknown) {
      console.error('❌ Bank connection failed:', err);
      const error = err as Error;
      setError(error.message || 'Unbekannter Fehler bei der Bankverbindung');
      setIsConnecting(false);
      setSelectedBank(null);
    }
  };

  const handleGoBack = () => {
    router.push(`/dashboard/company/${uid}/finance/banking`);
  };

  const handleWebFormSuccess = async (bankConnectionId?: string) => {
    console.log('🎉 Bank connection successful:', bankConnectionId);
    setIsWebFormModalOpen(false);
    setSelectedBank(null);

    // Update connected banks state
    if (selectedBank) {
      setConnectedBanks(prev => ({
        ...prev,
        [selectedBank.id.toString()]: true,
      }));
    }

    // Wait a moment for data to be processed
    setTimeout(() => {
      // Reload connected banks to get fresh data
      loadConnectedBanks();
    }, 1000);

    // Show success message
    setError(
      `✅ ${webFormBankName} wurde erfolgreich verbunden! Ihre Kontodaten werden verarbeitet...`
    );

    // Redirect to banking accounts page with success message after brief delay
    setTimeout(() => {
      router.push(
        `/dashboard/company/${uid}/finance/banking/accounts?connection=success&bank=${encodeURIComponent(webFormBankName)}`
      );
    }, 2000);
  };

  const handleWebFormError = (error: string) => {
    console.error('❌ WebForm error:', error);
    setIsWebFormModalOpen(false);

    // If it's a sandbox connection error, offer alternative
    if (error.includes('Sandbox-Verbindung') || error.includes('Verbindung abgelehnt')) {
      setError(`finAPI Sandbox-Problem: ${error} - Sie können das WebForm auch direkt öffnen.`);
    } else {
      setError(`Bankverbindung fehlgeschlagen: ${error}`);
    }

    setIsConnecting(false);
    setSelectedBank(null);
  };

  const handleWebFormClose = () => {
    console.log('WebForm modal closed by user');
    setIsWebFormModalOpen(false);
    setIsConnecting(false);
    setSelectedBank(null);
  };

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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 border-b border-gray-200 pb-4">
        <Button variant="ghost" onClick={handleGoBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurück
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bank verbinden</h1>
          <p className="text-gray-600 mt-1">
            {preSelectedBankId
              ? 'Verbindung zur ausgewählten Bank wird hergestellt...'
              : 'Wählen Sie Ihre Bank aus und verbinden Sie sie sicher mit WebForm 2.0'}
          </p>
        </div>
      </div>

      {/* WebForm 2.0 Info */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <Zap className="h-6 w-6 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-green-900 mb-1">
                WebForm 2.0 - Sichere Bankverbindung
              </h3>
              <p className="text-green-700 text-sm">
                Moderne, verschlüsselte Verbindung direkt zu Ihrer Bank ohne Speicherung von
                Zugangsdaten
              </p>
            </div>
            <div className="flex items-center gap-2 text-green-600">
              <Shield className="h-5 w-5" />
              <span className="text-sm font-medium">PSD2 konform</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sandbox Info */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FlaskConical className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-blue-900">finAPI Sandbox-Umgebung</h4>
              <p className="text-blue-700 text-sm">
                Dies ist eine Test-Umgebung mit Demo-Banken. Nur Banken mit &quot;Demo&quot; oder
                &quot;Test&quot; im Namen unterstützen Kontoinformationen.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div>
                <h4 className="font-medium text-red-800">Verbindungsfehler</h4>
                <p className="text-red-700 text-sm mt-1">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-[#14ad9f]" />
            Bank auswählen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Bank suchen (z.B. Deutsche Bank, Sparkasse...)"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBanks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {searchTerm ? 'Keine Banken gefunden' : 'Keine Banken verfügbar'}
                </div>
              ) : (
                filteredBanks.map(bank => {
                  const isConnected = connectedBanks[bank.id.toString()];
                  const isPreSelected = preSelectedBankId === bank.id.toString();

                  return (
                    <div
                      key={bank.id}
                      className={`p-4 border rounded-lg transition-colors ${
                        isConnected
                          ? 'border-green-300 bg-green-50 cursor-default'
                          : isPreSelected
                            ? 'border-[#14ad9f] bg-[#14ad9f]/10 cursor-pointer shadow-md'
                            : selectedBank?.id === bank.id && isConnecting
                              ? 'border-blue-300 bg-blue-50 cursor-pointer'
                              : 'hover:border-gray-300 hover:bg-gray-50 cursor-pointer'
                      }`}
                      onClick={() => !isConnected && handleConnectBank(bank)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Building2 className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">{bank.name}</h3>
                            <div className="flex items-center gap-3 mt-1">
                              {bank.city && (
                                <span className="text-sm text-gray-600">{bank.city}</span>
                              )}
                              {bank.blz && (
                                <span className="text-sm text-gray-600">BLZ: {bank.blz}</span>
                              )}
                              {bank.isTestBank && (
                                <Badge variant="secondary" className="text-xs">
                                  Test Bank
                                </Badge>
                              )}
                              {isConnected && (
                                <Badge
                                  variant="default"
                                  className="text-xs bg-green-600 text-white"
                                >
                                  Verbunden
                                </Badge>
                              )}
                              {isPreSelected && !isConnected && (
                                <Badge
                                  variant="default"
                                  className="text-xs bg-[#14ad9f] text-white"
                                >
                                  Ausgewählt
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {isConnected ? (
                            <div className="flex items-center gap-2 text-green-600">
                              <span className="text-sm font-medium">Bereits verbunden</span>
                            </div>
                          ) : selectedBank?.id === bank.id && isConnecting ? (
                            <div className="flex items-center gap-2 text-blue-600">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="text-sm">Verbinde...</span>
                            </div>
                          ) : (
                            <Button size="sm" className="bg-[#14ad9f] hover:bg-[#129488]">
                              <CreditCard className="mr-2 h-4 w-4" />
                              Verbinden
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* finAPI WebForm Modal */}
      <FinAPIWebFormModal
        isOpen={isWebFormModalOpen}
        onClose={handleWebFormClose}
        onSuccess={handleWebFormSuccess}
        onError={handleWebFormError}
        webFormUrl={webFormUrl}
        bankName={webFormBankName}
        title={`${webFormBankName} verbinden`}
      />
    </div>
  );
}
