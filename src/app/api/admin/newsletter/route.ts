import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/admin-auth';
import { admin } from '@/firebase/server';

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
      // Send campaign
      await admin.firestore().collection('newsletterCampaigns').doc(id).update({
        status: 'sent',
        sentAt: admin.firestore.Timestamp.now(),
      });

      return NextResponse.json({ success: true });
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
