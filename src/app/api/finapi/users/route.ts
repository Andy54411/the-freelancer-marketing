import { NextRequest, NextResponse } from 'next/server';

// finAPI Users API - Users connect banks through Taskilo's finAPI service account
// Users don't need individual finAPI accounts, they connect banks directly

export async function POST(req: NextRequest) {
  return NextResponse.json(
    {
      success: true,
      message: 'User registration not required - banks can be connected directly',
      redirect: '/dashboard/company/[uid]/finance/banking/setup',
      user: { id: 'taskilo_service', email: 'service@taskilo.de' },
      access_token: 'not_needed_for_bank_connection',
      token_type: 'Bearer',
      expires_in: 3600,
    },
    { status: 200 }
  );
}

export async function GET(req: NextRequest) {
  return NextResponse.json(
    {
      success: true,
      message: 'User info via Taskilo service account',
      user: { id: 'taskilo_service', email: 'service@taskilo.de' },
    },
    { status: 200 }
  );
}
