import { NextRequest, NextResponse } from 'next/server';
import { FinAPIClientManager } from '@/lib/finapi-client-manager';

// GET /api/finapi/labels - Get all labels
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

    // Get labels
    const response = await clientManager.labels.getAndSearchAllLabels(
      undefined, // ids
      undefined, // search
      page,
      perPage
    );

    console.log('Labels retrieved:', response.labels?.length || 0);

    return NextResponse.json({
      success: true,
      data: response.labels,
      paging: response.paging,
      labels:
        response.labels?.map(label => ({
          id: label.id,
          name: label.name,
        })) || [],
      totalCount: response.labels?.length || 0,
    });
  } catch (error: any) {
    console.error('finAPI labels error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get labels',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// POST /api/finapi/labels - Create, update, or delete labels
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, labelId, name } = body;

    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const clientManager = new FinAPIClientManager(token);

    if (action === 'create') {
      // Create new label
      const label = await clientManager.labels.createLabel({
        name,
      });

      return NextResponse.json({
        success: true,
        data: label,
      });
    }

    if (action === 'edit' && labelId) {
      // Edit label
      const label = await clientManager.labels.editLabel(labelId, {
        name,
      });

      return NextResponse.json({
        success: true,
        data: label,
      });
    }

    if (action === 'delete' && labelId) {
      // Delete label
      await clientManager.labels.deleteLabel(labelId);

      return NextResponse.json({
        success: true,
        message: 'Label deleted successfully',
      });
    }

    if (action === 'get' && labelId) {
      // Get specific label
      const label = await clientManager.labels.getLabel(labelId);

      return NextResponse.json({
        success: true,
        data: label,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action specified' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('finAPI labels POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process label request',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
