import { NextRequest, NextResponse } from 'next/server';
import { db, withFirebase } from '@/firebase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string; emailId: string }> }
) {
  try {
    const { uid, emailId } = await params;
    const body = await request.json();
    const { archived } = body;

    console.log(`📦 Toggle archive for email ${emailId}, archived: ${archived}`);

    let result: any;

    await withFirebase(async () => {
      const emailRef = db!.collection('companies').doc(uid).collection('emailCache').doc(emailId);
      const emailDoc = await emailRef.get();

      if (!emailDoc.exists) {
        throw new Error('Email not found');
      }

      const emailData = emailDoc.data();
      const labels = emailData?.labels || emailData?.labelIds || [];

      let updatedLabels: string[];

      if (archived) {
        // Archive: remove INBOX, add ARCHIVED
        updatedLabels = labels.filter((l: string) => l !== 'INBOX');
        if (!updatedLabels.includes('ARCHIVED')) {
          updatedLabels.push('ARCHIVED');
        }
      } else {
        // Unarchive: remove ARCHIVED, add INBOX
        updatedLabels = labels.filter((l: string) => l !== 'ARCHIVED');
        if (!updatedLabels.includes('INBOX')) {
          updatedLabels.push('INBOX');
        }
      }

      await emailRef.update({
        labels: updatedLabels,
        labelIds: updatedLabels,
        updatedAt: new Date(),
      });

      result = {
        success: true,
        archived,
        message: archived ? 'Archiviert' : 'Aus Archiv wiederhergestellt',
      };
    });

    console.log(`✅ Email ${emailId} archive status updated to ${archived}`);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('❌ Error toggling archive:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
