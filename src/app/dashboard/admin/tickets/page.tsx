// Admin Tickets Page - Dedizierte Ticket-Verwaltung
'use client';

import TicketManagement from '@/components/admin/TicketManagement';

export default function AdminTicketsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 pb-4">
        <h1 className="text-3xl font-bold text-gray-900">Ticket Management</h1>
        <p className="text-gray-600 mt-2">Verwalten Sie alle Support-Tickets und Kundenanfragen</p>
      </div>

      {/* Ticket Management Component */}
      <TicketManagement />
    </div>
  );
}
