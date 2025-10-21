import { NextRequest, NextResponse } from 'next/server';
import { db, withFirebase } from '@/firebase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string; emailId: string }> }
) {
  try {
    const { uid, emailId } = await params;
    const body = await request.json();
    const { starred } = body;

    console.log(`⭐ Toggle star for email ${emailId}, starred: ${starred}`);

    // Update email in emailCache
    await withFirebase(async () => {
      const emailRef = db!.collection('companies').doc(uid).collection('emailCache').doc(emailId);

      const emailDoc = await emailRef.get();

      if (!emailDoc.exists) {
        throw new Error('Email not found');
      }

      const emailData = emailDoc.data();
      const labels = emailData?.labels || emailData?.labelIds || [];

      let updatedLabels: string[];

      if (starred) {
        // Add STARRED label if not present
        if (!labels.includes('STARRED')) {
          updatedLabels = [...labels, 'STARRED'];
        } else {
          updatedLabels = labels;
        }
      } else {
        // Remove STARRED label
        updatedLabels = labels.filter((label: string) => label !== 'STARRED');
      }

      // Update Firestore
      await emailRef.update({
        starred,
        labels: updatedLabels,
        labelIds: updatedLabels,
        updatedAt: new Date().toISOString(),
      });

      console.log(`✅ Email ${emailId} starred status updated to ${starred}`);
    });

    return NextResponse.json({
      success: true,
      starred,
      message: starred ? 'Email als Favorit markiert' : 'Favorit entfernt',
    });
  } catch (error: any) {
    console.error('❌ Star email error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to star email',
      },
      { status: 500 }
    );
  }
}
