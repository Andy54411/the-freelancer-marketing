import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
    try {
        // Lösche das Session-Cookie, indem die Gültigkeit auf 0 gesetzt wird.
        (await cookies()).set('__session', '', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 0, // Läuft sofort ab
            path: '/',
        });

        return NextResponse.json({ status: 'success' });
    } catch (error) {
        console.error('Logout Error:', error);
        return NextResponse.json({ error: 'Logout fehlgeschlagen' }, { status: 500 });
    }
}