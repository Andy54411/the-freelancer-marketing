import { db } from '@/firebase/server';
import { JobApplication } from '@/types/career';
import { ApplicationsList } from '@/components/recruiting/ApplicationsList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function AllApplicationsPage({
  params,
}: {
  params: Promise<{ uid: string }>;
}) {
  const { uid } = await params;

  if (!db) {
    return <div>Database Error</div>;
  }

  let applications: JobApplication[] = [];

  try {
    // Strategy 1: Check Company Subcollection (camelCase - used by Flutter App)
    let appsSnapshot = await db
      .collection('companies')
      .doc(uid)
      .collection('jobApplications')
      .orderBy('appliedAt', 'desc')
      .get();

    // Strategy 2: Check Company Subcollection (snake_case - used by Web App)
    if (appsSnapshot.empty) {
      appsSnapshot = await db
        .collection('companies')
        .doc(uid)
        .collection('job_applications')
        .orderBy('appliedAt', 'desc')
        .get();
    }

    // Strategy 3: Collection Group Query (Fallback if data is only in User subcollections)
    // This finds documents in ANY 'job_applications' subcollection where companyId matches
    if (appsSnapshot.empty) {
      appsSnapshot = await db
        .collectionGroup('job_applications')
        .where('companyId', '==', uid)
        .orderBy('appliedAt', 'desc')
        .get();
    }

    // Strategy 4: Collection Group Query for camelCase 'jobApplications'
    if (appsSnapshot.empty) {
      appsSnapshot = await db
        .collectionGroup('jobApplications')
        .where('companyId', '==', uid)
        .orderBy('appliedAt', 'desc')
        .get();
    }

    applications = appsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as JobApplication);

    // Sort in memory to ensure correct order regardless of source
    applications.sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime());
  } catch (error) {
    console.error('Error fetching applications:', error);
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Alle Bewerbungen</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Eingegangene Bewerbungen</CardTitle>
        </CardHeader>
        <CardContent>
          <ApplicationsList applications={applications} />
        </CardContent>
      </Card>
    </div>
  );
}
