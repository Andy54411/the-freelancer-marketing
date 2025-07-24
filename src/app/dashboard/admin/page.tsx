'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClientTranslations } from './components/ClientTranslations';
import {
  FiUsers,
  FiBriefcase,
  FiMessageSquare,
  FiHelpCircle,
  FiAlertTriangle,
  FiSettings,
  FiMail,
  FiUserCheck,
  FiLoader,
} from 'react-icons/fi';

// Helper-Komponente für Dashboard-Karten
const StatCard = ({
  href,
  title,
  value,
  icon: Icon,
  error,
  loading = false,
}: {
  href: string;
  title: string;
  value: number;
  icon: React.ComponentType<any>;
  error?: string;
  loading?: boolean;
}) => (
  <Link href={href}>
    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        <Icon className="h-4 w-4 text-gray-500" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center space-x-2">
            <FiLoader className="h-4 w-4 animate-spin text-blue-500" />
            <span className="text-sm text-gray-500">Laden...</span>
          </div>
        ) : error ? (
          <div className="text-red-500 text-sm">Fehler: {error}</div>
        ) : (
          <div className="text-2xl font-bold text-blue-600">{value}</div>
        )}
      </CardContent>
    </Card>
  </Link>
);

export default function DashboardPage() {
  const [stats, setStats] = useState({
    companies: 0,
    orders: 0,
    chats: 0,
    supportTickets: 0,
  });
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true);

        // Parallel laden der Statistiken über API-Endpoints
        const [companiesRes, ordersRes, chatsRes, supportRes] = await Promise.allSettled([
          fetch('/api/admin/companies'),
          fetch('/api/admin/orders'),
          fetch('/api/admin/chats'),
          fetch('/api/admin/support'),
        ]);

        const newStats = { ...stats };
        const newErrors: Record<string, string> = {};

        // Unternehmen
        if (companiesRes.status === 'fulfilled' && companiesRes.value.ok) {
          const companiesData = await companiesRes.value.json();
          newStats.companies = companiesData.success
            ? companiesData.companies?.length || companiesData.count || 0
            : Array.isArray(companiesData)
              ? companiesData.length
              : 0;
        } else {
          newErrors.companies = 'Fehler beim Laden';
        }

        // Aufträge
        if (ordersRes.status === 'fulfilled' && ordersRes.value.ok) {
          const ordersData = await ordersRes.value.json();
          newStats.orders = ordersData.success
            ? ordersData.orders?.length || ordersData.count || 0
            : Array.isArray(ordersData)
              ? ordersData.length
              : 0;
        } else {
          newErrors.orders = 'Fehler beim Laden';
        }

        // Chats
        if (chatsRes.status === 'fulfilled' && chatsRes.value.ok) {
          const chatsData = await chatsRes.value.json();
          newStats.chats = chatsData.success
            ? chatsData.chats?.length || chatsData.totalChats || chatsData.count || 0
            : Array.isArray(chatsData)
              ? chatsData.length
              : 0;
        } else {
          newErrors.chats = 'Fehler beim Laden';
        }

        // Support-Tickets
        if (supportRes.status === 'fulfilled' && supportRes.value.ok) {
          const supportData = await supportRes.value.json();
          newStats.supportTickets = supportData.success
            ? supportData.supportChats?.length ||
              supportData.summary?.totalChats ||
              supportData.count ||
              0
            : Array.isArray(supportData)
              ? supportData.length
              : 0;
        } else {
          newErrors.supportTickets = 'Fehler beim Laden';
        }

        setStats(newStats);
        setErrors(newErrors);
      } catch (error) {
        console.error('Fehler beim Laden der Statistiken:', error);
        setErrors({
          companies: 'Ladefehler',
          orders: 'Ladefehler',
          chats: 'Ladefehler',
          supportTickets: 'Ladefehler',
        });
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-4">Admin Dashboard</h1>

      {/* Hauptstatistiken */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          href="/dashboard/admin/companies"
          title="Unternehmen"
          icon={FiUsers}
          value={stats.companies}
          loading={loading}
          error={errors.companies}
        />
        <StatCard
          href="/dashboard/admin/orders"
          title="Aufträge"
          icon={FiBriefcase}
          value={stats.orders}
          loading={loading}
          error={errors.orders}
        />
        <StatCard
          href="/dashboard/admin/chats"
          title="Nachrichten"
          icon={FiMessageSquare}
          value={stats.chats}
          loading={loading}
          error={errors.chats}
        />
        <StatCard
          href="/dashboard/admin/support"
          title="Support"
          icon={FiHelpCircle}
          value={stats.supportTickets}
          loading={loading}
          error={errors.supportTickets}
        />
      </div>

      {/* Zusätzliche Admin-Funktionen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        <Link href="/dashboard/admin/ai-config">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">🛡️ KI-Moderation</CardTitle>
              <FiSettings className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600">Chat-Moderation konfigurieren</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/admin/moderation">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                🔍 Moderation-Logs
              </CardTitle>
              <FiAlertTriangle className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600">Moderation-Events überwachen</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/admin/newsletter">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">📧 Newsletter</CardTitle>
              <FiMail className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600">Newsletter verwalten</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/admin/staff-management">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">👥 Mitarbeiter</CardTitle>
              <FiUserCheck className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600">Team-Mitglieder verwalten</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/admin/platform-settings">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">⚙️ Plattform</CardTitle>
              <FiSettings className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600">Plattform-Einstellungen</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/admin/email-management">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                ✉️ E-Mail Management
              </CardTitle>
              <FiMail className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600">E-Mail-System verwalten</div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
