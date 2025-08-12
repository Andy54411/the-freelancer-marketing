import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/clients';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    console.log('AWS SES Webhook received:', body);

    // Parse SNS message
    let snsMessage;
    try {
      snsMessage = JSON.parse(body);
    } catch (error) {
      console.error('Error parsing SNS message:', error);
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // Handle SNS subscription confirmation
    if (snsMessage.Type === 'SubscriptionConfirmation') {
      console.log('SNS Subscription confirmation received');

      // Auto-confirm subscription
      const confirmUrl = snsMessage.SubscribeURL;
      if (confirmUrl) {
        const response = await fetch(confirmUrl);
        console.log('Subscription confirmed:', response.status);
      }

      return NextResponse.json({ message: 'Subscription confirmed' });
    }

    // Handle SNS notification
    if (snsMessage.Type === 'Notification') {
      const sesMessage = JSON.parse(snsMessage.Message);
      console.log('SES Event:', sesMessage);

      // Process different SES event types
      if (sesMessage.eventType === 'send') {
        console.log('Email sent:', sesMessage.mail);
      } else if (sesMessage.eventType === 'delivery') {
        console.log('Email delivered:', sesMessage.mail);
      } else if (sesMessage.eventType === 'bounce') {
        console.log('Email bounced:', sesMessage.bounce);
      } else if (sesMessage.eventType === 'complaint') {
        console.log('Email complaint:', sesMessage.complaint);
      } else if (sesMessage.eventType === 'receive') {
        // This is an incoming email!
        console.log('Email received:', sesMessage.mail);

        try {
          await addDoc(collection(db, 'admin_emails'), {
            type: 'received',
            from: sesMessage.mail.commonHeaders?.from?.[0] || 'unknown',
            to: sesMessage.mail.commonHeaders?.to?.[0] || 'unknown',
            subject: sesMessage.mail.commonHeaders?.subject || 'No Subject',
            messageId: sesMessage.mail.messageId,
            timestamp: serverTimestamp(),
            source: 'aws-ses',
            raw: sesMessage,
            read: false,
          });

          console.log('Email stored in Firestore');
        } catch (error) {
          console.error('Error storing email:', error);
        }
      }

      return NextResponse.json({ message: 'Event processed' });
    }

    return NextResponse.json({ message: 'Unknown message type' }, { status: 400 });
  } catch (error) {
    console.error('AWS SES webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
