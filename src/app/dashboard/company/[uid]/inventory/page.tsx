'use client';

import { useParams } from 'next/navigation';
import InventoryComponent from '@/components/InventoryComponent';

export default function InventoryPage() {
  const params = useParams();
  const companyId = typeof params?.uid === 'string' ? params.uid : '';

  if (!companyId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500">Keine Firma ausgewählt</p>
      </div>
    );
  }

  return <InventoryComponent companyId={companyId} />;
}
