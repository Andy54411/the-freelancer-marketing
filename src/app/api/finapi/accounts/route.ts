import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
    }

    const token = authHeader.substring(7);

    // finAPI Accounts Request
    const accountsResponse = await fetch('https://sandbox.finapi.io/api/v1/accounts', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!accountsResponse.ok) {
      const errorText = await accountsResponse.text();
      console.error('finAPI accounts request failed:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch accounts', details: errorText },
        { status: accountsResponse.status }
      );
    }

    const accountsData = await accountsResponse.json();

    return NextResponse.json(accountsData);
  } catch (error) {
    console.error('finAPI accounts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
