import { NextRequest, NextResponse } from 'next/server';
import { FinAPIClientManager } from '@/lib/finapi-client-manager';

// GET /api/finapi/categories - Get all categories
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('perPage') || '50');
    const search = searchParams.get('search');
    const isCustom = searchParams.get('isCustom') === 'true';

    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const clientManager = new FinAPIClientManager(token);

    // Get categories
    const response = await clientManager.categories.getAndSearchAllCategories(
      undefined, // ids
      search || undefined,
      isCustom,
      page,
      perPage,
      undefined // order
    );

    console.log('Categories retrieved:', response.categories?.length || 0);

    return NextResponse.json({
      success: true,
      data: response.categories,
      paging: response.paging,
      categories:
        response.categories?.map(category => ({
          id: category.id,
          name: category.name,
          parentId: category.parentId,
          parentName: category.parentName,
          isCustom: category.isCustom,
          children: category.children,
        })) || [],
      totalCount: response.categories?.length || 0,
    });
  } catch (error: any) {
    console.error('finAPI categories error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get categories',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// POST /api/finapi/categories - Create, update, or delete categories
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, categoryId, name, parentId } = body;

    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const clientManager = new FinAPIClientManager(token);

    if (action === 'create') {
      // Create new category
      const category = await clientManager.categories.createCategory({
        name,
        parentId,
      });

      return NextResponse.json({
        success: true,
        data: category,
      });
    }

    if (action === 'edit' && categoryId) {
      // Edit category
      const category = await clientManager.categories.editCategory(categoryId, {
        name,
      });

      return NextResponse.json({
        success: true,
        data: category,
      });
    }

    if (action === 'delete' && categoryId) {
      // Delete category
      await clientManager.categories.deleteCategory(categoryId);

      return NextResponse.json({
        success: true,
        message: 'Category deleted successfully',
      });
    }

    if (action === 'get' && categoryId) {
      // Get specific category
      const category = await clientManager.categories.getCategory(categoryId);

      return NextResponse.json({
        success: true,
        data: category,
      });
    }

    if (action === 'cashFlows') {
      // Get cash flows for category
      const { categoryIds, accountIds, minBankBookingDate, maxBankBookingDate } = body;

      const cashFlows = await clientManager.categories.getCashFlows(
        categoryIds,
        accountIds,
        minBankBookingDate,
        maxBankBookingDate
      );

      return NextResponse.json({
        success: true,
        data: cashFlows,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action specified' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('finAPI categories POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process category request',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
