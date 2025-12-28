'use client';

export const dynamic = 'force-dynamic';

import ProtectedRoute from '@/components/auth/ProtectedRoute';
// STRIPE DEAKTIVIERT - StripeElementsAppProvider entfernt
// import StripeElementsAppProvider from '@/components/StripeElementsAppProvider';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      {/* STRIPE DEAKTIVIERT - Kein Stripe Provider mehr benötigt */}
      {children}
    </ProtectedRoute>
  );
}
