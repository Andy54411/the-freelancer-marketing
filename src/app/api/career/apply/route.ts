import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';
import { JobApplicationSchema } from '@/types/career';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobId, companyId, userId, coverLetter } = body;

    if (!jobId || !companyId || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!db) {
      return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
    }

    // 1. Check if already applied
    const existingAppQuery = await db.collection('jobApplications')
      .where('jobId', '==', jobId)
      .where('applicantId', '==', userId)
      .get();

    if (!existingAppQuery.empty) {
      return NextResponse.json(
        { message: 'Sie haben sich bereits auf diese Stelle beworben.' },
        { status: 400 }
      );
    }

    // 2. Fetch Applicant Profile
    const profileDoc = await db.collection('candidateProfiles').doc(userId).get();
    if (!profileDoc.exists) {
      return NextResponse.json(
        { message: 'Bitte erstellen Sie zuerst Ihr Kandidatenprofil.' },
        { status: 400 }
      );
    }
    const applicantProfile = profileDoc.data();

    // 3. Create Application
    const applicationData = {
      jobId,
      companyId,
      applicantId: userId,
      applicantProfile, // Snapshot
      coverLetter: coverLetter || '',
      status: 'pending',
      appliedAt: new Date().toISOString(),
    };

    const docRef = await db.collection('jobApplications').add(applicationData);
    await docRef.update({ id: docRef.id });

    return NextResponse.json({ 
      success: true, 
      id: docRef.id,
      message: 'Application submitted successfully' 
    });

  } catch (error) {
    console.error('Error submitting application:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
