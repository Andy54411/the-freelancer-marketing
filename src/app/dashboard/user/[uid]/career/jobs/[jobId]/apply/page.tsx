import { db } from '@/firebase/server';
import { JobPosting, ApplicantProfile } from '@/types/career';
import { notFound } from 'next/navigation';
import { MOCK_JOBS } from '@/lib/mock-jobs';
import { ApplicationForm } from './ApplicationForm';

import { redirect } from 'next/navigation';

export default async function ApplyPage({
  params,
}: {
  params: Promise<{ uid: string; jobId: string }>;
}) {
  const { uid, jobId } = await params;

  if (!db) {
    return <div>Database Error</div>;
  }

  // 1. Fetch Job
  let job: JobPosting | null = null;

  // Try Firestore
  const jobDoc = await db.collection('jobs').doc(jobId).get();
  if (jobDoc.exists) {
    job = { id: jobDoc.id, ...jobDoc.data() } as JobPosting;
  } else {
    // Try Mock Data
    const mockJob = MOCK_JOBS.find(j => j.id === jobId);
    if (mockJob) {
      job = {
        id: mockJob.id,
        companyId: 'mock-company-id',
        companyName: mockJob.company,
        title: mockJob.title,
        description: mockJob.description,
        location: mockJob.location,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        type: mockJob.type as any,
        postedAt: new Date().toISOString(),
        status: 'active',
      } as JobPosting;
    }
  }

  if (!job) {
    notFound();
  }

  // 2. Fetch User Profile
  let profile: ApplicantProfile | null = null;

  try {
    // Try new collection first
    const profileDoc = await db.collection('candidateProfiles').doc(uid).get();
    if (profileDoc.exists) {
      profile = profileDoc.data() as ApplicantProfile;
    } else {
      // Try legacy path
      const legacyDoc = await db
        .collection('users')
        .doc(uid)
        .collection('career_profile')
        .doc('main')
        .get();
      if (legacyDoc.exists) {
        profile = legacyDoc.data() as ApplicantProfile;
      } else {
        // Try to pre-fill from user record
        const userDoc = await db.collection('users').doc(uid).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          profile = {
            userId: uid,
            firstName: userData?.firstName || '',
            lastName: userData?.lastName || '',
            email: userData?.email || '',
            salutation: userData?.salutation || '',
            phone: userData?.phone || '',
            // Initialize required arrays
            experience: [],
            education: [],
            languages: [],
            qualifications: [],
            skills: [],
            industries: [],
            employmentTypes: [],
            preferredLocations: [],
            careerLevel: [],
            // Missing required fields
            desiredPosition: '',
            updatedAt: new Date().toISOString(),
          } as unknown as ApplicantProfile;
        }
      }
    }
  } catch (error) {
    console.error('Error fetching profile:', error);
  }

  if (!profile) {
    redirect(`/dashboard/user/${uid}/career/profile`);
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <ApplicationForm job={job} profile={profile} userId={uid} />
    </div>
  );
}
