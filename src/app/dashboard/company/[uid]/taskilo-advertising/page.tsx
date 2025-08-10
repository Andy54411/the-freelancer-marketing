'use client';

// 🎯 MULTI-PLATFORM ADVERTISING - Main Page
// Zentrale Verwaltung für Google Ads, LinkedIn, Meta, Taboola, Outbrain

import React from 'react';
import { useParams } from 'next/navigation';
import MultiPlatformAdvertisingDashboard from '@/components/taskilo-advertising/MultiPlatformAdvertisingDashboard';

export default function TaskiloAdvertisingPage() {
  const params = useParams();
  const companyId = params.uid as string;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <MultiPlatformAdvertisingDashboard companyId={companyId} />
      </div>
    </div>
  );
}
