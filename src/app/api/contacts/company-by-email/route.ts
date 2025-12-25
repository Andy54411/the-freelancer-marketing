import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';
import { z } from 'zod';

const RequestSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = RequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Ungueltige E-Mail-Adresse' },
        { status: 400 }
      );
    }

    const { email } = validation.data;
    const emailLower = email.toLowerCase();

    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Datenbank nicht verfuegbar' },
        { status: 500 }
      );
    }

    // Suche nach User mit dieser webmailEmail
    const usersSnapshot = await db
      .collection('users')
      .where('webmailEmail', '==', emailLower)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      // Fallback: Suche nach der normalen E-Mail
      const emailSnapshot = await db
        .collection('users')
        .where('email', '==', emailLower)
        .limit(1)
        .get();

      if (emailSnapshot.empty) {
        return NextResponse.json(
          { success: false, error: 'Kein Unternehmen mit dieser E-Mail gefunden' },
          { status: 404 }
        );
      }

      const userDoc = emailSnapshot.docs[0];
      return NextResponse.json({
        success: true,
        companyId: userDoc.id,
      });
    }

    const userDoc = usersSnapshot.docs[0];
    return NextResponse.json({
      success: true,
      companyId: userDoc.id,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
