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

// POST: UPS-Versandlabel erstellen
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, deliveryNoteId, shipmentData } = body;

    if (!companyId || !deliveryNoteId || !shipmentData) {
      return NextResponse.json({ error: 'Alle Parameter sind erforderlich' }, { status: 400 });
    }

    // UPS-Integration aus Firestore abrufen
    const integrationDoc = await db
      .collection('companies')
      .doc(companyId)
      .collection('integrations')
      .doc('ups')
      .get();

    if (!integrationDoc.exists) {
      return NextResponse.json({ error: 'UPS-Integration nicht konfiguriert' }, { status: 404 });
    }

    const integration = integrationDoc.data();
    if (
      !integration?.enabled ||
      !integration?.config?.accessToken ||
      !integration?.config?.accountNumber
    ) {
      return NextResponse.json(
        { error: 'UPS-Integration nicht vollständig konfiguriert' },
        { status: 400 }
      );
    }

    // UPS API-Anfrage vorbereiten
    const upsApiUrl =
      integration.config.environment === 'production'
        ? 'https://onlinetools.ups.com/api/shipments/v1/ship'
        : 'https://wwwcie.ups.com/api/shipments/v1/ship';

    const upsRequest = {
      ShipmentRequest: {
        Request: {
          SubVersion: '1801',
          RequestOption: 'nonvalidate',
          TransactionReference: {
            CustomerContext: deliveryNoteId,
          },
        },
        Shipment: {
          Description: shipmentData.description || 'Package',
          Shipper: {
            Name: shipmentData.shipper.name,
            AttentionName: shipmentData.shipper.attentionName || shipmentData.shipper.name,
            TaxIdentificationNumber: shipmentData.shipper.taxId || '',
            Phone: {
              Number: shipmentData.shipper.phone || '',
            },
            ShipperNumber: integration.config.accountNumber,
            Address: {
              AddressLine: [
                shipmentData.shipper.addressLine1,
                shipmentData.shipper.addressLine2,
              ].filter(Boolean),
              City: shipmentData.shipper.city,
              StateProvinceCode: shipmentData.shipper.stateCode || '',
              PostalCode: shipmentData.shipper.postalCode,
              CountryCode: shipmentData.shipper.countryCode || 'DE',
            },
          },
          ShipTo: {
            Name: shipmentData.receiver.name,
            AttentionName: shipmentData.receiver.attentionName || shipmentData.receiver.name,
            Phone: {
              Number: shipmentData.receiver.phone || '',
            },
            Address: {
              AddressLine: [
                shipmentData.receiver.addressLine1,
                shipmentData.receiver.addressLine2,
              ].filter(Boolean),
              City: shipmentData.receiver.city,
              StateProvinceCode: shipmentData.receiver.stateCode || '',
              PostalCode: shipmentData.receiver.postalCode,
              CountryCode: shipmentData.receiver.countryCode || 'DE',
            },
          },
          Service: {
            Code: shipmentData.serviceCode || '11', // UPS Standard
            Description: shipmentData.serviceDescription || 'UPS Standard',
          },
          Package: {
            Description: shipmentData.packageDescription || 'Package',
            Packaging: {
              Code: shipmentData.packagingCode || '02', // Customer Supplied Package
            },
            Dimensions: {
              UnitOfMeasurement: {
                Code: 'CM',
              },
              Length: shipmentData.dimensions?.length?.toString() || '20',
              Width: shipmentData.dimensions?.width?.toString() || '20',
              Height: shipmentData.dimensions?.height?.toString() || '10',
            },
            PackageWeight: {
              UnitOfMeasurement: {
                Code: 'KGS',
              },
              Weight: shipmentData.weight?.toString() || '1',
            },
          },
          PaymentInformation: {
            ShipmentCharge: {
              Type: '01', // Transportation
              BillShipper: {
                AccountNumber: integration.config.accountNumber,
              },
            },
          },
        },
        LabelSpecification: {
          LabelImageFormat: {
            Code: 'PDF',
          },
          HTTPUserAgent: 'Mozilla/4.5',
        },
      },
    };

    // UPS API aufrufen
    const response = await fetch(upsApiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${integration.config.accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(upsRequest),
    });

    const responseData = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: `UPS API Fehler: ${response.status}`, details: responseData },
        { status: response.status }
      );
    }

    // Versandlabel-Daten in Firestore speichern
    const labelData = {
      deliveryNoteId,
      carrier: 'ups',
      trackingNumber:
        responseData.ShipmentResponse?.ShipmentResults?.PackageResults?.TrackingNumber,
      labelData:
        responseData.ShipmentResponse?.ShipmentResults?.PackageResults?.ShippingLabel?.GraphicImage,
      status: 'created',
      createdAt: new Date(),
      shipmentData: upsRequest,
      apiResponse: responseData,
    };

    await db!.collection('companies').doc(companyId).collection('shippingLabels').add(labelData);

    // Lieferschein mit Tracking-Nummer aktualisieren
    await db
      .collection('companies')
      .doc(companyId)
      .collection('deliveryNotes')
      .doc(deliveryNoteId)
      .update({
        trackingNumber:
          responseData.ShipmentResponse?.ShipmentResults?.PackageResults?.TrackingNumber,
        shippingCarrier: 'ups',
        shippingStatus: 'label_created',
        updatedAt: new Date(),
      });

    return NextResponse.json({
      success: true,
      trackingNumber:
        responseData.ShipmentResponse?.ShipmentResults?.PackageResults?.TrackingNumber,
      labelData:
        responseData.ShipmentResponse?.ShipmentResults?.PackageResults?.ShippingLabel?.GraphicImage,
      message: 'UPS-Versandlabel erfolgreich erstellt',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Fehler beim Erstellen des UPS-Versandlabels' },
      { status: 500 }
    );
  }
}

// GET: Tracking-Informationen abrufen
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const trackingNumber = searchParams.get('trackingNumber');

    if (!companyId || !trackingNumber) {
      return NextResponse.json(
        { error: 'Company ID und Tracking-Nummer sind erforderlich' },
        { status: 400 }
      );
    }

    // UPS-Integration aus Firestore abrufen
    const integrationDoc = await db
      .collection('companies')
      .doc(companyId)
      .collection('integrations')
      .doc('ups')
      .get();

    if (!integrationDoc.exists) {
      return NextResponse.json({ error: 'UPS-Integration nicht konfiguriert' }, { status: 404 });
    }

    const integration = integrationDoc.data();
    if (!integration?.enabled || !integration?.config?.accessToken) {
      return NextResponse.json({ error: 'UPS Tracking API nicht konfiguriert' }, { status: 400 });
    }

    // UPS Tracking API aufrufen
    const trackingApiUrl =
      integration.config.environment === 'production'
        ? `https://onlinetools.ups.com/api/track/v1/details/${trackingNumber}`
        : `https://wwwcie.ups.com/api/track/v1/details/${trackingNumber}`;

    const response = await fetch(trackingApiUrl, {
      headers: {
        Authorization: `Bearer ${integration.config.accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: `UPS Tracking API Fehler: ${response.status} - ${error}` },
        { status: response.status }
      );
    }

    const trackingData = await response.json();

    return NextResponse.json({
      success: true,
      trackingNumber,
      trackingData,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Tracking-Informationen' },
      { status: 500 }
    );
  }
}
