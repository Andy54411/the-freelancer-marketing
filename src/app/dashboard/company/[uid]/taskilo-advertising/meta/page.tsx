'use client';

// 🎯 META ADS - Dedicated Page
// Spezialisierte Meta (Facebook/Instagram) Ads Verwaltung

import React from 'react';
import { useParams } from 'next/navigation';
import MetaAdsManager from '@/components/taskilo-advertising/MetaAdsManager';

export default function MetaAdsPage() {
  const params = useParams();
  const companyId = params.uid as string;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Meta Ads Manager</h1>
          <p className="text-gray-600 mt-2">Verwalten Sie Ihre Facebook & Instagram Werbeanzeigen</p>
        </div>
        <MetaAdsManager companyId={companyId} />
      </div>
    </div>
  );
}