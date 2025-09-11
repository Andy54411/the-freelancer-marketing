import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Initialize Firebase Admin
if (!getApps().length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();

interface ShopifyOrder {
  id: number;
  name: string;
  email: string;
  total_price: string;
  currency: string;
  financial_status: string;
  fulfillment_status: string;
  created_at: string;
  line_items: Array<{
    id: number;
    product_id: number;
    variant_id: number;
    title: string;
    quantity: number;
    price: string;
    sku: string;
  }>;
  shipping_address: {
    first_name: string;
    last_name: string;
    company?: string;
    address1: string;
    address2?: string;
    city: string;
    province: string;
    country: string;
    zip: string;
    phone?: string;
  };
  billing_address: {
    first_name: string;
    last_name: string;
    company?: string;
    address1: string;
    address2?: string;
    city: string;
    province: string;
    country: string;
    zip: string;
    phone?: string;
  };
}

// GET: Shopify-Bestellungen abrufen
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const limit = searchParams.get('limit') || '50';
    const status = searchParams.get('status') || 'any';
    const since = searchParams.get('since'); // ISO date string

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID ist erforderlich' }, { status: 400 });
    }

    // Shopify-Integration aus Firestore abrufen
    const integrationDoc = await db
      .collection('companies')
      .doc(companyId)
      .collection('integrations')
      .doc('shopify')
      .get();

    if (!integrationDoc.exists) {
      return NextResponse.json(
        { error: 'Shopify-Integration nicht konfiguriert' },
        { status: 404 }
      );
    }

    const integration = integrationDoc.data();
    if (
      !integration?.enabled ||
      !integration?.config?.shopUrl ||
      !integration?.config?.accessToken
    ) {
      return NextResponse.json(
        { error: 'Shopify-Integration nicht vollständig konfiguriert' },
        { status: 400 }
      );
    }

    // Shopify API aufrufen
    const shopUrl = integration.config.shopUrl;
    const accessToken = integration.config.accessToken;

    let apiUrl = `https://${shopUrl}/admin/api/2023-10/orders.json?limit=${limit}&status=${status}`;
    if (since) {
      apiUrl += `&created_at_min=${since}`;
    }

    const response = await fetch(apiUrl, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: `Shopify API Fehler: ${response.status} - ${error}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      orders: data.orders,
      count: data.orders?.length || 0,
    });
  } catch (error) {
    console.error('Shopify Orders API Error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Shopify-Bestellungen' },
      { status: 500 }
    );
  }
}

// POST: Bestellung in Lieferschein konvertieren
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, orderId, shopifyOrderData } = body;

    if (!companyId || !orderId) {
      return NextResponse.json(
        { error: 'Company ID und Order ID sind erforderlich' },
        { status: 400 }
      );
    }

    // Shopify-Bestellung zu Lieferschein-Format konvertieren
    const order = shopifyOrderData as ShopifyOrder;

    const deliveryNoteData = {
      companyId,
      source: 'shopify',
      sourceOrderId: order.id.toString(),
      sourceOrderNumber: order.name,
      status: 'draft',
      customer: {
        name: `${order.shipping_address.first_name} ${order.shipping_address.last_name}`,
        company: order.shipping_address.company || '',
        email: order.email,
        phone: order.shipping_address.phone || '',
        address: {
          street: order.shipping_address.address1,
          street2: order.shipping_address.address2 || '',
          city: order.shipping_address.city,
          postalCode: order.shipping_address.zip,
          state: order.shipping_address.province,
          country: order.shipping_address.country,
        },
      },
      billingAddress: {
        street: order.billing_address.address1,
        street2: order.billing_address.address2 || '',
        city: order.billing_address.city,
        postalCode: order.billing_address.zip,
        state: order.billing_address.province,
        country: order.billing_address.country,
      },
      items: order.line_items.map(item => ({
        id: item.id.toString(),
        productId: item.product_id.toString(),
        variantId: item.variant_id.toString(),
        name: item.title,
        sku: item.sku || '',
        quantity: item.quantity,
        price: parseFloat(item.price),
        total: parseFloat(item.price) * item.quantity,
      })),
      totals: {
        subtotal: parseFloat(order.total_price),
        tax: 0, // TODO: Tax calculation from Shopify
        total: parseFloat(order.total_price),
        currency: order.currency,
      },
      dates: {
        created: new Date(order.created_at),
        orderDate: new Date(order.created_at),
      },
      metadata: {
        shopifyOrderId: order.id,
        shopifyOrderName: order.name,
        shopifyFinancialStatus: order.financial_status,
        shopifyFulfillmentStatus: order.fulfillment_status,
        importedAt: new Date(),
      },
    };

    // Lieferschein in Firestore speichern
    const deliveryNoteRef = await db
      .collection('companies')
      .doc(companyId)
      .collection('deliveryNotes')
      .add(deliveryNoteData);

    // Shopify-Bestellung als "imported" markieren (optional)
    await db
      .collection('companies')
      .doc(companyId)
      .collection('shopifyOrders')
      .doc(order.id.toString())
      .set({
        ...order,
        imported: true,
        deliveryNoteId: deliveryNoteRef.id,
        importedAt: new Date(),
      });

    return NextResponse.json({
      success: true,
      deliveryNoteId: deliveryNoteRef.id,
      message: 'Shopify-Bestellung erfolgreich in Lieferschein konvertiert',
    });
  } catch (error) {
    console.error('Shopify Order Import Error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Importieren der Shopify-Bestellung' },
      { status: 500 }
    );
  }
}
