'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Package,
  Truck,
  ShoppingCart,
  Globe,
  Settings,
  CheckCircle,
  AlertCircle,
  Plug,
  Key,
  Zap,
  Database,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';

// API Integration Types
interface ApiIntegration {
  id: string;
  name: string;
  type: 'shipping' | 'ecommerce' | 'postal' | 'marketplace';
  status: 'connected' | 'disconnected' | 'error' | 'pending';
  description: string;
  icon: React.ReactNode;
  color: string;
  features: string[];
  config: Record<string, any>;
  lastSync?: Date;
  credentials?: {
    apiKey?: string;
    secretKey?: string;
    endpoint?: string;
    storeUrl?: string;
    accessToken?: string;
  };
}

interface DeliveryNoteApiIntegrationsProps {
  companyId: string;
}

export function DeliveryNoteApiIntegrations({ companyId }: DeliveryNoteApiIntegrationsProps) {
  const [integrations, setIntegrations] = useState<ApiIntegration[]>([]);
  const [loading, setLoading] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<ApiIntegration | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);

  // Verfügbare API-Integrationen
  const availableIntegrations: Omit<ApiIntegration, 'id' | 'status' | 'config' | 'credentials'>[] =
    [
      {
        name: 'Deutsche Post DHL',
        type: 'shipping',
        description: 'Automatische Label-Erstellung und Sendungsverfolgung über DHL API',
        icon: <Truck className="h-5 w-5" />,
        color: '#FFCC00',
        features: ['Paketlabel erstellen', 'Sendungsverfolgung', 'Preisberechnung', 'Retouren'],
      },
      {
        name: 'UPS API',
        type: 'shipping',
        description: 'UPS Versandlabels und Tracking-Integration',
        icon: <Package className="h-5 w-5" />,
        color: '#8B4513',
        features: ['Versandlabel', 'Tracking', 'Kostenberechnung', 'Lieferzeit-Schätzung'],
      },
      {
        name: 'FedEx Web Services',
        type: 'shipping',
        description: 'FedEx Versand- und Tracking-Services',
        icon: <Truck className="h-5 w-5" />,
        color: '#4B0082',
        features: ['Express-Versand', 'Tracking', 'Zollabwicklung', 'Retouren'],
      },
      {
        name: 'Shopify Store',
        type: 'ecommerce',
        description: 'Automatische Bestellungen aus Shopify importieren',
        icon: <ShoppingCart className="h-5 w-5" />,
        color: '#7AB55C',
        features: ['Bestellungen sync', 'Produktdaten', 'Kundeninformationen', 'Lagerbestand'],
      },
      {
        name: 'WooCommerce',
        type: 'ecommerce',
        description: 'WordPress WooCommerce Store-Anbindung',
        icon: <Globe className="h-5 w-5" />,
        color: '#96588A',
        features: ['Order Management', 'Produktsync', 'Inventory Sync', 'Customer Data'],
      },
      {
        name: 'Magento 2',
        type: 'ecommerce',
        description: 'Magento E-Commerce Platform Integration',
        icon: <Database className="h-5 w-5" />,
        color: '#F26322',
        features: ['Bestellverwaltung', 'Katalog-Sync', 'Multi-Store', 'B2B Features'],
      },
      {
        name: 'Amazon Marketplace',
        type: 'marketplace',
        description: 'Amazon Seller Central API-Integration',
        icon: <Package className="h-5 w-5" />,
        color: '#FF9900',
        features: ['Order Management', 'FBA Integration', 'Inventory Sync', 'Reporting'],
      },
      {
        name: 'eBay Trading API',
        type: 'marketplace',
        description: 'eBay Marketplace Integration für Verkäufer',
        icon: <Globe className="h-5 w-5" />,
        color: '#E53238',
        features: ['Auction Management', 'Order Processing', 'Feedback System', 'Analytics'],
      },
      {
        name: 'Österreichische Post',
        type: 'postal',
        description: 'Post Austria API für Österreich-Versand',
        icon: <Truck className="h-5 w-5" />,
        color: '#FFD700',
        features: ['Paketservice', 'Tracking', 'Internationaler Versand', 'Express'],
      },
      {
        name: 'Swiss Post API',
        type: 'postal',
        description: 'Schweizer Post API-Integration',
        icon: <Package className="h-5 w-5" />,
        color: '#DC143C',
        features: ['PostPac', 'Tracking', 'Zolldokumente', 'Express-Service'],
      },
    ];

  useEffect(() => {
    loadIntegrations();
  }, [companyId]);

  const loadIntegrations = async () => {
    try {
      setLoading(true);
      // API call to load existing integrations
      // const response = await fetch(`/api/delivery-note/integrations/${companyId}`);
      // const data = await response.json();
      // setIntegrations(data.integrations || []);

      // Demo data für jetzt
      setIntegrations([
        {
          id: '1',
          name: 'Deutsche Post DHL',
          type: 'shipping',
          status: 'connected',
          description: 'Automatische Label-Erstellung und Sendungsverfolgung über DHL API',
          icon: <Truck className="h-5 w-5" />,
          color: '#FFCC00',
          features: ['Paketlabel erstellen', 'Sendungsverfolgung', 'Preisberechnung', 'Retouren'],
          config: { autoCreateLabels: true, defaultService: 'DHL_PAKET' },
          lastSync: new Date(),
          credentials: {
            apiKey: 'dhl_*********************',
            endpoint: 'https://api-sandbox.dhl.com',
          },
        },
      ]);
    } catch {
      toast.error('Integrationen konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const _handleAddIntegration = (integration: any) => {
    setSelectedIntegration({
      ...integration,
      id: Date.now().toString(),
      status: 'disconnected' as const,
      config: {},
      credentials: {},
    });
    setShowConfigDialog(true);
  };

  const handleSaveIntegration = async () => {
    if (!selectedIntegration) return;

    try {
      // API call to save integration
      // await fetch(`/api/delivery-note/integrations/${companyId}`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(selectedIntegration),
      // });

      setIntegrations(prev => {
        const existing = prev.find(i => i.id === selectedIntegration.id);
        if (existing) {
          return prev.map(i => (i.id === selectedIntegration.id ? selectedIntegration : i));
        }
        return [...prev, selectedIntegration];
      });

      setShowConfigDialog(false);
      setSelectedIntegration(null);
      toast.success('Integration erfolgreich gespeichert');
    } catch {
      toast.error('Integration konnte nicht gespeichert werden');
    }
  };

  const handleTestConnection = async (_integration: ApiIntegration) => {
    try {
      toast.success('Verbindung erfolgreich getestet');
      // Hier würde die tatsächliche API-Verbindung getestet
    } catch {
      toast.error('Verbindungstest fehlgeschlagen');
    }
  };

  const handleSyncData = async (integration: ApiIntegration) => {
    try {
      toast.success('Daten erfolgreich synchronisiert');
      // Hier würde die Datensynchronisation durchgeführt
      setIntegrations(prev =>
        prev.map(i => (i.id === integration.id ? { ...i, lastSync: new Date() } : i))
      );
    } catch {
      toast.error('Synchronisation fehlgeschlagen');
    }
  };

  const getStatusBadge = (status: ApiIntegration['status']) => {
    switch (status) {
      case 'connected':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Verbunden
          </Badge>
        );
      case 'disconnected':
        return (
          <Badge variant="outline" className="border-gray-300 text-gray-600">
            <AlertCircle className="h-3 w-3 mr-1" />
            Getrennt
          </Badge>
        );
      case 'error':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            <AlertCircle className="h-3 w-3 mr-1" />
            Fehler
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            Ausstehend
          </Badge>
        );
      default:
        return null;
    }
  };

  const getTypeIcon = (type: ApiIntegration['type']) => {
    switch (type) {
      case 'shipping':
        return <Truck className="h-4 w-4" />;
      case 'ecommerce':
        return <ShoppingCart className="h-4 w-4" />;
      case 'postal':
        return <Package className="h-4 w-4" />;
      case 'marketplace':
        return <Globe className="h-4 w-4" />;
      default:
        return <Plug className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-[#14ad9f]" />
        <span className="ml-2 text-gray-600">Lade Integrationen...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-sm text-gray-600 mb-6">
          Verbinden Sie externe Services für automatische Label-Erstellung und E-Commerce-Sync
        </p>
      </div>

      {/* Verfügbare Integrationen als Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {availableIntegrations.map((integration, index) => (
          <Card
            key={index}
            className="hover:shadow-md transition-all cursor-pointer hover:border-[#14ad9f]"
            onClick={() => {
              setSelectedIntegration({
                ...integration,
                id: `${integration.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
                status: 'disconnected',
                config: {},
                credentials: {},
              });
              setShowConfigDialog(true);
            }}
          >
            <CardContent className="p-4 text-center">
              <div
                className="p-3 rounded-lg mx-auto mb-3 w-fit"
                style={{ backgroundColor: `${integration.color}20` }}
              >
                {integration.icon}
              </div>
              <h3 className="font-medium text-sm mb-1">{integration.name}</h3>
              <div className="flex items-center justify-center space-x-1 mb-2">
                {getTypeIcon(integration.type)}
                <span className="text-xs text-gray-500 capitalize">
                  {integration.type === 'shipping'
                    ? 'Versand'
                    : integration.type === 'ecommerce'
                      ? 'E-Commerce'
                      : integration.type === 'marketplace'
                        ? 'Marktplatz'
                        : 'Post'}
                </span>
              </div>
              <p className="text-xs text-gray-600 line-clamp-2">{integration.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Konfigurierte Integrationen */}
      {integrations.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Konfigurierte Integrationen</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {integrations.map(integration => (
              <Card key={integration.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: `${integration.color}20` }}
                      >
                        {integration.icon}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{integration.name}</CardTitle>
                        <div className="flex items-center space-x-2 mt-1">
                          {getTypeIcon(integration.type)}
                          <span className="text-xs text-gray-500 capitalize">
                            {integration.type === 'shipping'
                              ? 'Versand'
                              : integration.type === 'ecommerce'
                                ? 'E-Commerce'
                                : integration.type === 'marketplace'
                                  ? 'Marktplatz'
                                  : 'Post'}
                          </span>
                        </div>
                      </div>
                    </div>
                    {getStatusBadge(integration.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600">{integration.description}</p>

                  <div className="space-y-2">
                    <div className="text-xs font-medium text-gray-700">Features:</div>
                    <div className="flex flex-wrap gap-1">
                      {integration.features.slice(0, 3).map((feature, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                      {integration.features.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{integration.features.length - 3} mehr
                        </Badge>
                      )}
                    </div>
                  </div>

                  {integration.lastSync && (
                    <div className="text-xs text-gray-500">
                      Letzte Sync: {integration.lastSync.toLocaleString('de-DE')}
                    </div>
                  )}

                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedIntegration(integration);
                        setShowConfigDialog(true);
                      }}
                      className="flex-1"
                    >
                      <Settings className="h-4 w-4 mr-1" />
                      Konfigurieren
                    </Button>
                    {integration.status === 'connected' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSyncData(integration)}
                        className="border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Configuration Dialog */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedIntegration?.name} konfigurieren</DialogTitle>
            <DialogDescription>
              Konfigurieren Sie die API-Verbindung und Einstellungen
            </DialogDescription>
          </DialogHeader>

          {selectedIntegration && (
            <div className="space-y-6 mt-4">
              {/* API Credentials */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center">
                  <Key className="h-5 w-5 mr-2 text-[#14ad9f]" />
                  API-Zugangsdaten
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="apiKey">API-Schlüssel</Label>
                    <div className="relative">
                      <Input
                        id="apiKey"
                        type={showApiKey ? 'text' : 'password'}
                        value={selectedIntegration.credentials?.apiKey || ''}
                        onChange={e =>
                          setSelectedIntegration({
                            ...selectedIntegration,
                            credentials: {
                              ...selectedIntegration.credentials,
                              apiKey: e.target.value,
                            },
                          })
                        }
                        placeholder="Ihr API-Schlüssel"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="secretKey">Secret Key (optional)</Label>
                    <div className="relative">
                      <Input
                        id="secretKey"
                        type={showSecretKey ? 'text' : 'password'}
                        value={selectedIntegration.credentials?.secretKey || ''}
                        onChange={e =>
                          setSelectedIntegration({
                            ...selectedIntegration,
                            credentials: {
                              ...selectedIntegration.credentials,
                              secretKey: e.target.value,
                            },
                          })
                        }
                        placeholder="Secret Key"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSecretKey(!showSecretKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showSecretKey ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endpoint">API-Endpoint</Label>
                  <Input
                    id="endpoint"
                    value={selectedIntegration.credentials?.endpoint || ''}
                    onChange={e =>
                      setSelectedIntegration({
                        ...selectedIntegration,
                        credentials: {
                          ...selectedIntegration.credentials,
                          endpoint: e.target.value,
                        },
                      })
                    }
                    placeholder="https://api.example.com"
                  />
                </div>
              </div>

              {/* Configuration Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center">
                  <Settings className="h-5 w-5 mr-2 text-[#14ad9f]" />
                  Automatisierung
                </h3>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="autoSync">Automatische Synchronisation</Label>
                      <p className="text-sm text-gray-600">Daten automatisch synchronisieren</p>
                    </div>
                    <Switch
                      id="autoSync"
                      checked={selectedIntegration.config?.autoSync || false}
                      onCheckedChange={checked =>
                        setSelectedIntegration({
                          ...selectedIntegration,
                          config: {
                            ...selectedIntegration.config,
                            autoSync: checked,
                          },
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="autoCreateLabels">Automatische Label-Erstellung</Label>
                      <p className="text-sm text-gray-600">
                        Labels automatisch bei Lieferschein-Erstellung erstellen
                      </p>
                    </div>
                    <Switch
                      id="autoCreateLabels"
                      checked={selectedIntegration.config?.autoCreateLabels || false}
                      onCheckedChange={checked =>
                        setSelectedIntegration({
                          ...selectedIntegration,
                          config: {
                            ...selectedIntegration.config,
                            autoCreateLabels: checked,
                          },
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => handleTestConnection(selectedIntegration)}
                  className="flex-1"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Verbindung testen
                </Button>
                <Button
                  onClick={handleSaveIntegration}
                  className="flex-1 bg-[#14ad9f] hover:bg-[#0f9d84] text-white"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Speichern
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
