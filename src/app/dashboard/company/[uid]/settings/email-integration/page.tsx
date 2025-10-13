'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// This page is deprecated - redirect to new email integration
export default function EmailIntegrationPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('../email-integration');
  }, [router]);

  return null;
}
