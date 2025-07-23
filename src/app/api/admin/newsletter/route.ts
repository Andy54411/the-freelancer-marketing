import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/admin-auth';
import { admin } from '@/firebase/server';
import { GmailNewsletterSender } from '@/lib/google-workspace';

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'subscribers' or 'campaigns'

    if (type === 'subscribers') {
      // Get newsletter subscribers
      const subscribersSnapshot = await admin
        .firestore()
        .collection('newsletterSubscribers')
        .orderBy('subscribedAt', 'desc')
        .get();

      const subscribers = subscribersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        subscribedAt:
          doc.data().subscribedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      }));

      return NextResponse.json({
        success: true,
        subscribers,
        count: subscribers.length,
      });
    } else if (type === 'campaigns') {
      // Get newsletter campaigns
      const campaignsSnapshot = await admin
        .firestore()
        .collection('newsletterCampaigns')
        .orderBy('createdAt', 'desc')
        .get();

      const campaigns = campaignsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        sentAt: doc.data().sentAt?.toDate?.()?.toISOString(),
      }));

      return NextResponse.json({
        success: true,
        campaigns,
        count: campaigns.length,
      });
    } else {
      return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error fetching newsletter data:', error);
    return NextResponse.json({ error: 'Failed to fetch newsletter data' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, data } = body;

    if (type === 'subscriber') {
      // Add new subscriber
      const { email, name } = data;

      if (!email) {
        return NextResponse.json({ error: 'Email is required' }, { status: 400 });
      }

      // Check if subscriber already exists
      const existingSubscriber = await admin
        .firestore()
        .collection('newsletterSubscribers')
        .where('email', '==', email)
        .get();

      if (!existingSubscriber.empty) {
        return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
      }

      // Add new subscriber
      const newSubscriber = {
        email,
        name: name || null,
        subscribed: true,
        subscribedAt: admin.firestore.Timestamp.now(),
        source: 'manual',
      };

      const docRef = await admin.firestore().collection('newsletterSubscribers').add(newSubscriber);

      return NextResponse.json({
        success: true,
        subscriber: {
          id: docRef.id,
          ...newSubscriber,
          subscribedAt: newSubscriber.subscribedAt.toDate().toISOString(),
        },
      });
    } else if (type === 'campaign') {
      // Create new campaign
      const { subject, content } = data;

      if (!subject || !content) {
        return NextResponse.json({ error: 'Subject and content are required' }, { status: 400 });
      }

      // Get active subscriber count
      const subscribersSnapshot = await admin
        .firestore()
        .collection('newsletterSubscribers')
        .where('subscribed', '==', true)
        .get();

      const newCampaign = {
        subject,
        content,
        status: 'draft',
        createdAt: admin.firestore.Timestamp.now(),
        recipientCount: subscribersSnapshot.size,
      };

      const docRef = await admin.firestore().collection('newsletterCampaigns').add(newCampaign);

      return NextResponse.json({
        success: true,
        campaign: {
          id: docRef.id,
          ...newCampaign,
          createdAt: newCampaign.createdAt.toDate().toISOString(),
        },
      });
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error creating newsletter item:', error);
    return NextResponse.json({ error: 'Failed to create newsletter item' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, id, data } = body;

    if (type === 'campaign-send') {
      // Get campaign details
      const campaignDoc = await admin.firestore().collection('newsletterCampaigns').doc(id).get();

      if (!campaignDoc.exists) {
        return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
      }

      const campaign = campaignDoc.data();
      if (campaign?.status !== 'draft') {
        return NextResponse.json(
          { error: 'Campaign already sent or not in draft status' },
          { status: 400 }
        );
      }

      // Get active subscribers
      const subscribersSnapshot = await admin
        .firestore()
        .collection('newsletterSubscribers')
        .where('subscribed', '==', true)
        .get();

      const subscriberEmails = subscribersSnapshot.docs.map(doc => doc.data().email);

      if (subscriberEmails.length === 0) {
        return NextResponse.json({ error: 'No active subscribers found' }, { status: 400 });
      }

      // Get Google Workspace credentials from request or admin
      const { accessToken, refreshToken } = data || {};

      if (!accessToken) {
        return NextResponse.json(
          {
            error: 'Google Workspace access token required for sending emails',
          },
          { status: 400 }
        );
      }

      try {
        // Initialize Gmail sender
        const gmailSender = new GmailNewsletterSender(accessToken, refreshToken);

        // Create HTML content (you can enhance this with templates)
        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>${campaign.subject}</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; margin: 20px; }
              .header { background-color: #f8f9fa; padding: 20px; text-align: center; }
              .content { padding: 20px; }
              .footer { background-color: #f8f9fa; padding: 10px; text-align: center; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Taskilo Newsletter</h1>
            </div>
            <div class="content">
              ${campaign.content.replace(/\n/g, '<br>')}
            </div>
            <div class="footer">
              <p>Sie erhalten diese E-Mail, weil Sie sich für den Taskilo Newsletter angemeldet haben.</p>
              <p>Um sich abzumelden, antworten Sie auf diese E-Mail mit "Abmelden".</p>
            </div>
          </body>
          </html>
        `;

        // Send newsletter
        const sendResult = await gmailSender.sendNewsletter(
          subscriberEmails,
          campaign.subject,
          htmlContent,
          campaign.content // Text version
        );

        if (sendResult.success) {
          // Update campaign status
          await admin.firestore().collection('newsletterCampaigns').doc(id).update({
            status: 'sent',
            sentAt: admin.firestore.Timestamp.now(),
            recipientCount: subscriberEmails.length,
            sendResults: sendResult.results,
          });

          return NextResponse.json({
            success: true,
            message: `Newsletter successfully sent to ${subscriberEmails.length} subscribers`,
            results: sendResult.results,
          });
        } else {
          return NextResponse.json(
            {
              error: `Failed to send newsletter: ${sendResult.error}`,
            },
            { status: 500 }
          );
        }
      } catch (error) {
        console.error('Error sending newsletter via Gmail:', error);
        return NextResponse.json(
          {
            error: 'Failed to send newsletter via Gmail API',
          },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error updating newsletter item:', error);
    return NextResponse.json({ error: 'Failed to update newsletter item' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    if (!type || !id) {
      return NextResponse.json({ error: 'Type and ID are required' }, { status: 400 });
    }

    if (type === 'subscriber') {
      await admin.firestore().collection('newsletterSubscribers').doc(id).delete();
    } else if (type === 'campaign') {
      await admin.firestore().collection('newsletterCampaigns').doc(id).delete();
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting newsletter item:', error);
    return NextResponse.json({ error: 'Failed to delete newsletter item' }, { status: 500 });
  }
}
