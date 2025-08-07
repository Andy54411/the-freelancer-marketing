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
  Building2,
  CreditCard,
  RefreshCw,
  Settings,
  Zap,
  Shield,
  FlaskConical,
  AlertCircle,
  Search,
  Loader2,
  Plus,
  ArrowRight,
} from 'lucide-react';

interface BankConnection {
  id: string;
  bankName: string;
  status: 'connected' | 'error' | 'pending';
  accountCount: number;
  lastSync?: any;
}

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

export default function BankingDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const uid = params.uid as string;

  // Banking Overview States
  const [connections, setConnections] = useState<BankConnection[]>([]);
  const [loading, setLoading] = useState(true);

  // Bank Connection States
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableBanks, setAvailableBanks] = useState<Bank[]>([]);
  const [filteredBanks, setFilteredBanks] = useState<Bank[]>([]);
  const [connectedBanks, setConnectedBanks] = useState<{ [bankId: string]: boolean }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [showBankSelection, setShowBankSelection] = useState(false);

  // WebForm Modal States
  const [isWebFormModalOpen, setIsWebFormModalOpen] = useState(false);
  const [webFormUrl, setWebFormUrl] = useState<string>('');
  const [webFormBankName, setWebFormBankName] = useState<string>('');

  useEffect(() => {
    if (user && user.uid === uid) {
      loadBankConnections();
      loadAvailableBanks();
      loadConnectedBanks();
    }

    // Check for success callback from WebForm
    const urlParams = new URLSearchParams(window.location.search);
    const connectionStatus = urlParams.get('connection');
    const mode = urlParams.get('mode');
    const bankId = urlParams.get('bank');

    if (connectionStatus === 'success') {
      if (mode === 'mock') {
        console.log('🎭 Mock bank connection successful for bank:', bankId);
        setTimeout(() => {
          loadBankConnections();
        }, 1000);
      } else {
        console.log('✅ Real bank connection successful');
        setTimeout(() => {
          loadBankConnections();
        }, 1000);
      }

      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [user, uid]);

  // Filter banks based on search
  useEffect(() => {
    if (searchTerm.length > 0) {
      const filtered = availableBanks.filter(
        bank =>
          bank.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          bank.city?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredBanks(filtered.slice(0, 10));
    } else {
      // Show popular banks by default
      const popular = availableBanks
        .filter(bank => bank.popularity && bank.popularity > 50)
        .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
        .slice(0, 15);
      setFilteredBanks(popular);
    }
  }, [searchTerm, availableBanks]);

  const loadBankConnections = async () => {
    try {
      setLoading(true);
      console.log('📊 Loading stored banking data for user:', uid);

      const response = await fetch(`/api/banking/stored-data?userId=${encodeURIComponent(uid)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load banking data: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📊 Banking data response:', data);

      if (data.success) {
        const transformedConnections: BankConnection[] = data.connections.map((conn: any) => ({
          id: conn.id,
          bankName: conn.bankName,
          status:
            conn.status === 'ready' ? 'connected' : conn.status === 'pending' ? 'pending' : 'error',
          accountCount: data.stats.totalAccounts || conn.accountsCount || 0,
          lastSync: conn.lastSync,
        }));

        setConnections(transformedConnections);
        console.log('✅ Banking connections loaded from storage:', transformedConnections.length);
      } else {
        console.log('ℹ️ No stored banking data found');
        setConnections([]);
      }
    } catch (error) {
      console.error('Error loading banking data:', error);
      setConnections([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableBanks = async () => {
    try {
      setError(null);
      const response = await fetch('/api/finapi/banks?includeTestBanks=true&perPage=50');

      if (!response.ok) {
        throw new Error(`Failed to load banks: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.data && Array.isArray(data.data.banks)) {
        setAvailableBanks(data.data.banks);
      } else if (data.banks && Array.isArray(data.banks)) {
        setAvailableBanks(data.banks);
      } else {
        throw new Error('Invalid response format - no banks data received');
      }
    } catch (error) {
      console.error('Error loading banks:', error);
      setError(
        'Die Bankliste konnte nicht geladen werden. Bitte prüfen Sie die finAPI Sandbox-Konfiguration.'
      );
    }
  };

  const loadConnectedBanks = async () => {
    try {
      if (!user?.uid) return;

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
        }
      }
    } catch (error) {
      console.error('Error loading connected banks:', error);
    }
  };

  const handleConnectBank = async (bank: Bank) => {
    if (isConnecting) return;

    if (connectedBanks[bank.id.toString()]) {
      setError(`${bank.name} ist bereits verbunden.`);
      return;
    }

    setIsConnecting(true);
    setSelectedBank(bank);
    setError(null);

    try {
      console.log('🔗 Starting bank connection for:', bank.name);

      const response = await fetch('/api/finapi/webform', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bankId: bank.id,
          userId: user?.uid,
          credentialType: 'sandbox',
          bankName: bank.name,
        }),
      });

      if (!response.ok) {
        throw new Error(`WebForm request failed: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.webFormUrl) {
        setWebFormUrl(data.webFormUrl);
        setWebFormBankName(bank.name);
        setIsWebFormModalOpen(true);
      } else {
        throw new Error(data.error || 'Failed to create WebForm URL');
      }
    } catch (error: any) {
      console.error('❌ Bank connection error:', error);
      setError(error.message || 'Unbekannter Fehler bei der Bankverbindung');
      setIsConnecting(false);
      setSelectedBank(null);
    }
  };

  const handleWebFormSuccess = async (bankConnectionId?: string) => {
    console.log('🎉 Bank connection successful:', bankConnectionId);
    setIsWebFormModalOpen(false);
    setSelectedBank(null);

    if (selectedBank) {
      setConnectedBanks(prev => ({
        ...prev,
        [selectedBank.id.toString()]: true,
      }));
    }

    setTimeout(() => {
      loadConnectedBanks();
      loadBankConnections();
    }, 1000);

    setError(`✅ ${webFormBankName} wurde erfolgreich verbunden!`);
    setShowBankSelection(false);
  };

  const handleWebFormError = (error: string) => {
    console.error('❌ WebForm error:', error);
    setIsWebFormModalOpen(false);
    setError(`Verbindungsfehler: ${error}`);
  };

  const handleWebFormClose = () => {
    setIsWebFormModalOpen(false);
    setIsConnecting(false);
    setSelectedBank(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatLastSync = (timestamp?: any) => {
    if (!timestamp) return 'Nie';

    if (timestamp && typeof timestamp === 'object' && timestamp._seconds) {
      const date = new Date(timestamp._seconds * 1000);
      return date.toLocaleString('de-DE');
    }

    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return 'Ungültiges Datum';

    return date.toLocaleString('de-DE');
  };

  const handleViewAccounts = () => {
    router.push(`/dashboard/company/${uid}/finance/banking/accounts`);
  };

  const handleImportTransactions = () => {
    router.push(`/dashboard/company/${uid}/finance/banking/import`);
  };

  // Authorization check
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
      {/* Header */}
      <div className="flex justify-between items-start border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Banking Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Verwalten Sie Ihre Bankverbindungen und Transaktionen zentral
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Verbundene Konten</p>
          <p className="text-xl font-bold text-gray-900">{connections.length}</p>
        </div>
      </div>

      {/* WebForm 2.0 Features Banner */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Zap className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-blue-900 mb-1">
                WebForm 2.0 Integration aktiv
              </h3>
              <p className="text-blue-700 text-sm">
                Moderne Bankverbindungen mit verbesserter Sicherheit und Benutzerfreundlichkeit
              </p>
            </div>
            <div className="flex items-center gap-2 text-blue-600">
              <Shield className="h-5 w-5" />
              <span className="text-sm font-medium">Sicher & Zuverlässig</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && !error.includes('✅') && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div>
                <h4 className="font-medium text-red-800">Information</h4>
                <p className="text-red-700 text-sm mt-1">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success Message */}
      {error && error.includes('✅') && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 text-green-600">✅</div>
              <div>
                <h4 className="font-medium text-green-800">Erfolgreich</h4>
                <p className="text-green-700 text-sm mt-1">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Banking Statistics Overview */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-[#14ad9f]" />
              Bankkonten
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900">{connections.length}</p>
              <p className="text-sm text-gray-600">Verbundene Banken</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-[#14ad9f]" />
              Letzter Sync
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <p className="text-sm text-gray-900">
                {connections.length > 0 ? formatLastSync(connections[0]?.lastSync) : 'Noch kein Sync'}
              </p>
              <p className="text-xs text-gray-600">Automatische Synchronisation</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-[#14ad9f]" />
              Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <p className="text-sm text-gray-900">{connections.length > 0 ? 'Aktiv' : 'Inaktiv'}</p>
              <p className="text-xs text-gray-600">Banking-Integration</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Connected Banks or Bank Selection */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-[#14ad9f]" />
              {showBankSelection ? 'Bank auswählen' : 'Verbundene Banken'}
            </CardTitle>
            {!showBankSelection && (
              <Button 
                onClick={() => setShowBankSelection(true)}
                className="bg-[#14ad9f] hover:bg-[#129488]"
              >
                <Plus className="h-4 w-4 mr-2" />
                Bank verbinden
              </Button>
            )}
            {showBankSelection && (
              <Button 
                variant="ghost"
                onClick={() => setShowBankSelection(false)}
              >
                Zurück
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {showBankSelection ? (
            // Bank Selection Section
            <div className="space-y-6">
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
                        Test-Umgebung mit Demo-Banken. Nur Banken mit "Demo" oder "Test" unterstützen Kontoinformationen.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Bank suchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Bank List */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredBanks.map((bank) => {
                  const isConnected = connectedBanks[bank.id.toString()];
                  return (
                    <div
                      key={bank.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
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
                              <Badge variant="default" className="text-xs bg-green-600 text-white">
                                Verbunden
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
                          <Button 
                            size="sm" 
                            className="bg-[#14ad9f] hover:bg-[#129488]"
                            onClick={() => handleConnectBank(bank)}
                          >
                            <CreditCard className="mr-2 h-4 w-4" />
                            Verbinden
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            // Connected Banks Overview
            <div>
              {loading ? (
                <div className="flex justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : connections.length === 0 ? (
                <div className="text-center py-8">
                  <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Bankverbindungen</h3>
                  <p className="text-gray-600 mb-6">
                    Verbinden Sie Ihre erste Bank, um mit dem Banking zu beginnen.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {connections.map(connection => (
                    <div
                      key={connection.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Building2 className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{connection.bankName}</h4>
                          <p className="text-sm text-gray-600">
                            {connection.accountCount} Konto(s) • Letzte Sync:{' '}
                            {formatLastSync(connection.lastSync)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={getStatusColor(connection.status)}>
                          {connection.status === 'connected'
                            ? 'Verbunden'
                            : connection.status === 'error'
                              ? 'Fehler'
                              : 'Ausstehend'}
                        </Badge>
                        <Button variant="ghost" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions - converted to Status Cards */}
      {connections.length > 0 && !showBankSelection && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={handleViewAccounts}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-[#14ad9f] bg-opacity-10 rounded-lg">
                  <CreditCard className="h-6 w-6 text-[#14ad9f]" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Konten</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {connections.reduce((total, conn) => total + conn.accountCount, 0)} Bankkonten verwalten
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={handleImportTransactions}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-[#14ad9f] bg-opacity-10 rounded-lg">
                  <RefreshCw className="h-6 w-6 text-[#14ad9f]" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Transaktionen</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Import und Synchronisation verwalten
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-[#14ad9f] bg-opacity-10 rounded-lg">
                  <Settings className="h-6 w-6 text-[#14ad9f]" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Einstellungen</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Banking-Konfiguration anpassen
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* WebForm Modal */}
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
