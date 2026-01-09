// Admin Dashboard Hauptseite
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { DemoRequestsCard } from '@/components/admin/demo-requests-card';
import { AdminCalendarCard } from '@/components/admin/admin-calendar-card';
import {
  Users,
  Building2,
  Mail,
  Activity,
  TrendingUp,
  AlertTriangle,
  Ticket,
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
        // Map API response to expected format
        if (data.success && data.stats) {
          setStats({
            totalUsers: data.stats.users?.total || 0,
            totalCompanies: data.stats.companies?.total || 0,
            totalEmails: 0, // Not tracked in new API
            systemHealth: data.stats.system?.status === 'healthy' ? 'healthy' : 'error',
            recentActivity: [],
          });
        }
      }
    } catch {
      setStats({
        totalUsers: 0,
        totalCompanies: 0,
        totalEmails: 0,
        systemHealth: 'error',
        recentActivity: [],
      });
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

      {/* Overview Content - Nur die Übersicht, da Sidebar-Navigation verwendet wird */}
      <div className="space-y-6">
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
          {/* Demo Requests Card */}
          <DemoRequestsCard />

          {/* Calendar Overview Card */}
          <AdminCalendarCard />
        </div>

        {/* Activity & Quick Actions - Second Row */}
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
                      <div className="shrink-0">
                        {activity.type === 'user' && <Users className="h-4 w-4 text-blue-600" />}
                        {activity.type === 'company' && (
                          <Building2 className="h-4 w-4 text-green-600" />
                        )}
                        {activity.type === 'email' && <Mail className="h-4 w-4 text-purple-600" />}
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
                <button className="w-full flex items-center justify-between p-3 bg-[#14ad9f] text-white rounded-lg hover:bg-taskilo-hover transition-colors">
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
      </div>
    </div>
  );
}
