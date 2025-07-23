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
          const companies = await companiesRes.value.json();
          newStats.companies = Array.isArray(companies) ? companies.length : 0;
        } else {
          newErrors.companies = 'Fehler beim Laden';
        }

        // Aufträge
        if (ordersRes.status === 'fulfilled' && ordersRes.value.ok) {
          const orders = await ordersRes.value.json();
          newStats.orders = Array.isArray(orders) ? orders.length : 0;
        } else {
          newErrors.orders = 'Fehler beim Laden';
        }

        // Chats
        if (chatsRes.status === 'fulfilled' && chatsRes.value.ok) {
          const chats = await chatsRes.value.json();
          newStats.chats = Array.isArray(chats) ? chats.length : 0;
        } else {
          newErrors.chats = 'Fehler beim Laden';
        }

        // Support-Tickets
        if (supportRes.status === 'fulfilled' && supportRes.value.ok) {
          const tickets = await supportRes.value.json();
          newStats.supportTickets = Array.isArray(tickets) ? tickets.length : 0;
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
    <ClientTranslations>
      {(t: (key: string) => string) => (
        <div className="space-y-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">{t('admin.welcome')}</h1>

          {/* Hauptstatistiken */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              href="/dashboard/admin/companies"
              title={t('admin.companies')}
              icon={FiUsers}
              value={stats.companies}
              loading={loading}
              error={errors.companies}
            />
            <StatCard
              href="/dashboard/admin/orders"
              title={t('admin.orders')}
              icon={FiBriefcase}
              value={stats.orders}
              loading={loading}
              error={errors.orders}
            />
            <StatCard
              href="/dashboard/admin/chats"
              title={t('admin.messages')}
              icon={FiMessageSquare}
              value={stats.chats}
              loading={loading}
              error={errors.chats}
            />
            <StatCard
              href="/dashboard/admin/support"
              title={t('admin.support')}
              icon={FiHelpCircle}
              value={stats.supportTickets}
              loading={loading}
              error={errors.supportTickets}
            />
          </div>
        </div>
      )}
    </ClientTranslations>
  );
}
