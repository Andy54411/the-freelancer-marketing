import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

interface WooCommerceOrder {
  id: number;
  number: string;
  status: string;
  currency: string;
  date_created: string;
  date_modified: string;
  discount_total: string;
  discount_tax: string;
  shipping_total: string;
  shipping_tax: string;
  cart_tax: string;
  total: string;
  total_tax: string;
  customer_id: number;
  billing: {
    first_name: string;
    last_name: string;
    company: string;
    address_1: string;
    address_2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
    email: string;
    phone: string;
  };
  shipping: {
    first_name: string;
    last_name: string;
    company: string;
    address_1: string;
    address_2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  line_items: Array<{
    id: number;
    name: string;
    product_id: number;
    variation_id: number;
    quantity: number;
    tax_class: string;
    subtotal: string;
    subtotal_tax: string;
    total: string;
    total_tax: string;
    sku: string;
    price: number;
  }>;
  shipping_lines: Array<{
    id: number;
    method_title: string;
    method_id: string;
    total: string;
    total_tax: string;
  }>;
  payment_method: string;
  payment_method_title: string;
}

// GET: WooCommerce-Bestellungen abrufen
export async function GET(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Datenbank nicht verfügbar' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const page = searchParams.get('page') || '1';
    const perPage = searchParams.get('per_page') || '20';
    const status = searchParams.get('status') || 'any';
    const after = searchParams.get('after'); // ISO date string
    const before = searchParams.get('before'); // ISO date string

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID ist erforderlich' }, { status: 400 });
    }

    // WooCommerce-Integration aus Firestore abrufen
    const integrationDoc = await db
      .collection('companies')
      .doc(companyId)
      .collection('integrations')
      .doc('woocommerce')
      .get();

    if (!integrationDoc.exists) {
      return NextResponse.json(
        { error: 'WooCommerce-Integration nicht konfiguriert' },
        { status: 404 }
      );
    }

    const integration = integrationDoc.data();
    if (
      !integration?.enabled ||
      !integration?.config?.siteUrl ||
      !integration?.config?.consumerKey ||
      !integration?.config?.consumerSecret
    ) {
      return NextResponse.json(
        { error: 'WooCommerce-Integration nicht vollständig konfiguriert' },
        { status: 400 }
      );
    }

    // WooCommerce REST API aufrufen
    const siteUrl = integration.config.siteUrl;
    const consumerKey = integration.config.consumerKey;
    const consumerSecret = integration.config.consumerSecret;

    let apiUrl = `${siteUrl}/wp-json/wc/v3/orders?page=${page}&per_page=${perPage}&status=${status}`;
    if (after) {
      apiUrl += `&after=${after}`;
    }
    if (before) {
      apiUrl += `&before=${before}`;
    }

    // Basic Auth für WooCommerce API
    const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: `WooCommerce API Fehler: ${response.status} - ${error}` },
        { status: response.status }
      );
    }

    const orders = await response.json();

    // Total count aus Headers
    const totalOrders = response.headers.get('X-WP-Total') || '0';
    const totalPages = response.headers.get('X-WP-TotalPages') || '1';

    return NextResponse.json({
      success: true,
      orders,
      pagination: {
        page: parseInt(page),
        perPage: parseInt(perPage),
        total: parseInt(totalOrders),
        totalPages: parseInt(totalPages),
      },
      count: orders?.length || 0,
    });
  } catch {
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der WooCommerce-Bestellungen' },
      { status: 500 }
    );
  }
}

// POST: Bestellung in Lieferschein konvertieren
export async function POST(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Datenbank nicht verfügbar' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { companyId, orderId, wooOrderData } = body;

    if (!companyId || !orderId) {
      return NextResponse.json(
        { error: 'Company ID und Order ID sind erforderlich' },
        { status: 400 }
      );
    }

    // WooCommerce-Bestellung zu Lieferschein-Format konvertieren
    const order = wooOrderData as WooCommerceOrder;

    const deliveryNoteData = {
      companyId,
      source: 'woocommerce',
      sourceOrderId: order.id.toString(),
      sourceOrderNumber: order.number,
      status: 'draft',
      customer: {
        name: `${order.billing.first_name} ${order.billing.last_name}`,
        company: order.billing.company || '',
        email: order.billing.email,
        phone: order.billing.phone || '',
        address: {
          street: order.shipping.address_1 || order.billing.address_1,
          street2: order.shipping.address_2 || order.billing.address_2,
          city: order.shipping.city || order.billing.city,
          postalCode: order.shipping.postcode || order.billing.postcode,
          state: order.shipping.state || order.billing.state,
          country: order.shipping.country || order.billing.country,
        },
      },
      billingAddress: {
        street: order.billing.address_1,
        street2: order.billing.address_2,
        city: order.billing.city,
        postalCode: order.billing.postcode,
        state: order.billing.state,
        country: order.billing.country,
      },
      items: order.line_items.map(item => ({
        id: item.id.toString(),
        productId: item.product_id.toString(),
        variantId: item.variation_id > 0 ? item.variation_id.toString() : null,
        name: item.name,
        sku: item.sku || '',
        quantity: item.quantity,
        price: item.price,
        subtotal: parseFloat(item.subtotal),
        tax: parseFloat(item.total_tax),
        total: parseFloat(item.total),
      })),
      shipping: order.shipping_lines.map(shipping => ({
        id: shipping.id.toString(),
        method: shipping.method_title,
        methodId: shipping.method_id,
        cost: parseFloat(shipping.total),
        tax: parseFloat(shipping.total_tax),
      })),
      totals: {
        subtotal: parseFloat(order.total) - parseFloat(order.total_tax),
        tax: parseFloat(order.total_tax),
        shipping: parseFloat(order.shipping_total),
        shippingTax: parseFloat(order.shipping_tax),
        discount: parseFloat(order.discount_total),
        total: parseFloat(order.total),
        currency: order.currency,
      },
      payment: {
        method: order.payment_method,
        methodTitle: order.payment_method_title,
      },
      dates: {
        created: new Date(order.date_created),
        modified: new Date(order.date_modified),
        orderDate: new Date(order.date_created),
      },
      metadata: {
        wooOrderId: order.id,
        wooOrderNumber: order.number,
        wooOrderStatus: order.status,
        wooCustomerId: order.customer_id,
        importedAt: new Date(),
      },
    };

    // Lieferschein in Firestore speichern
    const deliveryNoteRef = await db
      .collection('companies')
      .doc(companyId)
      .collection('deliveryNotes')
      .add(deliveryNoteData);

    // WooCommerce-Bestellung als "imported" markieren (optional)
    await db
      .collection('companies')
      .doc(companyId)
      .collection('woocommerceOrders')
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
      message: 'WooCommerce-Bestellung erfolgreich in Lieferschein konvertiert',
    });
  } catch {
    return NextResponse.json(
      { error: 'Fehler beim Importieren der WooCommerce-Bestellung' },
      { status: 500 }
    );
  }
}
