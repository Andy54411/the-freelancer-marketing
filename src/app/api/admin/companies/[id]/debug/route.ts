import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';
import { verifyAdminAuth } from '@/lib/admin-auth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    console.log('[DEBUG] Starting company debug analysis...');

    // Verify admin authentication
    const adminVerification = await verifyAdminAuth(request);
    if (!adminVerification.success) {
      return NextResponse.json(
        { success: false, error: 'Admin authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;
    console.log(`[DEBUG] Analyzing company ID: ${id}`);

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Company ID is required' },
        { status: 400 }
      );
    }

    // Get ALL data for debug analysis
    const userDocRef = db.collection('users').doc(id);
    const companyDocRef = db.collection('companies').doc(id);

    // Also check orders related to this company
    const ordersQuery = db.collection('orders').where('companyId', '==', id).limit(5);
    const invoicesQuery = db.collection('invoices').where('companyId', '==', id).limit(5);

    console.log('[DEBUG] Executing parallel queries...');
    const [userDoc, companyDoc, ordersSnapshot, invoicesSnapshot] = await Promise.all([
      userDocRef.get(),
      companyDocRef.get(),
      ordersQuery.get(),
      invoicesQuery.get(),
    ]);

    console.log(
      `[DEBUG] Results: user=${userDoc.exists}, company=${companyDoc.exists}, orders=${ordersSnapshot.size}, invoices=${invoicesSnapshot.size}`
    );

    // Analyze the data structure
    const debugInfo: any = {
      id,
      userExists: userDoc.exists,
      companyExists: companyDoc.exists,
      userData: userDoc.exists ? Object.keys(userDoc.data()!) : [],
      companyData: companyDoc.exists ? Object.keys(companyDoc.data()!) : [],
      ordersCount: ordersSnapshot.size,
      invoicesCount: invoicesSnapshot.size,
      timestamp: new Date().toISOString(),
    };

    // Check for problematic fields
    if (userDoc.exists) {
      const userData = userDoc.data()!;
      debugInfo.userDataTypes = {};
      debugInfo.userProblematicFields = [];

      for (const [key, value] of Object.entries(userData)) {
        debugInfo.userDataTypes[key] = typeof value;

        // Check for problematic values
        if (value === null) {
          debugInfo.userProblematicFields.push(`${key}: null`);
        } else if (value === undefined) {
          debugInfo.userProblematicFields.push(`${key}: undefined`);
        } else if (
          typeof value === 'object' &&
          value.constructor &&
          value.constructor.name === 'Timestamp'
        ) {
          debugInfo.userProblematicFields.push(`${key}: Firebase Timestamp`);
        } else if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
          debugInfo.userProblematicFields.push(`${key}: Complex Object`);
        }
      }
    }

    if (companyDoc.exists) {
      const companyData = companyDoc.data()!;
      debugInfo.companyDataTypes = {};
      debugInfo.companyProblematicFields = [];

      for (const [key, value] of Object.entries(companyData)) {
        debugInfo.companyDataTypes[key] = typeof value;

        // Check for problematic values
        if (value === null) {
          debugInfo.companyProblematicFields.push(`${key}: null`);
        } else if (value === undefined) {
          debugInfo.companyProblematicFields.push(`${key}: undefined`);
        } else if (
          typeof value === 'object' &&
          value.constructor &&
          value.constructor.name === 'Timestamp'
        ) {
          debugInfo.companyProblematicFields.push(`${key}: Firebase Timestamp`);
        } else if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
          debugInfo.companyProblematicFields.push(`${key}: Complex Object`);
        }
      }
    }

    console.log('[DEBUG] Analysis completed successfully');
    return NextResponse.json({
      success: true,
      debug: debugInfo,
    });
  } catch (error: any) {
    console.error('[DEBUG] Error in company debug analysis:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
