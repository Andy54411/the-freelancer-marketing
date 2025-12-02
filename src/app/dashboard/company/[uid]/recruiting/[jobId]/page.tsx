import { db } from '@/firebase/server';
import { JobPosting, JobApplication } from '@/types/career';
import { notFound } from 'next/navigation';
import { ApplicationsList } from '@/components/recruiting/ApplicationsList';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MapPin, Clock } from 'lucide-react';
import Link from 'next/link';

export default async function CompanyJobDetailsPage({
  params,
}: {
  params: Promise<{ uid: string; jobId: string }>;
}) {
  const { uid, jobId } = await params;

  if (!db) {
    return <div>Database Error</div>;
  }

  // Fetch Job
  // Try subcollection first
  let jobDoc = await db.collection('companies').doc(uid).collection('jobs').doc(jobId).get();

  // Fallback to global collection
  if (!jobDoc.exists) {
    jobDoc = await db.collection('jobs').doc(jobId).get();
  }

  if (!jobDoc.exists) {
    notFound();
  }
  const job = { id: jobDoc.id, ...jobDoc.data() } as JobPosting;

  // Verify ownership
  if (job.companyId !== uid) {
    notFound();
  }

  // Fetch Applications
  let applications: JobApplication[] = [];
  try {
    const appsSnapshot = await db
      .collection('jobApplications')
      .where('jobId', '==', jobId)
      .orderBy('appliedAt', 'desc')
      .get();

    applications = appsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as JobApplication);
  } catch (error) {
    console.error('Error fetching applications:', error);
    // Fallback
    const appsSnapshot = await db.collection('jobApplications').where('jobId', '==', jobId).get();
    applications = appsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as JobApplication);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/company/${uid}/recruiting`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{job.title}</h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
            <Badge variant={job.status === 'active' ? 'default' : 'secondary'}>
              {job.status === 'active' ? 'Aktiv' : 'Geschlossen'}
            </Badge>
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {job.location}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> {new Date(job.postedAt).toLocaleDateString('de-DE')}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-4">Bewerbungen ({applications.length})</h2>
            <ApplicationsList applications={applications} />
          </div>
        </div>

        <div className="space-y-6">
          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="font-semibold mb-2">Job Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Typ</span>
                <span className="capitalize">{job.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gehalt</span>
                <span>
                  {job.salaryRange?.min ? `€${job.salaryRange.min}` : '-'} -{' '}
                  {job.salaryRange?.max ? `€${job.salaryRange.max}` : '-'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
