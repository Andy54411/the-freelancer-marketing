// Admin Companies API
import { NextRequest, NextResponse } from 'next/server';
import { db, isFirebaseAvailable } from '@/firebase/server';

export async function GET(_request: NextRequest) {
  try {
    // Check if Firebase is properly initialized
    if (!isFirebaseAvailable() || !db) {
      console.error('Firebase not initialized');
      return NextResponse.json(
        { success: false, error: 'Service temporarily unavailable' },
        { status: 503 }
      );
    }

    // Hole alle Unternehmen aus der Firebase companies Collection
    const companiesSnapshot = await db!.collection('companies').get();
    const companies: any[] = [];

    companiesSnapshot.forEach(doc => {
      const data = doc.data();

      // Status-Logik: NUR Admin-Freigabe zählt (Onboarding-System hat Fehler)
      let status = 'inactive';

      const isAdminApproved = data?.adminApproved === true;

      // Status basierend auf Admin-Freigabe
      if (data?.accountSuspended === true || data?.status === 'suspended') {
        status = 'suspended';
      } else if (isAdminApproved) {
        status = 'active';
      } else {
        status = 'inactive';
      }

      companies.push({
        id: doc.id,
        email: data.email,
        name: data.companyName || data.email,
        type: 'company',
        companyName: data.companyName,
        industry: data.selectedCategory || data.industry,
        website: data.website || data.step1?.website,
        phone: data.step1?.phoneNumber || data.companyPhoneNumber,
        status: status,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        lastLogin: data.lastLogin?.toDate?.()?.toISOString(),
        // Zusätzliche Felder für Admin-Dashboard
        address: `${data?.companyStreet || ''} ${data?.companyHouseNumber || ''}`.trim(),
        city: data.companyCity,
        postalCode: data.companyPostalCode,
        country: data.companyCountry,
        description: data.description || data.step1?.description,
        services: data.services,
        stripeAccountId: data.step5?.stripeAccountId || data.stripeAccountId,
        verified: isAdminApproved,
        // Debug-Informationen
        adminApproved: isAdminApproved,
        onboardingCompleted: data.onboardingCompleted,
        profileComplete: data.profileComplete,
      });
    });

    return NextResponse.json({
      companies: companies.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    });
  } catch (error) {
    return NextResponse.json({ error: 'Fehler beim Laden der Unternehmen' }, { status: 500 });
  }
}
