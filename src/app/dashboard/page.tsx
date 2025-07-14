import { FiLoader } from 'react-icons/fi';

export const dynamic = 'force-dynamic';

// Reine Client-Komponente, kein Suspense, kein SSR
export default function DashboardPage() {
  const DashboardRedirectClient = require('./DashboardRedirectClient').default;
  return (
    <div className="flex items-center justify-center min-h-screen">
      <DashboardRedirectClient />
    </div>
  );
}
