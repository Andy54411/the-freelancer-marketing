import { NextRequest, NextResponse } from 'next/server';
import { getAllOrders } from '@/lib/order-data';
import { verifyAdminAuth } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all orders
    const orders = await getAllOrders();

    return NextResponse.json({
      success: true,
      orders,
      count: orders.length,
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}
