import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');
  const verifyToken = process.env.META_WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'taskilo_whatsapp_2024';

  if (mode === 'subscribe' && token === verifyToken) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (value?.messages) {
      const message = value.messages[0];
      const from = message.from;
      const text = message.text?.body;
      const messageId = message.id;

      const companiesSnapshot = await db!.collection('companies').get();

      for (const companyDoc of companiesSnapshot.docs) {
        const customersSnapshot = await db!
          .collection('companies')
          .doc(companyDoc.id)
          .collection('customers')
          .where('phone', '==', `+${from}`)
          .limit(1)
          .get();

        if (!customersSnapshot.empty) {
          const customer = customersSnapshot.docs[0];

          await db!
            .collection('companies')
            .doc(companyDoc.id)
            .collection('whatsappMessages')
            .add({
              messageId,
              customerPhone: `+${from}`,
              customerId: customer.id,
              customerName: customer.data().name,
              direction: 'inbound',
              status: 'delivered',
              body: text,
              companyId: companyDoc.id,
              createdAt: new Date(),
            });

          break;
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[WhatsApp Webhook]', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
