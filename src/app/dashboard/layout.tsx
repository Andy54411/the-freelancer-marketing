'use client';

export const dynamic = 'force-dynamic';

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import StripeElementsAppProvider from '@/components/StripeElementsAppProvider';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <StripeElementsAppProvider>{children}</StripeElementsAppProvider>
    </ProtectedRoute>
  );
}
