import { NextRequest, NextResponse } from 'next/server';

// Runtime Firebase initialization to prevent build-time issues
async function getFirebaseDb(): Promise<any> {
  try {
    // Dynamically import Firebase services
    const firebaseModule = await import('@/firebase/server');

    // Check if we have valid db service
    if (!firebaseModule.db) {
      // Try to get from admin if needed
      const { admin } = firebaseModule;
      if (admin && admin.apps.length > 0) {
        const { getFirestore } = await import('firebase-admin/firestore');
        return getFirestore();
      }
      throw new Error('Firebase database unavailable');
    }

    return firebaseModule.db;
  } catch (error) {
    throw new Error('Firebase database unavailable');
  }
}

/**
 * API Route für Company-Daten
 * GET /api/companies/[uid]
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  try {
    const { uid } = await params;

    if (!uid) {
      return NextResponse.json({ error: 'UID ist erforderlich' }, { status: 400 });
    }

    // Get Firebase DB dynamically
    const db = await getFirebaseDb();

    // Lade Company-Daten aus Firestore
    const companyDoc = await db!.collection('companies').doc(uid).get();

    if (!companyDoc.exists) {
      return NextResponse.json({ error: 'Company nicht gefunden' }, { status: 404 });
    }

    const companyData = companyDoc.data();

    // Helper function to decode URLs properly
    const decodeUrl = (url: string | null | undefined): string | null => {
      if (!url) return null;
      try {
        // Full URL decode for Firebase Storage URLs
        let decoded = url;
        while (decoded !== decodeURIComponent(decoded)) {
          decoded = decodeURIComponent(decoded);
        }
        return decoded;
      } catch (error) {
        return url;
      }
    };

    // Return company data with safe structure
    return NextResponse.json({
      success: true,
      company: {
        id: uid,
        companyName: companyData.companyName || '',
        companyLogo: decodeUrl(companyData.companyLogo),
        profilePictureURL: decodeUrl(companyData.profilePictureURL),
        step3: companyData.step3
          ? {
              ...companyData.step3,
              profilePictureURL: decodeUrl(companyData.step3.profilePictureURL),
            }
          : null,
        preferredInvoiceTemplate: companyData.preferredInvoiceTemplate || 'german-standard',
        // Address Daten für Templates
        companyStreet: companyData.companyStreet || '',
        companyHouseNumber: companyData.companyHouseNumber || '',
        companyPostalCode: companyData.companyPostalCode || '',
        companyCity: companyData.companyCity || '',
        companyCountry: companyData.companyCountry || '',
        // Firmendetails für Rechnungen
        companyPhone: companyData.companyPhone || '',
        companyEmail: companyData.companyEmail || '',
        companyWebsite: companyData.companyWebsite || '',
        taxNumber: companyData.taxNumber || '',
        vatId: companyData.vatId || '',
        companyRegister: companyData.companyRegister || '',
        // Weitere relevante Daten
        ...companyData,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Interner Serverfehler beim Laden der Company-Daten' },
      { status: 500 }
    );
  }
}

/**
 * API Route für Company Template Update
 * PUT /api/companies/[uid] - Update preferredInvoiceTemplate
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  try {
    const { uid } = await params;
    const body = await request.json();

    if (!uid) {
      return NextResponse.json({ error: 'UID ist erforderlich' }, { status: 400 });
    }

    // Get Firebase DB dynamically
    const db = await getFirebaseDb();

    // Update Template Preference
    if (body.preferredInvoiceTemplate) {
      await db!.collection('companies').doc(uid).update({
        preferredInvoiceTemplate: body.preferredInvoiceTemplate,
        updatedAt: new Date(),
      });

      return NextResponse.json({
        success: true,
        message: 'Template erfolgreich aktualisiert',
      });
    }

    return NextResponse.json({ error: 'Keine gültigen Update-Daten' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Interner Serverfehler beim Update der Company-Daten' },
      { status: 500 }
    );
  }
}

/**
 * API Route für Company-Daten Update (E-Rechnung Daten)
 * PATCH /api/companies/[uid] - Update company information for E-Invoice
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await params;
    const body = await request.json();

    if (!uid) {
      return NextResponse.json({ error: 'UID ist erforderlich' }, { status: 400 });
    }

    // Get Firebase DB dynamically
    const db = await getFirebaseDb();

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date(),
    };

    // Company basic info
    if (body.companyName) updateData.companyName = body.companyName;
    if (body.companyStreet) updateData.companyStreet = body.companyStreet;
    if (body.companyCity) updateData.companyCity = body.companyCity;
    if (body.companyPostalCode) updateData.companyPostalCode = body.companyPostalCode;
    if (body.companyCountry) updateData.companyCountry = body.companyCountry;
    if (body.contactEmail) updateData.contactEmail = body.contactEmail;

    // Tax information
    if (body.taxNumber) updateData.taxNumber = body.taxNumber;
    if (body.vatId) updateData.vatId = body.vatId;
    if (body.registrationNumber) updateData.registrationNumber = body.registrationNumber;

    // Bank details - merge with existing data
    if (body.bankDetails) {
      updateData.bankDetails = body.bankDetails;
    }

    // Update the company document
    await db!.collection('companies').doc(uid).update(updateData);

    return NextResponse.json({
      success: true,
      message: 'Firmendaten erfolgreich aktualisiert',
      data: updateData,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Interner Serverfehler beim Update der Company-Daten' },
      { status: 500 }
    );
  }
}
