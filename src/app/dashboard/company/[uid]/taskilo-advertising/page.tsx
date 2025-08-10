'use client';

// 🎯 WHITE-LABEL TASKILO ADVERTISING - Main Page
// Vollständige Google Ads Integration mit Taskilo Branding

import React from 'react';
import { useParams } from 'next/navigation';
import TaskiloAdvertisingDashboard from '@/components/taskilo-advertising/TaskiloAdvertisingDashboard';

export default function TaskiloAdvertisingPage() {
  const params = useParams();
  const companyId = params.uid as string;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <TaskiloAdvertisingDashboard companyId={companyId} />
      </div>
    </div>
  );
}
