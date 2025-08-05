'use client';

import React, { use } from 'react';
import { DatevDashboard } from '@/components/datev/DatevDashboard';

interface DatevOverviewPageProps {
  params: Promise<{
    uid: string;
  }>;
}

export default function DatevOverviewPage({ params }: DatevOverviewPageProps) {
  const { uid } = use(params);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">DATEV Dashboard</h1>
          <p className="text-gray-600 mt-1">Übersicht und Verwaltung Ihrer DATEV-Integration</p>
        </div>
      </div>

      {/* Dashboard Component */}
      <DatevDashboard companyId={uid} />
    </div>
  );
}
