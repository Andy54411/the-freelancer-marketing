import { getAllCompanies } from '@/lib/company-data';
import { getAllOrders } from '@/lib/order-data';
import { getAllChats } from '@/lib/chat-data';
import { getSupportTickets } from '@/lib/support-data';
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
              value={companiesResult.status === 'fulfilled' ? companiesResult.value.length : 0}
              error={
                companiesResult.status === 'rejected' ? companiesResult.reason.message : undefined
              }
            />
            <StatCard
              href="/dashboard/admin/orders"
              title={t('admin.orders')}
              icon={FiBriefcase}
              value={ordersResult.status === 'fulfilled' ? ordersResult.value.length : 0}
              error={ordersResult.status === 'rejected' ? ordersResult.reason.message : undefined}
            />
            <StatCard
              href="/dashboard/admin/chats"
              title={t('admin.messages')}
              icon={FiMessageSquare}
              value={chatsResult.status === 'fulfilled' ? chatsResult.value.length : 0}
              error={chatsResult.status === 'rejected' ? chatsResult.reason.message : undefined}
            />
            <StatCard
              href="/dashboard/admin/support"
              title={t('admin.support')}
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
            <h2 className="text-2xl font-semibold text-gray-800">{t('admin.platform.title')}</h2>
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
                    <div className="text-sm text-gray-600">{t('admin.settings.description')}</div>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/dashboard/admin/email-management" className="block">
                <Card className="hover:shadow-lg transition-shadow h-full border-2 border-blue-500/20 hover:border-blue-500/40">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-blue-600">
                      E-Mail Management
                    </CardTitle>
                    <FiMail className="h-5 w-5 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-gray-600">
                      Verwaltung aller Taskilo E-Mail-Adressen und Mitarbeiter-Zuweisungen
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/dashboard/admin/staff-management" className="block">
                <Card className="hover:shadow-lg transition-shadow h-full border-2 border-purple-500/20 hover:border-purple-500/40">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-purple-600">
                      Mitarbeiter-Verwaltung
                    </CardTitle>
                    <FiUserCheck className="h-5 w-5 text-purple-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-gray-600">
                      Anmeldung und Verwaltung von Mitarbeitern für E-Mail-Support
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>
        </div>
      )}
    </ClientTranslations>
  );
}
