import { NextRequest, NextResponse } from 'next/server';

const HETZNER_API_URL = process.env.HETZNER_WEBMAIL_API_URL || 'https://mail.taskilo.de/webmail-api';
const API_KEY = process.env.HETZNER_WEBMAIL_API_KEY || '';

// Chat-Einstellungen abrufen
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'E-Mail ist erforderlich' },
        { status: 400 }
      );
    }

    const response = await fetch(`${HETZNER_API_URL}/api/chat/settings?email=${encodeURIComponent(email)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
        'X-User-Email': email,
      },
    });

    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Fehler beim Abrufen der Einstellungen',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler'
      },
      { status: 500 }
    );
  }
}

// Chat-Einstellungen speichern
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, settings } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'E-Mail ist erforderlich' },
        { status: 400 }
      );
    }

    if (!settings) {
      return NextResponse.json(
        { success: false, error: 'Einstellungen sind erforderlich' },
        { status: 400 }
      );
    }

    const response = await fetch(`${HETZNER_API_URL}/api/chat/settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
        'X-User-Email': email,
      },
      body: JSON.stringify({ email, settings }),
    });

    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Fehler beim Speichern der Einstellungen',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler'
      },
      { status: 500 }
    );
  }
}
