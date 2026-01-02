/**
 * API: Blockierte Tage verwalten
 * 
 * GET /api/companies/[uid]/availability/blocked-dates - Liste abrufen
 * POST /api/companies/[uid]/availability/blocked-dates - Neuen blockierten Tag hinzufügen
 * 
 * Authentifizierung erforderlich - nur Company Owner
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, auth } from '@/firebase/server';
import { FieldValue } from 'firebase-admin/firestore';
import { type BlockedDate } from '@/types/availability';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid: companyId } = await params;

    if (!companyId || !db || !auth) {
      return NextResponse.json(
        { success: false, error: 'Ungültige Anfrage' },
        { status: 400 }
      );
    }

    // Authentifizierung prüfen
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Authentifizierung erforderlich' },
        { status: 401 }
      );
    }

    const idToken = authHeader.substring(7);
    let userId: string;

    try {
      const decodedToken = await auth.verifyIdToken(idToken);
      userId = decodedToken.uid;
    } catch {
      return NextResponse.json(
        { success: false, error: 'Ungültiges Token' },
        { status: 401 }
      );
    }

    // Nur Company Owner darf blockierte Tage sehen
    if (userId !== companyId) {
      return NextResponse.json(
        { success: false, error: 'Keine Berechtigung' },
        { status: 403 }
      );
    }

    // Blockierte Tage abrufen
    const blockedSnapshot = await db
      .collection('companies')
      .doc(companyId)
      .collection('blockedDates')
      .where('isActive', '==', true)
      .orderBy('date', 'asc')
      .get();

    const blockedDates: BlockedDate[] = [];
    
    blockedSnapshot.forEach(docSnap => {
      const data = docSnap.data();
      blockedDates.push({
        id: docSnap.id,
        date: data.date,
        reason: data.reason,
        blockType: data.blockType || 'full_day',
        startTime: data.startTime,
        endTime: data.endTime,
        recurring: data.recurring || false,
        recurringPattern: data.recurringPattern,
        isActive: data.isActive,
        createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
        createdBy: data.createdBy,
        updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt)
      });
    });

    return NextResponse.json({
      success: true,
      blockedDates
    });

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unbekannter Fehler' 
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid: companyId } = await params;

    if (!companyId || !db || !auth) {
      return NextResponse.json(
        { success: false, error: 'Ungültige Anfrage' },
        { status: 400 }
      );
    }

    // Authentifizierung prüfen
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Authentifizierung erforderlich' },
        { status: 401 }
      );
    }

    const idToken = authHeader.substring(7);
    let userId: string;

    try {
      const decodedToken = await auth.verifyIdToken(idToken);
      userId = decodedToken.uid;
    } catch {
      return NextResponse.json(
        { success: false, error: 'Ungültiges Token' },
        { status: 401 }
      );
    }

    // Nur Company Owner darf Tage blockieren
    if (userId !== companyId) {
      return NextResponse.json(
        { success: false, error: 'Keine Berechtigung' },
        { status: 403 }
      );
    }

    // Request Body parsen
    const body = await request.json();
    const { date, endDate, reason, blockType, startTime, endTime, recurring, recurringPattern } = body;

    if (!date) {
      return NextResponse.json(
        { success: false, error: 'Datum erforderlich' },
        { status: 400 }
      );
    }

    const createdIds: string[] = [];

    // Falls Datumsbereich: Alle Tage blockieren
    if (endDate && endDate !== date) {
      const startDateObj = new Date(date);
      const endDateObj = new Date(endDate);
      
      const currentDate = new Date(startDateObj);
      while (currentDate <= endDateObj) {
        const dateStr = currentDate.toISOString().split('T')[0];
        
        const docRef = await db
          .collection('companies')
          .doc(companyId)
          .collection('blockedDates')
          .add({
            date: dateStr,
            reason: reason || 'Nicht verfügbar',
            blockType: blockType || 'full_day',
            startTime: startTime || null,
            endTime: endTime || null,
            recurring: false,
            recurringPattern: null,
            createdAt: FieldValue.serverTimestamp(),
            createdBy: userId,
            isActive: true
          });
        
        createdIds.push(docRef.id);
        currentDate.setDate(currentDate.getDate() + 1);
      }
    } else {
      // Einzelner Tag blockieren
      const docRef = await db
        .collection('companies')
        .doc(companyId)
        .collection('blockedDates')
        .add({
          date,
          reason: reason || 'Nicht verfügbar',
          blockType: blockType || 'full_day',
          startTime: startTime || null,
          endTime: endTime || null,
          recurring: recurring || false,
          recurringPattern: recurringPattern || null,
          createdAt: FieldValue.serverTimestamp(),
          createdBy: userId,
          isActive: true
        });
      
      createdIds.push(docRef.id);
    }

    return NextResponse.json({
      success: true,
      message: createdIds.length > 1 
        ? `${createdIds.length} Tage erfolgreich blockiert` 
        : 'Tag erfolgreich blockiert',
      ids: createdIds
    });

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unbekannter Fehler' 
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid: companyId } = await params;
    const { searchParams } = new URL(request.url);
    const dateId = searchParams.get('dateId');
    const date = searchParams.get('date');

    if (!companyId || !db || !auth) {
      return NextResponse.json(
        { success: false, error: 'Ungültige Anfrage' },
        { status: 400 }
      );
    }

    // Authentifizierung prüfen
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Authentifizierung erforderlich' },
        { status: 401 }
      );
    }

    const idToken = authHeader.substring(7);
    let userId: string;

    try {
      const decodedToken = await auth.verifyIdToken(idToken);
      userId = decodedToken.uid;
    } catch {
      return NextResponse.json(
        { success: false, error: 'Ungültiges Token' },
        { status: 401 }
      );
    }

    // Nur Company Owner darf Tage freigeben
    if (userId !== companyId) {
      return NextResponse.json(
        { success: false, error: 'Keine Berechtigung' },
        { status: 403 }
      );
    }

    if (dateId) {
      // Spezifisches Dokument freigeben
      await db
        .collection('companies')
        .doc(companyId)
        .collection('blockedDates')
        .doc(dateId)
        .update({
          isActive: false,
          updatedAt: FieldValue.serverTimestamp()
        });

      return NextResponse.json({
        success: true,
        message: 'Tag erfolgreich freigegeben'
      });
    } else if (date) {
      // Alle Blockierungen für ein bestimmtes Datum freigeben
      const blockedSnapshot = await db
        .collection('companies')
        .doc(companyId)
        .collection('blockedDates')
        .where('date', '==', date)
        .where('isActive', '==', true)
        .get();

      const batch = db.batch();
      blockedSnapshot.forEach(docSnap => {
        batch.update(docSnap.ref, {
          isActive: false,
          updatedAt: FieldValue.serverTimestamp()
        });
      });

      await batch.commit();

      return NextResponse.json({
        success: true,
        message: `${blockedSnapshot.size} Blockierung(en) für ${date} freigegeben`
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'dateId oder date Parameter erforderlich' },
        { status: 400 }
      );
    }

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unbekannter Fehler' 
      },
      { status: 500 }
    );
  }
}
