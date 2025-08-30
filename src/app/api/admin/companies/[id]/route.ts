// Admin Company Details API
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    console.log(`Fetching company details for ID: ${id}`);

    // Hole das spezifische Unternehmen aus der Firebase companies Collection
    const companyDoc = await db.collection('companies').doc(id).get();

    if (!companyDoc.exists) {
      return NextResponse.json({ error: 'Company not found', company: null }, { status: 404 });
    }

    const data = companyDoc.data();
    const company = {
      id: companyDoc.id,
      email: data?.email,
      name: data?.companyName || data?.email,
      type: 'company',
      companyName: data?.companyName,
      industry: data?.industry,
      website: data?.website,
      phone: data?.phone,
      status: data?.isActive ? 'active' : 'inactive',
      createdAt: data?.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      lastLogin: data?.lastLogin?.toDate?.()?.toISOString(),

      // Detaillierte Felder für Admin-Dashboard
      address: data?.address,
      city: data?.city,
      postalCode: data?.postalCode,
      country: data?.country,
      description: data?.description,
      services: data?.services || [],
      stripeAccountId: data?.stripeAccountId,
      verified: data?.verified || false,

      // Zusätzliche Admin-Informationen
      businessType: data?.businessType,
      vatNumber: data?.vatNumber,
      registrationNumber: data?.registrationNumber,
      bankDetails: data?.bankDetails,
      contactPerson: data?.contactPerson,

      // Platform-spezifische Daten
      totalOrders: data?.totalOrders || 0,
      totalRevenue: data?.totalRevenue || 0,
      avgRating: data?.avgRating || 0,
      reviewCount: data?.reviewCount || 0,

      // Compliance & Verifizierung
      documentsUploaded: data?.documentsUploaded || [],
      verificationStatus: data?.verificationStatus || 'pending',
      lastVerificationUpdate: data?.lastVerificationUpdate?.toDate?.()?.toISOString(),

      // Einstellungen
      notificationSettings: data?.notificationSettings,
      privacySettings: data?.privacySettings,
      paymentSettings: data?.paymentSettings,
    };

    console.log(`Successfully fetched company details for ${id}`);

    return NextResponse.json({
      company,
      source: 'firebase_direct',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`Error fetching company details for ${params}:`, error);
    return NextResponse.json(
      {
        error: 'Failed to fetch company details',
        details: error instanceof Error ? error.message : 'Unknown error',
        company: null,
      },
      { status: 500 }
    );
  }
}
