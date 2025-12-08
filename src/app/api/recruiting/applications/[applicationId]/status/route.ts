import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { applicationId: string } }
) {
  try {
    const { applicationId } = await params;
    const body = await request.json();
    const { 
      status, 
      companyId: providedCompanyId, 
      interviewSlots, 
      message, 
      isVideoCall, 
      videoLink,
      meetingType,
      allowCandidateChoice 
    } = body;

    if (!status) {
      return NextResponse.json({ error: 'Status required' }, { status: 400 });
    }

    let appDoc = null;
    let appRef = null;

    // 1. Direct lookup if companyId is provided (Fastest & Cheapest)
    if (providedCompanyId) {
      // Try camelCase collection first
      appRef = db
        .collection('companies')
        .doc(providedCompanyId)
        .collection('jobApplications')
        .doc(applicationId);
      appDoc = await appRef.get();

      if (!appDoc.exists) {
        // Try snake_case collection
        appRef = db
          .collection('companies')
          .doc(providedCompanyId)
          .collection('job_applications')
          .doc(applicationId);
        appDoc = await appRef.get();
      }
    }

    // 2. Fallback to Collection Group Query if not found or companyId missing
    if (!appDoc || !appDoc.exists) {
      // Try finding it via collectionGroup (most robust if we don't know companyId)
      const querySnapshot = await db
        .collectionGroup('jobApplications')
        .where('id', '==', applicationId)
        .limit(1)
        .get();

      if (!querySnapshot.empty) {
        appDoc = querySnapshot.docs[0];
        appRef = appDoc.ref;
      } else {
        // Fallback: Try user subcollection via collectionGroup 'job_applications'
        const userQuerySnapshot = await db
          .collectionGroup('job_applications')
          .where('id', '==', applicationId)
          .limit(1)
          .get();
        if (!userQuerySnapshot.empty) {
          appDoc = userQuerySnapshot.docs[0];
          appRef = appDoc.ref;
        }
      }
    }

    if (!appDoc || !appDoc.exists) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const appData = appDoc.data();
    const applicantId = appData?.applicantId;
    const companyId = appData?.companyId;

    const updateData: any = {
      status,
      updatedAt: new Date().toISOString(),
    };

    if (interviewSlots) {
      updateData.interviewSlots = interviewSlots;
      // Optional: Add a flag to trigger email notification cloud function
      updateData.interviewInviteSent = false; 
    }

    if (message) {
      updateData.interviewMessage = message;
    }

    // 🎯 Meeting-Typ-Daten erweitern
    if (typeof isVideoCall === 'boolean') {
      updateData.isVideoCall = isVideoCall;
    }

    if (videoLink) {
      updateData.videoLink = videoLink;
    }

    // 🎯 Neue Meeting-Typ Felder
    if (meetingType) {
      updateData.meetingType = meetingType;
    }

    if (typeof allowCandidateChoice === 'boolean') {
      updateData.allowCandidateChoice = allowCandidateChoice;
    }

    // 1. Update the document we actually found (Source of Truth for this read)
    if (appRef) {
      await appRef.update(updateData).catch(e => console.warn('Failed to update source doc', e));
    }

    // 2. Sync to the other side
    
    // If source was User, sync to Company
    if (appRef && appRef.path.includes('/users/')) {
        if (companyId) {
             const camelRef = db.collection('companies').doc(companyId).collection('jobApplications').doc(applicationId);
             const snakeRef = db.collection('companies').doc(companyId).collection('job_applications').doc(applicationId);
             try {
                await camelRef.update(updateData);
             } catch {
                await snakeRef.update(updateData).catch(e => console.warn('Failed to sync to company snake_case', e));
             }
        }
    }
    
    // If source was Company, sync to User
    else if (appRef && appRef.path.includes('/companies/')) {
        if (applicantId) {
            await db.collection('users').doc(applicantId).collection('job_applications').doc(applicationId)
                .update(updateData).catch(e => console.warn('Failed to sync to user', e));
        }
        
        // Also ensure we try to update the OTHER company collection format if we are migrating
        // (e.g. if we found it in snake_case, try to update camelCase too if it exists, or vice versa? 
        // Actually, let's just stick to updating the source and the user copy for now to avoid confusion)
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating application status:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
