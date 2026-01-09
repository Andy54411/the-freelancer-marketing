import { NextRequest, NextResponse } from 'next/server';
import { db, auth } from '@/firebase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  const { uid } = await params;

  try {
    if (!db || !auth) {
      return NextResponse.json(
        { success: false, error: 'Datenbank nicht verfügbar' },
        { status: 500 }
      );
    }

    // Get the auth token from the request headers
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken;

    try {
      decodedToken = await auth.verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if the user is authorized to access this company's data
    // Inhaber ODER Mitarbeiter dieser Company dürfen zugreifen
    const isOwner = decodedToken.uid === uid;
    const isEmployee = decodedToken.role === 'mitarbeiter' && decodedToken.companyId === uid;
    
    if (!isOwner && !isEmployee) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get company data to verify it exists
    let companyDoc = await db.collection('companies').doc(uid).get();
    if (!companyDoc.exists) {
      companyDoc = await db.collection('users').doc(uid).get();
      if (!companyDoc.exists) {
        return NextResponse.json({ error: 'Company not found' }, { status: 404 });
      }
    }

    const quotes: Record<string, unknown>[] = [];

    // UNIFIED: Lade Direkt-Anfragen aus project_requests (targetProviderId === uid)
    try {
      const directRequestsSnapshot = await db
        .collection('project_requests')
        .where('targetProviderId', '==', uid)
        .where('isActive', '==', true)
        .get();

      for (const docSnap of directRequestsSnapshot.docs) {
        const data = docSnap.data();

        // Lade Customer-Info
        let customerInfo: Record<string, unknown> = {
          name: data.customerName || 'Unbekannter Kunde',
          type: data.customerType || 'user',
          email: data.customerEmail || '',
          phone: data.customerPhone || '',
          avatar: null,
          uid: data.customerUid || null,
        };

        if (data.customerUid) {
          try {
            const userDoc = await db.collection('users').doc(data.customerUid).get();
            if (userDoc.exists) {
              const userData = userDoc.data();
              if (userData) {
                customerInfo = {
                  name: userData.companyName || `${userData.firstname || ''} ${userData.lastname || ''}`.trim() || data.customerName || 'Kunde',
                  type: data.customerType || 'user',
                  email: userData.email || data.customerEmail,
                  phone: userData.phone || data.customerPhone,
                  avatar: userData.step3?.profilePictureURL || userData.profilePictureURL || null,
                  uid: userDoc.id,
                };
              }
            }
          } catch { /* ignore */ }
        }

        // Prüfe ob Company bereits geantwortet hat
        let hasResponse = false;
        let responseData: Record<string, unknown> | null = null;
        let proposalStatus: string | null = null;

        try {
          const proposalsSnapshot = await db
            .collection('project_requests')
            .doc(docSnap.id)
            .collection('proposals')
            .where('providerId', '==', uid)
            .get();

          if (!proposalsSnapshot.empty) {
            hasResponse = true;
            responseData = proposalsSnapshot.docs[0].data();
            proposalStatus = (responseData as { status?: string })?.status || null;
          }
        } catch { /* ignore */ }

        // Status bestimmen
        let actualStatus = data.status || 'open';
        if (proposalStatus === 'accepted') {
          actualStatus = data.escrowPaid ? 'accepted' : 'accepted';
        } else if (proposalStatus === 'declined' || proposalStatus === 'rejected') {
          actualStatus = 'declined';
        } else if (hasResponse && actualStatus === 'open') {
          actualStatus = 'responded';
        }

        quotes.push({
          id: docSnap.id,
          title: data.title || 'Kein Titel',
          description: data.description || '',
          serviceCategory: data.category || data.serviceCategory || '',
          serviceSubcategory: data.subcategory || data.serviceSubcategory || '',
          projectType: 'fixed_price',
          status: actualStatus,
          budgetRange: data.budgetRange || { min: data.budgetAmount, max: data.maxBudget },
          deadline: data.preferredDate || data.timeline,
          location: data.location || '',
          urgency: data.urgency || 'medium',
          estimatedDuration: data.timeline || '',
          hasResponse,
          response: responseData,
          proposalStatus,
          customer: customerInfo,
          customerType: customerInfo.type,
          customerUid: customerInfo.uid,
          // UNIFIED Felder
          requestType: data.requestType || 'direct',
          isPublic: data.isPublic || false,
          escrowRequired: data.escrowRequired !== false, // Default true
          createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt || Date.now()),
        });
      }
    } catch { 
      // Direkt-Anfragen Fehler ignorieren
    }

    // AUCH: Lade öffentliche Marktplatz-Projekte die zur Subkategorie der Company passen
    try {
      const companyUserData = companyDoc.data();
      const selectedSubcategory = companyUserData?.onboarding?.selectedSubcategory || companyUserData?.selectedSubcategory;

      if (selectedSubcategory) {
        const marketplaceSnapshot = await db
          .collection('project_requests')
          .where('isPublic', '==', true)
          .where('isActive', '==', true)
          .where('subcategory', '==', selectedSubcategory)
          .get();

        for (const docSnap of marketplaceSnapshot.docs) {
          // Skip wenn bereits in quotes (von Direkt-Anfrage)
          if (quotes.some(q => q.id === docSnap.id)) continue;

          const data = docSnap.data();

          // Lade Customer-Info
          const customerInfo: Record<string, unknown> = {
            name: data.customerName || 'Unbekannter Kunde',
            type: data.customerType || 'user',
            email: '', // Email erst nach Escrow sichtbar
            phone: '',
            avatar: null,
            uid: data.customerUid || null,
          };

          // Prüfe ob Company bereits geantwortet hat
          let hasResponse = false;
          let responseData: Record<string, unknown> | null = null;
          let proposalStatus: string | null = null;

          try {
            const proposalsSnapshot = await db
              .collection('project_requests')
              .doc(docSnap.id)
              .collection('proposals')
              .where('providerId', '==', uid)
              .get();

            if (!proposalsSnapshot.empty) {
              hasResponse = true;
              responseData = proposalsSnapshot.docs[0].data();
              proposalStatus = (responseData as { status?: string })?.status || null;
            }
          } catch { /* ignore */ }

          let actualStatus = data.status || 'open';
          if (proposalStatus === 'accepted') {
            actualStatus = 'accepted';
          } else if (proposalStatus === 'declined') {
            actualStatus = 'declined';
          } else if (hasResponse) {
            actualStatus = 'responded';
          }

          quotes.push({
            id: docSnap.id,
            title: data.title || 'Kein Titel',
            description: data.description || '',
            serviceCategory: data.category || data.serviceCategory || '',
            serviceSubcategory: data.subcategory || data.serviceSubcategory || '',
            projectType: 'fixed_price',
            status: actualStatus,
            budgetRange: data.budgetRange || { min: data.budgetAmount, max: data.maxBudget },
            deadline: data.preferredDate || data.timeline,
            location: data.location || '',
            urgency: data.urgency || 'medium',
            estimatedDuration: data.timeline || '',
            hasResponse,
            response: responseData,
            proposalStatus,
            customer: customerInfo,
            customerType: customerInfo.type,
            customerUid: customerInfo.uid,
            requestType: 'marketplace',
            isPublic: true,
            escrowRequired: true,
            createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt || Date.now()),
          });
        }
      }
    } catch {
      // Marktplatz-Fehler ignorieren
    }

    // Sortiere nach Datum (neueste zuerst)
    quotes.sort((a, b) => {
      const aTime = (a.createdAt as Date)?.getTime?.() || 0;
      const bTime = (b.createdAt as Date)?.getTime?.() || 0;
      return bTime - aTime;
    });

    return NextResponse.json({
      success: true,
      quotes,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
