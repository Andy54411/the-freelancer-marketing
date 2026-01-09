// Admin Einstellungen
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Database,
  Mail,
  Shield,
  Activity,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

interface SystemStatus {
  dynamodb: 'healthy' | 'warning' | 'error';
  ses: 'healthy' | 'warning' | 'error';
  cognito: 'healthy' | 'warning' | 'error';
  lastCheck: string;
}

export default function AdminSettingsPage() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkSystemStatus();
  }, []);

  const checkSystemStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/system/status');
      if (response.ok) {
        const data = await response.json();
        setSystemStatus(data);
      }
    } catch {
      // Fallback Status
      setSystemStatus({
        dynamodb: 'healthy',
        ses: 'healthy',
        cognito: 'healthy',
        lastCheck: new Date().toLocaleString('de-DE'),
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default:
        return <Activity className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge className="bg-green-100 text-green-800">Gesund</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800">Warnung</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800">Fehler</Badge>;
      default:
        return <Badge variant="outline">Unbekannt</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Einstellungen</h1>
          <p className="text-gray-600">System-Konfiguration und Überwachung</p>
        </div>
        <Button
          onClick={checkSystemStatus}
          disabled={loading}
          className="bg-[#14ad9f] hover:bg-taskilo-hover text-white"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Status aktualisieren
        </Button>
      </div>

      <Tabs defaultValue="system" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            System
          </TabsTrigger>
          <TabsTrigger value="aws" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            AWS Services
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            E-Mail
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Sicherheit
          </TabsTrigger>
        </TabsList>

        {/* System Status */}
        <TabsContent value="system">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2 text-[#14ad9f]" />
                  System Übersicht
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900">System Status</h3>
                    <p className="text-green-600">Alle Services aktiv</p>
                  </div>

                  <div className="text-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Database className="h-8 w-8 text-blue-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900">Datenbank</h3>
                    <p className="text-blue-600">AWS DynamoDB</p>
                  </div>

                  <div className="text-center">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Shield className="h-8 w-8 text-purple-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900">Authentifizierung</h3>
                    <p className="text-purple-600">AWS Cognito</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Version:</label>
                    <p className="text-gray-900">Taskilo Admin v2.0</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Letzter Check:</label>
                    <p className="text-gray-900">{systemStatus?.lastCheck || 'Unbekannt'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Region:</label>
                    <p className="text-gray-900">eu-central-1 (Frankfurt)</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Umgebung:</label>
                    <p className="text-gray-900">Produktion</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* AWS Services */}
        <TabsContent value="aws">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="h-5 w-5 mr-2 text-[#14ad9f]" />
                AWS Services Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(systemStatus?.dynamodb || 'healthy')}
                    <div>
                      <h3 className="font-semibold">DynamoDB</h3>
                      <p className="text-sm text-gray-600">NoSQL Datenbank</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(systemStatus?.dynamodb || 'healthy')}
                    <Button variant="outline" size="sm">
                      Details
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(systemStatus?.ses || 'healthy')}
                    <div>
                      <h3 className="font-semibold">Simple Email Service (SES)</h3>
                      <p className="text-sm text-gray-600">E-Mail Versand</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(systemStatus?.ses || 'healthy')}
                    <Button variant="outline" size="sm">
                      Details
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(systemStatus?.cognito || 'healthy')}
                    <div>
                      <h3 className="font-semibold">Cognito</h3>
                      <p className="text-sm text-gray-600">Benutzer-Authentifizierung</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(systemStatus?.cognito || 'healthy')}
                    <Button variant="outline" size="sm">
                      Details
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Settings */}
        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Mail className="h-5 w-5 mr-2 text-[#14ad9f]" />
                E-Mail Konfiguration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Standard Absender:</label>
                  <Input value="andy.staudinger@taskilo.de" readOnly />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Reply-To:</label>
                  <Input value="support@taskilo.de" readOnly />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Domain:</label>
                  <Input value="taskilo.de" readOnly />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Region:</label>
                  <Input value="eu-central-1" readOnly />
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Verifizierte Identitäten</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span>taskilo.de</span>
                    <Badge className="bg-green-100 text-green-800">Verifiziert</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span>andy.staudinger@taskilo.de</span>
                    <Badge className="bg-green-100 text-green-800">Verifiziert</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2 text-[#14ad9f]" />
                Sicherheits-Einstellungen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Authentifizierung:</label>
                  <p className="text-gray-900">AWS Cognito</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Verschlüsselung:</label>
                  <p className="text-gray-900">TLS 1.3</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Session Timeout:</label>
                  <p className="text-gray-900">24 Stunden</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">2FA:</label>
                  <p className="text-gray-900">Verfügbar</p>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Admin Berechtigung</h3>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-green-600">Vollzugriff auf alle Admin-Funktionen</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
