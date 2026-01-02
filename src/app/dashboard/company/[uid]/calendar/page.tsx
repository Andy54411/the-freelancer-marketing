'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import CompanyCalendar from '@/components/CompanyCalendar';

export default function CalendarPage() {
  const params = useParams();
  const uid = typeof params?.uid === 'string' ? params.uid : '';

  if (!uid) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <p className="text-gray-500">Firma-ID nicht gefunden</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Kalender</h2>
          <p className="text-sm text-gray-500">Klicke auf einen Tag, um ihn zu blockieren oder freizugeben</p>
        </div>
        <CompanyCalendar companyUid={uid} enableBlockedDates={true} />
      </div>
    </div>
  );
}
