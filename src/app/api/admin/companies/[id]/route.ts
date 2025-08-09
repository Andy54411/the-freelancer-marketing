import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';
import { verifyAdminAuth } from '@/lib/admin-auth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    console.log('[API] Starting company details fetch...');

    // Verify admin authentication
    const adminVerification = await verifyAdminAuth(request);
    if (!adminVerification.success) {
      console.error('[API] Admin verification failed:', adminVerification.error);
      return NextResponse.json(
        { success: false, error: 'Admin authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;
    console.log(`[API] Fetching details for company ID: ${id}`);

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Company ID is required' },
        { status: 400 }
      );
    }

    // Get company data from both collections
    const userDocRef = db.collection('users').doc(id);
    const companyDocRef = db.collection('companies').doc(id);

    console.log('[API] Querying Firestore...');
    const [userDoc, companyDoc] = await Promise.all([userDocRef.get(), companyDocRef.get()]);

    console.log(
      `[API] User doc exists: ${userDoc.exists}, Company doc exists: ${companyDoc.exists}`
    );

    // If neither document exists, return error
    if (!userDoc.exists && !companyDoc.exists) {
      console.warn(`[API] No documents found for company ID: ${id}`);
      return NextResponse.json({ success: false, error: 'Company not found' }, { status: 404 });
    }

    // Combine data from both collections
    const userData = userDoc.exists ? userDoc.data() : {};
    const companyData = companyDoc.exists ? companyDoc.data() : {};

    const combinedData = {
      ...userData,
      ...companyData,
      id,
    };

    // Convert Firebase timestamps to ISO strings
    const serializableData: { [key: string]: any } = {};
    for (const key in combinedData) {
      const value = combinedData[key];
      if (value && typeof value.toDate === 'function') {
        serializableData[key] = value.toDate().toISOString();
      } else {
        serializableData[key] = value;
      }
    }

    console.log('[API] Successfully fetched and serialized company data');
    return NextResponse.json({
      success: true,
      data: serializableData,
    });
  } catch (error: any) {
    console.error('[API] Error in company details fetch:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
