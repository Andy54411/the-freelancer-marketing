'use server';

import { z } from 'zod';
import { db } from '@/firebase/server';
import { ApplicantProfileSchema } from '@/types/career';
import { revalidatePath } from 'next/cache';

export async function saveApplicantProfile(data: z.infer<typeof ApplicantProfileSchema>) {
  try {
    if (!db) {
      throw new Error('Database connection not available');
    }
    const validatedData = ApplicantProfileSchema.parse(data);

    await db
      .collection('users')
      .doc(validatedData.userId)
      .collection('career_profile')
      .doc('main')
      .set({
        ...validatedData,
        updatedAt: new Date().toISOString(),
      });

    revalidatePath(`/dashboard/user/${validatedData.userId}/career/profile`);
    return { success: true };
  } catch (error) {
    console.error('Error saving profile:', error);
    return { success: false, error: 'Fehler beim Speichern des Profils' };
  }
}

export async function applyForJob(jobId: string, userId: string, coverLetter?: string) {
  try {
    if (!db) {
      throw new Error('Database connection not available');
    }
    // 1. Get User Profile
    const profileDoc = await db
      .collection('users')
      .doc(userId)
      .collection('career_profile')
      .doc('main')
      .get();

    if (!profileDoc.exists) {
      return { success: false, error: 'Bitte füllen Sie zuerst Ihr Profil aus.' };
    }

    const profile = profileDoc.data();

    // 2. Get Job Details
    // Try global collection first
    let jobDoc = await db.collection('jobs').doc(jobId).get();

    // Try subcollections if not found
    if (!jobDoc.exists) {
      const querySnapshot = await db
        .collectionGroup('jobs')
        .where('id', '==', jobId)
        .limit(1)
        .get();
      if (!querySnapshot.empty) {
        jobDoc = querySnapshot.docs[0];
      }
    }

    if (!jobDoc.exists) {
      return { success: false, error: 'Job nicht gefunden.' };
    }
    const job = jobDoc.data();

    // 3. Create Application
    const applicationId = `${jobId}_${userId}`;
    const application = {
      id: applicationId,
      jobId,
      companyId: job?.companyId,
      applicantId: userId,
      applicantProfile: profile, // Snapshot
      coverLetter: coverLetter || '',
      status: 'pending',
      appliedAt: new Date().toISOString(),
      jobTitle: job?.title,
      companyName: job?.companyName,
    };

    // Save to global applications collection (or company subcollection)
    // Using company subcollection pattern as per instructions
    await db
      .collection('companies')
      .doc(job?.companyId)
      .collection('job_applications')
      .doc(applicationId)
      .set(application);

    // Also save reference in user's collection
    await db
      .collection('users')
      .doc(userId)
      .collection('job_applications')
      .doc(applicationId)
      .set(application);

    revalidatePath(`/dashboard/user/${userId}/career/applications`);
    return { success: true };
  } catch (error) {
    console.error('Error applying for job:', error);
    return { success: false, error: 'Fehler bei der Bewerbung' };
  }
}
