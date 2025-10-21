import { Metadata } from 'next';
import { CashbookComponent } from '@/components/finance/CashbookComponent';

export const metadata: Metadata = {
  title: 'Kassenbuch | Taskilo',
  description: 'Bargeld-Einnahmen und -Ausgaben dokumentieren und verwalten',
};

interface CashbookPageProps {
  params: {
    uid: string;
  };
}

export default function CashbookPage({ params }: CashbookPageProps) {
  return (
    <div className="container mx-auto py-6 px-4">
      <CashbookComponent companyId={params.uid} />
    </div>
  );
}
