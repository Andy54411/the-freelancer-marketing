import { db } from '@/firebase/server';
import { JobPosting, ApplicantProfile } from '@/types/career';
import { notFound } from 'next/navigation';
import { ApplicationForm } from './ApplicationForm';

import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

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

  // Try Firestore Global
  let jobDoc = await db.collection('jobs').doc(jobId).get();

  // Try Subcollections
  if (!jobDoc.exists) {
    const querySnapshot = await db.collectionGroup('jobs').where('id', '==', jobId).limit(1).get();
    if (!querySnapshot.empty) {
      jobDoc = querySnapshot.docs[0];
    }
  }

  if (jobDoc.exists) {
    job = { id: jobDoc.id, ...jobDoc.data() } as JobPosting;
  }

  if (!job) {
    notFound();
  }

  // 2. Fetch User Profile
  let profile: ApplicantProfile | null = null;

  try {
    console.log(`Fetching profile for user: ${uid}`);

    // Try new subcollection
    const profileDoc = await db
      .collection('users')
      .doc(uid)
      .collection('candidate_profile')
      .doc('main')
      .get();

    if (profileDoc.exists) {
      console.log('Found profile in users subcollection');
      profile = profileDoc.data() as ApplicantProfile;
    } else {
      console.log('Profile not found in users subcollection');
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
