import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { applicationId: string } }
) {
  try {
    const { applicationId } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json({ error: 'Status required' }, { status: 400 });
    }

    // Get the application to find related IDs
    // Since we deleted the root collection, we must search in subcollections
    // We can search in company subcollections as this is likely triggered by a company action
    // Or use collectionGroup query

    let appDoc = null;
    let appRef = null;
    let source = '';

    // Try finding it via collectionGroup (most robust if we don't know companyId)
    const querySnapshot = await db
      .collectionGroup('jobApplications')
      .where('id', '==', applicationId)
      .limit(1)
      .get();

    if (!querySnapshot.empty) {
      appDoc = querySnapshot.docs[0];
      appRef = appDoc.ref;
      source = 'company'; // Assuming collectionGroup hits company subcollection first or we treat it as source
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
        source = 'user';
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
