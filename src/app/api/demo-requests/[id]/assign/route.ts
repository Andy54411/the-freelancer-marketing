import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthService } from '@/services/admin/AdminAuthService';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Admin-Authentifizierung prüfen
    const adminUser = await AdminAuthService.verifyFromRequest(request);
    if (!adminUser) {
      return NextResponse.json(
        { success: false, error: 'Nicht autorisiert - Admin-Zugriff erforderlich' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { assignedTo, status } = body;

    if (!params.id) {
      return NextResponse.json(
        { success: false, error: 'ID ist erforderlich' },
        { status: 400 }
      );
    }

    // Admin SDK für Server-seitige Updates verwenden
    const { db: adminDb, admin } = await import('@/firebase/server');
    
    if (!adminDb || !admin) {
      throw new Error('Firebase Admin nicht verfügbar');
    }
    
    const docRef = adminDb.collection('demoRequests').doc(params.id);
    
    type UpdateData = {
      updatedAt: FirebaseFirestore.FieldValue;
      assignedTo?: string;
      status?: string;
    };
    
    const updateData: UpdateData = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (assignedTo !== undefined) {
      updateData.assignedTo = assignedTo;
      updateData.status = 'zugewiesen';
    }

    if (status !== undefined) {
      updateData.status = status;
    }

    await docRef.update(updateData);

    return NextResponse.json({
      success: true,
      message: 'Demo-Anfrage erfolgreich aktualisiert',
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Demo-Anfrage:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Aktualisieren der Demo-Anfrage',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}
