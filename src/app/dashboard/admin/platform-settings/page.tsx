'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Settings,
  TrendingUp,
  DollarSign,
  Users,
  Activity,
  Save,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  CreditCard,
  Download,
  ArrowUpRight,
} from 'lucide-react';
import { toast } from 'sonner';

interface PlatformFeeConfig {
  id: string;
  feeRate: number;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

interface PlatformStats {
  totalRevenue: number;
  totalFees: number;
  connectedAccounts: number;
  monthlyGrowth: number;
  availableBalance: number;
  pendingBalance: number;
}

interface PlatformPayout {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: number;
  arrival_date?: number;
  destination?: {
    bank_name?: string;
    last4?: string;
  };
}

export default function PlatformSettingsPage() {
  const [feeConfig, setFeeConfig] = useState<PlatformFeeConfig | null>(null);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [payouts, setPayouts] = useState<PlatformPayout[]>([]);
  const [newFeeRate, setNewFeeRate] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    loadPlatformSettings();
  }, []);

  const loadPlatformSettings = async () => {
    try {
      setLoading(true);

      // Lade aktuelle Konfiguration
      const configResponse = await fetch('/api/admin/platform-config');
      const configData = await configResponse.json();

      if (configResponse.ok) {
        setFeeConfig(configData.config);
        setNewFeeRate((configData.config.feeRate * 100).toFixed(1));
      }

      // Lade Platform Stats
      const statsResponse = await fetch('/api/admin/platform-stats');
      const statsData = await statsResponse.json();

      if (statsResponse.ok) {
        setStats(statsData.stats);
      }

      // Lade Platform Payouts
      const payoutsResponse = await fetch('/api/admin/platform-payouts');
      const payoutsData = await payoutsResponse.json();

      if (payoutsResponse.ok) {
        setPayouts(payoutsData.payouts || []);
      }
    } catch (error) {
      console.error('Error loading platform settings:', error);
      toast.error('Fehler beim Laden der Plattform-Einstellungen');
    } finally {
      setLoading(false);
    }
  };

  const updatePlatformFee = async () => {
    if (!newFeeRate || isNaN(Number(newFeeRate))) {
      toast.error('Bitte geben Sie einen gültigen Gebührensatz ein');
      return;
    }

    const feeRateDecimal = Number(newFeeRate) / 100;

    if (feeRateDecimal < 0 || feeRateDecimal > 0.2) {
      toast.error('Gebührensatz muss zwischen 0% und 20% liegen');
      return;
    }

    try {
      setSaving(true);

      const response = await fetch('/api/admin/update-platform-fee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feeRate: feeRateDecimal,
          adminUserId: 'current-admin-id', // TODO: Get from auth context
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setFeeConfig(data.config);
        toast.success(`Plattformgebühr erfolgreich auf ${newFeeRate}% aktualisiert`);

        // Refresh stats
        await refreshStats();
      } else {
        toast.error(data.message || 'Fehler beim Aktualisieren der Gebühr');
      }
    } catch (error) {
      console.error('Error updating platform fee:', error);
      toast.error('Fehler beim Aktualisieren der Gebühr');
    } finally {
      setSaving(false);
    }
  };

  const refreshStats = async () => {
    try {
      setRefreshing(true);

      const response = await fetch('/api/admin/platform-stats');
      const data = await response.json();

      if (response.ok) {
        setStats(data.stats);
        toast.success('Statistiken aktualisiert');
      }
    } catch (error) {
      console.error('Error refreshing stats:', error);
      toast.error('Fehler beim Aktualisieren der Statistiken');
    } finally {
      setRefreshing(false);
    }
  };

  const requestPlatformPayout = async () => {
    if (!stats?.availableBalance || stats.availableBalance <= 0) {
      toast.error('Kein verfügbares Guthaben für Auszahlung');
      return;
    }

    try {
      setRequesting(true);

      const response = await fetch('/api/admin/request-platform-payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: stats.availableBalance,
          adminUserId: 'current-admin-id', // TODO: Get from auth context
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Auszahlung von ${formatCurrency(stats.availableBalance)} beantragt`);

        // Refresh data
        await loadPlatformSettings();
      } else {
        toast.error(data.message || 'Fehler beim Beantragen der Auszahlung');
      }
    } catch (error) {
      console.error('Error requesting payout:', error);
      toast.error('Fehler beim Beantragen der Auszahlung');
    } finally {
      setRequesting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount / 100);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Settings className="w-8 h-8" />
          <h1 className="text-3xl font-bold text-gray-800">Plattform-Einstellungen</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-3">
                <div className="h-4 bg-gray-300 rounded w-24"></div>
                <div className="h-8 bg-gray-300 rounded w-32"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Settings className="w-8 h-8" />
        <h1 className="text-3xl font-bold text-gray-800">Plattform-Einstellungen</h1>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gesamtumsatz</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Plattform-Gebühren</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalFees)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Verfügbares Guthaben</CardTitle>
              <CreditCard className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.availableBalance)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Connected Accounts</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.connectedAccounts}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monatliches Wachstum</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatPercentage(stats.monthlyGrowth / 100)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Fee Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Plattformgebühr konfigurieren
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {feeConfig && (
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm text-gray-600">Aktueller Satz:</span>
                <Badge variant="secondary">{formatPercentage(feeConfig.feeRate)}</Badge>
                <Badge variant={feeConfig.isActive ? 'default' : 'secondary'}>
                  {feeConfig.isActive ? 'Aktiv' : 'Inaktiv'}
                </Badge>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="feeRate" className="text-sm font-medium">
                Neuer Gebührensatz (%)
              </label>
              <div className="flex gap-2">
                <input
                  id="feeRate"
                  type="number"
                  min="0"
                  max="20"
                  step="0.1"
                  value={newFeeRate}
                  onChange={e => setNewFeeRate(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
                  placeholder="z.B. 4.5"
                />
                <Button
                  onClick={updatePlatformFee}
                  disabled={saving}
                  className="bg-[#14ad9f] hover:bg-[#129a8f]"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Speichern...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Speichern
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Geben Sie den Gebührensatz als Prozentsatz ein (z.B. 4.5 für 4,5%)
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Konfigurationsverlauf
            </CardTitle>
          </CardHeader>
          <CardContent>
            {feeConfig ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm">
                    Konfiguration aktiv seit{' '}
                    {new Date(feeConfig.updatedAt * 1000).toLocaleDateString('de-DE')}
                  </span>
                </div>

                <div className="text-sm text-gray-600">
                  <p>
                    Erstellt: {new Date(feeConfig.createdAt * 1000).toLocaleDateString('de-DE')}
                  </p>
                  <p>
                    Letzte Änderung:{' '}
                    {new Date(feeConfig.updatedAt * 1000).toLocaleDateString('de-DE')}
                  </p>
                </div>

                <Button
                  variant="outline"
                  onClick={refreshStats}
                  disabled={refreshing}
                  className="w-full"
                >
                  {refreshing ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Aktualisieren...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Statistiken aktualisieren
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-amber-600">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">Keine Konfiguration gefunden</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Info Section */}
      <Card>
        <CardHeader>
          <CardTitle>ℹ️ Wichtige Hinweise</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>• Änderungen der Plattformgebühr werden sofort für neue Transaktionen wirksam</li>
            <li>• Bestehende ausstehende Auszahlungen werden nicht beeinflusst</li>
            <li>
              • Die Gebühr wird automatisch in allen API-Routen und der Invoice-Generierung
              aktualisiert
            </li>
            <li>
              • Empfohlener Bereich: 3% - 6% für optimale Balance zwischen Umsatz und
              Konkurrenzfähigkeit
            </li>
            <li>• Alle Änderungen werden für Compliance-Zwecke protokolliert</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
