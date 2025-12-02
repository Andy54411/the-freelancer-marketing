import { db } from '@/firebase/server';
import { JobCreationForm } from '@/components/recruiting/JobCreationForm';
import { notFound } from 'next/navigation';

export default async function CreateJobPage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;

  if (!db) {
    return <div>Database Error</div>;
  }

  // Fetch company details
  const companyDoc = await db.collection('companies').doc(uid).get();

  if (!companyDoc.exists) {
    notFound();
  }

  const companyData = companyDoc.data();
  const companyName =
    companyData?.companyName ||
    companyData?.firmenname ||
    companyData?.name ||
    'Unbekanntes Unternehmen';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Neue Stellenanzeige</h1>
        <p className="text-muted-foreground">
          Erstellen Sie eine neue Stellenanzeige für {companyName}.
        </p>
      </div>

      <JobCreationForm companyId={uid} companyName={companyName} />
    </div>
  );
}
