/**
 * Admin Content Violations API
 * 
 * Server-seitige API für Content-Überwachung
 * Verwendet Firebase Admin SDK (nicht Client SDK)
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AdminAuthService } from '@/services/admin/AdminAuthService';
import { db } from '@/firebase/server';

interface ContentViolation {
  type: 'phone' | 'email' | 'address' | 'url' | 'social_media';
  match: string;
  position: number;
}

interface ViolationLog {
  id: string;
  companyId: string;
  companyName: string;
  userId: string;
  context: 'proposal' | 'chat' | 'order_message';
  originalText: string;
  violations: ContentViolation[];
  createdAt: FirebaseFirestore.Timestamp;
  reviewed: boolean;
  action?: 'warning' | 'suspended' | 'banned' | null;
  reviewedBy?: string;
  reviewedAt?: FirebaseFirestore.Timestamp;
  notes?: string;
}

/**
 * GET - Lade alle Content-Verstöße
 */
export async function GET(request: NextRequest) {
  try {
    // Admin-Authentifizierung prüfen
    const cookieStore = await cookies();
    const token = cookieStore.get('taskilo_admin_session')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const authResult = await AdminAuthService.verifyToken(token);
    if (!authResult.valid) {
      return NextResponse.json({ error: 'Ungültiges Token' }, { status: 401 });
    }

    if (!db) {
      return NextResponse.json({ error: 'Datenbank nicht verfügbar' }, { status: 500 });
    }

    // Query-Parameter
    const { searchParams } = new URL(request.url);
    const filterUnreviewed = searchParams.get('unreviewed') === 'true';
    const limitCount = parseInt(searchParams.get('limit') || '100', 10);

    // Firestore-Abfrage mit Admin SDK
    let query: FirebaseFirestore.Query = db.collection('content_violations');
    
    if (filterUnreviewed) {
      query = query.where('reviewed', '==', false);
    }
    
    query = query.orderBy('createdAt', 'desc').limit(limitCount);

    const snapshot = await query.get();
    
    const violations: ViolationLog[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as ViolationLog[];

    return NextResponse.json({
      success: true,
      violations,
      count: violations.length,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json(
      { error: `Fehler beim Laden: ${errorMessage}` },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Aktualisiere einen Verstoß (Review, Aktion)
 */
export async function PATCH(request: NextRequest) {
  try {
    // Admin-Authentifizierung prüfen
    const cookieStore = await cookies();
    const token = cookieStore.get('taskilo_admin_session')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const authResult = await AdminAuthService.verifyToken(token);
    if (!authResult.valid || !authResult.payload) {
      return NextResponse.json({ error: 'Ungültiges Token' }, { status: 401 });
    }

    if (!db) {
      return NextResponse.json({ error: 'Datenbank nicht verfügbar' }, { status: 500 });
    }

    const body = await request.json();
    const { violationId, action, notes } = body;

    if (!violationId) {
      return NextResponse.json({ error: 'Verstoß-ID fehlt' }, { status: 400 });
    }

    // Verstoß aktualisieren
    const violationRef = db.collection('content_violations').doc(violationId);
    const violationDoc = await violationRef.get();

    if (!violationDoc.exists) {
      return NextResponse.json({ error: 'Verstoß nicht gefunden' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {
      reviewed: true,
      reviewedBy: authResult.payload.email,
      reviewedAt: new Date(),
    };

    if (action) {
      updateData.action = action;
    }

    if (notes) {
      updateData.notes = notes;
    }

    await violationRef.update(updateData);

    // Bei Sperrung: Company-Status aktualisieren
    if (action === 'suspended' || action === 'banned') {
      const violationData = violationDoc.data();
      if (violationData?.companyId) {
        const companyRef = db.collection('companies').doc(violationData.companyId);
        await companyRef.update({
          taskerStatus: action,
          taskerStatusUpdatedAt: new Date(),
          taskerStatusReason: `Content-Verstoß: ${notes || 'Kontaktdaten-Weitergabe'}`,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Verstoß aktualisiert',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json(
      { error: `Fehler beim Aktualisieren: ${errorMessage}` },
      { status: 500 }
    );
  }
}
