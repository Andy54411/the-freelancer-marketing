'use client';

export const dynamic = 'force-dynamic';

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import StripeElementsAppProvider from '@/components/StripeElementsAppProvider';
import CachedTranslateWidget from '@/components/CachedTranslateWidget';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <StripeElementsAppProvider>
        <CachedTranslateWidget />
        {children}
      </StripeElementsAppProvider>
    </ProtectedRoute>
  );
}
