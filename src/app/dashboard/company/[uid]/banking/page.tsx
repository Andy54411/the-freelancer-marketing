'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import FinAPIWebFormModal from '@/components/FinAPIWebFormModal';
import RevolutConnectModal from '@/components/RevolutConnectModal';
import BankDisconnectDialog from '@/components/BankDisconnectDialog';
import { getFinAPICredentialType } from '@/lib/finapi-config';
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
  CheckCircle,
  Clock,
  Activity,
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
  const { user } = useAuth();
  const uid = params?.uid as string;

  // Get environment-specific credential type
  const credentialType = getFinAPICredentialType();

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

  // Revolut Modal States
  const [isRevolutModalOpen, setIsRevolutModalOpen] = useState(false);

  // Bank Disconnect Dialog States
  const [isDisconnectDialogOpen, setIsDisconnectDialogOpen] = useState(false);
  const [selectedConnectionForDisconnect, setSelectedConnectionForDisconnect] =
    useState<BankConnection | null>(null);

  useEffect(() => {
    if (user && user.uid === uid) {
      loadBankConnections();
      loadAvailableBanks();
      loadConnectedBanks();
    }

    // Check for success callback from WebForm or Revolut
    const urlParams = new URLSearchParams(window.location.search);
    const connectionStatus = urlParams.get('connection');
    const mode = urlParams.get('mode');
    const bankId = urlParams.get('bank');
    const revolutSuccess = urlParams.get('revolut_success');
    const revolutError = urlParams.get('revolut_error');
    const revolutAccounts = urlParams.get('accounts');

    if (connectionStatus === 'success') {
      if (mode === 'mock') {
        setTimeout(() => {
          loadBankConnections();
        }, 1000);
      } else {
        setTimeout(() => {
          loadBankConnections();
          // Automatically trigger sync after successful connection
          triggerAutoSyncAfterConnection();
        }, 1000);
      }

      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }

    // Handle Revolut success callback
    if (revolutSuccess === 'true') {
      setTimeout(() => {
        loadBankConnections();
        // Show success message
        setError(null);
      }, 1000);

      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }

    // Handle Revolut error callback
    if (revolutError) {
      setError(`Revolut Verbindung fehlgeschlagen: ${decodeURIComponent(revolutError)}`);
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
      const allConnections: BankConnection[] = [];

      // Load FinAPI connections
      try {
        const finapiResponse = await fetch(
          `/api/finapi/bank-connections?userId=${encodeURIComponent(uid)}&credentialType=${credentialType}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (finapiResponse.ok) {
          const finapiData = await finapiResponse.json();
          if (finapiData.success && finapiData.connections && finapiData.connections.length > 0) {
            // Enhance finAPI data with Firestore last sync information
            const enhancedConnections = await enhanceConnectionsWithFirestoreData(
              finapiData.connections
            );
            allConnections.push(...enhancedConnections);
          }
        }
      } catch (finapiError) {
        console.warn('⚠️ FinAPI connections failed:', finapiError);
      }

      // Load Revolut connections
      try {
        const revolutResponse = await fetch(
          `/api/revolut/accounts?userId=${encodeURIComponent(uid)}`
        );

        if (revolutResponse.ok) {
          const revolutData = await revolutResponse.json();
          if (revolutData.success && revolutData.accounts && revolutData.accounts.length > 0) {
            // Transform Revolut accounts to connection format
            const revolutConnections: BankConnection[] = [
              {
                id: 'revolut_business',
                bankName: 'Revolut Business',
                status: 'connected' as const,
                accountCount: revolutData.accounts.length,
                lastSync: revolutData.accounts[0]?.lastUpdated || new Date().toISOString(),
              },
            ];

            allConnections.push(...revolutConnections);
          }
        }
      } catch (revolutError) {
        console.warn('⚠️ Revolut connections failed:', revolutError);
      }

      // If we have any connections, use them
      if (allConnections.length > 0) {
        setConnections(allConnections);
        return;
      }

      // Fallback: Use enhanced accounts API to check for FinAPI accounts
      const accountsResponse = await fetch(
        `/api/finapi/accounts-enhanced?userId=${encodeURIComponent(uid)}&credentialType=${credentialType}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (accountsResponse.ok) {
        const accountsData = await accountsResponse.json();
        if (
          accountsData.success &&
          accountsData.accounts &&
          accountsData.accounts.length > 0 &&
          accountsData.source !== 'mock_data'
        ) {
          // Transform finAPI accounts data to connections format
          const bankGroups = accountsData.accountsByBank || {};
          const transformedConnections: BankConnection[] = Object.entries(bankGroups).map(
            ([bankName, accounts]: [string, any[]]) => ({
              id: `bank_${bankName.replace(/\s+/g, '_').toLowerCase()}`,
              bankName: bankName,
              status: 'connected' as const,
              accountCount: accounts.length,
              lastSync: accountsData.lastSync || new Date().toISOString(),
            })
          );

          // Also enhance these with Firestore data
          const enhancedConnections =
            await enhanceConnectionsWithFirestoreData(transformedConnections);
          setConnections(enhancedConnections);

          return;
        }
      }

      // No connections found
      setConnections([]);
    } catch (error) {
      console.error('❌ Failed to load bank connections:', error);
      setConnections([]);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to enhance connections with Firestore data
  const enhanceConnectionsWithFirestoreData = async (connections: BankConnection[]) => {
    try {
      // Get Firestore bank connection data
      const firestoreResponse = await fetch(`/api/user/bank-connections?userId=${uid}`);
      if (firestoreResponse.ok) {
        const firestoreData = await firestoreResponse.json();

        // Correct property name: bankConnections (not connections)
        const firestoreConnections = firestoreData.bankConnections || [];
        const lastSync = firestoreData.lastSync;
        const syncStatus = firestoreData.syncStatus;

        // If we have finAPI connections but no Firestore data, update status to "connected"
        if (connections.length > 0 && firestoreConnections.length === 0) {
          // Update Firestore with current connection data
          try {
            const updateResponse = await fetch('/api/user/bank-connections', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userId: uid,
                bankConnections: connections.map(conn => ({
                  id: conn.id,
                  bankName: conn.bankName,
                  status: 'connected',
                  accountCount: conn.accountCount,
                  lastSync: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                })),
                lastSync: new Date().toISOString(),
                syncStatus: 'connected',
              }),
            });

            if (updateResponse.ok) {
            }
          } catch (updateError) {
            console.error('❌ Failed to update Firestore:', updateError);
          }
        }

        // Merge finAPI and Firestore data
        return connections.map(connection => {
          const firestoreConnection = firestoreConnections.find(
            (fc: any) => fc.bankName === connection.bankName || fc.id === connection.id
          );

          const enhancedConnection = {
            ...connection,
            status:
              firestoreConnection?.status ||
              (connections.length > 0 ? 'connected' : connection.status),
            lastSync:
              firestoreConnection?.lastSync ||
              lastSync ||
              connection.lastSync ||
              new Date().toISOString(),
            firestoreData: firestoreConnection || null,
          };

          return enhancedConnection;
        });
      }
    } catch (error) {}

    // If Firestore data is unavailable, default to "connected" if we have finAPI connections
    if (connections.length > 0) {
      return connections.map(connection => ({
        ...connection,
        status: 'connected' as const,
        lastSync: connection.lastSync || new Date().toISOString(),
      }));
    }

    return connections;
  };

  // Auto-sync function to trigger after successful bank connection
  const triggerAutoSyncAfterConnection = async () => {
    try {
      // Wait a moment for the connection to be fully established
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Try to import transactions (this will sync all bank data)
      const importResponse = await fetch('/api/finapi/import-transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: uid,
          credentialType: credentialType,
          forceSync: true,
        }),
      });

      if (importResponse.ok) {
        const importData = await importResponse.json();

        // Reload connections to show updated status
        setTimeout(() => {
          loadBankConnections();
        }, 2000);

        // Show success message to user
        setTimeout(() => {}, 1000);
      } else {
        // Fallback to sync-transactions
        const syncResponse = await fetch('/api/finapi/sync-transactions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: uid,
            credentialType: credentialType,
          }),
        });

        if (syncResponse.ok) {
          setTimeout(() => {
            loadBankConnections();
          }, 2000);
        }
      }
    } catch (error) {
      console.error('❌ Auto-sync error:', error);
      // Don't show error to user since the connection itself was successful
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
      console.error('🔍 loadAvailableBanks error:', error);
      setError(
        'Die Bankliste konnte nicht geladen werden. Bitte prüfen Sie die finAPI Sandbox-Konfiguration.'
      );
    }
  };

  const loadConnectedBanks = async () => {
    try {
      if (!user?.uid) return;

      const response = await fetch(
        `/api/finapi/accounts-enhanced?userId=${user.uid}&credentialType=${credentialType}`
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
    } catch (error) {}
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
      const response = await fetch('/api/finapi/webform', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bankId: bank.id,
          userId: user?.uid,
          credentialType: credentialType,
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
      setError(error.message || 'Unbekannter Fehler bei der Bankverbindung');
      setIsConnecting(false);
      setSelectedBank(null);
    }
  };

  const handleWebFormSuccess = async (bankConnectionId?: string) => {
    setIsConnecting(false);
    setSelectedBank(null);
    setIsWebFormModalOpen(false);

    // Reload connections after successful connection
    setTimeout(() => {
      loadBankConnections();
      loadConnectedBanks();
    }, 1000);

    // Trigger automatic sync after successful connection
    setTimeout(() => {
      triggerAutoSyncAfterConnection();
    }, 2000);
  };

  const handleOpenDisconnectDialog = (connection: BankConnection) => {
    setSelectedConnectionForDisconnect(connection);
    setIsDisconnectDialogOpen(true);
  };

  const handleDisconnectBank = async () => {
    if (!selectedConnectionForDisconnect) return;

    try {
      const response = await fetch('/api/finapi/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId: uid,
        }),
      });

      if (!response.ok) {
        throw new Error('Fehler beim Trennen der Bankverbindung');
      }

      const data = await response.json();

      if (data.success) {
        // Erfolgreich getrennt - lade Verbindungen neu
        loadBankConnections();
        loadConnectedBanks();

        // Reset states
        setSelectedConnectionForDisconnect(null);
        setIsDisconnectDialogOpen(false);

        // Zeige Erfolg-Nachricht (optional)
      } else {
        throw new Error(data.error || 'Unbekannter Fehler');
      }
    } catch (error: any) {
      console.error('Bank disconnect error:', error);
      setError(error.message || 'Fehler beim Trennen der Bankverbindung');
    }
  };

  const handleWebFormClose = () => {
    setIsWebFormModalOpen(false);
    setIsConnecting(false);
    setSelectedBank(null);
  };

  const handleWebFormError = (error: string) => {
    setError(error);
    setIsConnecting(false);
    setSelectedBank(null);
    setIsWebFormModalOpen(false);
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-[#14ad9f]" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
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

      {/* Revolut Business Affiliate Banner */}
      <Card className="relative overflow-hidden bg-gradient-to-r from-[#14ad9f] to-[#0f9d84] border-[#14ad9f] shadow-lg">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=400&fit=crop&auto=format&q=80')",
          }}
        />

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#14ad9f]/80 to-[#0f9d84]/80" />

        <CardContent className="relative z-10 p-6">
          <div className="flex items-center gap-6">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-2">
                🎉 Revolutioniere dein Business Banking!
              </h3>
              <p className="text-white/90 text-sm mb-3">
                Eröffne ein Revolut Business Konto und erhalte deinen ersten Monat ohne
                Abo-Gebühren. Globales Geschäftskonto mit Taskilo-Integration.
              </p>
              <div className="flex items-center gap-2 text-white/80 text-xs">
                <CheckCircle className="h-4 w-4" />
                <span>Kostenloser erster Monat</span>
                <CheckCircle className="h-4 w-4 ml-2" />
                <span>Direkte Taskilo-Integration</span>
              </div>
            </div>
            <div className="flex-shrink-0">
              <Button
                onClick={() =>
                  window.open(
                    'https://business.revolut.com/signup?promo=b2b-ref-029-H2-TXC&ext=c77b9c27-bb0b-39b0-ac44-5b34dff30c6e&context=B2B_REFERRAL',
                    '_blank'
                  )
                }
                className="bg-white text-[#14ad9f] hover:bg-gray-100 font-semibold px-6 py-2 shadow-md"
              >
                Jetzt anmelden
              </Button>
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
        <Card className="border-[#14ad9f] border-opacity-30 bg-[#14ad9f] bg-opacity-10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-[#14ad9f]" />
              <div>
                <h4 className="font-medium text-[#14ad9f]">Erfolgreich</h4>
                <p className="text-[#14ad9f] text-sm mt-1 opacity-80">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Banking Statistics Overview */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <div
          data-slot="card"
          className="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm"
        >
          <div
            data-slot="card-header"
            className="@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6"
          >
            <div
              data-slot="card-title"
              className="leading-none font-semibold flex items-center gap-2"
            >
              <CreditCard className="h-5 w-5 text-[#14ad9f]" />
              Bankkonten
            </div>
          </div>
          <div data-slot="card-content" className="px-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">{connections.length}</p>
                <p className="text-sm text-gray-600">Verbundene Banken</p>
              </div>
              <Building2 className="h-8 w-8 text-[#14ad9f]" />
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-[#14ad9f]" />
              Letzter Sync
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {connections.length > 0
                    ? formatLastSync(connections[0]?.lastSync)
                    : 'Noch kein Sync'}
                </p>
                <p className="text-xs text-gray-600">Automatische Synchronisation</p>
              </div>
              {connections.length > 0 ? (
                <CheckCircle className="h-8 w-8 text-[#14ad9f]" />
              ) : (
                <Clock className="h-8 w-8 text-gray-400" />
              )}
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
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {connections.length > 0 ? 'Aktiv' : 'Inaktiv'}
                </p>
                <p className="text-xs text-gray-600">Banking-Integration</p>
              </div>
              {connections.length > 0 ? (
                <Activity className="h-8 w-8 text-[#14ad9f]" />
              ) : (
                <Activity className="h-8 w-8 text-gray-400" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Connected Banks or Bank Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-[#14ad9f]" />
            Banking-Übersicht
          </CardTitle>
        </CardHeader>
        <CardContent>
          {showBankSelection ? (
            // Bank Selection Section
            <div className="space-y-6">
              {/* Sandbox Info */}
              <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <FlaskConical className="h-5 w-5 text-blue-600" />
                    <div className="flex-1">
                      <h4 className="font-medium text-blue-900">finAPI Sandbox-Umgebung</h4>
                      <p className="text-blue-700 text-sm">
                        Test-Umgebung mit Demo-Banken. Nur Banken mit &ldquo;Demo&rdquo; oder
                        &ldquo;Test&rdquo; unterstützen Kontoinformationen.
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
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Bank List */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredBanks.map(bank => {
                  const isConnected = connectedBanks[bank.id.toString()];
                  return (
                    <div
                      key={bank.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-4">
                        <Building2 className="h-5 w-5 text-[#14ad9f]" />
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
                          <div className="flex items-center gap-2 text-[#14ad9f]">
                            <CheckCircle className="h-4 w-4" />
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
                    Verbinden Sie Ihre erste Bank mit einem unserer Banking-Provider.
                  </p>

                  {/* Provider Selection */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md mx-auto mb-6">
                    {/* FinAPI Option */}
                    <div className="border border-gray-200 rounded-lg p-4 hover:border-[#14ad9f] transition-colors">
                      <div className="flex flex-col items-center text-center">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
                          <Building2 className="h-6 w-6 text-blue-600" />
                        </div>
                        <h4 className="font-medium text-gray-900 mb-1">FinAPI</h4>
                        <p className="text-xs text-gray-600 mb-3">Deutsche Banken & PSD2</p>
                        <Button
                          onClick={() => setShowBankSelection(true)}
                          size="sm"
                          className="bg-[#14ad9f] hover:bg-[#129488] w-full"
                        >
                          <CreditCard className="h-4 w-4 mr-2" />
                          Bank auswählen
                        </Button>
                      </div>
                    </div>

                    {/* Revolut Option */}
                    <div className="border border-gray-200 rounded-lg p-4 hover:border-[#14ad9f] transition-colors">
                      <div className="flex flex-col items-center text-center">
                        <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mb-3 p-1">
                          <img
                            src="/icon/unnamed.webp"
                            alt="Revolut Logo"
                            className="w-10 h-10 object-contain"
                          />
                        </div>
                        <h4 className="font-medium text-gray-900 mb-1">Revolut</h4>
                        <p className="text-xs text-gray-600 mb-3">Business Banking</p>
                        <Button
                          onClick={() => setIsRevolutModalOpen(true)}
                          size="sm"
                          className="bg-[#14ad9f] hover:bg-[#129488] w-full"
                        >
                          <CreditCard className="h-4 w-4 mr-2" />
                          Verbinden
                        </Button>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500">
                    Wählen Sie Ihren bevorzugten Banking-Provider für die Kontoverbindung.
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
                        <Building2 className="h-5 w-5 text-[#14ad9f]" />
                        <div>
                          <h4 className="font-medium text-gray-900">{connection.bankName}</h4>
                          <p className="text-sm text-gray-600">
                            {connection.accountCount} Konto(s) • Letzte Sync:{' '}
                            {formatLastSync(connection.lastSync)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(connection.status)}
                          <Badge className={getStatusColor(connection.status)}>
                            {connection.status === 'connected'
                              ? 'Verbunden'
                              : connection.status === 'error'
                                ? 'Fehler'
                                : 'Ausstehend'}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDisconnectDialog(connection)}
                        >
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

      {/* Status Overview - Converted from Quick Actions to Status-Only Cards */}
      {connections.length > 0 && !showBankSelection && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <CreditCard className="h-8 w-8 text-[#14ad9f]" />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Konten-Status</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {connections.reduce((total, conn) => total + conn.accountCount, 0)} Bankkonten
                    aktiv
                  </p>
                  <div className="mt-2 text-lg font-bold text-[#14ad9f]">
                    {connections.length} Bank{connections.length !== 1 ? 'en' : ''} verbunden
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <RefreshCw className="h-8 w-8 text-[#14ad9f]" />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Sync-Status</h3>
                  <p className="text-sm text-gray-600 mt-1">Automatische Synchronisation aktiv</p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-green-600">Online</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Settings className="h-8 w-8 text-[#14ad9f]" />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Konfiguration</h3>
                  <p className="text-sm text-gray-600 mt-1">Import-Einstellungen verwaltet</p>
                  <div className="mt-2 text-sm font-medium text-gray-700">
                    Bereit für Banking-Operationen
                  </div>
                </div>
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

      {/* Revolut Connect Modal */}
      <RevolutConnectModal
        isOpen={isRevolutModalOpen}
        onClose={() => setIsRevolutModalOpen(false)}
        onSuccess={connectionId => {
          setIsRevolutModalOpen(false);
          // Reload connections after successful connection
          setTimeout(() => {
            loadBankConnections();
          }, 1000);
        }}
        onError={error => {
          console.error('❌ Revolut connection error:', error);
          setError(`Revolut Verbindung fehlgeschlagen: ${error}`);
          setIsRevolutModalOpen(false);
        }}
        userId={uid}
        companyEmail={user?.email || ''}
        title="Revolut Business verbinden"
      />

      {/* Bank Disconnect Dialog */}
      <BankDisconnectDialog
        isOpen={isDisconnectDialogOpen}
        onClose={() => {
          setIsDisconnectDialogOpen(false);
          setSelectedConnectionForDisconnect(null);
        }}
        onConfirm={handleDisconnectBank}
        bankName={selectedConnectionForDisconnect?.bankName || 'Bank'}
      />
    </div>
  );
}
