import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

// POST: DHL-Versandlabel erstellen
export async function POST(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Datenbank nicht verfügbar' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { companyId, deliveryNoteId, shipmentData } = body;

    if (!companyId || !deliveryNoteId || !shipmentData) {
      return NextResponse.json({ error: 'Alle Parameter sind erforderlich' }, { status: 400 });
    }

    // DHL-Integration aus Firestore abrufen
    const integrationDoc = await db
      .collection('companies')
      .doc(companyId)
      .collection('integrations')
      .doc('dhl')
      .get();

    if (!integrationDoc.exists) {
      return NextResponse.json({ error: 'DHL-Integration nicht konfiguriert' }, { status: 404 });
    }

    const integration = integrationDoc.data();
    if (!integration?.enabled || !integration?.config?.username || !integration?.config?.password) {
      return NextResponse.json(
        { error: 'DHL-Integration nicht vollständig konfiguriert' },
        { status: 400 }
      );
    }

    // DHL API-Anfrage vorbereiten
    const dhlApiUrl =
      integration.config.environment === 'production'
        ? 'https://api-eu.dhl.com/post/de/shipping/v1/orders'
        : 'https://api-sandbox.dhl.com/post/de/shipping/v1/orders';

    const dhlRequest = {
      profile: 'STANDARD_GRUPPENPROFIL',
      shipmentOrder: {
        sequenceNumber: '1',
        shipment: {
          ShipmentDetails: {
            product: shipmentData.product || 'V01PAK', // Standard DHL Paket
            accountNumber: integration.config.accountNumber,
            customerReference: deliveryNoteId,
            shipmentDate: new Date().toISOString().split('T')[0],
            costCentre: shipmentData.costCentre || '',
          },
          Shipper: {
            Name: {
              name1: shipmentData.shipper.name1,
              name2: shipmentData.shipper.name2 || '',
            },
            Address: {
              streetName: shipmentData.shipper.streetName,
              streetNumber: shipmentData.shipper.streetNumber,
              zip: shipmentData.shipper.zip,
              city: shipmentData.shipper.city,
              Origin: {
                country: shipmentData.shipper.country || 'DE',
              },
            },
            Communication: {
              phone: shipmentData.shipper.phone || '',
              email: shipmentData.shipper.email || '',
            },
          },
          Receiver: {
            name1: shipmentData.receiver.name1,
            Address: {
              name2: shipmentData.receiver.name2 || '',
              streetName: shipmentData.receiver.streetName,
              streetNumber: shipmentData.receiver.streetNumber,
              zip: shipmentData.receiver.zip,
              city: shipmentData.receiver.city,
              Origin: {
                country: shipmentData.receiver.country || 'DE',
              },
            },
            Communication: {
              phone: shipmentData.receiver.phone || '',
              email: shipmentData.receiver.email || '',
            },
          },
          ShipmentItem: {
            weightInKG: shipmentData.weight || 1,
            lengthInCM: shipmentData.dimensions?.length || 20,
            widthInCM: shipmentData.dimensions?.width || 20,
            heightInCM: shipmentData.dimensions?.height || 10,
          },
        },
        PrintOnlyIfCodeable: {
          active: 1,
        },
      },
    };

    // DHL API aufrufen
    const credentials = Buffer.from(
      `${integration.config.username}:${integration.config.password}`
    ).toString('base64');

    const response = await fetch(dhlApiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(dhlRequest),
    });

    const responseData = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: `DHL API Fehler: ${response.status}`, details: responseData },
        { status: response.status }
      );
    }

    // Versandlabel-Daten in Firestore speichern
    const labelData = {
      deliveryNoteId,
      carrier: 'dhl',
      trackingNumber: responseData.CreationState?.shipmentNumber,
      labelUrl: responseData.CreationState?.labelUrl,
      status: 'created',
      createdAt: new Date(),
      shipmentData: dhlRequest,
      apiResponse: responseData,
    };

    await db.collection('companies').doc(companyId).collection('shippingLabels').add(labelData);

    // Lieferschein mit Tracking-Nummer aktualisieren
    await db
      .collection('companies')
      .doc(companyId)
      .collection('deliveryNotes')
      .doc(deliveryNoteId)
      .update({
        trackingNumber: responseData.CreationState?.shipmentNumber,
        shippingCarrier: 'dhl',
        shippingStatus: 'label_created',
        updatedAt: new Date(),
      });

    return NextResponse.json({
      success: true,
      trackingNumber: responseData.CreationState?.shipmentNumber,
      labelUrl: responseData.CreationState?.labelUrl,
      message: 'DHL-Versandlabel erfolgreich erstellt',
    });
  } catch {
    return NextResponse.json(
      { error: 'Fehler beim Erstellen des DHL-Versandlabels' },
      { status: 500 }
    );
  }
}

// GET: Tracking-Informationen abrufen
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
    const trackingNumber = searchParams.get('trackingNumber');

    if (!companyId || !trackingNumber) {
      return NextResponse.json(
        { error: 'Company ID und Tracking-Nummer sind erforderlich' },
        { status: 400 }
      );
    }

    // DHL-Integration aus Firestore abrufen
    const integrationDoc = await db
      .collection('companies')
      .doc(companyId)
      .collection('integrations')
      .doc('dhl')
      .get();

    if (!integrationDoc.exists) {
      return NextResponse.json({ error: 'DHL-Integration nicht konfiguriert' }, { status: 404 });
    }

    const integration = integrationDoc.data();
    if (!integration?.enabled || !integration?.config?.trackingApiKey) {
      return NextResponse.json({ error: 'DHL Tracking API nicht konfiguriert' }, { status: 400 });
    }

    // DHL Tracking API aufrufen
    const trackingApiUrl = `https://api-eu.dhl.com/track/shipments?trackingNumber=${trackingNumber}`;

    const response = await fetch(trackingApiUrl, {
      headers: {
        'DHL-API-Key': integration.config.trackingApiKey,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: `DHL Tracking API Fehler: ${response.status} - ${error}` },
        { status: response.status }
      );
    }

    const trackingData = await response.json();

    return NextResponse.json({
      success: true,
      trackingNumber,
      trackingData,
    });
  } catch {
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Tracking-Informationen' },
      { status: 500 }
    );
  }
}
