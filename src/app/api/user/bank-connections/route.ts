import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../firebase/server';

/**
 * GET /api/user/bank-connections
 * Holt die Bank-Verbindungsdaten aus Firestore (mit Last-Sync-Daten)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID ist erforderlich' }, { status: 400 });
    }

    // Check if Firebase is properly initialized
    if (!db) {
      return NextResponse.json({ error: 'Database nicht verfügbar' }, { status: 500 });
    }

    // Try to get from companies collection first (main storage)
    let userDoc = await db!.collection('companies').doc(userId).get();

    if (!userDoc.exists) {
      // Fallback to users collection

      userDoc = await db!.collection('users').doc(userId).get();
    }

    if (!userDoc.exists) {
      return NextResponse.json({
        success: true,
        bankConnections: [],
        bankAccounts: [],
        message: 'No document found - user may not have bank connections yet',
      });
    }

    const userData = userDoc.data();
    const bankConnections = userData?.bankConnections || [];

    // Lade auch Bank-Konten aus Firestore
    const bankAccounts = userData?.bankAccounts || [];

    return NextResponse.json({
      success: true,
      bankConnections: bankConnections,
      bankAccounts: bankAccounts,
      lastSync: userData?.lastBankSync || null,
      autoSync: userData?.autoBankSync || false,
      syncStatus: userData?.bankSyncStatus || 'pending',
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Fehler beim Laden der Bank-Verbindungen',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/bank-connections
 * Aktualisiert Bank-Verbindungsdaten in Firestore
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, bankConnections, bankAccounts, lastSync, syncStatus } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID ist erforderlich' }, { status: 400 });
    }

    if (!db) {
      return NextResponse.json({ error: 'Database nicht verfügbar' }, { status: 500 });
    }

    const updateData: any = {
      updatedAt: new Date().toISOString(),
    };

    if (bankConnections !== undefined) {
      updateData.bankConnections = bankConnections;
    }

    if (bankAccounts !== undefined) {
      updateData.bankAccounts = bankAccounts;
    }

    if (lastSync !== undefined) {
      updateData.lastBankSync = lastSync;
    }

    if (syncStatus !== undefined) {
      updateData.bankSyncStatus = syncStatus;
    }

    // Try companies collection first (primary location for bank data)
    try {
      await db!.collection('companies').doc(userId).update(updateData);
    } catch {
      // Fallback to users collection
      try {
        await db!.collection('users').doc(userId).update(updateData);
      } catch {
        // If both fail, create a new document in companies collection
        await db!.collection('companies').doc(userId).set(updateData, { merge: true });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Bank-Verbindungsdaten erfolgreich aktualisiert',
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Fehler beim Aktualisieren der Bank-Verbindungen',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
