'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  Settings,
  Users,
  FileText,
  TrendingUp,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Zap,
  Shield,
  ArrowRight,
} from 'lucide-react';

interface DatevConnection {
  id: string;
  organizationName: string;
  status: 'connected' | 'error' | 'pending';
  lastSync: string;
  accountCount: number;
}

export default function DatevMainPage() {
  const params = useParams();
  const router = useRouter();
  const { user, firebaseUser } = useAuth();
  const uid = params.uid as string;

  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState<DatevConnection[]>([]);

  useEffect(() => {
    if (!user || user.uid !== uid || !firebaseUser) return;
    loadDatevConnections();
  }, [uid, user, firebaseUser]);

  const loadDatevConnections = async () => {
    try {
      setLoading(true);

      if (!firebaseUser) {
        console.warn('No Firebase user available for DATEV API call');
        setConnections([]);
        return;
      }

      // Verwende echte DATEV UserInfo Test API (guaranteed working)
      const token = await firebaseUser.getIdToken();
      const response = await fetch(`/api/datev/userinfo-test?companyId=${uid}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-company-id': uid,
        },
      });

      const data = await response.json();

      if (response.ok && data.success && data.userInfo) {
        // Transform UserInfo response to expected format
        const datevConnections: DatevConnection[] = [{
          id: data.userInfo.account_id || data.userInfo.sub || 'unknown',
          organizationName: data.userInfo.name || data.userInfo.preferred_username || 'DATEV User',
          status: 'connected',
          accountCount: 1,
          lastSync: new Date().toISOString(),
        }];

        setConnections(datevConnections);
      } else if (response.status === 401 && (data.error === 'no_tokens' || data.error === 'invalid_token')) {
        // DATEV Authentication required - this is expected for fresh installations
        console.log('DATEV authentication required - user needs to complete OAuth2 flow');
        setConnections([]);
      } else {
        console.warn('DATEV API error:', response.status, data.error || 'Unknown error');
        setConnections([]);
      }
    } catch (error) {
      console.error('Failed to load DATEV connections:', error);
      setConnections([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSetupDatev = () => {
    router.push(`/dashboard/company/${uid}/datev/setup`);
  };

  const handleViewOverview = () => {
    router.push(`/dashboard/company/${uid}/datev/overview`);
  };

  const handleSteuerberaterPortal = () => {
    router.push(`/dashboard/company/${uid}/steuerberater`);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">DATEV Integration</h1>
          <p className="text-gray-600 mt-1">
            Professionelle Buchhaltung und Steuerberatung mit DATEV
          </p>
        </div>
        <Badge className="bg-[#14ad9f]/10 text-[#14ad9f] border-[#14ad9f]/20">DSGVO-konform</Badge>
      </div>

      {/* DATEV Integration Banner */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-blue-900 mb-1">
                DATEV Professional Integration
              </h3>
              <p className="text-blue-700 text-sm">
                Nahtlose Anbindung an Ihr DATEV-System für automatisierte Buchhaltung und
                Steuerberatung
              </p>
            </div>
            <div className="flex items-center gap-2 text-blue-600">
              <Shield className="h-5 w-5" />
              <span className="text-sm font-medium">OAuth2 Sicherheit</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connection Status */}
      {loading ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-600">Lade DATEV-Verbindungen...</span>
            </div>
          </CardContent>
        </Card>
      ) : connections.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {connections.map(connection => (
            <Card key={connection.id} className="border-l-4 border-l-green-500">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{connection.organizationName}</CardTitle>
                  <Badge variant={connection.status === 'connected' ? 'default' : 'destructive'}>
                    {connection.status === 'connected' ? (
                      <>
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Verbunden
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Fehler
                      </>
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Konten:</span>
                    <span className="font-medium">{connection.accountCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Letzte Sync:</span>
                    <span className="font-medium">
                      {new Date(connection.lastSync).toLocaleDateString('de-DE')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed border-2 border-gray-200">
          <CardContent className="p-8 text-center">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Keine DATEV-Verbindung gefunden
            </h3>
            <p className="text-gray-600 mb-6">
              Verbinden Sie Ihr DATEV-Konto für professionelle Buchhaltung und Steuerberatung
            </p>
            <Button onClick={handleSetupDatev} className="bg-[#14ad9f] hover:bg-[#129488]">
              <Zap className="mr-2 h-4 w-4" />
              DATEV einrichten
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={handleViewOverview}
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#14ad9f]/10 rounded-lg">
                <FileText className="h-6 w-6 text-[#14ad9f]" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Dashboard</h3>
                <p className="text-sm text-gray-600">Übersicht und Buchungsverwaltung</p>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={handleSetupDatev}
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Settings className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Einrichtung</h3>
                <p className="text-sm text-gray-600">DATEV-Integration konfigurieren</p>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={handleSteuerberaterPortal}
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Steuerberater</h3>
                <p className="text-sm text-gray-600">Kollaboration und Datenaustausch</p>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Features Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[#14ad9f]" />
            DATEV Integration Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <FileText className="h-8 w-8 text-[#14ad9f] mx-auto mb-2" />
              <h4 className="font-medium text-gray-900">Rechnungsexport</h4>
              <p className="text-sm text-gray-600 mt-1">Automatischer Export zu DATEV</p>
            </div>

            <div className="text-center p-4 border rounded-lg">
              <RefreshCw className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <h4 className="font-medium text-gray-900">Live-Synchronisation</h4>
              <p className="text-sm text-gray-600 mt-1">Echtzeit-Buchungsabgleich</p>
            </div>

            <div className="text-center p-4 border rounded-lg">
              <Users className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <h4 className="font-medium text-gray-900">Steuerberater-Zugang</h4>
              <p className="text-sm text-gray-600 mt-1">Direkter Datenzugriff für Berater</p>
            </div>

            <div className="text-center p-4 border rounded-lg">
              <Shield className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <h4 className="font-medium text-gray-900">Maximale Sicherheit</h4>
              <p className="text-sm text-gray-600 mt-1">OAuth2 & DSGVO-konform</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
