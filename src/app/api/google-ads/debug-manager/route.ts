// Google Ads Customer Manager Debug
import { NextRequest, NextResponse } from 'next/server';
import { googleAdsClientService } from '@/services/googleAdsClientService';
import { db } from '@/firebase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId') || '0Rj5vGkBjeXrzZKBr4cFfV0jRuw1';
    const customerId = searchParams.get('customerId') || '5788229684';

    console.log('🔍 Debug Customer Manager Check:', { companyId, customerId });

    // Get Google Ads config from Firestore
    const googleAdsDocRef = db
      .collection('companies')
      .doc(companyId)
      .collection('integrations')
      .doc('googleAds');

    const googleAdsSnap = await googleAdsDocRef.get();

    if (!googleAdsSnap.exists) {
      return NextResponse.json({ error: 'Google Ads configuration not found' }, { status: 404 });
    }

    const googleAdsData = googleAdsSnap.data();
    const refreshToken = googleAdsData?.refreshToken;

    if (!refreshToken) {
      return NextResponse.json({ error: 'No refresh token found' }, { status: 400 });
    }

    // Test 1: Customer Info direkt abrufen
    console.log('🔍 Testing Customer Info for:', customerId);
    const customerResult = await googleAdsClientService.getCustomerInfo(refreshToken, customerId);

    // Test 2: Accessible Customers (um Manager-Status zu prüfen)
    console.log('🔍 Testing Accessible Customers...');
    const accessibleResult = await googleAdsClientService.getAccessibleCustomers(refreshToken);

    // Test 3: Alle Customer Details abrufen
    const allCustomerDetails = [];
    if (accessibleResult.success && accessibleResult.data) {
      for (const customer of accessibleResult.data) {
        const details = await googleAdsClientService.getCustomerInfo(refreshToken, customer.id);
        allCustomerDetails.push({
          id: customer.id,
          name: customer.name,
          status: customer.status,
          manager: customer.manager,
          detailsManager: details.data?.customer?.manager,
        });
      }
    }

    return NextResponse.json({
      success: true,
      customerId,
      debug: {
        customerInfo: customerResult,
        accessibleCustomers: accessibleResult,
        allCustomerDetails: allCustomerDetails,
      },
      analysis: {
        isManagerFromCustomerInfo: customerResult.data?.customer?.manager,
        targetCustomerDetails: allCustomerDetails.find(c => c.id === customerId),
        conclusion: allCustomerDetails.find(c => c.id === customerId)?.manager
          ? 'MCC (Manager Account)'
          : 'Regular Account',
      },
    });
  } catch (error: any) {
    console.error('❌ Debug Customer Manager Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
