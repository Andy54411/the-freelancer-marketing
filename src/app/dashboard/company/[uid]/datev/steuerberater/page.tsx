'use client';

import React from 'react';
import { SteuerberaterPortal } from '@/components/datev/SteuerberaterPortal';

interface SteuerberaterPageProps {
  params: Promise<{
    uid: string;
  }>;
}

export default async function SteuerberaterPage({ params }: SteuerberaterPageProps) {
  const { uid } = await params;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Steuerberater-Portal</h1>
          <p className="text-gray-600 mt-1">
            Kollaboration und Datenaustausch mit Ihrem Steuerberater
          </p>
        </div>
      </div>

      {/* Portal Component */}
      <SteuerberaterPortal companyId={uid} />
    </div>
  );
}
