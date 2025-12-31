/**
 * Admin API: Sync Webmail Profile
 * 
 * Synchronisiert Firebase Company-Daten mit dem Hetzner Webmail-Server
 * und aktualisiert die verifizierte Telefonnummer in Firebase.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';
import { FieldValue } from 'firebase-admin/firestore';

const WEBMAIL_API_URL = process.env.NEXT_PUBLIC_WEBMAIL_API_URL || 'https://mail.taskilo.de';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, taskiloEmail } = body;

    // Validierung
    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'Company-ID ist erforderlich' },
        { status: 400 }
      );
    }

    if (!taskiloEmail) {
      return NextResponse.json(
        { success: false, error: 'Taskilo E-Mail ist erforderlich' },
        { status: 400 }
      );
    }

    if (!taskiloEmail.toLowerCase().endsWith('@taskilo.de')) {
      return NextResponse.json(
        { success: false, error: 'Nur @taskilo.de E-Mail-Adressen können synchronisiert werden' },
        { status: 400 }
      );
    }

    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Datenbank nicht verfügbar' },
        { status: 500 }
      );
    }

    // Company-Daten aus Firebase laden (Server SDK)
    const companyDocRef = db.collection('companies').doc(companyId);
    const companyDocSnap = await companyDocRef.get();

    if (!companyDocSnap.exists) {
      return NextResponse.json(
        { success: false, error: 'Firma nicht gefunden' },
        { status: 404 }
      );
    }

    const companyData = companyDocSnap.data() || {};

    // Company-Daten für Sync vorbereiten
    const companyDataForSync = {
      companyName: companyData.companyName || companyData.name || '',
      address: companyData.street || companyData.address || '',
      city: companyData.city || '',
      postalCode: companyData.zip || companyData.postalCode || '',
      country: companyData.country || 'Deutschland',
      vatId: companyData.vatId || '',
      taxNumber: companyData.taxNumber || '',
      iban: companyData.iban || '',
      bic: companyData.bic || '',
      bankName: companyData.bankName || '',
      industry: companyData.industry || '',
      legalForm: companyData.legalForm || '',
      phone: companyData.phone || companyData.phoneNumber || '',
      website: companyData.website || '',
    };

    // Sync mit Hetzner Webmail durchführen
    const syncResponse = await fetch(`${WEBMAIL_API_URL}/api/profile/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: taskiloEmail,
        companyId,
        companyData: companyDataForSync,
      }),
    });

    if (!syncResponse.ok) {
      const errorData = await syncResponse.json().catch(() => ({}));
      return NextResponse.json(
        {
          success: false,
          error: errorData.error || `Webmail-Server Fehler: HTTP ${syncResponse.status}`,
        },
        { status: syncResponse.status }
      );
    }

    const syncResult = await syncResponse.json();

    // Response vorbereiten
    const response: {
      success: boolean;
      message: string;
      verifiedPhone?: string;
      phoneVerified?: boolean;
      phoneUpdated?: boolean;
    } = {
      success: true,
      message: 'Sync erfolgreich',
      verifiedPhone: syncResult.phone,
      phoneVerified: syncResult.phoneVerified,
      phoneUpdated: false,
    };

    // Wenn verifizierte Telefonnummer vorhanden, Firebase aktualisieren
    if (syncResult.phone && syncResult.phoneVerified) {
      await companyDocRef.update({
        phone: syncResult.phone,
        phoneNumber: syncResult.phone,
        phoneVerifiedFromWebmail: true,
        phoneVerifiedAt: FieldValue.serverTimestamp(),
        webmailProfileSyncedAt: FieldValue.serverTimestamp(),
      });
      response.phoneUpdated = true;
      response.message = 'Sync erfolgreich, Telefonnummer aktualisiert';
    } else {
      // Nur Sync-Zeitstempel aktualisieren
      await companyDocRef.update({
        webmailProfileSyncedAt: FieldValue.serverTimestamp(),
      });
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Admin Sync] Fehler:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}
