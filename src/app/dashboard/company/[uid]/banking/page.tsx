'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  AlertCircle,
  Search,
  Loader2,
  Plus,
  CheckCircle,
  Clock,
  Activity,
  Send,
  Filter,
  Download,
  Calendar,
  Euro,
  MoreHorizontal,
  ArrowUp,
  ArrowDown,
  FileText,
  Link,
  ChevronDown,
  Users,
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

  // Bank Search States
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Function to get the correct bank logo filename
  const getBankLogoPath = (name: string): string => {
    const bankMappings: { [key: string]: string } = {
      sparkasse: 'Sparkasse.png',
      'deutsche bank': 'Deutsche_Bank.png',
      commerzbank: 'Commerzbank.png',
      volksbank: 'Volksbanken_Raiffeisenbanken.png',
      n26: 'N26.png',
      paypal: 'Paypal.png',
      qonto: 'Qonto.png',
      fyrst: 'Fyrst.png',
      norisbank: 'Deutsche_Bank.png', // norisbank gehört zur Deutsche Bank
    };

    const normalizedName = name.toLowerCase();
    const logoFile = bankMappings[normalizedName];

    return logoFile ? `/images/banks/${logoFile}` : '/images/banks/default-bank-logo.svg';
  };

  // If we have connections, redirect to accounts page
  useEffect(() => {
    if (!loading && connections.length > 0) {
      router.push(`/dashboard/company/${uid}/banking/accounts`);
    }
  }, [loading, connections.length, router, uid]);

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

  // FinAPI Bank Search für Test-Banken
  const searchBanks = async (query: string) => {
    if (!query.trim()) {
      setFilteredBanks([]);
      return;
    }

    setLoading(true);

    try {
      // Suche in FinAPI Sandbox mit Test-Banken
      const response = await fetch(
        `/api/finapi/banks?search=${query}&perPage=20&includeTestBanks=true`
      );
      const data = await response.json();

      if (data.success && data.banks) {
        // Priorisiere Test-Banken in den Ergebnissen
        const testBanks = data.banks.filter((bank: any) => bank.isTestBank);
        const realBanks = data.banks.filter((bank: any) => !bank.isTestBank);

        // Zeige Test-Banken zuerst, dann echte Banken
        const sortedBanks = [...testBanks, ...realBanks];
        setFilteredBanks(sortedBanks);
      } else if (data.data?.banks) {
        setFilteredBanks(data.data.banks);
      } else {
        setFilteredBanks([]);
      }
    } catch (error) {
      console.error(`🚨 Fehler bei Suche "${query}":`, error);
      setFilteredBanks([]);
    } finally {
      setLoading(false);
    }
  };

  // Lade alle verfügbaren Banken aus der FinAPI
  const loadAllAvailableBanks = async () => {
    setLoading(true);
    setSearchTerm('Alle Banken');

    try {
      // Lade alle Banken ohne Suchfilter
      const response = await fetch('/api/finapi/banks?perPage=50&includeTestBanks=true');
      const data = await response.json();

      // Debug: Zeige API-Response

      if (data.success && data.banks) {
        // Sortiere: Test-Banken zuerst, dann alphabetisch
        const testBanks = data.banks
          .filter((bank: any) => bank.isTestBank)
          .sort((a: any, b: any) => a.name.localeCompare(b.name));
        const realBanks = data.banks
          .filter((bank: any) => !bank.isTestBank)
          .sort((a: any, b: any) => a.name.localeCompare(b.name));

        const allBanks = [...testBanks, ...realBanks];

        setFilteredBanks(allBanks);
      } else if (data.data?.banks) {
        // Fallback für andere API-Struktur
        const banks = data.data.banks;
        const testBanks = banks
          .filter(
            (bank: any) =>
              bank.isTestBank ||
              bank.name.toLowerCase().includes('test') ||
              bank.name.toLowerCase().includes('demo')
          )
          .sort((a: any, b: any) => a.name.localeCompare(b.name));
        const realBanks = banks
          .filter(
            (bank: any) =>
              !bank.isTestBank &&
              !bank.name.toLowerCase().includes('test') &&
              !bank.name.toLowerCase().includes('demo')
          )
          .sort((a: any, b: any) => a.name.localeCompare(b.name));

        const allBanks = [...testBanks, ...realBanks];

        setFilteredBanks(allBanks);
      } else {
        // Versuche andere mögliche Strukturen
        if (data.banks && Array.isArray(data.banks)) {
          setFilteredBanks(data.banks);
        } else if (data.result?.banks) {
          setFilteredBanks(data.result.banks);
        } else {
          setFilteredBanks([]);
          // Zeige verfügbare Struktur als Fallback-Info
          if (Object.keys(data).length > 0) {
            setError(`FinAPI Debug: Verfügbare Keys: ${Object.keys(data).join(', ')}`);
          }
        }
      }
    } catch (error) {
      console.error('🚨 Fehler beim Laden der Banken:', error);
      setFilteredBanks([]);
      setError(`Fehler beim Laden der Banken: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchTerm(query);
    searchBanks(query);
  };

  const handleBankSelect = (bank: any) => {
    // Navigate to connect page with bank details including FinAPI ID
    if (params?.uid) {
      const queryParams = new URLSearchParams({
        bank: bank.name,
        bic: bank.bic,
        blz: bank.blz,
        finapiId: bank.finapiId?.toString() || bank.id,
        location: bank.location || '',
        isTestBank: bank.isTestBank?.toString() || 'false',
      });

      window.location.href = `/dashboard/company/${params.uid}/banking/connect?${queryParams.toString()}`;
    }
    setShowSearchResults(false);
  };

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
      } catch (finapiError) {}

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
      } catch (revolutError) {}

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
            ([bankName, accounts]) => ({
              id: `bank_${bankName.replace(/\s+/g, '_').toLowerCase()}`,
              bankName: bankName,
              status: 'connected' as const,
              accountCount: Array.isArray(accounts) ? accounts.length : 0,
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
          } catch (updateError) {}
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
    } catch (error) {}
  };

  const loadAvailableBanks = async () => {
    try {
      setError(null);

      const response = await fetch('/api/finapi/banks?includeTestBanks=true&perPage=50');

      if (!response.ok) {
        throw new Error(`Failed to load banks: ${response.status}`);
      }

      const data = await response.json();

      // Updated to match the new API response structure
      if (data.success && data.banks && Array.isArray(data.banks)) {
        setAvailableBanks(data.banks);
      } else if (data.data && Array.isArray(data.data.banks)) {
        // Fallback for old API structure
        setAvailableBanks(data.data.banks);
      } else {
        console.error('❌ Keine Banken gefunden in API Response:', data);
        throw new Error('Invalid response format - no banks data received');
      }
    } catch (error) {
      console.error('❌ Fehler beim Laden der Banken:', error);
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

  if (!loading && connections.length > 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f] mx-auto mb-4"></div>
          <p className="text-gray-600">Weiterleitung zu Bankkonten...</p>
        </div>
      </div>
    );
  }

  // Show banking overview for connected users (fallback)
  if (false) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Hero Section - Connected */}
          <section className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Banking Übersicht</h1>
            <p className="text-gray-600">Verbundene Bankkonten und Transaktionen</p>
          </section>

          {/* Connected Banks */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {connections.map(connection => (
              <Card key={connection.id} className="border border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">{connection.bankName}</h3>
                    <Badge className={getStatusColor(connection.status)}>
                      {connection.status === 'connected' ? 'Verbunden' : connection.status}
                    </Badge>
                  </div>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p>Konten: {connection.accountCount}</p>
                    <p>Letzte Synchronisation: {formatLastSync(connection.lastSync)}</p>
                  </div>
                  <div className="mt-4 flex justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        (window.location.href = `/dashboard/company/${uid}/banking/transactions`)
                      }
                    >
                      Transaktionen
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedConnectionForDisconnect(connection);
                        setIsDisconnectDialogOpen(true);
                      }}
                    >
                      Trennen
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border border-gray-200">
              <CardContent className="p-6 text-center">
                <Activity className="h-8 w-8 text-[#14ad9f] mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Transaktionen</h3>
                <p className="text-sm text-gray-600 mb-4">Alle Banking-Transaktionen anzeigen</p>
                <Button
                  onClick={() =>
                    (window.location.href = `/dashboard/company/${uid}/banking/transactions`)
                  }
                  className="bg-[#14ad9f] hover:bg-[#129488] text-white"
                >
                  Transaktionen anzeigen
                </Button>
              </CardContent>
            </Card>

            <Card className="border border-gray-200">
              <CardContent className="p-6 text-center">
                <CreditCard className="h-8 w-8 text-[#14ad9f] mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Konten</h3>
                <p className="text-sm text-gray-600 mb-4">Bankkonten und Salden verwalten</p>
                <Button
                  onClick={() =>
                    (window.location.href = `/dashboard/company/${uid}/banking/accounts`)
                  }
                  variant="outline"
                >
                  Konten anzeigen
                </Button>
              </CardContent>
            </Card>

            <Card className="border border-gray-200">
              <CardContent className="p-6 text-center">
                <Plus className="h-8 w-8 text-[#14ad9f] mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Bank hinzufügen</h3>
                <p className="text-sm text-gray-600 mb-4">Weitere Bankverbindung hinzufügen</p>
                <Button
                  onClick={() =>
                    (window.location.href = `/dashboard/company/${uid}/banking/connect`)
                  }
                  variant="outline"
                >
                  Bank verbinden
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <section className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4 leading-tight">
            Deine Finanzen immer im Blick.
            <br />
            Verbinde Taskilo mit deiner Bank.
          </h1>
        </section>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8">
              <button className="py-3 px-1 border-b-2 border-[#14ad9f] text-[#14ad9f] font-medium text-sm">
                Bankkonto
              </button>
              <button className="py-3 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm">
                Verrechnungskonto
              </button>
            </nav>
          </div>
        </div>

        {/* Search Section */}
        <div className="mb-8">
          <div className="max-w-md mx-auto">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                type="text"
                placeholder="Bank suchen"
                value={searchTerm}
                onChange={handleSearchChange}
                className="pl-10 w-full h-12 text-lg border-gray-300 rounded-lg focus:ring-[#14ad9f] focus:border-[#14ad9f]"
              />

              {/* Search Results Dropdown - PRODUCTION VERSION */}
              {searchTerm.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                  {filteredBanks.length === 0 && !loading && (
                    <div className="p-4">
                      <div className="text-sm text-gray-600 mb-3">
                        {searchTerm === 'Alle Banken'
                          ? 'Keine Banken in der FinAPI Sandbox verfügbar'
                          : `Keine Banken gefunden für "${searchTerm}"`}
                      </div>
                      <div className="text-xs text-blue-600 mb-3">
                        💡 FinAPI Sandbox kann limitierte Test-Daten haben. Nutze die Buttons unten
                        zum Testen:
                      </div>
                      <div className="text-xs text-gray-500 mb-2">
                        🔧 Öffne die Browser-Konsole (F12) für Debug-Informationen
                      </div>
                      <div className="mt-2">
                        <button
                          onClick={() => {
                            setSearchTerm('Demo Bank');
                            searchBanks('Demo Bank');
                          }}
                          className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1 rounded mr-2"
                        >
                          Demo Bank testen
                        </button>
                        <button
                          onClick={() => {
                            setSearchTerm('FinAPI');
                            searchBanks('FinAPI');
                          }}
                          className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1 rounded mr-2"
                        >
                          FinAPI testen
                        </button>
                        <button
                          onClick={() => {
                            setSearchTerm('Sparkasse');
                            searchBanks('Sparkasse');
                          }}
                          className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1 rounded mr-2"
                        >
                          Sparkasse testen
                        </button>
                        <button
                          onClick={loadAllAvailableBanks}
                          className="text-xs bg-green-50 hover:bg-green-100 text-green-700 px-2 py-1 rounded mr-2"
                        >
                          Alle verfügbaren Banken anzeigen
                        </button>
                        <button
                          onClick={() => {
                            // Teste auch ohne Parameter
                            setLoading(true);
                            fetch('/api/finapi/banks')
                              .then(res => res.json())
                              .then(data => {
                                if (data.banks?.length > 0 || data.data?.banks?.length > 0) {
                                  setError(
                                    `✅ API funktioniert! Gefunden: ${data.banks?.length || data.data?.banks?.length || 0} Banken`
                                  );
                                } else {
                                  setError(
                                    `ℹ️ API Response: ${JSON.stringify(data).substring(0, 200)}...`
                                  );
                                }
                              })
                              .catch(err => setError(`❌ API Fehler: ${err}`))
                              .finally(() => setLoading(false));
                          }}
                          className="text-xs bg-yellow-50 hover:bg-yellow-100 text-yellow-700 px-2 py-1 rounded"
                        >
                          🧪 API testen
                        </button>
                      </div>
                    </div>
                  )}
                  {filteredBanks.length > 0 && (
                    <>
                      <ul className="py-2">
                        {filteredBanks.map((bank: any) => (
                          <li key={bank.id}>
                            <button
                              type="button"
                              onClick={() => handleBankSelect(bank)}
                              className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center space-x-3"
                            >
                              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                <img
                                  src={getBankLogoPath(bank.name)}
                                  alt={bank.name}
                                  className="w-6 h-6 object-contain"
                                  onError={e => {
                                    // Fallback to text initial
                                    const target = e.currentTarget;
                                    target.style.display = 'none';
                                    target.parentElement!.innerHTML = `<div class="w-6 h-6 bg-[#14ad9f] rounded flex items-center justify-center text-white font-semibold text-xs">${bank.name.charAt(0).toUpperCase()}</div>`;
                                  }}
                                />
                              </div>
                              <div className="flex-1">
                                <div className="text-sm font-medium text-gray-900">
                                  <span
                                    dangerouslySetInnerHTML={{
                                      __html: bank.name.replace(
                                        new RegExp(`(${searchTerm})`, 'gi'),
                                        '<mark class="bg-yellow-200">$1</mark>'
                                      ),
                                    }}
                                  />
                                  {bank.isTestBank && (
                                    <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">
                                      Test Bank
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {bank.bic && `BIC: ${bank.bic}`}{' '}
                                  {bank.blz && `· BLZ: ${bank.blz}`}
                                  {bank.location && ` · ${bank.location}`}
                                </div>
                              </div>
                              <div className="text-gray-400">
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 5l7 7-7 7"
                                  />
                                </svg>
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>

                      {/* +4000 weitere Banken Text */}
                      <div className="border-t border-gray-100 px-4 py-2 text-center">
                        <span className="text-sm text-gray-500">
                          +4000 weitere Banken in Deutschland und Österreich
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Loading indicator */}
              {loading && searchTerm.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center">
                  <div className="flex items-center justify-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin text-[#14ad9f]" />
                    <span className="text-sm text-gray-600">Suche Banken...</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bank Gallery */}
        <div className="mb-8">
          <div className="grid grid-cols-3 gap-3 max-w-4xl mx-auto">
            {/* Datenimport-Konto */}
            <button
              type="button"
              className="w-72 h-32 bg-white border border-gray-200 rounded-lg hover:border-[#14ad9f] hover:shadow-sm transition-all cursor-pointer flex flex-col items-center justify-center group p-4"
            >
              <Plus className="h-8 w-8 mb-2 text-gray-400 group-hover:text-[#14ad9f] transition-colors" />
              <span className="text-xs text-gray-600 group-hover:text-[#14ad9f] font-medium transition-colors text-center">
                Datenimport-Konto
              </span>
            </button>

            {/* Sparkasse */}
            <button
              type="button"
              className="w-72 h-32 bg-white border border-gray-200 rounded-lg overflow-hidden hover:border-[#14ad9f] hover:shadow-sm transition-all cursor-pointer flex items-center justify-center"
            >
              <img
                src="/images/banks/Sparkasse.png"
                alt="Sparkasse"
                className="max-w-full max-h-full object-contain p-4"
              />
            </button>

            {/* PayPal */}
            <button
              type="button"
              className="w-72 h-32 bg-white border border-gray-200 rounded-lg overflow-hidden hover:border-[#14ad9f] hover:shadow-sm transition-all cursor-pointer flex items-center justify-center"
            >
              <img
                src="/images/banks/Paypal.png"
                alt="PayPal"
                className="max-w-full max-h-full object-contain p-4"
              />
            </button>

            {/* Deutsche Bank */}
            <button
              type="button"
              className="w-72 h-32 bg-white border border-gray-200 rounded-lg overflow-hidden hover:border-[#14ad9f] hover:shadow-sm transition-all cursor-pointer flex items-center justify-center"
            >
              <img
                src="/images/banks/Deutsche_Bank.png"
                alt="Deutsche Bank"
                className="max-w-full max-h-full object-contain p-4"
              />
            </button>

            {/* Commerzbank */}
            <button
              type="button"
              className="w-72 h-32 bg-white border border-gray-200 rounded-lg overflow-hidden hover:border-[#14ad9f] hover:shadow-sm transition-all cursor-pointer flex items-center justify-center"
            >
              <img
                src="/images/banks/Commerzbank.png"
                alt="Commerzbank"
                className="max-w-full max-h-full object-contain p-4"
              />
            </button>

            {/* N26 */}
            <button
              type="button"
              className="w-72 h-32 bg-white border border-gray-200 rounded-lg overflow-hidden hover:border-[#14ad9f] hover:shadow-sm transition-all cursor-pointer flex items-center justify-center"
            >
              <img
                src="/images/banks/N26.png"
                alt="N26"
                className="max-w-full max-h-full object-contain p-4"
              />
            </button>

            {/* Volksbank */}
            <button
              type="button"
              className="w-72 h-32 bg-white border border-gray-200 rounded-lg overflow-hidden hover:border-[#14ad9f] hover:shadow-sm transition-all cursor-pointer flex items-center justify-center"
            >
              <img
                src="/images/banks/Volksbanken_Raiffeisenbanken.png"
                alt="Volksbank"
                className="max-w-full max-h-full object-contain p-4"
              />
            </button>

            {/* Qonto */}
            <button
              type="button"
              className="w-72 h-32 bg-white border border-gray-200 rounded-lg overflow-hidden hover:border-[#14ad9f] hover:shadow-sm transition-all cursor-pointer flex items-center justify-center"
            >
              <img
                src="/images/banks/Qonto.png"
                alt="Qonto"
                className="max-w-full max-h-full object-contain p-4"
              />
            </button>

            {/* Fyrst */}
            <button
              type="button"
              className="w-72 h-32 bg-white border border-gray-200 rounded-lg overflow-hidden hover:border-[#14ad9f] hover:shadow-sm transition-all cursor-pointer flex items-center justify-center"
            >
              <img
                src="/images/banks/Fyrst.png"
                alt="Fyrst"
                className="max-w-full max-h-full object-contain p-4"
              />
            </button>
          </div>

          {/* +4000 weitere Banken Text */}
          <div className="text-center mt-6">
            <span className="text-sm text-gray-500">
              +4000 weitere Banken in Deutschland und Österreich
            </span>
          </div>
        </div>

        {/* Benefits Card */}
        <Card className="bg-white border border-gray-200 shadow-sm max-w-4xl mx-auto">
          <CardContent className="p-8">
            <ul className="space-y-4">
              <li className="flex items-center space-x-3">
                <div className="shrink-0">
                  <CheckCircle className="h-6 w-6 text-[#14ad9f]" />
                </div>
                <span className="text-gray-700">Zahlungseingänge werden automatisch verbucht</span>
              </li>
              <li className="flex items-center space-x-3">
                <div className="shrink-0">
                  <CheckCircle className="h-6 w-6 text-[#14ad9f]" />
                </div>
                <span className="text-gray-700">
                  Tätige Überweisungen ohne Umwege direkt in Taskilo
                </span>
              </li>
              <li className="flex items-center space-x-3">
                <div className="shrink-0">
                  <CheckCircle className="h-6 w-6 text-[#14ad9f]" />
                </div>
                <span className="text-gray-700">Sehen, wenn ein Beleg vergessen wurde</span>
              </li>
            </ul>
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
      </div>
    </main>
  );
}
