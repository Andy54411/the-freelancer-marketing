import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/finapi/banks
 * List available banks for finAPI integration
 * SIMPLIFIED: Returns empty banks since WebForm handles bank selection
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('perPage') || '20');

    console.log('🏛️ Getting banks list (simplified)');

    // Return empty banks since WebForm handles bank selection
    return NextResponse.json({
      success: true,
      banks: [],
      totalCount: 0,
      page,
      perPage,
      totalPages: 0,
      search,
      source: 'webform_only',
      message: 'Banks are selected through WebForm integration.',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ Banks error:', error.message);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get banks',
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
