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
      <CompanyCalendar companyUid={uid} />
    </div>
  );
}
