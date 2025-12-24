'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminCalendarRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/admin-calendar');
  }, [router]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
    </div>
  );
}
