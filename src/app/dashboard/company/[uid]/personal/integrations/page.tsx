'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Zap,
  CreditCard,
  Calendar,
  Building,
  Database,
  Cloud,
  Settings,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Plus,
  Link as LinkIcon,
  Download,
  Upload,
  BarChart3,
  Users,
  ShoppingCart,
  Utensils,
  Receipt,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Integration {
  id: string;
  name: string;
  description: string;
  category:
    | 'kassensystem'
    | 'reservierung'
    | 'controlling'
    | 'datev'
    | 'warenwirtschaft'
    | 'banking';
  icon: React.ComponentType<any>;
  status: 'connected' | 'disconnected' | 'error' | 'pending';
  lastSync?: Date;
  dataPoints?: number;
  features: string[];
}

interface SyncStats {
  totalIntegrations: number;
  activeConnections: number;
  dailySyncs: number;
  lastFullSync: Date;
}

export default function IntegrationsPage({ params }: { params: Promise<{ uid: string }> }) {
  const { user } = useAuth();
  const resolvedParams = React.use(params);
  const [loading, setLoading] = useState(true);
  const [syncStats, setSyncStats] = useState<SyncStats>({
    totalIntegrations: 0,
    activeConnections: 0,
    dailySyncs: 0,
    lastFullSync: new Date(),
  });

  const integrations: Integration[] = [
    {
      id: 'kassensystem-gastronovi',
      name: 'Gastronovi Kassensystem',
      description: 'Umsatzdaten und Gästezahlen für optimierte Dienstplanung',
      category: 'kassensystem',
      icon: CreditCard,
      status: 'connected',
      lastSync: new Date(Date.now() - 15 * 60 * 1000), // 15 min ago
      dataPoints: 1247,
      features: ['Umsatzdaten', 'Gästezahlen', 'Tagesabschluss', 'Produktverkäufe'],
    },
    {
      id: 'reservierung-opentable',
      name: 'OpenTable Reservierungen',
      description: 'Reservierungsdaten für bessere Personalplanung',
      category: 'reservierung',
      icon: Calendar,
      status: 'connected',
      lastSync: new Date(Date.now() - 30 * 60 * 1000), // 30 min ago
      dataPoints: 356,
      features: ['Reservierungen', 'Gästezahl-Prognosen', 'No-Show-Tracking'],
    },
    {
      id: 'datev-export',
      name: 'DATEV Lohnbuchhaltung',
      description: 'Automatischer Export von Lohndaten an DATEV',
      category: 'datev',
      icon: Receipt,
      status: 'connected',
      lastSync: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      dataPoints: 89,
      features: ['Lohndaten-Export', 'Arbeitszeiten', 'Zuschläge', 'Steuerklassen'],
    },
    {
      id: 'controlling-meinbusiness',
      name: 'MEINbusiness Controlling',
      description: 'Warenwirtschaft und Controlling-Integration',
      category: 'controlling',
      icon: BarChart3,
      status: 'pending',
      features: ['Warenwirtschaft', 'Kostenkontrolle', 'KPI-Dashboard'],
    },
    {
      id: 'warenwirtschaft-lexware',
      name: 'Lexware Warenwirtschaft',
      description: 'Integration mit Lexware für Bestandsmanagement',
      category: 'warenwirtschaft',
      icon: Database,
      status: 'disconnected',
      features: ['Bestandsführung', 'Einkaufsoptimierung', 'Inventur'],
    },
    {
      id: 'banking-sevdesk',
      name: 'sevDesk Banking',
      description: 'Rechnungsstellung und Finanzmanagement',
      category: 'banking',
      icon: Building,
      status: 'error',
      features: ['Rechnungsstellung', 'Zahlungsabwicklung', 'Finanzreporting'],
    },
  ];

  useEffect(() => {
    if (user && resolvedParams.uid) {
      loadIntegrationData();
    }
  }, [user, resolvedParams.uid]);

  const loadIntegrationData = async () => {
    try {
      setLoading(true);

      // Mock Integration Stats
      const connectedIntegrations = integrations.filter(int => int.status === 'connected');
      setSyncStats({
        totalIntegrations: integrations.length,
        activeConnections: connectedIntegrations.length,
        dailySyncs: connectedIntegrations.reduce((sum, int) => sum + (int.dataPoints || 0), 0),
        lastFullSync: new Date(Date.now() - 45 * 60 * 1000), // 45 min ago
      });
    } catch (error) {

      toast.error('Fehler beim Laden der Integrations-Daten');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (integrationId: string) => {
    toast.success(
      `Integration mit ${integrations.find(i => i.id === integrationId)?.name} wird eingerichtet...`
    );
  };

  const handleDisconnect = async (integrationId: string) => {
    toast.success(
      `Integration mit ${integrations.find(i => i.id === integrationId)?.name} getrennt`
    );
  };

  const handleSync = async (integrationId: string) => {
    toast.success('Synchronisation gestartet...');
  };

  const getStatusBadge = (status: Integration['status']) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-100 text-green-800">Verbunden</Badge>;
      case 'disconnected':
        return <Badge variant="secondary">Nicht verbunden</Badge>;
      case 'error':
        return <Badge variant="destructive">Fehler</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Ausstehend</Badge>;
      default:
        return <Badge variant="secondary">Unbekannt</Badge>;
    }
  };

  const getStatusIcon = (status: Integration['status']) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case 'pending':
        return <RefreshCw className="h-5 w-5 text-yellow-600" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getCategoryLabel = (category: Integration['category']) => {
    const labels = {
      kassensystem: 'Kassensystem',
      reservierung: 'Reservierungen',
      controlling: 'Controlling',
      datev: 'DATEV/Lohnbuchhaltung',
      warenwirtschaft: 'Warenwirtschaft',
      banking: 'Banking/Finanzen',
    };
    return labels[category] || category;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schnittstellen & Integrationen</h1>
          <p className="text-gray-600">
            Verbinden Sie Taskilo mit Kassensystemen, Reservierungstools und Controlling-Software
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => toast.success('Synchronisation aller Systeme gestartet')}
            variant="outline"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Alle synchronisieren
          </Button>
          <Button className="bg-[#14ad9f] hover:bg-[#129488] text-white">
            <Plus className="h-4 w-4 mr-2" />
            Integration hinzufügen
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Gesamt Integrationen</p>
                <p className="text-3xl font-bold text-gray-900">{syncStats.totalIntegrations}</p>
                <p className="text-sm text-gray-500">Verfügbare Schnittstellen</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <Zap className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Aktive Verbindungen</p>
                <p className="text-3xl font-bold text-gray-900">{syncStats.activeConnections}</p>
                <p className="text-sm text-green-600">
                  {Math.floor((syncStats.activeConnections / syncStats.totalIntegrations) * 100)}%
                  verbunden
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <LinkIcon className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tägliche Syncs</p>
                <p className="text-3xl font-bold text-gray-900">
                  {syncStats.dailySyncs.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500">Datenpunkte heute</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <RefreshCw className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Letzte Sync</p>
                <p className="text-lg font-bold text-gray-900">
                  {syncStats.lastFullSync.toLocaleTimeString('de-DE')}
                </p>
                <p className="text-sm text-gray-500">
                  Vor {Math.floor((Date.now() - syncStats.lastFullSync.getTime()) / 60000)} min
                </p>
              </div>
              <div className="bg-orange-100 p-3 rounded-full">
                <Cloud className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">Alle</TabsTrigger>
          <TabsTrigger value="kassensystem">Kasse</TabsTrigger>
          <TabsTrigger value="reservierung">Reservierung</TabsTrigger>
          <TabsTrigger value="datev">DATEV</TabsTrigger>
          <TabsTrigger value="controlling">Controlling</TabsTrigger>
          <TabsTrigger value="warenwirtschaft">Waren</TabsTrigger>
        </TabsList>

        {['all', 'kassensystem', 'reservierung', 'datev', 'controlling', 'warenwirtschaft'].map(
          category => (
            <TabsContent key={category} value={category} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {integrations
                  .filter(integration => category === 'all' || integration.category === category)
                  .map(integration => {
                    const Icon = integration.icon;
                    return (
                      <Card key={integration.id} className="relative">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-gray-100 rounded-lg">
                                <Icon className="h-6 w-6 text-gray-600" />
                              </div>
                              <div>
                                <CardTitle className="text-lg">{integration.name}</CardTitle>
                                <CardDescription className="mt-1">
                                  {getCategoryLabel(integration.category)}
                                </CardDescription>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(integration.status)}
                              {getStatusBadge(integration.status)}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-gray-600 mb-4">{integration.description}</p>

                          <div className="space-y-3">
                            <div>
                              <h4 className="font-medium text-sm text-gray-900 mb-2">Features:</h4>
                              <div className="flex flex-wrap gap-1">
                                {integration.features.map((feature, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {feature}
                                  </Badge>
                                ))}
                              </div>
                            </div>

                            {integration.status === 'connected' && (
                              <div className="text-sm text-gray-500">
                                <div className="flex justify-between">
                                  <span>Letzte Sync:</span>
                                  <span>{integration.lastSync?.toLocaleTimeString('de-DE')}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Datenpunkte heute:</span>
                                  <span>{integration.dataPoints?.toLocaleString()}</span>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2 mt-4">
                            {integration.status === 'connected' ? (
                              <>
                                <Button
                                  onClick={() => handleSync(integration.id)}
                                  variant="outline"
                                  size="sm"
                                  className="flex-1"
                                >
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  Sync
                                </Button>
                                <Button
                                  onClick={() => handleDisconnect(integration.id)}
                                  variant="outline"
                                  size="sm"
                                  className="flex-1"
                                >
                                  Trennen
                                </Button>
                              </>
                            ) : (
                              <Button
                                onClick={() => handleConnect(integration.id)}
                                className="w-full bg-[#14ad9f] hover:bg-[#129488] text-white"
                                size="sm"
                              >
                                {integration.status === 'pending'
                                  ? 'Einrichtung fortsetzen'
                                  : 'Verbinden'}
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            </TabsContent>
          )
        )}
      </Tabs>

      {/* Integration Benefits */}
      <Card>
        <CardHeader>
          <CardTitle>Vorteile der Integration</CardTitle>
          <CardDescription>Warum Integrationen Ihr Personal-Management verbessern</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-blue-100 p-3 rounded-full w-12 h-12 mx-auto mb-4">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">KI-optimierte Planung</h3>
              <p className="text-sm text-gray-600">
                Umsatzdaten und Gästezahlen fließen automatisch in die Dienstplanung ein
              </p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 p-3 rounded-full w-12 h-12 mx-auto mb-4">
                <Zap className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Automatisierung</h3>
              <p className="text-sm text-gray-600">
                Automatischer Export von Lohndaten an DATEV und andere Systeme
              </p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 p-3 rounded-full w-12 h-12 mx-auto mb-4">
                <Database className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Zentrale Daten</h3>
              <p className="text-sm text-gray-600">
                Alle Systeme sind verbunden und teilen relevante Daten in Echtzeit
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
