import { Metadata } from 'next';
import { CashbookComponent } from '@/components/finance/CashbookComponent';

export const metadata: Metadata = {
  title: 'Kassenbuch | Taskilo',
  description: 'Bargeld-Einnahmen und -Ausgaben dokumentieren und verwalten',
};

interface CashbookPageProps {
  params: Promise<{
    uid: string;
  }>;
}

export default async function CashbookPage({ params }: CashbookPageProps) {
  const { uid } = await params;
  return (
    <div className="container mx-auto py-6 px-4">
      <CashbookComponent companyId={uid} />
    </div>
  );
}
