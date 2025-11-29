import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';
import { GoogleAdsClientService } from '@/services/googleAdsClientService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid: companyId } = await params;
    
    if (!companyId) {
      return NextResponse.json({ success: false, error: 'Company ID required' }, { status: 400 });
    }

    if (!db) {
      throw new Error('Database connection failed');
    }

    // Get company name for the account name
    const companyDoc = await db.collection('companies').doc(companyId).get();
    const companyName = companyDoc.data()?.name || `Taskilo Account ${companyId.substring(0, 6)}`;
    const accountName = `Taskilo - ${companyName}`;

    const googleAdsService = new GoogleAdsClientService();
    const result = await googleAdsService.createTestAccount(accountName);

    if (!result.success || !result.data) {
      throw new Error(result.error?.message || 'Failed to create account');
    }

    const { customerId } = result.data;

    // Save to Firestore - Automatically Connected!
    await db
      .collection('companies')
      .doc(companyId)
      .collection('advertising_connections')
      .doc('google-ads')
      .set({
        platform: 'google-ads',
        customerId: customerId,
        managerApproved: true, // Auto-approved since we created it
        managerLinkStatus: 'ACTIVE',
        status: 'connected',
        connectedAt: new Date().toISOString(),
        isTestAccount: true,
        autoCreated: true
      });

    return NextResponse.json({
      success: true,
      customerId,
      message: 'Test Account created and connected successfully'
    });

  } catch (error: any) {
    console.error('Create Account Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
