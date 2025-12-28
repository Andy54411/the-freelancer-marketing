import { NextRequest, NextResponse } from 'next/server';
import { createFinAPIService } from '@/lib/finapi-sdk-service';
import { verifyApiAuth, authErrorResponse } from '@/lib/apiAuth';

/**
 * GET /api/finapi/banks
 * List available banks for finAPI integration from real finAPI endpoint
 */
export async function GET(request: NextRequest) {
  // Authentifizierung - Bankenliste nur für eingeloggte Benutzer
  const authResult = await verifyApiAuth(request);
  if (!authResult.success) {
    return authErrorResponse(authResult);
  }
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('perPage') || '20');
    const includeTestBanks = searchParams.get('includeTestBanks') === 'true';

    // Debug: Check environment variables
    console.log('🔧 Environment Variables Check:');
    console.log('FINAPI_SANDBOX_CLIENT_ID:', process.env.FINAPI_SANDBOX_CLIENT_ID ? 'SET' : 'MISSING');
    console.log('FINAPI_SANDBOX_CLIENT_SECRET:', process.env.FINAPI_SANDBOX_CLIENT_SECRET ? 'SET' : 'MISSING');
    console.log('NODE_ENV:', process.env.NODE_ENV);

    // Use the same service as other finAPI endpoints
    const finapiService = createFinAPIService();

    // Get banks from finAPI using the service
    console.log('🚀 Starting getBanks with params:', { search, page, perPage, includeTestBanks });
    
    const result = await finapiService.getBanks({
      search: search || undefined,
      page,
      perPage,
      includeTestBanks,
    });
    
    console.log('📊 getBanks result:', result);

    return NextResponse.json({
      success: true,
      banks: result.banks || [],
      totalCount: result.paging?.totalCount || 0,
      page: result.paging?.page || page,
      perPage: result.paging?.perPage || perPage,
      totalPages: result.paging?.pageCount || 0,
      search,
      source: 'finapi_service',
      timestamp: new Date().toISOString(),
      debug: {
        envVars: {
          hasClientId: !!process.env.FINAPI_SANDBOX_CLIENT_ID,
          hasClientSecret: !!process.env.FINAPI_SANDBOX_CLIENT_SECRET,
          nodeEnv: process.env.NODE_ENV,
          clientIdLength: process.env.FINAPI_SANDBOX_CLIENT_ID?.length || 0,
        }
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get banks from finAPI',
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
