'use client';

// 🎯 ANALYTICS - Dedicated Page
// Detaillierte Performance-Berichte und Statistiken

import React from 'react';
import { useParams } from 'next/navigation';
import AdvertisingAnalytics from '@/components/taskilo-advertising/AdvertisingAnalytics';

export default function AnalyticsPage() {
  const params = useParams();
  const companyId = params.uid as string;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Advertising Analytics</h1>
          <p className="text-gray-600 mt-2">Detaillierte Performance-Berichte und ROI-Analysen</p>
        </div>
        <AdvertisingAnalytics companyId={companyId} />
      </div>
    </div>
  );
}