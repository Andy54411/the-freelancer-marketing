import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase/clients';

// GET: Einzelne E-Mail-Details abrufen
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const emailId = params.id;

    if (!emailId) {
      return NextResponse.json(
        { success: false, error: 'E-Mail-ID ist erforderlich' },
        { status: 400 }
      );
    }

    const emailRef = doc(db, 'inbox_emails', emailId);
    const emailSnap = await getDoc(emailRef);

    if (!emailSnap.exists()) {
      return NextResponse.json({ success: false, error: 'E-Mail nicht gefunden' }, { status: 404 });
    }

    const emailData = {
      id: emailSnap.id,
      ...emailSnap.data(),
      receivedAt: emailSnap.data()?.receivedAt?.toDate() || new Date(),
    } as any;

    // Als gelesen markieren, wenn noch nicht gelesen
    if (!emailData.isRead) {
      await updateDoc(emailRef, {
        isRead: true,
        readAt: new Date(),
      });
      emailData.isRead = true;
    }

    return NextResponse.json({
      success: true,
      data: emailData,
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der E-Mail-Details:', error);
    return NextResponse.json(
      { success: false, error: 'Fehler beim Abrufen der E-Mail-Details' },
      { status: 500 }
    );
  }
}

// PATCH: E-Mail aktualisieren
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const emailId = params.id;
    const updates = await request.json();

    if (!emailId) {
      return NextResponse.json(
        { success: false, error: 'E-Mail-ID ist erforderlich' },
        { status: 400 }
      );
    }

    const emailRef = doc(db, 'inbox_emails', emailId);

    // Validiere Updates
    const allowedFields = [
      'isRead',
      'isStarred',
      'isArchived',
      'labels',
      'priority',
      'isSpam',
      'notes',
    ];

    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([key]) => allowedFields.includes(key))
    );

    if (Object.keys(filteredUpdates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Keine gültigen Update-Felder gefunden' },
        { status: 400 }
      );
    }

    await updateDoc(emailRef, {
      ...filteredUpdates,
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'E-Mail erfolgreich aktualisiert',
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren der E-Mail:', error);
    return NextResponse.json(
      { success: false, error: 'Fehler beim Aktualisieren der E-Mail' },
      { status: 500 }
    );
  }
}

// DELETE: E-Mail löschen
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const emailId = params.id;

    if (!emailId) {
      return NextResponse.json(
        { success: false, error: 'E-Mail-ID ist erforderlich' },
        { status: 400 }
      );
    }

    const emailRef = doc(db, 'inbox_emails', emailId);

    // Als gelöscht markieren statt löschen
    await updateDoc(emailRef, {
      isDeleted: true,
      deletedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'E-Mail erfolgreich gelöscht',
    });
  } catch (error) {
    console.error('Fehler beim Löschen der E-Mail:', error);
    return NextResponse.json(
      { success: false, error: 'Fehler beim Löschen der E-Mail' },
      { status: 500 }
    );
  }
}
