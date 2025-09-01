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
      console.error('Firebase database not available');
      return NextResponse.json({ error: 'Database nicht verfügbar' }, { status: 500 });
    }

    console.log(`🔍 Loading Firestore bank connections for user: ${userId}`);

    // Try to get from companies collection first (main storage)
    let userDoc = await db.collection('companies').doc(userId).get();
    let sourceCollection = 'companies';

    if (!userDoc.exists) {
      // Fallback to users collection
      console.log('⚠️ Company document not found, trying users collection');
      userDoc = await db.collection('users').doc(userId).get();
      sourceCollection = 'users';
    }

    if (!userDoc.exists) {
      console.log(`❌ No user/company document found: ${userId}`);
      return NextResponse.json({
        success: true,
        bankConnections: [],
        bankAccounts: [],
        message: 'No document found - user may not have bank connections yet',
      });
    }

    console.log(`✅ Found document in ${sourceCollection} collection`);

    const userData = userDoc.data();
    const bankConnections = userData?.bankConnections || [];

    console.log(`✅ Found ${bankConnections.length} bank connections in Firestore`);

    // Lade auch Bank-Konten aus Firestore
    const bankAccounts = userData?.bankAccounts || [];

    console.log(`✅ Found ${bankAccounts.length} bank accounts in Firestore`);

    return NextResponse.json({
      success: true,
      bankConnections: bankConnections,
      bankAccounts: bankAccounts,
      lastSync: userData?.lastBankSync || null,
      autoSync: userData?.autoBankSync || false,
      syncStatus: userData?.bankSyncStatus || 'pending',
    });
  } catch (error: any) {
    console.error('Error loading user bank connections:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

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

    console.log(`💾 Updating Firestore bank data for user: ${userId}`);

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

    console.log('💾 Updating Firestore bank data for user:', userId);

    // Try companies collection first (primary location for bank data)
    try {
      await db.collection('companies').doc(userId).update(updateData);
      console.log(`✅ Successfully updated bank data in companies collection`);
    } catch (companiesError) {
      console.log(
        '⚠️ Companies collection update failed, trying users collection:',
        companiesError
      );

      // Fallback to users collection
      try {
        await db.collection('users').doc(userId).update(updateData);
        console.log(`✅ Successfully updated bank data in users collection`);
      } catch (usersError) {
        console.log('❌ Both collections failed, creating new document in companies');

        // If both fail, create a new document in companies collection
        await db.collection('companies').doc(userId).set(updateData, { merge: true });
        console.log(`✅ Successfully created bank data in companies collection`);
      }
    }

    console.log(`✅ Successfully updated bank data in Firestore`);

    return NextResponse.json({
      success: true,
      message: 'Bank-Verbindungsdaten erfolgreich aktualisiert',
    });
  } catch (error: any) {
    console.error('Error updating user bank connections:', error);

    return NextResponse.json(
      {
        error: 'Fehler beim Aktualisieren der Bank-Verbindungen',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
