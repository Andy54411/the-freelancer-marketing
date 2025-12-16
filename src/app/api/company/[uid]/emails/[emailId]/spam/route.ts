import { NextRequest, NextResponse } from 'next/server';
import { db, withFirebase } from '@/firebase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string; emailId: string }> }
) {
  try {
    const { uid, emailId } = await params;
    const body = await request.json();
    const { spam, userId } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      );
    }

    console.log(`🚫 Toggle spam for email ${emailId}, spam: ${spam}, userId: ${userId}`);

    // Update email in emailCache
    await withFirebase(async () => {
      const emailRef = db!.collection('companies').doc(uid).collection('emailCache').doc(emailId);

      const emailDoc = await emailRef.get();

      if (!emailDoc.exists) {
        throw new Error('Email not found');
      }

      const emailData = emailDoc.data();

      // Validiere, dass die E-Mail dem anfragenden Benutzer gehört
      if (emailData?.userId && emailData.userId !== userId) {
        throw new Error('Unauthorized: Email belongs to another user');
      }

      const labels = emailData?.labels || emailData?.labelIds || [];

      let updatedLabels: string[];

      if (spam) {
        // Add SPAM label and remove from INBOX
        updatedLabels = labels.filter((label: string) => label !== 'INBOX');
        if (!updatedLabels.includes('SPAM')) {
          updatedLabels.push('SPAM');
        }
      } else {
        // Remove SPAM label and add back to INBOX
        updatedLabels = labels.filter((label: string) => label !== 'SPAM');
        if (!updatedLabels.includes('INBOX')) {
          updatedLabels.push('INBOX');
        }
      }

      // Update Firestore
      await emailRef.update({
        labels: updatedLabels,
        labelIds: updatedLabels,
        updatedAt: new Date().toISOString(),
      });

      console.log(`✅ Email ${emailId} spam status updated to ${spam}`);
    });

    return NextResponse.json({
      success: true,
      spam,
      message: spam ? 'Als Spam markiert' : 'Spam-Markierung entfernt',
    });
  } catch (error: any) {
    console.error('❌ Mark as spam error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to mark as spam',
      },
      { status: 500 }
    );
  }
}
