import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { searchParams } = new URL(req.url);

    // Extract query parameters
    const accountIds = searchParams.get('accountIds');
    const minBankBookingDate = searchParams.get('minBankBookingDate');
    const maxBankBookingDate = searchParams.get('maxBankBookingDate');
    const page = searchParams.get('page') || '1';
    const perPage = searchParams.get('perPage') || '20';

    // Build finAPI query parameters
    const queryParams = new URLSearchParams();
    if (accountIds) queryParams.set('accountIds', accountIds);
    if (minBankBookingDate) queryParams.set('minBankBookingDate', minBankBookingDate);
    if (maxBankBookingDate) queryParams.set('maxBankBookingDate', maxBankBookingDate);
    queryParams.set('page', page);
    queryParams.set('perPage', perPage);

    // finAPI Transactions Request
    const transactionsResponse = await fetch(
      `https://sandbox.finapi.io/api/v1/transactions?${queryParams.toString()}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!transactionsResponse.ok) {
      const errorText = await transactionsResponse.text();
      console.error('finAPI transactions request failed:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch transactions', details: errorText },
        { status: transactionsResponse.status }
      );
    }

    const transactionsData = await transactionsResponse.json();

    return NextResponse.json(transactionsData);
  } catch (error) {
    console.error('finAPI transactions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
