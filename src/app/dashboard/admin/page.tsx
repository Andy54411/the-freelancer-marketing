// Admin Dashboard Hauptseite
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TicketManagement from '@/components/admin/TicketManagement';
import {
  Users,
  Building2,
  Mail,
  Activity,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Ticket,
  BarChart3,
  Settings,
} from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  totalCompanies: number;
  totalEmails: number;
  systemHealth: 'healthy' | 'warning' | 'error';
  recentActivity: ActivityItem[];
}

interface ActivityItem {
  id: string;
  type: 'user' | 'company' | 'email' | 'system';
  message: string;
  timestamp: string;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const response = await fetch('/api/admin/dashboard/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]"></div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Benutzer Gesamt',
      value: stats?.totalUsers?.toLocaleString() || '0',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Unternehmen',
      value: stats?.totalCompanies?.toLocaleString() || '0',
      icon: Building2,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'E-Mails versendet',
      value: stats?.totalEmails?.toLocaleString() || '0',
      icon: Mail,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'System Status',
      value:
        stats?.systemHealth === 'healthy'
          ? 'Gesund'
          : stats?.systemHealth === 'warning'
            ? 'Warnung'
            : 'Fehler',
      icon: Activity,
      color:
        stats?.systemHealth === 'healthy'
          ? 'text-green-600'
          : stats?.systemHealth === 'warning'
            ? 'text-yellow-600'
            : 'text-red-600',
      bgColor:
        stats?.systemHealth === 'healthy'
          ? 'bg-green-50'
          : stats?.systemHealth === 'warning'
            ? 'bg-yellow-50'
            : 'bg-red-50',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 pb-4">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">Verwalten Sie Ihr Taskilo System</p>
      </div>

      {/* Tabs Navigation */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Übersicht
          </TabsTrigger>
          <TabsTrigger value="tickets" className="flex items-center gap-2">
            <Ticket className="h-4 w-4" />
            Tickets
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            System
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Einstellungen
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statCards.map((card, index) => (
              <Card key={index}>
                <CardContent className="flex items-center p-6">
                  <div className={`p-3 rounded-full ${card.bgColor} mr-4`}>
                    <card.icon className={`h-6 w-6 ${card.color}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">{card.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Activity & Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2 text-[#14ad9f]" />
                  Aktuelle Aktivitäten
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats?.recentActivity && stats.recentActivity.length > 0 ? (
                  <div className="space-y-4">
                    {stats.recentActivity.slice(0, 5).map(activity => (
                      <div
                        key={activity.id}
                        className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex-shrink-0">
                          {activity.type === 'user' && <Users className="h-4 w-4 text-blue-600" />}
                          {activity.type === 'company' && (
                            <Building2 className="h-4 w-4 text-green-600" />
                          )}
                          {activity.type === 'email' && (
                            <Mail className="h-4 w-4 text-purple-600" />
                          )}
                          {activity.type === 'system' && (
                            <AlertTriangle className="h-4 w-4 text-orange-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900">{activity.message}</p>
                          <p className="text-xs text-gray-500 mt-1">{activity.timestamp}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Keine aktuellen Aktivitäten</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-[#14ad9f]" />
                  Schnelle Aktionen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <button className="w-full flex items-center justify-between p-3 bg-[#14ad9f] text-white rounded-lg hover:bg-[#129488] transition-colors">
                    <span className="flex items-center">
                      <Ticket className="h-4 w-4 mr-2" />
                      Ticket erstellen
                    </span>
                    <span>→</span>
                  </button>

                  <button className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <span className="flex items-center">
                      <Mail className="h-4 w-4 mr-2" />
                      E-Mail senden
                    </span>
                    <span>→</span>
                  </button>

                  <button className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <span className="flex items-center">
                      <Users className="h-4 w-4 mr-2" />
                      Benutzer verwalten
                    </span>
                    <span>→</span>
                  </button>

                  <button className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <span className="flex items-center">
                      <Building2 className="h-4 w-4 mr-2" />
                      Unternehmen hinzufügen
                    </span>
                    <span>→</span>
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tickets Tab */}
        <TabsContent value="tickets" className="space-y-6">
          <TicketManagement onTicketUpdate={loadDashboardData} />
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system" className="space-y-6">
          {/* AWS Services Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2 text-[#14ad9f]" />
                AWS Services Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">DynamoDB</p>
                    <p className="text-sm text-gray-600">Datenbank</p>
                  </div>
                  <div className="text-green-600 font-semibold">Aktiv</div>
                </div>

                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">SES</p>
                    <p className="text-sm text-gray-600">E-Mail Service</p>
                  </div>
                  <div className="text-green-600 font-semibold">Aktiv</div>
                </div>

                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Cognito</p>
                    <p className="text-sm text-gray-600">Authentifizierung</p>
                  </div>
                  <div className="text-green-600 font-semibold">Aktiv</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Monitoring */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-[#14ad9f]" />
                System Monitoring
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">CPU Auslastung</p>
                    <p className="text-sm text-gray-600">Server Performance</p>
                  </div>
                  <div className="text-green-600 font-semibold">12%</div>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Speicher</p>
                    <p className="text-sm text-gray-600">RAM Verwendung</p>
                  </div>
                  <div className="text-yellow-600 font-semibold">68%</div>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Datenbankverbindungen</p>
                    <p className="text-sm text-gray-600">Aktive Verbindungen</p>
                  </div>
                  <div className="text-green-600 font-semibold">45/100</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2 text-[#14ad9f]" />
                Systemeinstellungen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">E-Mail Benachrichtigungen</p>
                    <p className="text-sm text-gray-600">Automatische Admin-Benachrichtigungen</p>
                  </div>
                  <button className="px-4 py-2 bg-[#14ad9f] text-white rounded hover:bg-[#129488]">
                    Aktiviert
                  </button>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Backup System</p>
                    <p className="text-sm text-gray-600">Automatische Datensicherung</p>
                  </div>
                  <button className="px-4 py-2 bg-[#14ad9f] text-white rounded hover:bg-[#129488]">
                    Aktiviert
                  </button>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Maintenance Mode</p>
                    <p className="text-sm text-gray-600">System-Wartungsmodus</p>
                  </div>
                  <button className="px-4 py-2 bg-gray-200 text-gray-600 rounded hover:bg-gray-300">
                    Deaktiviert
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
