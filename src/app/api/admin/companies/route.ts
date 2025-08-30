// Admin Companies API
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

export async function GET(_request: NextRequest) {
  try {
    // Hole alle Unternehmen aus der Firebase companies Collection
    const companiesSnapshot = await db.collection('companies').get();
    const companies: any[] = [];

    companiesSnapshot.forEach(doc => {
      const data = doc.data();
      companies.push({
        id: doc.id,
        email: data.email,
        name: data.companyName || data.email,
        type: 'company',
        companyName: data.companyName,
        industry: data.industry,
        website: data.website,
        phone: data.phone,
        status: data.isActive ? 'active' : 'inactive',
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        lastLogin: data.lastLogin?.toDate?.()?.toISOString(),
        // Zusätzliche Felder für Admin-Dashboard
        address: data.address,
        city: data.city,
        postalCode: data.postalCode,
        country: data.country,
        description: data.description,
        services: data.services,
        stripeAccountId: data.stripeAccountId,
        verified: data.verified || false,
      });
    });

    return NextResponse.json({
      companies: companies.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    });
  } catch (error) {
    console.error('Error fetching companies from Firebase:', error);
    return NextResponse.json({ error: 'Fehler beim Laden der Unternehmen' }, { status: 500 });
  }
}
