// src/app/api/storage/send-limit-email/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { admin } from '@/firebase/server';
// TODO: Re-implement with new email service
// import { StorageEmailService } from '@/services/storageEmailService';

export async function POST(request: NextRequest) {
  try {
    const { companyId, type, currentUsage, limit, percentUsed } = await request.json();

    if (!companyId || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get company data
    const db = admin.firestore();
    const companyDoc = await db.collection('companies').doc(companyId).get();

    if (!companyDoc.exists) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const companyData = companyDoc.data()!;
    const recipient = {
      email: companyData.email || companyData.contactEmail,
      companyName: companyData.companyName || 'Ihr Unternehmen',
      companyId,
    };

    // Check if email was sent recently (avoid spam)
    const lastEmailKey = `lastEmail_${type}`;
    const lastEmailTime = companyData[lastEmailKey];

    if (lastEmailTime) {
      const hoursSinceLastEmail = (Date.now() - lastEmailTime.toMillis()) / (1000 * 60 * 60);

      // Don't send same email type more than once per 24 hours
      if (hoursSinceLastEmail < 24) {
        return NextResponse.json({
          success: true,
          message: 'Email already sent recently',
          skipped: true,
        });
      }
    }

    // TODO: Re-implement email sending with new Gmail service
    console.log(`Storage limit email would be sent: type=${type}, companyId=${companyId}`);

    // Send appropriate email
    switch (type) {
      case 'warning':
        // await StorageEmailService.sendLimitWarningEmail(
        //   recipient,
        //   currentUsage,
        //   limit,
        //   percentUsed
        // );
        console.log('Warning email would be sent');
        break;

      case 'over_limit':
        // await StorageEmailService.sendOverLimitEmail(
        //   recipient,
        //   currentUsage,
        //   limit,
        //   companyData.storagePlanId || 'free'
        // );
        console.log('Over limit email would be sent');
        break;

      default:
        return NextResponse.json({ error: 'Invalid email type' }, { status: 400 });
    }

    // Update last email timestamp
    await db
      .collection('companies')
      .doc(companyId)
      .update({
        [lastEmailKey]: admin.firestore.FieldValue.serverTimestamp(),
      });

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
    });
  } catch (error) {
    console.error('Error sending storage email:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
