import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

/**
 * COMPANY STORNO FEES SETTINGS API
 * Ermöglicht es Unternehmen, ihre Storno-Gebühren in den Einstellungen zu konfigurieren
 * Diese Gebühren werden in den öffentlichen Storno-Bedingungen angezeigt
 *
 * INTEGRIERT MIT DEADLINE MANAGEMENT:
 * - Automatische Lieferverzug-Erkennung basierend auf jobDateTo
 * - Storno-Recht bei überschrittenen Deadlines
 * - Intelligente Deadline-Berechnung für verschiedene Auftragstypen
 */

/**
 * Berechnet Deadline-Status für einen Auftrag
 */
function calculateDeadlineStatus(orderData: any) {
  if (!orderData.jobDateTo && !orderData.jobDateFrom) {
    return {
      hasDeadline: false,
      isOverdue: false,
      timeUntilDeadline: null,
      deadlineType: 'none',
    };
  }

  const now = new Date();

  // Verwende jobDateTo als primäre Deadline, sonst jobDateFrom
  const deadlineDate = new Date(orderData.jobDateTo || orderData.jobDateFrom);

  // Setze Deadline auf Ende des Tages (23:59:59)
  deadlineDate.setHours(23, 59, 59, 999);

  const diffMs = deadlineDate.getTime() - now.getTime();
  const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));

  // Bestimme Deadline-Typ basierend auf Auftragsdaten
  let deadlineType = 'standard';
  if (
    orderData.jobDateFrom &&
    orderData.jobDateTo &&
    orderData.jobDateFrom !== orderData.jobDateTo
  ) {
    deadlineType = 'multiday';
  } else if (orderData.jobTimePreference) {
    deadlineType = 'timed';
  }

  return {
    hasDeadline: true,
    isOverdue: diffHours <= 0,
    timeUntilDeadline: Math.max(0, diffHours),
    deadlineType,
    deadlineDate: deadlineDate.toISOString(),
  };
}

/**
 * Prüft Storno-Berechtigung basierend auf Deadline und Storno-Einstellungen
 */
function checkStornoEligibility(orderData: any, stornoSettings: any) {
  const deadline = calculateDeadlineStatus(orderData);

  // Bei Lieferverzug: Automatisches Storno-Recht
  if (deadline.isOverdue) {
    return {
      hasStornoRight: true,
      stornoType: 'lieferverzug',
      fullRefund: true,
      processingFee: 0,
      deadline,
    };
  }

  // Normale Storno-Prüfung basierend auf Einstellungen
  if (!stornoSettings.enabled) {
    return {
      hasStornoRight: false,
      stornoType: 'none',
      fullRefund: false,
      processingFee: 0,
      deadline,
    };
  }

  // Zeit-basierte Gebühren prüfen
  const timeUntilDeadline = deadline.timeUntilDeadline || 0;
  let applicableFee: any = null;

  // Prüfe verschiedene Zeitfenster
  if (timeUntilDeadline >= 7 * 24 && stornoSettings.timeBasedFees.before7Days.enabled) {
    applicableFee = stornoSettings.timeBasedFees.before7Days;
  } else if (timeUntilDeadline >= 48 && stornoSettings.timeBasedFees.before48Hours.enabled) {
    applicableFee = stornoSettings.timeBasedFees.before48Hours;
  } else if (timeUntilDeadline >= 24 && stornoSettings.timeBasedFees.before24Hours.enabled) {
    applicableFee = stornoSettings.timeBasedFees.before24Hours;
  } else if (stornoSettings.timeBasedFees.afterStart.enabled) {
    applicableFee = stornoSettings.timeBasedFees.afterStart;
  }

  if (!applicableFee) {
    return {
      hasStornoRight: false,
      stornoType: 'none',
      fullRefund: false,
      processingFee: 0,
      deadline,
    };
  }

  // Berechne Kosten
  const orderAmount = orderData.priceInCents || orderData.jobCalculatedPriceInCents || 0;
  const percentageFee = Math.round((orderAmount * (applicableFee?.percentage || 0)) / 100);
  const fixedFee = Math.round((applicableFee?.fixedAmount || 0) * 100); // Convert EUR to cents
  const totalFee = percentageFee + fixedFee;

  return {
    hasStornoRight: true,
    stornoType: 'normal',
    fullRefund: totalFee === 0,
    processingFee: totalFee,
    refundAmount: Math.max(0, orderAmount - totalFee),
    applicableFeeDescription: applicableFee?.description || 'Standard Storno-Gebühr',
    deadline,
  };
}

export async function GET(request: NextRequest, { params }: { params: { uid: string } }) {
  try {
    const { uid } = await params;
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    // Prüfe Firebase-Verbindung
    if (!db) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Hole Unternehmenseinstellungen aus der companies Collection
    const companyRef = db!.collection('companies').doc(uid);
    const companyDoc = await companyRef.get();

    if (!companyDoc.exists) {
      return NextResponse.json({ error: 'Unternehmen nicht gefunden' }, { status: 404 });
    }

    const companyData = companyDoc.data();

    // Hole Storno-Einstellungen (mit Defaults falls nicht vorhanden)
    const stornoSettings = companyData?.settings?.stornoFees || getDefaultStornoSettings();

    // Wenn orderId gegeben, hole Auftragsdaten für Deadline-Check
    let orderAnalysis: any = null;
    if (orderId) {
      try {
        const orderRef = db!.collection('auftraege').doc(orderId);
        const orderDoc = await orderRef.get();

        if (orderDoc.exists) {
          const orderData = orderDoc.data();
          orderAnalysis = checkStornoEligibility(orderData, stornoSettings);
        }
      } catch (orderError) {}
    }

    return NextResponse.json({
      success: true,
      stornoSettings,
      companyInfo: {
        uid,
        companyName: companyData?.companyName || companyData?.displayName,
        isActive: !companyData?.account?.isBlocked,
      },
      orderAnalysis, // Null wenn keine orderId oder Auftrag nicht gefunden
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Fehler beim Abrufen der Einstellungen',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: { params: { uid: string } }) {
  try {
    const { uid } = await params;
    const body = await request.json();

    // Validiere Eingabedaten
    const validationResult = validateStornoFeesInput(body);
    if (!validationResult.valid) {
      return NextResponse.json({ error: validationResult.error }, { status: 400 });
    }

    // Prüfe Firebase-Verbindung
    if (!db) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Prüfe ob Unternehmen existiert in companies Collection
    const companyRef = db!.collection('companies').doc(uid);
    const companyDoc = await companyRef.get();

    if (!companyDoc.exists) {
      return NextResponse.json({ error: 'Unternehmen nicht gefunden' }, { status: 404 });
    }

    const companyData = companyDoc.data();

    // Prüfe ob es ein Unternehmens-Account ist
    if (!companyData?.accountType || companyData.accountType !== 'company') {
      return NextResponse.json(
        { error: 'Nur für Unternehmens-Accounts verfügbar' },
        { status: 403 }
      );
    }

    // Bereite Storno-Einstellungen auf
    const stornoSettings = {
      // Grundeinstellungen
      enabled: body.enabled !== false, // Default: enabled
      lastUpdated: new Date(),
      updatedBy: uid,

      // Storno-Gebühren nach Zeitraum
      timeBasedFees: {
        before24Hours: {
          enabled: body.timeBasedFees?.before24Hours?.enabled || false,
          percentage: Math.min(
            100,
            Math.max(0, body.timeBasedFees?.before24Hours?.percentage || 0)
          ),
          fixedAmount: Math.max(0, body.timeBasedFees?.before24Hours?.fixedAmount || 0),
          description:
            body.timeBasedFees?.before24Hours?.description || 'Stornierung bis 24h vor Termin',
        },
        before48Hours: {
          enabled: body.timeBasedFees?.before48Hours?.enabled || false,
          percentage: Math.min(
            100,
            Math.max(0, body.timeBasedFees?.before48Hours?.percentage || 0)
          ),
          fixedAmount: Math.max(0, body.timeBasedFees?.before48Hours?.fixedAmount || 0),
          description:
            body.timeBasedFees?.before48Hours?.description || 'Stornierung bis 48h vor Termin',
        },
        before7Days: {
          enabled: body.timeBasedFees?.before7Days?.enabled || false,
          percentage: Math.min(100, Math.max(0, body.timeBasedFees?.before7Days?.percentage || 0)),
          fixedAmount: Math.max(0, body.timeBasedFees?.before7Days?.fixedAmount || 0),
          description:
            body.timeBasedFees?.before7Days?.description || 'Stornierung bis 7 Tage vor Termin',
        },
        afterStart: {
          enabled: body.timeBasedFees?.afterStart?.enabled !== false, // Default: enabled
          percentage: Math.min(
            100,
            Math.max(50, body.timeBasedFees?.afterStart?.percentage || 100)
          ), // Min 50%
          fixedAmount: Math.max(0, body.timeBasedFees?.afterStart?.fixedAmount || 0),
          description:
            body.timeBasedFees?.afterStart?.description || 'Stornierung nach Projektbeginn',
        },
      },

      // Spezielle Storno-Bedingungen
      specialConditions: {
        emergencyFree: body.specialConditions?.emergencyFree || false,
        emergencyProof: body.specialConditions?.emergencyProof || false,
        illnessFree: body.specialConditions?.illnessFree || false,
        illnessProof: body.specialConditions?.illnessProof || false,
        weatherCancellation: body.specialConditions?.weatherCancellation || false,
        description: body.specialConditions?.description || '',
      },

      // Allgemeine Bedingungen
      generalTerms: {
        minimumNotice: Math.max(1, body.generalTerms?.minimumNotice || 24), // Mindestens 1h
        refundMethod: body.generalTerms?.refundMethod || 'automatic',
        processingTime: body.generalTerms?.processingTime || '3-5 Werktage',
        contactRequired: body.generalTerms?.contactRequired || false,
        additionalTerms: body.generalTerms?.additionalTerms || '',
      },

      // Display-Einstellungen für Kunden
      displaySettings: {
        showInBooking: body.displaySettings?.showInBooking !== false, // Default: show
        showDetailed: body.displaySettings?.showDetailed || false,
        customText: body.displaySettings?.customText || '',
        highlightFreeStorno: body.displaySettings?.highlightFreeStorno !== false,
      },
    };

    // Update Unternehmensdaten
    await companyRef.update({
      'settings.stornoFees': stornoSettings,
      'settings.lastUpdated': new Date(),
    });

    // Log für Admin-Überwachung

    return NextResponse.json({
      success: true,
      message: 'Storno-Einstellungen erfolgreich aktualisiert',
      stornoSettings,
      publicPreview: generatePublicStornoConditions(stornoSettings),
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Fehler beim Speichern der Einstellungen' }, { status: 500 });
  }
}

/**
 * Default Storno-Einstellungen für neue Unternehmen
 */
function getDefaultStornoSettings() {
  return {
    enabled: true,
    lastUpdated: new Date(),
    updatedBy: null,

    timeBasedFees: {
      before24Hours: {
        enabled: false,
        percentage: 0,
        fixedAmount: 0,
        description: 'Stornierung bis 24h vor Termin',
      },
      before48Hours: {
        enabled: false,
        percentage: 0,
        fixedAmount: 0,
        description: 'Stornierung bis 48h vor Termin',
      },
      before7Days: {
        enabled: true,
        percentage: 0,
        fixedAmount: 0,
        description: 'Kostenlose Stornierung bis 7 Tage vor Termin',
      },
      afterStart: {
        enabled: true,
        percentage: 100,
        fixedAmount: 0,
        description: 'Keine Rückerstattung nach Projektbeginn',
      },
    },

    specialConditions: {
      emergencyFree: false,
      emergencyProof: false,
      illnessFree: false,
      illnessProof: false,
      weatherCancellation: false,
      description: '',
    },

    generalTerms: {
      minimumNotice: 24,
      refundMethod: 'automatic',
      processingTime: '3-5 Werktage',
      contactRequired: false,
      additionalTerms: '',
    },

    displaySettings: {
      showInBooking: true,
      showDetailed: false,
      customText: '',
      highlightFreeStorno: true,
    },
  };
}

/**
 * Validiere Storno-Gebühren Eingabe
 */
function validateStornoFeesInput(input: any) {
  // Grundvalidierung
  if (typeof input !== 'object' || input === null) {
    return { valid: false, error: 'Ungültige Eingabedaten' };
  }

  // Validiere Prozentsätze
  const timeBasedFees = input.timeBasedFees || {};
  for (const [period, settings] of Object.entries(timeBasedFees)) {
    const fee = settings as any;
    if (fee.enabled && fee.percentage > 100) {
      return { valid: false, error: `Prozentsatz für ${period} darf nicht über 100% liegen` };
    }
    if (fee.enabled && fee.percentage < 0) {
      return { valid: false, error: `Prozentsatz für ${period} darf nicht negativ sein` };
    }
    if (fee.enabled && fee.fixedAmount < 0) {
      return { valid: false, error: `Fester Betrag für ${period} darf nicht negativ sein` };
    }
  }

  // Validiere Mindestvorlaufzeit
  const minimumNotice = input.generalTerms?.minimumNotice;
  if (minimumNotice && (minimumNotice < 1 || minimumNotice > 7 * 24)) {
    // Max 7 Tage
    return { valid: false, error: 'Mindestvorlaufzeit muss zwischen 1 und 168 Stunden liegen' };
  }

  return { valid: true };
}

/**
 * Generiere öffentliche Storno-Bedingungen für die Anzeige
 */
function generatePublicStornoConditions(settings: any) {
  const conditions: string[] = [];

  // Zeit-basierte Gebühren
  const sortedPeriods = [
    { key: 'before7Days', label: 'bis 7 Tage vor Termin' },
    { key: 'before48Hours', label: 'bis 48 Stunden vor Termin' },
    { key: 'before24Hours', label: 'bis 24 Stunden vor Termin' },
    { key: 'afterStart', label: 'nach Projektbeginn' },
  ];

  for (const period of sortedPeriods) {
    const fee = settings.timeBasedFees[period.key];
    if (fee.enabled) {
      let feeText = '';
      if (fee.percentage === 0 && fee.fixedAmount === 0) {
        feeText = 'Kostenlose Stornierung';
      } else {
        const parts: string[] = [];
        if (fee.percentage > 0) parts.push(`${fee.percentage}% des Auftragswertes`);
        if (fee.fixedAmount > 0) parts.push(`${fee.fixedAmount} EUR Bearbeitungsgebühr`);
        feeText = parts.join(' + ');
      }

      conditions.push(`${period.label}: ${feeText}`);
    }
  }

  // Spezielle Bedingungen
  const specialConditions: string[] = [];
  if (settings.specialConditions.emergencyFree) {
    specialConditions.push(
      'Notfall' + (settings.specialConditions.emergencyProof ? ' (mit Nachweis)' : '')
    );
  }
  if (settings.specialConditions.illnessFree) {
    specialConditions.push(
      'Krankheit' + (settings.specialConditions.illnessProof ? ' (mit Attest)' : '')
    );
  }
  if (settings.specialConditions.weatherCancellation) {
    specialConditions.push('Unwetter');
  }

  if (specialConditions.length > 0) {
    conditions.push(`Kostenlose Stornierung bei: ${specialConditions.join(', ')}`);
  }

  return {
    summary: conditions,
    processingTime: settings.generalTerms.processingTime,
    minimumNotice: `${settings.generalTerms.minimumNotice} Stunden`,
    customText: settings.displaySettings.customText,
  };
}
