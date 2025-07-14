import { getAllCompanies } from '@/lib/company-data';
import { getAllOrders } from '@/lib/order-data';
import { getAllChats } from '@/lib/chat-data';
import { getSupportTickets } from '@/lib/support-data';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FiUsers,
  FiBriefcase,
  FiMessageSquare,
  FiHelpCircle,
  FiAlertTriangle,
  FiSettings,
} from 'react-icons/fi';

export const dynamic = 'force-dynamic';

// Helper-Komponente für Dashboard-Karten, um Code-Wiederholung zu vermeiden
const StatCard = ({
  href,
  title,
  value,
  icon: Icon,
  error,
}: {
  href: string;
  title: string;
  value: number | string;
  icon: React.ElementType;
  error?: string;
}) => (
  <Link href={href} className="block">
    <Card className="hover:shadow-lg transition-shadow h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="text-sm font-medium text-destructive flex items-center gap-2">
            <FiAlertTriangle />
            <span>Daten konnten nicht geladen werden</span>
          </div>
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
      </CardContent>
    </Card>
  </Link>
);

export default async function DashboardPage() {
  // Daten parallel abrufen und Fehler elegant abfangen mit Promise.allSettled
  const results = await Promise.allSettled([
    getAllCompanies(),
    getAllOrders(),
    getAllChats(),
    getSupportTickets(),
  ]);

  const [companiesResult, ordersResult, chatsResult, supportTicketsResult] = results;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-4">Willkommen im Admin-Dashboard</h1>

      {/* Hauptstatistiken */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          href="/dashboard/admin/companies"
          title="Firmen"
          icon={FiUsers}
          value={companiesResult.status === 'fulfilled' ? companiesResult.value.length : 0}
          error={companiesResult.status === 'rejected' ? companiesResult.reason.message : undefined}
        />
        <StatCard
          href="/dashboard/admin/orders"
          title="Aufträge"
          icon={FiBriefcase}
          value={ordersResult.status === 'fulfilled' ? ordersResult.value.length : 0}
          error={ordersResult.status === 'rejected' ? ordersResult.reason.message : undefined}
        />
        <StatCard
          href="/dashboard/admin/chats"
          title="Nachrichten"
          icon={FiMessageSquare}
          value={chatsResult.status === 'fulfilled' ? chatsResult.value.length : 0}
          error={chatsResult.status === 'rejected' ? chatsResult.reason.message : undefined}
        />
        <StatCard
          href="/dashboard/admin/support"
          title="Offene Support-Tickets"
          icon={FiHelpCircle}
          value={
            supportTicketsResult.status === 'fulfilled' ? supportTicketsResult.value.length : 0
          }
          error={
            supportTicketsResult.status === 'rejected'
              ? supportTicketsResult.reason.message
              : undefined
          }
        />
      </div>

      {/* Plattform-Verwaltung */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-800">Plattform-Verwaltung</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/dashboard/admin/platform-settings" className="block">
            <Card className="hover:shadow-lg transition-shadow h-full border-2 border-[#14ad9f]/20 hover:border-[#14ad9f]/40">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-[#14ad9f]">
                  Plattform-Einstellungen
                </CardTitle>
                <FiSettings className="h-5 w-5 text-[#14ad9f]" />
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600">
                  Verwalten Sie Plattformgebühren, Stripe-Einstellungen und andere wichtige
                  Konfigurationen
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
