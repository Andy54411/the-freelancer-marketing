import { ReminderComponent } from '@/components/finance/ReminderComponent';

interface RemindersPageProps {
  params: Promise<{
    uid: string;
  }>;
}

export default async function RemindersPage({ params }: RemindersPageProps) {
  const { uid } = await params;

  return (
    <div className="p-6">
      <ReminderComponent companyId={uid} />
    </div>
  );
}

export const metadata = {
  title: 'Mahnungen | Tasko',
  description: 'Automatisches Mahnwesen für überfällige Rechnungen',
};
