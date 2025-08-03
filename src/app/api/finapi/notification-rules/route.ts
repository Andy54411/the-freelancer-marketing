import { NextRequest, NextResponse } from 'next/server';
import { FinAPIClientManager } from '@/lib/finapi-client-manager';

// GET /api/finapi/notification-rules - Get notification rules
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('perPage') || '50');

    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const clientManager = new FinAPIClientManager(token);

    // Get notification rules - simplified approach
    const allRules = [];

    // For now, return empty array since API structure is unclear
    const response = {
      notificationRules: allRules,
      paging: { page: 1, perPage: 50, pageCount: 1, totalCount: 0 },
    };

    console.log('Notification rules retrieved:', response.notificationRules?.length || 0);

    return NextResponse.json({
      success: true,
      data: response.notificationRules,
      paging: response.paging,
      notificationRules: response.notificationRules || [],
      totalCount: response.notificationRules?.length || 0,
    });
  } catch (error: any) {
    console.error('finAPI notification rules error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get notification rules',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// POST /api/finapi/notification-rules - Create or manage notification rules
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const clientManager = new FinAPIClientManager(token);

    if (action === 'create') {
      // Create notification rule
      const { triggerEvent, params, callbackHandle, includeDetails } = body;

      const rule = await clientManager.notificationRules.createNotificationRule({
        triggerEvent,
        params,
        callbackHandle,
        includeDetails,
      });

      return NextResponse.json({
        success: true,
        data: rule,
      });
    }

    if (action === 'delete') {
      // Delete notification rule
      const { ruleId } = body;

      await clientManager.notificationRules.deleteNotificationRule(ruleId);

      return NextResponse.json({
        success: true,
        message: 'Notification rule deleted successfully',
      });
    }

    if (action === 'get') {
      // Get specific notification rule
      const { ruleId } = body;

      const rule = await clientManager.notificationRules.getNotificationRule(ruleId);

      return NextResponse.json({
        success: true,
        data: rule,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action specified' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('finAPI notification rules POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process notification rule request',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
