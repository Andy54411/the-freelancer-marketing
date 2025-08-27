import { NextRequest, NextResponse } from 'next/server';
import { db, admin } from '@/firebase/server';

/**
 * API Route für Company Received Quote Details
 * GET /api/company/[uid]/quotes/received/[quoteId]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string; quoteId: string }> }
) {
  const { uid, quoteId } = await params;

  try {
    // Auth-Check
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentifizierung erforderlich' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
    } catch (authError) {
      return NextResponse.json({ error: 'Ungültiger Token' }, { status: 401 });
    }

    // Check if user is authorized to access this company's data
    if (decodedToken.uid !== uid) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    // Get company data
    const companyDoc = await db.collection('users').doc(uid).get();
    if (!companyDoc.exists) {
      return NextResponse.json({ error: 'Unternehmen nicht gefunden' }, { status: 404 });
    }

    const companyData = companyDoc.data();
    const customerEmail = companyData?.email;

    if (!customerEmail) {
      return NextResponse.json({ error: 'Keine E-Mail für Unternehmen gefunden' }, { status: 400 });
    }

    // Get the specific quote where this company is the customer
    const quoteRef = db.collection('quotes').doc(quoteId);
    const quoteDoc = await quoteRef.get();

    if (!quoteDoc.exists) {
      return NextResponse.json({ error: 'Angebot nicht gefunden' }, { status: 404 });
    }

    const quoteData = quoteDoc.data();

    // Verify this company is the customer for this quote
    if (quoteData?.customerEmail !== customerEmail && quoteData?.customerUid !== uid) {
      return NextResponse.json({ error: 'Keine Berechtigung für dieses Angebot' }, { status: 403 });
    }

    // Get provider information (who sent the quote)
    let providerInfo: {
      name: string;
      type: 'company' | 'user';
      email: string;
      avatar: string | null;
      uid: string;
    } | null = null;

    if (quoteData?.providerId) {
      // Try companies collection first, then users as fallback
      const companyDoc = await db.collection('companies').doc(quoteData.providerId).get();
      if (companyDoc.exists) {
        const providerCompanyData = companyDoc.data();
        providerInfo = {
          name: providerCompanyData?.companyName || 'Unbekanntes Unternehmen',
          type: 'company',
          email: providerCompanyData?.ownerEmail || providerCompanyData?.email || '',
          avatar:
            providerCompanyData?.profilePictureURL || providerCompanyData?.companyLogo || null,
          uid: quoteData.providerId,
        };
      } else {
        // Fallback to users collection
        const userDoc = await db.collection('users').doc(quoteData.providerId).get();
        if (userDoc.exists) {
          const providerUserData = userDoc.data();
          providerInfo = {
            name:
              providerUserData?.companyName ||
              (providerUserData?.firstName && providerUserData?.lastName
                ? `${providerUserData.firstName} ${providerUserData.lastName}`
                : 'Unbekannter Anbieter'),
            type: 'user',
            email: providerUserData?.email || '',
            avatar: providerUserData?.profilePictureURL || providerUserData?.avatar || null,
            uid: quoteData.providerId,
          };
        }
      }
    }

    // Build the quote response object
    const quote = {
      id: quoteDoc.id,
      title: quoteData?.projectTitle || quoteData?.title || 'Kein Titel',
      description: quoteData?.projectDescription || quoteData?.description || '',
      category: quoteData?.projectCategory || quoteData?.serviceCategory || '',
      subcategory: quoteData?.projectSubcategory || quoteData?.serviceSubcategory || '',
      status: quoteData?.status || 'pending',
      budget: quoteData?.budgetRange || 'Nicht angegeben',
      budgetRange: quoteData?.budgetRange || 'Nicht angegeben',
      location: quoteData?.location || '',
      postalCode: quoteData?.postalCode || '',
      urgency: quoteData?.urgency || 'normal',
      estimatedDuration: quoteData?.estimatedDuration || '',
      preferredStartDate: quoteData?.preferredStartDate || '',
      additionalNotes: quoteData?.additionalNotes || '',
      provider: providerInfo,
      hasResponse: !!quoteData?.response,
      response: quoteData?.response || null,
      responseDate: quoteData?.response?.respondedAt
        ? new Date(quoteData.response.respondedAt)
        : null,
      createdAt: quoteData?.createdAt?.toDate
        ? quoteData.createdAt.toDate()
        : new Date(quoteData?.createdAt || Date.now()),
    };

    return NextResponse.json({
      success: true,
      quote,
    });
  } catch (error) {
    console.error('Error fetching received quote details:', error);
    return NextResponse.json({ error: 'Fehler beim Laden des Angebots' }, { status: 500 });
  }
}
