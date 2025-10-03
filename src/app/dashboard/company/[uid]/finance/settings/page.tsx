'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { ReminderSettings } from '@/components/finance/ReminderSettings';

export default function FinanceSettingsPage() {
  const params = useParams();
  const uid = params?.uid as string;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Finanzeinstellungen</h1>
      </div>

      <ReminderSettings uid={uid} />
    </div>
  );
}
