'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  CreditCard, 
  Plus, 
  Settings, 
  ArrowRight,
  Zap,
  Shield,
  RefreshCw
} from 'lucide-react';

interface BankConnection {
  id: string;
  bankName: string;
  status: 'connected' | 'error' | 'pending';
  accountCount: number;
  lastSync?: string;
}

export default function BankingPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const uid = typeof params?.uid === 'string' ? params.uid : '';

  const [connections, setConnections] = useState<BankConnection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.uid !== uid) return;
    loadBankConnections();
  }, [uid, user]);

  const loadBankConnections = async () => {
    try {
      setLoading(true);
      // TODO: Load real bank connections from finAPI
      // Für jetzt Mock-Daten
      setTimeout(() => {
        setConnections([
          {
            id: 'conn_1',
            bankName: 'Deutsche Bank',
            status: 'connected',
            accountCount: 2,
            lastSync: '2024-08-05T10:30:00Z'
          },
          {
            id: 'conn_2', 
            bankName: 'Sparkasse',
            status: 'error',
            accountCount: 1,
            lastSync: '2024-08-04T15:45:00Z'
          }
        ]);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Failed to load bank connections:', error);
      setLoading(false);
    }
  };

  const handleConnectBank = () => {
    router.push(`/dashboard/company/${uid}/finance/banking/connect`);
  };

  const handleViewAccounts = () => {
    router.push(`/dashboard/company/${uid}/finance/banking/accounts`);
  };

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

  const handleImportTransactions = () => {
    router.push(`/dashboard/company/${uid}/finance/banking/import`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatLastSync = (dateString?: string) => {
    if (!dateString) return 'Nie';
    const date = new Date(dateString);
    return date.toLocaleString('de-DE');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Banking</h1>
          <p className="text-gray-600 mt-1">
            Verwalten Sie Ihre Bankverbindungen mit WebForm 2.0 und finAPI
          </p>
        </div>
        <Button onClick={handleConnectBank} className="bg-[#14ad9f] hover:bg-[#129488]">
          <Plus className="mr-2 h-4 w-4" />
          Bank verbinden
        </Button>
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

      {/* Bank Connections Overview */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-[#14ad9f]" />
              Konten
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Alle verknüpften Bankkonten anzeigen und verwalten
            </p>
            <Button 
              onClick={handleViewAccounts}
              variant="outline" 
              className="w-full"
            >
              Konten anzeigen
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-[#14ad9f]" />
              Import
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Transaktionen importieren und synchronisieren
            </p>
            <Button 
              onClick={handleImportTransactions}
              variant="outline" 
              className="w-full"
            >
              Transaktionen
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-[#14ad9f]" />
              Einstellungen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Banking-Einstellungen und Automatisierung
            </p>
            <Button 
              variant="outline" 
              className="w-full"
            >
              Konfiguration
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Bank Connections List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-[#14ad9f]" />
            Verbundene Banken
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : connections.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Keine Bankverbindungen
              </h3>
              <p className="text-gray-600 mb-6">
                Verbinden Sie Ihre erste Bank, um mit dem Banking zu beginnen.
              </p>
              <Button onClick={handleConnectBank} className="bg-[#14ad9f] hover:bg-[#129488]">
                <Plus className="mr-2 h-4 w-4" />
                Erste Bank verbinden
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {connections.map((connection) => (
                <div 
                  key={connection.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Building2 className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {connection.bankName}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {connection.accountCount} Konto(s) • Letzte Sync: {formatLastSync(connection.lastSync)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={getStatusColor(connection.status)}>
                      {connection.status === 'connected' ? 'Verbunden' : 
                       connection.status === 'error' ? 'Fehler' : 'Ausstehend'}
                    </Badge>
                    <Button variant="ghost" size="sm">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
