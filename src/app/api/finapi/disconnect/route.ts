import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: NextRequest, companyId: string) {
  try {
    const body = await request.json();
    const { companyId } = body;

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID ist erforderlich' }, { status: 400 });
    }

    // Lösche finAPI-Daten aus der Company-Collection
    const companyRef = db.collection('companies').doc(companyId);
    const companyDoc = await companyRef.get();

    if (!companyDoc.exists) {
      return NextResponse.json({ error: 'Unternehmen nicht gefunden' }, { status: 404 });
    }

    // Update Company Document - Entferne finAPI-bezogene Felder
    await companyRef.update({
      finapiUser: FieldValue.delete(),
      // Weitere finAPI-bezogene Felder können hier entfernt werden
      lastFinapiSync: FieldValue.delete(),
      finapiAccounts: FieldValue.delete(),
      finapiTransactions: FieldValue.delete(),
      // Aktualisiere auch den Update-Timestamp
      updatedAt: new Date().toISOString(),
      // Füge Log hinzu
      lastModifiedBy: 'system-disconnect',
    });

    // Lösche alle finAPI-Sessions für diese Company
    const sessionsQuery = db.collection('finapi_sessions');

    const sessionsSnapshot = await sessionsQuery.get();
    const deletePromises = sessionsSnapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(deletePromises);

    // Lösche alle finAPI-Disconnections für diese Company (falls vorhanden)
    const disconnectionsQuery = db
      .collection('finapi_disconnections')
      ;

    const disconnectionsSnapshot = await disconnectionsQuery.get();
    const disconnectDeletePromises = disconnectionsSnapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(disconnectDeletePromises);

    // Füge ein Log-Eintrag hinzu für die Trennung
    await db.collection('finapi_disconnections').add({
      companyId,
      disconnectedAt: new Date().toISOString(),
      reason: 'user_initiated',
      disconnectedBy: 'company_user',
      status: 'completed',
    });

    return NextResponse.json({
      success: true,
      message: 'finAPI-Verbindung erfolgreich getrennt',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Fehler beim Trennen der finAPI-Verbindung' },
      { status: 500 }
    );
  }
}
