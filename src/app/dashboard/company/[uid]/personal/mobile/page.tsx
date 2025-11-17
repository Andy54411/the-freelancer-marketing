'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PersonalService, Employee } from '@/services/personalService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Smartphone,
  Download,
  QrCode,
  Users,
  Clock,
  Calendar,
  Bell,
  MapPin,
  Camera,
  Wifi,
  WifiOff,
  MessageSquare,
  Settings,
  Shield,
  Zap,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface AppStats {
  totalDownloads: number;
  activeUsers: number;
  dailyCheckIns: number;
  offlineCapable: boolean;
  lastSync: Date;
}

interface MobileFeature {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  enabled: boolean;
  usage: number;
}

export default function MobileAppPage({ params }: { params: Promise<{ uid: string }> }) {
  const { user } = useAuth();
  const resolvedParams = React.use(params);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [appStats, setAppStats] = useState<AppStats>({
    totalDownloads: 0,
    activeUsers: 0,
    dailyCheckIns: 0,
    offlineCapable: true,
    lastSync: new Date(),
  });

  const mobileFeatures: MobileFeature[] = [
    {
      id: 'timetracking',
      name: 'Zeiterfassung',
      description: 'Start/Stop Timer mit Foto und GPS-Verifizierung',
      icon: Clock,
      enabled: true,
      usage: 95,
    },
    {
      id: 'schedule',
      name: 'Dienstplan',
      description: 'Schichtpläne einsehen und Wunschzeiten einreichen',
      icon: Calendar,
      enabled: true,
      usage: 87,
    },
    {
      id: 'shifttrade',
      name: 'Schichttausch',
      description: 'Schichten mit Kollegen tauschen via Push-Benachrichtigung',
      icon: Users,
      enabled: true,
      usage: 73,
    },
    {
      id: 'vacation',
      name: 'Urlaubsanträge',
      description: 'Urlaub beantragen und Status verfolgen',
      icon: Calendar,
      enabled: true,
      usage: 82,
    },
    {
      id: 'communication',
      name: 'Team-Chat',
      description: 'Echtzeit-Kommunikation mit dem Team',
      icon: MessageSquare,
      enabled: true,
      usage: 91,
    },
    {
      id: 'notifications',
      name: 'Push-Benachrichtigungen',
      description: 'Sofortige Updates zu Schichtänderungen',
      icon: Bell,
      enabled: true,
      usage: 98,
    },
    {
      id: 'offline',
      name: 'Offline-Modus',
      description: 'Funktioniert auch ohne Internetverbindung',
      icon: WifiOff,
      enabled: true,
      usage: 65,
    },
    {
      id: 'gps',
      name: 'GPS-Tracking',
      description: 'Standortbasierte Zeiterfassung',
      icon: MapPin,
      enabled: false,
      usage: 45,
    },
  ];

  useEffect(() => {
    if (user && resolvedParams.uid) {
      loadData();
    }
  }, [user, resolvedParams.uid]);

  const loadData = async () => {
    try {
      setLoading(true);
      const employeesData = await PersonalService.getEmployees(resolvedParams.uid);
      setEmployees(employeesData);

      // Mock App Stats (würde in der Realität von Firebase/Analytics kommen)
      setAppStats({
        totalDownloads: employeesData.length * 0.8, // 80% Adoption Rate
        activeUsers: employeesData.filter(emp => emp.isActive).length * 0.9,
        dailyCheckIns: Math.floor(employeesData.length * 0.6),
        offlineCapable: true,
        lastSync: new Date(),
      });
    } catch (error) {
      toast.error('Fehler beim Laden der App-Daten');
    } finally {
      setLoading(false);
    }
  };

  const generateQRCode = () => {
    const appURL = `https://taskilo.app/download/${resolvedParams.uid}`;
    toast.success('QR-Code wurde generiert!');
    // In der Realität würde hier ein QR-Code generiert werden
  };

  const sendAppInvitation = async () => {
    try {
      // Mock: App-Einladung an alle Mitarbeiter senden
      toast.success(`App-Einladung an ${employees.length} Mitarbeiter gesendet`);
    } catch (error) {
      toast.error('Fehler beim Senden der Einladungen');
    }
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
          <h1 className="text-2xl font-bold text-gray-900">Mobile App Integration</h1>
          <p className="text-gray-600">
            Taskilo Mobile App für Zeiterfassung, Schichtplanung und Team-Kommunikation
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={generateQRCode} variant="outline" className="flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            QR-Code generieren
          </Button>
          <Button
            onClick={sendAppInvitation}
            className="bg-[#14ad9f] hover:bg-taskilo-hover text-white"
          >
            <Download className="h-4 w-4 mr-2" />
            App-Einladung senden
          </Button>
        </div>
      </div>

      {/* App Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">App Downloads</p>
                <p className="text-3xl font-bold text-gray-900">
                  {Math.floor(appStats.totalDownloads)}
                </p>
                <p className="text-sm text-green-600">
                  {Math.floor((appStats.totalDownloads / employees.length) * 100)}% Adoption
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <Download className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Aktive Nutzer</p>
                <p className="text-3xl font-bold text-gray-900">
                  {Math.floor(appStats.activeUsers)}
                </p>
                <p className="text-sm text-gray-500">Täglich aktiv</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <Users className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tägliche Check-ins</p>
                <p className="text-3xl font-bold text-gray-900">{appStats.dailyCheckIns}</p>
                <p className="text-sm text-gray-500">Zeiterfassungen</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">App Status</p>
                <p className="text-lg font-bold text-green-600">Online</p>
                <p className="text-sm text-gray-500">
                  Sync: {appStats.lastSync.toLocaleTimeString('de-DE')}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                {appStats.offlineCapable ? (
                  <Wifi className="h-6 w-6 text-green-600" />
                ) : (
                  <WifiOff className="h-6 w-6 text-red-600" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="features" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="features">App-Features</TabsTrigger>
          <TabsTrigger value="users">Benutzer</TabsTrigger>
          <TabsTrigger value="settings">Einstellungen</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="features" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Verfügbare App-Features</CardTitle>
              <CardDescription>
                Aktivieren und verwalten Sie die Funktionen der Taskilo Mobile App
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mobileFeatures.map(feature => {
                  const Icon = feature.icon;
                  return (
                    <Card key={feature.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div
                            className={`p-2 rounded-lg ${
                              feature.enabled
                                ? 'bg-[#14ad9f] text-white'
                                : 'bg-gray-100 text-gray-400'
                            }`}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">{feature.name}</h3>
                            <p className="text-sm text-gray-600 mt-1">{feature.description}</p>
                            <div className="mt-3">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">Nutzung</span>
                                <span className="font-medium">{feature.usage}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                <div
                                  className="bg-[#14ad9f] h-2 rounded-full"
                                  style={{ width: `${feature.usage}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <Badge variant={feature.enabled ? 'default' : 'secondary'}>
                          {feature.enabled ? 'Aktiv' : 'Inaktiv'}
                        </Badge>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>App-Benutzer Übersicht</CardTitle>
              <CardDescription>Mitarbeiter mit App-Zugang und Nutzungsstatistiken</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {employees.map(employee => (
                  <div
                    key={employee.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={employee.avatar} />
                        <AvatarFallback className="bg-[#14ad9f] text-white">
                          {employee.firstName[0]}
                          {employee.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {employee.firstName} {employee.lastName}
                        </h3>
                        <p className="text-sm text-gray-600">{employee.position}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {Math.random() > 0.2 ? 'App installiert' : 'Nicht installiert'}
                        </p>
                        <p className="text-xs text-gray-500">
                          Letzte Nutzung: {Math.random() > 0.3 ? 'Heute' : 'Vor 2 Tagen'}
                        </p>
                      </div>
                      <Badge variant={Math.random() > 0.2 ? 'default' : 'secondary'}>
                        {Math.random() > 0.2 ? 'Aktiv' : 'Inaktiv'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>App-Konfiguration</CardTitle>
                <CardDescription>Grundeinstellungen für die Mobile App</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Unternehmen App-Name</label>
                  <Input defaultValue="Taskilo - Ihr Unternehmen" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">App-Logo URL</label>
                  <Input placeholder="https://..." />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Primärfarbe</label>
                  <Input defaultValue="#14ad9f" />
                </div>
                <Button className="w-full bg-[#14ad9f] hover:bg-taskilo-hover text-white">
                  Einstellungen speichern
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sicherheit & Datenschutz</CardTitle>
                <CardDescription>Sicherheitseinstellungen für die App</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">GPS-Tracking</p>
                    <p className="text-sm text-gray-600">Standortbasierte Zeiterfassung</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Konfigurieren
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Foto-Verifizierung</p>
                    <p className="text-sm text-gray-600">Fotos bei Check-in/out</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Aktivieren
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Offline-Synchronisation</p>
                    <p className="text-sm text-gray-600">Daten ohne Internet speichern</p>
                  </div>
                  <Badge variant="default">Aktiv</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>App-Nutzung Statistiken</CardTitle>
                <CardDescription>Nutzungsmetriken der letzten 30 Tage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Zeiterfassung</span>
                    <span className="font-medium">1,247 Check-ins</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Schichttausch</span>
                    <span className="font-medium">89 Anfragen</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Urlaubsanträge</span>
                    <span className="font-medium">34 Anträge</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Team-Nachrichten</span>
                    <span className="font-medium">2,156 Nachrichten</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Metriken</CardTitle>
                <CardDescription>App-Performance und Zuverlässigkeit</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">App-Bewertung</span>
                    <span className="font-medium flex items-center gap-1">4.8 ⭐</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Crash-Rate</span>
                    <span className="font-medium text-green-600">0.2%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Offline-Verfügbarkeit</span>
                    <span className="font-medium text-green-600">99.1%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Durchschn. Session</span>
                    <span className="font-medium">4:32 min</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
