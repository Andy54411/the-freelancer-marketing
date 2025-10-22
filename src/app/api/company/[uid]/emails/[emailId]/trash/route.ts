import { NextRequest, NextResponse } from 'next/server';
import { db, withFirebase } from '@/firebase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string; emailId: string }> }
) {
  try {
    const { uid, emailId } = await params;
    const body = await request.json();
    const { trash } = body;

    console.log(`🗑️ Toggle trash for email ${emailId}, trash: ${trash}`);

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

      if (trash) {
        // Move to trash: remove INBOX/SPAM, add TRASH
        updatedLabels = labels.filter((l: string) => l !== 'INBOX' && l !== 'SPAM');
        if (!updatedLabels.includes('TRASH')) {
          updatedLabels.push('TRASH');
        }
      } else {
        // Remove from trash: remove TRASH, add INBOX
        updatedLabels = labels.filter((l: string) => l !== 'TRASH');
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
        trash,
        message: trash ? 'In Papierkorb verschoben' : 'Aus Papierkorb wiederhergestellt',
      };
    });

    console.log(`✅ Email ${emailId} trash status updated to ${trash}`);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('❌ Error toggling trash:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
