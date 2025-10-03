import { NextRequest, NextResponse } from 'next/server';
import { adminEmailsService } from '@/lib/aws-dynamodb';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();

    // Parse SNS message
    let snsMessage;
    try {
      snsMessage = JSON.parse(body);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // Handle SNS subscription confirmation
    if (snsMessage.Type === 'SubscriptionConfirmation') {
      // Auto-confirm subscription
      const confirmUrl = snsMessage.SubscribeURL;
      if (confirmUrl) {
        const response = await fetch(confirmUrl);
      }

      return NextResponse.json({ message: 'Subscription confirmed' });
    }

    // Handle SNS notification
    if (snsMessage.Type === 'Notification') {
      const sesMessage = JSON.parse(snsMessage.Message);

      // Process different SES event types
      if (sesMessage.eventType === 'send') {
      } else if (sesMessage.eventType === 'delivery') {
      } else if (sesMessage.eventType === 'bounce') {
      } else if (sesMessage.eventType === 'complaint') {
      } else if (sesMessage.eventType === 'receive') {
        // This is an incoming email!

        try {
          await adminEmailsService.createEmail({
            messageId: sesMessage.mail.messageId,
            from: sesMessage.mail.commonHeaders?.from?.[0] || 'unknown',
            to: sesMessage.mail.commonHeaders?.to?.[0] || 'unknown',
            subject: sesMessage.mail.commonHeaders?.subject || 'No Subject',
            textContent: sesMessage.content || '',
            htmlContent: sesMessage.content || '',
            source: 'aws-ses',
            type: 'received',
            read: false,
            timestamp: Date.now(),
            raw: sesMessage,
          });
        } catch (error) {}
      }

      return NextResponse.json({ message: 'Event processed' });
    }

    return NextResponse.json({ message: 'Unknown message type' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
