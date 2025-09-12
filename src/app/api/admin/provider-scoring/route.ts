import { NextRequest, NextResponse } from 'next/server';
import { db as adminDb } from '@/firebase/server';

/**
 * PROVIDER SCORING SYSTEM API
 * 4-Kategorie Bewertungssystem mit automatischem Blocking
 * - Storno-Rate: 40% Gewichtung
 * - Lieferzeiten: 30% Gewichtung
 * - Kundenzufriedenheit: 20% Gewichtung
 * - Antwortzeit: 10% Gewichtung
 */

export async function GET(request: NextRequest) {
  try {
    // Check if Firebase is available
    if (!adminDb) {
      return NextResponse.json({ error: 'Firebase Admin not available' }, { status: 500 });
    }

    const url = new URL(request.url);
    const providerId = url.searchParams.get('providerId');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const minScore = parseInt(url.searchParams.get('minScore') || '0');
    const includeBlocked = url.searchParams.get('includeBlocked') === 'true';

    if (providerId) {
      // Einzelner Provider Score
      const providerScore = await getProviderScore(providerId);
      return NextResponse.json({
        success: true,
        providerScore,
      });
    } else {
      // Alle Provider Scores mit Filtering
      const providerScores = await getAllProviderScores(limit, minScore, includeBlocked);
      return NextResponse.json({
        success: true,
        providerScores,
        total: providerScores.length,
        filters: { limit, minScore, includeBlocked },
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Provider-Bewertungen' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { providerId, action, adminUserId, reason } = body;

    // Validierung
    if (!providerId || !action || !adminUserId) {
      return NextResponse.json(
        { error: 'Pflichtfelder fehlen: providerId, action, adminUserId' },
        { status: 400 }
      );
    }

    if (!['block', 'unblock', 'reset_score'].includes(action)) {
      return NextResponse.json(
        { error: 'Ungültige Aktion - nur block, unblock oder reset_score erlaubt' },
        { status: 400 }
      );
    }

    const result = await executeProviderScoreAction(providerId, action, adminUserId, reason);

    return NextResponse.json({
      success: true,
      message: result.message,
      updatedScore: result.updatedScore,
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Fehler bei der Provider-Aktion' }, { status: 500 });
  }
}

/**
 * Hole detaillierten Score für einen Provider
 */
async function getProviderScore(providerId: string) {
  try {
    if (!adminDb) {
      throw new Error('Firebase Admin not available');
    }

    const providerRef = adminDb.collection('users').doc(providerId);
    const providerDoc = await providerRef.get();

    if (!providerDoc.exists) {
      throw new Error('Provider nicht gefunden');
    }

    const providerData = providerDoc.data();
    const currentScore = providerData?.providerScore || (await initializeProviderScore(providerId));

    // Berechne detaillierte Score-Aufschlüsselung
    const scoreBreakdown = calculateScoreBreakdown(currentScore);

    // Hole aktuelle Aufträge für zusätzliche Statistiken
    const orderStats = await getProviderOrderStats(providerId);

    return {
      providerId,
      providerName: providerData?.displayName || 'Unbekannt',
      companyName: providerData?.companyName || null,

      // Haupt-Score
      overallScore: currentScore.overallScore || 100,
      scoreStatus: getScoreStatus(currentScore.overallScore || 100),

      // Kategorie-Aufschlüsselung
      categories: scoreBreakdown,

      // Statistiken
      stats: {
        totalOrders: orderStats.totalOrders,
        completedOrders: orderStats.completedOrders,
        approvedStornos: currentScore.approvedStornos || 0,
        stornoRate: currentScore.stornoRate || 0,
        lastUpdated: currentScore.lastUpdated,
      },

      // Account Status
      account: {
        isBlocked: providerData?.account?.isBlocked || false,
        blockReason: providerData?.account?.blockReason || null,
        blockedAt: providerData?.account?.blockedAt || null,
        blockType: providerData?.account?.blockType || null,
      },
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Hole alle Provider Scores mit Filtering
 */
async function getAllProviderScores(limit: number, minScore: number, includeBlocked: boolean) {
  try {
    if (!adminDb) {
      throw new Error('Firebase Admin not available');
    }

    const query = adminDb
      .collection('users')
      .where('user_type', '==', 'firma') // Nur Anbieter-Accounts
      .limit(limit);

    const querySnapshot = await query.get();
    const providers: Array<{
      providerId: string;
      providerName: string;
      companyName: string | null;
      overallScore: number;
      scoreStatus: string;
      stornoRate: number;
      totalOrders: number;
      isBlocked: boolean;
      blockReason: string | null;
      lastUpdated: any;
    }> = [];

    for (const doc of querySnapshot.docs) {
      const providerData = doc.data();
      const providerId = doc.id;

      // Filter: Blockierte Accounts
      if (!includeBlocked && providerData?.account?.isBlocked) {
        continue;
      }

      const currentScore =
        providerData?.providerScore || (await initializeProviderScore(providerId));
      const overallScore = currentScore.overallScore || 100;

      // Filter: Mindest-Score
      if (overallScore < minScore) {
        continue;
      }

      providers.push({
        providerId,
        providerName: providerData?.displayName || 'Unbekannt',
        companyName: providerData?.companyName || null,
        overallScore,
        scoreStatus: getScoreStatus(overallScore),
        stornoRate: currentScore.stornoRate || 0,
        totalOrders: currentScore.totalOrders || 0,
        isBlocked: providerData?.account?.isBlocked || false,
        blockReason: providerData?.account?.blockReason || null,
        lastUpdated: currentScore.lastUpdated,
      });
    }

    // Sortiere nach Overall Score (niedrigste zuerst für Admin-Aufmerksamkeit)
    providers.sort((a, b) => a.overallScore - b.overallScore);

    return providers;
  } catch (error) {
    throw error;
  }
}

/**
 * Berechne detaillierte Score-Aufschlüsselung
 */
function calculateScoreBreakdown(scoreData: any) {
  const stornoRate = scoreData.stornoRate || 0;
  const deliveryDelays = scoreData.deliveryDelays || 0;
  const customerSatisfaction = scoreData.customerSatisfaction || 100;
  const responseTime = scoreData.responseTime || 100;

  // Kategorie-Scores berechnen
  const stornoRateScore = Math.max(0, 100 - stornoRate);
  const deliveryDelayScore = Math.max(0, 100 - deliveryDelays);

  return {
    stornoRate: {
      score: stornoRateScore,
      weight: 40,
      value: stornoRate,
      status: getCategoryStatus(stornoRateScore),
      description: `${stornoRate.toFixed(1)}% Stornierungsrate`,
    },
    deliveryDelays: {
      score: deliveryDelayScore,
      weight: 30,
      value: deliveryDelays,
      status: getCategoryStatus(deliveryDelayScore),
      description: `${deliveryDelays.toFixed(1)}% Lieferverzögerungen`,
    },
    customerSatisfaction: {
      score: customerSatisfaction,
      weight: 20,
      value: customerSatisfaction,
      status: getCategoryStatus(customerSatisfaction),
      description: `${customerSatisfaction.toFixed(1)}% Kundenzufriedenheit`,
    },
    responseTime: {
      score: responseTime,
      weight: 10,
      value: responseTime,
      status: getCategoryStatus(responseTime),
      description: `${responseTime.toFixed(1)}% Antwortzeit-Score`,
    },
  };
}

/**
 * Provider Order-Statistiken berechnen
 */
async function getProviderOrderStats(providerId: string) {
  try {
    if (!adminDb) {
      throw new Error('Firebase Admin not available');
    }

    const ordersSnapshot = await adminDb
      .collection('auftraege')
      .where('selectedAnbieterId', '==', providerId)
      .get();

    const totalOrders = ordersSnapshot.size;
    let completedOrders = 0;

    ordersSnapshot.docs.forEach(doc => {
      const orderData = doc.data();
      if (orderData.status === 'ABGESCHLOSSEN') {
        completedOrders++;
      }
    });

    return {
      totalOrders,
      completedOrders,
      completionRate: totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0,
    };
  } catch (error) {
    return {
      totalOrders: 0,
      completedOrders: 0,
      completionRate: 0,
    };
  }
}

/**
 * Provider Score initialisieren falls nicht vorhanden
 */
async function initializeProviderScore(providerId: string) {
  const defaultScore = {
    stornoRate: 0,
    deliveryDelays: 0,
    customerSatisfaction: 100,
    responseTime: 100,
    overallScore: 100,
    totalOrders: 0,
    approvedStornos: 0,
    lastUpdated: new Date(),
  };

  try {
    if (!adminDb) {
      return defaultScore;
    }

    await adminDb.collection('users').doc(providerId).update({
      providerScore: defaultScore,
    });
  } catch (error) {}

  return defaultScore;
}

/**
 * Provider Score Action ausführen (Block/Unblock/Reset)
 */
async function executeProviderScoreAction(
  providerId: string,
  action: string,
  adminUserId: string,
  reason?: string
) {
  if (!adminDb) {
    throw new Error('Firebase Admin not available');
  }

  const providerRef = adminDb.collection('users').doc(providerId);
  const providerDoc = await providerRef.get();

  if (!providerDoc.exists) {
    throw new Error('Provider nicht gefunden');
  }

  switch (action) {
    case 'block':
      await providerRef.update({
        'account.isBlocked': true,
        'account.blockReason': reason || 'Manuell durch Admin blockiert',
        'account.blockedAt': new Date(),
        'account.blockedBy': adminUserId,
        'account.blockType': 'manual_admin',
      });
      return { message: 'Provider erfolgreich blockiert' };

    case 'unblock':
      await providerRef.update({
        'account.isBlocked': false,
        'account.blockReason': null,
        'account.blockedAt': null,
        'account.blockedBy': null,
        'account.blockType': null,
        'account.unblockedAt': new Date(),
        'account.unblockedBy': adminUserId,
        'account.unblockReason': reason || 'Manuell durch Admin freigegeben',
      });
      return { message: 'Provider erfolgreich freigegeben' };

    case 'reset_score':
      const resetScore = await initializeProviderScore(providerId);
      return {
        message: 'Provider Score zurückgesetzt',
        updatedScore: resetScore,
      };

    default:
      throw new Error('Ungültige Aktion');
  }
}

/**
 * Score-Status bestimmen
 */
function getScoreStatus(score: number): string {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'average';
  if (score >= 20) return 'poor';
  return 'critical';
}

/**
 * Kategorie-Status bestimmen
 */
function getCategoryStatus(score: number): string {
  if (score >= 90) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'average';
  if (score >= 30) return 'poor';
  return 'critical';
}
