import { NextRequest, NextResponse } from 'next/server';
import { admin, db } from '@/firebase/server';

interface PaymentTermsSettings {
  companyId: string;
  defaultPaymentTerms: {
    days: number; // Standard-Zahlungsziel in Tagen
    text: string; // Text für Rechnung
    skontoEnabled: boolean; // Skonto aktiviert
    skontoDays: number; // Skonto-Frist in Tagen
    skontoPercentage: number; // Skonto-Prozentsatz
  };
  customPaymentTerms: Array<{
    id: string;
    name: string;
    days: number;
    text: string;
    isDefault?: boolean;
  }>;
  lastUpdated: Date;
  updatedBy?: string;
}

/**
 * GET: Lade aktuelle Zahlungskonditionen-Einstellungen
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  try {
    const { uid } = await params;

    // Lade Company-Dokument
    const companyRef = db!.collection('companies').doc(uid);
    const companyDoc = await companyRef.get();

    if (!companyDoc.exists) {
      return NextResponse.json({ error: 'Unternehmen nicht gefunden' }, { status: 404 });
    }

    const companyData = companyDoc.data();

    // Prüfe zuerst settings.paymentTerms, dann defaultPaymentTerms, dann Fallback
    let paymentTermsSettings = companyData?.settings?.paymentTerms;

    if (!paymentTermsSettings && companyData?.defaultPaymentTerms) {
      // Fallback: Aus normalen Firmeneinstellungen laden

      paymentTermsSettings = {
        companyId: uid,
        defaultPaymentTerms: companyData.defaultPaymentTerms,
        customPaymentTerms: [],
        lastUpdated: new Date(),
        updatedBy: 'Migration from company settings',
      };
    } else if (!paymentTermsSettings) {
      // Keine Einstellungen vorhanden: Standard-Werte

      paymentTermsSettings = getDefaultPaymentTerms();
    } else {
    }

    return NextResponse.json({
      success: true,
      paymentTerms: paymentTermsSettings,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Fehler beim Laden der Zahlungskonditionen' },
      { status: 500 }
    );
  }
}

/**
 * PUT: Aktualisiere Zahlungskonditionen-Einstellungen
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  try {
    const { uid } = await params;
    const body = await request.json();

    // Validierung
    const validation = validatePaymentTermsInput(body);
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Lade Company-Dokument
    const companyRef = db!.collection('companies').doc(uid);
    const companyDoc = await companyRef.get();

    if (!companyDoc.exists) {
      return NextResponse.json({ error: 'Unternehmen nicht gefunden' }, { status: 404 });
    }

    // Aufbereitete Zahlungskonditionen-Einstellungen
    const paymentTermsSettings: PaymentTermsSettings = {
      companyId: uid,
      defaultPaymentTerms: {
        days: Math.max(0, body.defaultPaymentTerms?.days || 14),
        text:
          body.defaultPaymentTerms?.text ||
          `Zahlbar binnen ${body.defaultPaymentTerms?.days || 14} Tagen ohne Abzug`,
        skontoEnabled: body.defaultPaymentTerms?.skontoEnabled || false,
        skontoDays: Math.max(0, body.defaultPaymentTerms?.skontoDays || 10),
        skontoPercentage: Math.max(
          0,
          Math.min(100, body.defaultPaymentTerms?.skontoPercentage || 2)
        ),
      },
      customPaymentTerms: body.customPaymentTerms || [],
      lastUpdated: new Date(),
      updatedBy: body.updatedBy || 'Company User',
    };

    // Update Unternehmensdaten
    await companyRef.update({
      'settings.paymentTerms': paymentTermsSettings,
      'settings.lastUpdated': admin.firestore.FieldValue.serverTimestamp(),
      defaultPaymentTerms: paymentTermsSettings.defaultPaymentTerms, // Auch auf root level für useCompanySettings
    });

    // Log für Admin-Überwachung

    return NextResponse.json({
      success: true,
      message: 'Zahlungskonditionen erfolgreich aktualisiert',
      paymentTerms: paymentTermsSettings,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Fehler beim Speichern der Zahlungskonditionen' },
      { status: 500 }
    );
  }
}

/**
 * Default Zahlungskonditionen-Einstellungen für neue Unternehmen
 */
function getDefaultPaymentTerms() {
  return {
    companyId: '',
    defaultPaymentTerms: {
      days: 14,
      text: 'Zahlbar binnen 14 Tagen ohne Abzug',
      skontoEnabled: false,
      skontoDays: 10,
      skontoPercentage: 2,
    },
    customPaymentTerms: [
      {
        id: 'immediate',
        name: 'Sofort fällig',
        days: 0,
        text: 'Sofort fällig bei Erhalt',
        isDefault: false,
      },
      {
        id: 'net-7',
        name: '7 Tage Zahlungsziel',
        days: 7,
        text: 'Zahlbar binnen 7 Tagen ohne Abzug',
        isDefault: false,
      },
      {
        id: 'net-14',
        name: '14 Tage Zahlungsziel',
        days: 14,
        text: 'Zahlbar binnen 14 Tagen ohne Abzug',
        isDefault: true,
      },
      {
        id: 'net-30',
        name: '30 Tage Zahlungsziel',
        days: 30,
        text: 'Zahlbar binnen 30 Tagen ohne Abzug',
        isDefault: false,
      },
    ],

    lastUpdated: new Date(),
  };
}

/**
 * Validiere Zahlungskonditionen-Eingabe
 */
function validatePaymentTermsInput(input: any) {
  if (!input || typeof input !== 'object') {
    return { isValid: false, error: 'Ungültige Eingabe' };
  }

  // Validiere defaultPaymentTerms
  if (input.defaultPaymentTerms) {
    const { days, skontoPercentage, skontoDays } = input.defaultPaymentTerms;

    if (days !== undefined && (typeof days !== 'number' || days < 0 || days > 365)) {
      return { isValid: false, error: 'Zahlungsziel muss zwischen 0 und 365 Tagen liegen' };
    }

    if (
      skontoPercentage !== undefined &&
      (typeof skontoPercentage !== 'number' || skontoPercentage < 0 || skontoPercentage > 100)
    ) {
      return { isValid: false, error: 'Skonto-Prozentsatz muss zwischen 0 und 100% liegen' };
    }

    if (
      skontoDays !== undefined &&
      (typeof skontoDays !== 'number' || skontoDays < 0 || skontoDays > 365)
    ) {
      return { isValid: false, error: 'Skonto-Frist muss zwischen 0 und 365 Tagen liegen' };
    }
  }

  // Validiere customPaymentTerms
  if (input.customPaymentTerms && Array.isArray(input.customPaymentTerms)) {
    for (const term of input.customPaymentTerms) {
      if (!term.id || !term.name || typeof term.days !== 'number') {
        return { isValid: false, error: 'Ungültige benutzerdefinierte Zahlungskonditionen' };
      }
    }
  }

  return { isValid: true };
}
