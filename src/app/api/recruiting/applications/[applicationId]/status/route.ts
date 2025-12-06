import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { applicationId: string } }
) {
  try {
    const { applicationId } = await params;
    const body = await request.json();
    const { status, companyId: providedCompanyId } = body;

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

    const updateData = {
      status,
      updatedAt: new Date().toISOString(),
    };

    // Update User Subcollection
    if (applicantId) {
      await db
        .collection('users')
        .doc(applicantId)
        .collection('job_applications')
        .doc(applicationId)
        .update(updateData)
        .catch(e => console.warn('Failed to update user app copy', e));
    }

    // Update Company Subcollection
    if (companyId) {
      await db
        .collection('companies')
        .doc(companyId)
        .collection('jobApplications')
        .doc(applicationId)
        .update(updateData)
        .catch(e => console.warn('Failed to update company app copy', e));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating application status:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
