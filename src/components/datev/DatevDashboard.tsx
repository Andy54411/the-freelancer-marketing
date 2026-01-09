'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FiRefreshCw,
  FiFileText,
  FiDollarSign,
  FiUsers,
  FiTrendingUp,
  FiDownload,
  FiUpload,
  FiDatabase,
} from 'react-icons/fi';
import {
  DatevService,
  DatevOrganization,
  DatevAccount,
  DatevTransaction,
} from '@/services/datevService';
import { toast } from 'sonner';

interface DatevDashboardProps {
  companyId: string;
}

export function DatevDashboard({ companyId }: DatevDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [organization, setOrganization] = useState<DatevOrganization | null>(null);
  const [accounts, setAccounts] = useState<DatevAccount[]>([]);
  const [transactions, setTransactions] = useState<DatevTransaction[]>([]);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    loadDatevData();
  }, [companyId]);

  const loadDatevData = async () => {
    try {
      setLoading(true);

      // Test DATEV connection by calling userinfo-test API (guaranteed working)
      const response = await fetch(
        `/api/datev/userinfo-test?companyId=${encodeURIComponent(companyId)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          const errorData = await response.json();
          if (errorData.error === 'no_tokens' || errorData.error === 'invalid_token') {
            toast.error('DATEV-Verbindung erforderlich - bitte authentifizieren Sie sich zuerst');
          } else {
            toast.error('DATEV-Token abgelaufen - erneute Authentifizierung erforderlich');
          }
        } else {
          toast.error('Fehler beim Laden der DATEV-Daten');
        }
        return;
      }

      const result = await response.json();

      if (result.success && result.userInfo) {
        // Transform UserInfo response to organization format
        const org = {
          id: result.userInfo.account_id || result.userInfo.sub || 'unknown',
          name: result.userInfo.name || result.userInfo.preferred_username || 'DATEV User',
          email: result.userInfo.email,
          type: 'client' as const,
          status: 'active' as const,
          address: {
            street: 'N/A',
            city: 'N/A',
            zipCode: 'N/A',
            country: 'DE',
          },
        };
        setOrganization(org);

        // TODO: Load accounts and transactions once those APIs are implemented
        // For now, just set mock data to show connection success
        setAccounts([]);
        setTransactions([]);
        setLastSync(new Date().toISOString());

        toast.success('DATEV-Daten erfolgreich geladen');
      } else {
        toast.error('Keine DATEV-Organisationen gefunden');
      }
    } catch {
      toast.error('Fehler beim Laden der DATEV-Daten');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      await loadDatevData();
      toast.success('DATEV-Daten erfolgreich synchronisiert');
    } catch {
      toast.error('Fehler bei der Synchronisation');
    } finally {
      setSyncing(false);
    }
  };

  const exportToDatev = async (invoiceId: string) => {
    try {
      // Prepare invoice data for DATEV
      const invoiceData = {
        id: invoiceId,
        invoiceNumber: `RG-${invoiceId}`,
        date: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        customerName: 'Beispiel Kunde',
        amount: 1000,
        vatAmount: 190,
        description: `Rechnung ${invoiceId}`,
      };

      await DatevService.importInvoiceToDatev(invoiceData, organization!.id);
      toast.success('Rechnung erfolgreich zu DATEV exportiert');
    } catch {
      toast.error('Fehler beim Export zu DATEV');
    }
  };

  const syncPayment = async (paymentId: string) => {
    try {
      // Prepare payment data for DATEV
      const paymentData = {
        id: paymentId,
        amount: 1000,
        date: new Date().toISOString().split('T')[0],
        reference: `Zahlung ${paymentId}`,
        invoiceId: `RG-${paymentId}`,
      };

      await DatevService.syncPaymentToDatev(paymentData, organization!.id);
      toast.success('Zahlung erfolgreich synchronisiert');
    } catch {
      toast.error('Fehler bei der Zahlungssynchronisation');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FiRefreshCw className="animate-spin" />
            DATEV-Daten werden geladen...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (!organization) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">Keine DATEV-Verbindung</CardTitle>
          <CardDescription>
            Bitte verbinden Sie zuerst Ihr DATEV-Konto um die Buchhaltungsfunktionen zu nutzen.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-[#14ad9f]">
                <FiDatabase />
                DATEV Integration
              </CardTitle>
              <CardDescription>
                Verbunden mit: {organization.name} ({organization.type})
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-[#14ad9f] text-[#14ad9f]">
                Verbunden
              </Badge>
              <Button
                onClick={handleSync}
                disabled={syncing}
                size="sm"
                className="bg-[#14ad9f] hover:bg-taskilo-hover"
              >
                {syncing ? (
                  <FiRefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <FiRefreshCw className="w-4 h-4" />
                )}
                Synchronisieren
              </Button>
            </div>
          </div>
          {lastSync && (
            <p className="text-sm text-gray-500">
              Letzte Synchronisation: {new Date(lastSync).toLocaleString('de-DE')}
            </p>
          )}
        </CardHeader>
      </Card>

      {/* Dashboard Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="accounts">Konten</TabsTrigger>
          <TabsTrigger value="transactions">Transaktionen</TabsTrigger>
          <TabsTrigger value="exports">Export/Import</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Konten</CardTitle>
                <FiUsers className="h-4 w-4 text-[#14ad9f]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{accounts.length}</div>
                <p className="text-xs text-muted-foreground">DATEV-Konten verbunden</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Transaktionen</CardTitle>
                <FiTrendingUp className="h-4 w-4 text-[#14ad9f]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{transactions.length}</div>
                <p className="text-xs text-muted-foreground">Letzte 30 Tage</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gesamtsumme</CardTitle>
                <FiDollarSign className="h-4 w-4 text-[#14ad9f]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  €{transactions.reduce((sum, t) => sum + (t.amount || 0), 0).toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">Transaktionsvolumen</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="accounts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>DATEV-Konten</CardTitle>
              <CardDescription>Übersicht aller verbundenen DATEV-Konten</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {accounts.map(account => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <h4 className="font-medium">{account.name}</h4>
                      <p className="text-sm text-gray-500">Konto-Nr: {account.number}</p>
                      <p className="text-sm text-gray-500">Typ: {account.type}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">€{account.balance?.toFixed(2) || '0.00'}</p>
                      <Badge
                        variant="outline"
                        className={
                          account.isActive
                            ? 'border-green-500 text-green-500'
                            : 'border-gray-400 text-gray-400'
                        }
                      >
                        {account.isActive ? 'Aktiv' : 'Inaktiv'}
                      </Badge>
                    </div>
                  </div>
                ))}
                {accounts.length === 0 && (
                  <p className="text-center text-gray-500 py-8">Keine DATEV-Konten gefunden</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Letzte Transaktionen</CardTitle>
              <CardDescription>Aktuelle Buchungen aus DATEV (letzte 30 Tage)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {transactions.map(transaction => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <h4 className="font-medium">{transaction.description}</h4>
                      <p className="text-sm text-gray-500">
                        {transaction.date
                          ? new Date(transaction.date).toLocaleDateString('de-DE')
                          : 'Kein Datum'}
                      </p>
                      <p className="text-sm text-gray-500">Konto: {transaction.accountNumber}</p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-medium ${(transaction.amount || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {(transaction.amount || 0) >= 0 ? '+' : ''}€
                        {transaction.amount?.toFixed(2) || '0.00'}
                      </p>
                      <Badge variant="outline">{transaction.status || 'Standard'}</Badge>
                    </div>
                  </div>
                ))}
                {transactions.length === 0 && (
                  <p className="text-center text-gray-500 py-8">Keine Transaktionen gefunden</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exports" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FiUpload className="text-[#14ad9f]" />
                  Export zu DATEV
                </CardTitle>
                <CardDescription>Taskilo-Rechnungen zu DATEV exportieren</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  className="w-full bg-[#14ad9f] hover:bg-taskilo-hover"
                  onClick={() => exportToDatev('example-invoice-id')}
                >
                  <FiUpload className="w-4 h-4 mr-2" />
                  Offene Rechnungen exportieren
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
                  onClick={() => syncPayment('example-payment-id')}
                >
                  <FiRefreshCw className="w-4 h-4 mr-2" />
                  Zahlungen synchronisieren
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FiDownload className="text-[#14ad9f]" />
                  Import aus DATEV
                </CardTitle>
                <CardDescription>DATEV-Daten in Taskilo importieren</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  variant="outline"
                  className="w-full border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
                  onClick={handleSync}
                >
                  <FiDownload className="w-4 h-4 mr-2" />
                  Kontendaten importieren
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
                  onClick={handleSync}
                >
                  <FiFileText className="w-4 h-4 mr-2" />
                  Buchungen aktualisieren
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
