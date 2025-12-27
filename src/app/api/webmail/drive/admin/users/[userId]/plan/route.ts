import { NextRequest, NextResponse } from 'next/server';

const WEBMAIL_PROXY_URL = process.env.WEBMAIL_PROXY_URL || 'https://mail.taskilo.de/webmail-api';
const WEBMAIL_API_KEY = process.env.WEBMAIL_API_KEY;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const body = await request.json();
    
    const response = await fetch(`${WEBMAIL_PROXY_URL}/api/drive/admin/users/${encodeURIComponent(userId)}/plan`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': WEBMAIL_API_KEY || '',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: 'Failed to update user plan' },
      { status: 500 }
    );
  }
}
