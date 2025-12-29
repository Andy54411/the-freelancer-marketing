// Admin Logout API
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(_request: NextRequest) {
  try {
    // Admin-Token Cookie löschen
    const cookieStore = await cookies();
    cookieStore.delete('taskilo_admin_session');

    return NextResponse.json({
      success: true,
      message: 'Erfolgreich abgemeldet',
    });
  } catch (error) {
    return NextResponse.json({ error: 'Logout-Fehler' }, { status: 500 });
  }
}
