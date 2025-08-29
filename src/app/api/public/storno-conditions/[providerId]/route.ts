import { NextRequest, NextResponse } from 'next/server';
import { db as adminDb } from '@/firebase/server';

/**
 * PUBLIC STORNO CONDITIONS API
 * Zeigt die öffentlichen Storno-Bedingungen für einen Anbieter an
 * Wird in der Buchung und Auftragsübersicht angezeigt
 */

export async function GET(
  request: NextRequest,
  { params }: { params: { providerId: string } }
) {
  try {
    // Check if Firebase is available
    if (!adminDb) {
      return NextResponse.json({ error: 'Firebase Admin not available' }, { status: 500 });
    }

    const { providerId } = params;
    const url = new URL(request.url);
    const auftragId = url.searchParams.get('auftragId');
    const format = url.searchParams.get('format') || 'detailed'; // 'summary' oder 'detailed'

    // Hole Provider-Daten
    const providerRef = adminDb.collection('users').doc(providerId);
    const providerDoc = await providerRef.get();

    if (!providerDoc.exists) {
      return NextResponse.json(
        { error: 'Anbieter nicht gefunden' },
        { status: 404 }
      );
    }

    const providerData = providerDoc.data();

    // Prüfe ob Provider aktiv ist
    if (providerData?.account?.isBlocked) {
      return NextResponse.json(
        { error: 'Anbieter ist momentan nicht verfügbar' },
        { status: 403 }
      );
    }

    // Hole Storno-Einstellungen
    const stornoSettings = providerData?.settings?.stornoFees || getDefaultStornoConditions();

    // Falls spezifischer Auftrag angegeben, berechne konkrete Werte
    let auftragSpecificInfo: any = null;
    if (auftragId) {
      auftragSpecificInfo = await calculateAuftragSpecificStornoInfo(auftragId, stornoSettings);
    }

    // Generiere öffentliche Bedingungen
    const publicConditions = generatePublicStornoDisplay(stornoSettings, format, auftragSpecificInfo);

    return NextResponse.json({
      success: true,
      provider: {
        id: providerId,
        name: providerData?.displayName || providerData?.companyName,
        companyName: providerData?.companyName
      },
      stornoConditions: publicConditions,
      auftragSpecific: auftragSpecificInfo,
      lastUpdated: stornoSettings.lastUpdated || null
    });

  } catch (error: any) {
    console.error('Fehler beim Abrufen der öffentlichen Storno-Bedingungen:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden der Storno-Bedingungen' },
      { status: 500 }
    );
  }
}

/**
 * Berechne auftragsspezifische Storno-Informationen mit Deadline-Management
 */
async function calculateAuftragSpecificStornoInfo(auftragId: string, stornoSettings: any) {
  try {
    if (!adminDb) return null;

    const auftragRef = adminDb.collection('auftraege').doc(auftragId);
    const auftragDoc = await auftragRef.get();

    if (!auftragDoc.exists) return null;

    const auftragData = auftragDoc.data();
    
    // DEADLINE MANAGEMENT: Verwende jobDateTo als primäre Deadline, dann jobDateFrom
    const deadline = auftragData?.jobDateTo || auftragData?.jobDateFrom;
    if (!deadline) {
      return {
        auftragId,
        hasDeadline: false,
        stornoNotAvailable: 'Kein Termin definiert'
      };
    }

    const deadlineDate = new Date(deadline);
    deadlineDate.setHours(23, 59, 59, 999); // Ende des Tages
    
    const now = new Date();
    const isOverdue = now > deadlineDate;
    const timeDiff = deadlineDate.getTime() - now.getTime();
    const hoursUntilDeadline = Math.ceil(timeDiff / (1000 * 60 * 60));
    
    const totalAmount = auftragData?.totalAmountPaidByBuyer || auftragData?.jobCalculatedPriceInCents || 0;

    // LIEFERVERZUG CHECK: Wenn überfällig, Vollerstattung ohne Gebühren
    if (isOverdue) {
      return {
        auftragId,
        hasDeadline: true,
        isOverdue: true,
        deadlineDate: deadlineDate.toISOString(),
        hoursOverdue: Math.abs(hoursUntilDeadline),
        stornoType: 'lieferverzug',
        totalAmount: totalAmount / 100,
        fullRefundRight: true,
        refundAmount: totalAmount / 100,
        processingFee: 0,
        message: 'LIEFERVERZUG: Vollständige Rückerstattung ohne Abzüge',
        priority: 'urgent'
      };
    }

    // NORMALE STORNO-BERECHNUNG basierend auf verbleibender Zeit
    let applicableFee: any = null;
    
    if (hoursUntilDeadline <= 0) {
      // Deadline erreicht oder überschritten
      applicableFee = stornoSettings.timeBasedFees.afterStart;
    } else if (hoursUntilDeadline <= 24) {
      // Weniger als 24h bis Deadline
      applicableFee = stornoSettings.timeBasedFees.before24Hours?.enabled 
        ? stornoSettings.timeBasedFees.before24Hours 
        : stornoSettings.timeBasedFees.afterStart;
    } else if (hoursUntilDeadline <= 48) {
      // 24-48h bis Deadline
      applicableFee = stornoSettings.timeBasedFees.before48Hours?.enabled 
        ? stornoSettings.timeBasedFees.before48Hours 
        : stornoSettings.timeBasedFees.before24Hours?.enabled
          ? stornoSettings.timeBasedFees.before24Hours
          : stornoSettings.timeBasedFees.afterStart;
    } else if (hoursUntilDeadline <= 168) { // 7 Tage
      // 2-7 Tage bis Deadline
      applicableFee = stornoSettings.timeBasedFees.before7Days?.enabled 
        ? stornoSettings.timeBasedFees.before7Days 
        : stornoSettings.timeBasedFees.before48Hours?.enabled
          ? stornoSettings.timeBasedFees.before48Hours
          : stornoSettings.timeBasedFees.before24Hours?.enabled
            ? stornoSettings.timeBasedFees.before24Hours
            : stornoSettings.timeBasedFees.afterStart;
    } else {
      // Mehr als 7 Tage bis Deadline
      applicableFee = stornoSettings.timeBasedFees.before7Days?.enabled 
        ? stornoSettings.timeBasedFees.before7Days 
        : { enabled: true, percentage: 0, fixedAmount: 0, description: 'Kostenlose Stornierung' };
    }

    // Berechne konkrete Kosten
    const percentageFee = Math.round((totalAmount * (applicableFee?.percentage || 0)) / 100);
    const fixedFee = Math.round((applicableFee?.fixedAmount || 0) * 100); // Convert to cents
    const totalStornoFee = percentageFee + fixedFee;
    const refundAmount = Math.max(0, totalAmount - totalStornoFee);

    return {
      auftragId,
      hasDeadline: true,
      isOverdue: false,
      deadlineDate: deadlineDate.toISOString(),
      hoursUntilDeadline: Math.max(0, hoursUntilDeadline),
      daysUntilDeadline: Math.ceil(hoursUntilDeadline / 24),
      stornoType: 'normal',
      totalAmount: totalAmount / 100, // In EUR
      applicableFee: {
        ...applicableFee,
        percentageFee: percentageFee / 100, // In EUR
        fixedFee: (applicableFee?.fixedAmount || 0), // In EUR
        totalFee: totalStornoFee / 100, // In EUR
      },
      refundAmount: refundAmount / 100, // In EUR
      processingFee: totalStornoFee / 100, // In EUR
      canCancel: stornoSettings.enabled && applicableFee?.enabled,
      timeWindow: getTimeWindowDescription(hoursUntilDeadline)
    };

  } catch (error) {
    console.error('Fehler bei der Berechnung der auftragsspezifischen Storno-Info:', error);
    return null;
  }
}

/**
 * Hilfsfunktion für Zeit-Fenster Beschreibung
 */
function getTimeWindowDescription(hours: number): string {
  if (hours <= 0) return 'Deadline erreicht';
  if (hours <= 24) return `${hours}h bis Deadline`;
  if (hours <= 48) return `${Math.ceil(hours / 24)} Tag${Math.ceil(hours / 24) > 1 ? 'e' : ''} bis Deadline`;
  if (hours <= 168) return `${Math.ceil(hours / 24)} Tage bis Deadline`;
  return `Über ${Math.ceil(hours / 168)} Woche${Math.ceil(hours / 168) > 1 ? 'n' : ''} bis Deadline`;
}

/**
 * Generiere öffentliche Storno-Anzeige
 */
function generatePublicStornoDisplay(settings: any, format: string, auftragInfo: any = null) {
  const display: {
    enabled: boolean;
    format: string;
    summary: string[];
    details: any;
    specialConditions: string[];
    generalInfo: any;
    customText?: string;
    highlight?: string;
  } = {
    enabled: settings.enabled !== false,
    format,
    summary: [],
    details: {},
    specialConditions: [],
    generalInfo: {}
  };

  if (!display.enabled) {
    return {
      ...display,
      summary: ['Stornierungen sind für diesen Anbieter nicht möglich'],
      message: 'Bitte kontaktieren Sie den Anbieter direkt bei Fragen'
    };
  }

  // Zeit-basierte Gebühren aufbereiten
  const timeBasedFees = settings.timeBasedFees || {};
  const sortedPeriods = [
    { key: 'before7Days', label: 'Mehr als 7 Tage vor Termin', hours: 168 },
    { key: 'before48Hours', label: '2-7 Tage vor Termin', hours: 48 },
    { key: 'before24Hours', label: '1-2 Tage vor Termin', hours: 24 },
    { key: 'afterStart', label: 'Weniger als 24h oder nach Beginn', hours: 0 }
  ];

  for (const period of sortedPeriods) {
    const fee = timeBasedFees[period.key];
    if (fee?.enabled !== false) { // Default enabled für afterStart
      const feeInfo = formatFeeInfo(fee);
      
      if (format === 'summary') {
        display.summary.push(`${period.label}: ${feeInfo.text}`);
      } else {
        display.details[period.key] = {
          label: period.label,
          hours: period.hours,
          ...feeInfo,
          isCurrent: auftragInfo && isCurrentPeriod(auftragInfo.hoursUntilJob, period.hours)
        };
      }
    }
  }

  // Spezielle Bedingungen
  const special = settings.specialConditions || {};
  const specialList: string[] = [];

  if (special.emergencyFree) {
    specialList.push(`Notfall${special.emergencyProof ? ' (mit Nachweis)' : ''}`);
  }
  if (special.illnessFree) {
    specialList.push(`Krankheit${special.illnessProof ? ' (mit Attest)' : ''}`);
  }
  if (special.weatherCancellation) {
    specialList.push('Unwetter/höhere Gewalt');
  }

  if (specialList.length > 0) {
    display.specialConditions = specialList;
    if (format === 'summary') {
      display.summary.push(`Kostenlose Stornierung bei: ${specialList.join(', ')}`);
    }
  }

  // Allgemeine Informationen
  const general = settings.generalTerms || {};
  display.generalInfo = {
    minimumNotice: `${general.minimumNotice || 24} Stunden`,
    processingTime: general.processingTime || '3-5 Werktage',
    refundMethod: general.refundMethod === 'manual' ? 'Manuelle Bearbeitung' : 'Automatische Rückerstattung',
    contactRequired: general.contactRequired || false
  };

  // Custom Text
  if (settings.displaySettings?.customText) {
    display.customText = settings.displaySettings.customText;
  }

  // Highlight für kostenlose Stornierung
  if (settings.displaySettings?.highlightFreeStorno && hasFreeCancellation(timeBasedFees)) {
    display.highlight = 'Kostenlose Stornierung möglich';
  }

  return display;
}

/**
 * Formatiere Gebühren-Information
 */
function formatFeeInfo(fee: any) {
  if (!fee) {
    return { text: 'Nicht verfügbar', percentage: 0, fixedAmount: 0, isFree: false };
  }

  const percentage = fee.percentage || 0;
  const fixedAmount = fee.fixedAmount || 0;

  if (percentage === 0 && fixedAmount === 0) {
    return { 
      text: 'Kostenlose Stornierung', 
      percentage: 0, 
      fixedAmount: 0, 
      isFree: true,
      color: 'success'
    };
  }

  const parts: string[] = [];
  if (percentage > 0) parts.push(`${percentage}% des Auftragswertes`);
  if (fixedAmount > 0) parts.push(`${fixedAmount} EUR Bearbeitungsgebühr`);

  const text = parts.length > 0 ? parts.join(' + ') : 'Keine Rückerstattung';
  const color = percentage === 0 ? 'warning' : percentage >= 50 ? 'danger' : 'warning';

  return { 
    text, 
    percentage, 
    fixedAmount, 
    isFree: false,
    color
  };
}

/**
 * Prüfe ob aktueller Zeitraum
 */
function isCurrentPeriod(hoursUntilJob: number, periodHours: number): boolean {
  if (periodHours === 0) return hoursUntilJob < 24; // afterStart
  if (periodHours === 24) return hoursUntilJob >= 24 && hoursUntilJob < 48;
  if (periodHours === 48) return hoursUntilJob >= 48 && hoursUntilJob < 168;
  if (periodHours === 168) return hoursUntilJob >= 168;
  return false;
}

/**
 * Prüfe ob kostenlose Stornierung verfügbar
 */
function hasFreeCancellation(timeBasedFees: any): boolean {
  return Object.values(timeBasedFees || {}).some((fee: any) => 
    fee?.enabled && fee.percentage === 0 && fee.fixedAmount === 0
  );
}

/**
 * Default Storno-Bedingungen für Provider ohne Einstellungen
 */
function getDefaultStornoConditions() {
  return {
    enabled: true,
    timeBasedFees: {
      before7Days: {
        enabled: true,
        percentage: 0,
        fixedAmount: 0,
        description: 'Kostenlose Stornierung bis 7 Tage vor Termin'
      },
      before48Hours: {
        enabled: false,
        percentage: 10,
        fixedAmount: 0,
        description: 'Stornierung bis 48h vor Termin'
      },
      before24Hours: {
        enabled: false,
        percentage: 25,
        fixedAmount: 0,
        description: 'Stornierung bis 24h vor Termin'
      },
      afterStart: {
        enabled: true,
        percentage: 100,
        fixedAmount: 0,
        description: 'Keine Rückerstattung nach Projektbeginn'
      }
    },
    specialConditions: {
      emergencyFree: false,
      emergencyProof: false,
      illnessFree: false,
      illnessProof: false,
      weatherCancellation: false
    },
    generalTerms: {
      minimumNotice: 24,
      refundMethod: 'automatic',
      processingTime: '3-5 Werktage',
      contactRequired: false
    },
    displaySettings: {
      showInBooking: true,
      showDetailed: false,
      customText: '',
      highlightFreeStorno: true
    }
  };
}
