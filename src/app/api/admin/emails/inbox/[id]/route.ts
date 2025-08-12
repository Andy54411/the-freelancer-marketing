import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/clients';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    const emailDoc = await getDoc(doc(db, 'inbox_emails', id));

    if (!emailDoc.exists()) {
      return NextResponse.json({ error: 'E-Mail nicht gefunden', success: false }, { status: 404 });
    }

    const email = {
      id: emailDoc.id,
      ...emailDoc.data(),
      receivedAt: emailDoc.data()?.receivedAt?.toDate?.() || new Date(),
    };

    return NextResponse.json({
      email,
      success: true,
    });
  } catch (error) {
    console.error('Fehler beim Laden der E-Mail-Details:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden der E-Mail', success: false },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const updates = await request.json();

    await updateDoc(doc(db, 'inbox_emails', id), updates);

    return NextResponse.json({
      success: true,
      message: 'E-Mail erfolgreich aktualisiert',
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren der E-Mail:', error);
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren der E-Mail', success: false },
      { status: 500 }
    );
  }
}
