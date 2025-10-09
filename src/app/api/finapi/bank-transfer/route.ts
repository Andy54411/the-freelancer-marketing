import { NextRequest, NextResponse } from 'next/server';
import { createFinAPIService } from '@/lib/finapi-sdk-service';
import { db } from '@/firebase/server';
import { getFinApiBaseUrl } from '@/lib/finapi-config';

export async function POST(request: NextRequest) {
  try {
    const {
      userId,
      credentialType,
      accountId,
      receiverName,
      iban,
      bic,
      purpose,
      amount,
      executionDate
    } = await request.json();

    // Validate required fields
    if (!userId || !credentialType || !accountId || !receiverName || !iban || !bic || !purpose || !amount) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get company data to retrieve email
    const companyDoc = await db!.collection('companies').doc(userId).get();
    
    if (!companyDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Company not found' },
        { status: 404 }
      );
    }

    const companyData = companyDoc.data();
    const companyEmail = companyData?.email;

    if (!companyEmail) {
      return NextResponse.json(
        { success: false, error: 'Company email not found' },
        { status: 400 }
      );
    }

    // Create finAPI service and get user token
    const finapiService = createFinAPIService();
    const userData = await finapiService.getOrCreateUser(companyEmail, 'demo123', userId);
    
    if (!userData?.userToken) {
      return NextResponse.json(
        { success: false, error: 'Failed to get FinAPI access token' },
        { status: 401 }
      );
    }
    
    const accessToken = userData.userToken;

    // Prepare transfer payload for FinAPI (correct format based on CreateMoneyTransferParams)
    const transferPayload = {
      accountId: parseInt(accountId),
      ...(executionDate && { executionDate: executionDate }),
      moneyTransfers: [
        {
          counterpartName: receiverName,
          counterpartIban: iban,
          counterpartBic: bic,
          amount: amount,
          currency: 'EUR',
          purpose: purpose,
          structuredRemittanceInformation: []
        }
      ],
      instantPayment: false,
      singleBooking: true
    };

    console.log('🏦 Creating FinAPI money transfer:', transferPayload);

    // Since direct API calls are not allowed for this client, we need to use Web Form
    // This is the standard approach for FinAPI Payment Initiation Services (PIS)
    console.log('💡 Using FinAPI Web Form for payment (direct API calls not permitted)');
    
    return NextResponse.json({
      success: false,
      requiresWebForm: true,
      error: 'Payment requires Web Form authentication',
      message: 'Für diesen FinAPI Client sind direkte API-Aufrufe nicht zulässig. Die Zahlung muss über das finAPI Web Form durchgeführt werden.',
      transferData: transferPayload,
      webFormNeeded: true,
      // In a full implementation, you would create a web form URL here
      nextStep: 'redirect_to_webform'
    }, { status: 422 });

  } catch (error) {
    console.error('❌ Bank transfer error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unbekannter Fehler bei der Überweisung'
      },
      { status: 500 }
    );
  }
}