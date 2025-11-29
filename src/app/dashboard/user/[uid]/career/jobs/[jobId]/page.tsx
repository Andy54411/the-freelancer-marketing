import { db } from '@/firebase/server';
import { JobPosting } from '@/types/career';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Briefcase, Clock, Building, ArrowLeft, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { JobApplicationDialog } from '@/components/career/JobApplicationDialog';
import { MOCK_JOBS } from '@/lib/mock-jobs';
import { JobActions } from './JobActions';

export default async function JobDetailsPage({ params }: { params: Promise<{ uid: string, jobId: string }> }) {
  const { uid, jobId } = await params;

  if (!db) {
    return <div>Database Error</div>;
  }

  // Fetch Job
  let job: JobPosting | null = null;
  
  // 1. Try Firestore
  const jobDoc = await db.collection('jobs').doc(jobId).get();
  if (jobDoc.exists) {
    job = { id: jobDoc.id, ...jobDoc.data() } as JobPosting;
  } else {
    // 2. Try Mock Data
    const mockJob = MOCK_JOBS.find(j => j.id === jobId);
    if (mockJob) {
      // Map Mock Job to JobPosting structure
      job = {
        id: mockJob.id,
        companyId: 'mock-company-id', // Placeholder
        companyName: mockJob.company,
        title: mockJob.title,
        description: mockJob.description,
        location: mockJob.location,
        type: mockJob.type as any, // Cast to match enum if possible, or relax type
        postedAt: new Date().toISOString(), // Mock date
        status: 'active',
        // Add other required fields with defaults
      } as JobPosting;
    }
  }

  if (!job) {
    notFound();
  }

  // Check if user has profile
  const profileDoc = await db.collection('candidateProfiles').doc(uid).get();
  const hasProfile = profileDoc.exists;

  // Check if already applied
  const applicationQuery = await db.collection('jobApplications')
    .where('jobId', '==', jobId)
    .where('applicantId', '==', uid)
    .get();
  
  const hasApplied = !applicationQuery.empty;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link 
        href={`/dashboard/user/${uid}/career/jobs`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Zurück zur Übersicht
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{job.title}</h1>
            <div className="flex items-center gap-2 mt-2 text-lg text-gray-600">
              <Building className="h-5 w-5" />
              <span>{job.companyName}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Badge variant="secondary" className="flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {job.location}
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1 capitalize">
              <Briefcase className="h-3 w-3" /> {job.type}
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> {new Date(job.postedAt).toLocaleDateString('de-DE')}
            </Badge>
            {job.salaryRange && (
              <Badge variant="outline">
                €{job.salaryRange.min?.toLocaleString()} - €{job.salaryRange.max?.toLocaleString()}
              </Badge>
            )}
          </div>

          <Card>
            <CardContent className="pt-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Beschreibung</h3>
                <div className="prose max-w-none whitespace-pre-wrap text-gray-700">
                  {job.description}
                </div>
              </div>

              {job.requirements && job.requirements.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Anforderungen</h3>
                  <ul className="list-disc pl-5 space-y-1 text-gray-700">
                    {job.requirements.map((req, i) => (
                      <li key={i}>{req}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6 space-y-4">
              {hasApplied ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-green-800">Beworben</h3>
                  <p className="text-sm text-green-700 mt-1">
                    Sie haben sich am {new Date(applicationQuery.docs[0].data().appliedAt).toLocaleDateString('de-DE')} beworben.
                  </p>
                </div>
              ) : (
                <Link href={`/dashboard/user/${uid}/career/jobs/${job.id}/apply`} className="w-full block">
                  <Button size="lg" className="w-full bg-teal-600 hover:bg-teal-700">
                    Jetzt bewerben
                  </Button>
                </Link>
              )}

              <div className="pt-4 border-t flex justify-center w-full">
                <JobActions jobId={job.id} />
              </div>

              {!hasProfile && !hasApplied && (
                <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded border border-amber-200">
                  Hinweis: Sie müssen erst Ihr Profil ausfüllen, bevor Sie sich bewerben können.
                </div>
              )}

              <div className="border-t pt-4 mt-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Veröffentlicht</span>
                  <span>{new Date(job.postedAt).toLocaleDateString('de-DE')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Job ID</span>
                  <span className="font-mono text-xs">{job.id.substring(0, 8)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
