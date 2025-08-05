'use client';

import SettingsComponent from '@/components/dashboard/SettingsComponent';

// Simple Next.js Page component that renders the SettingsComponent
export default function SettingsPage() {
  return <SettingsComponent userData={null} onDataSaved={() => console.log('Settings updated')} />;
}
