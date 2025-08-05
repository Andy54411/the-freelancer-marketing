import { SteuerberaterPortal } from '@/components/datev/SteuerberaterPortal';

interface SteuerberaterPageProps {
  params: Promise<{
    uid: string;
  }>;
}

export default async function SteuerberaterPage({ params }: SteuerberaterPageProps) {
  const { uid } = await params;
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Steuerberater-Kollaboration
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Arbeiten Sie sicher und effizient mit Ihrem Steuerberater zusammen
          </p>
        </div>
        
        <SteuerberaterPortal companyId={uid} />
      </div>
    </div>
  );
}
