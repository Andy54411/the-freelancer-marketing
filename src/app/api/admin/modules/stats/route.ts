/**
 * Admin Module Stats API
 * 
 * Endpoint: GET /api/admin/modules/stats
 * Holt alle Modul-Abonnement-Statistiken für Admins
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth as adminAuth, db as adminDb } from '@/firebase/server';

export async function GET(request: NextRequest) {
  try {
    // Auth Check
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Nicht autorisiert' },
        { status: 401 }
      );
    }

    const idToken = authHeader.substring(7);
    const decodedToken = await adminAuth?.verifyIdToken(idToken);
    
    if (!decodedToken) {
      return NextResponse.json(
        { success: false, error: 'Ungültiger Token' },
        { status: 401 }
      );
    }

    // Admin Check
    const userDoc = await adminDb?.collection('users').doc(decodedToken.uid).get();
    const userData = userDoc?.data();
    
    if (!userData || userData.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Keine Admin-Berechtigung' },
        { status: 403 }
      );
    }

    // Alle Companies mit Modul-Daten laden
    const companiesSnapshot = await adminDb?.collection('companies').get();
    
    const stats = {
      totalActiveModules: 0,
      totalTrialingModules: 0,
      totalBundles: 0,
      totalSeats: 0,
      monthlyRevenue: 0,
      moduleBreakdown: {
        whatsapp: { active: 0, trial: 0 },
        advertising: { active: 0, trial: 0 },
        recruiting: { active: 0, trial: 0 },
        workspace: { active: 0, trial: 0 },
      } as Record<string, { active: number; trial: number }>,
    };

    const MODULE_PRICES: Record<string, number> = {
      whatsapp: 14.99,
      advertising: 24.99,
      recruiting: 19.99,
      workspace: 9.99,
    };

    const BUNDLE_PRICE = 49.99;
    const SEAT_PRICE = 5.99;

    interface CompanyModuleData {
      companyId: string;
      companyName: string;
      email: string;
      activeModules: string[];
      trialingModules: string[];
      bundleActive: boolean;
      seats: {
        total: number;
        used: number;
      };
      monthlyTotal: number;
      createdAt: string;
    }

    const companies: CompanyModuleData[] = [];

    if (companiesSnapshot) {
      for (const companyDoc of companiesSnapshot.docs) {
        const companyData = companyDoc.data();
        const companyId = companyDoc.id;

        // Module-Subcollection laden
        const modulesSnapshot = await adminDb
          ?.collection('companies')
          .doc(companyId)
          .collection('modules')
          .get();

        const activeModules: string[] = [];
        const trialingModules: string[] = [];
        let bundleActive = false;
        let companyMonthly = 0;

        if (modulesSnapshot) {
          for (const moduleDoc of modulesSnapshot.docs) {
            const moduleData = moduleDoc.data();
            const moduleId = moduleDoc.id;

            if (moduleId === 'bundle') {
              if (moduleData.status === 'active') {
                bundleActive = true;
                stats.totalBundles++;
                companyMonthly += BUNDLE_PRICE;
              }
              continue;
            }

            if (moduleData.status === 'active') {
              activeModules.push(moduleId);
              stats.totalActiveModules++;
              if (stats.moduleBreakdown[moduleId]) {
                stats.moduleBreakdown[moduleId].active++;
              }
              if (!bundleActive) {
                companyMonthly += MODULE_PRICES[moduleId] || 0;
              }
            } else if (moduleData.status === 'trial') {
              trialingModules.push(moduleId);
              stats.totalTrialingModules++;
              if (stats.moduleBreakdown[moduleId]) {
                stats.moduleBreakdown[moduleId].trial++;
              }
            }
          }
        }

        // Seats laden
        const seatsDoc = await adminDb
          ?.collection('companies')
          .doc(companyId)
          .collection('settings')
          .doc('seats')
          .get();

        const seatsData = seatsDoc?.data();
        const totalSeats = seatsData?.total || 1;
        const usedSeats = seatsData?.used || 1;
        const paidSeats = Math.max(0, totalSeats - 1);

        stats.totalSeats += totalSeats;
        companyMonthly += paidSeats * SEAT_PRICE;
        stats.monthlyRevenue += companyMonthly;

        // Nur Companies mit Modulen oder Seats > 1 aufnehmen
        if (activeModules.length > 0 || trialingModules.length > 0 || bundleActive || totalSeats > 1) {
          companies.push({
            companyId,
            companyName: companyData.companyName || companyData.step1?.companyName || 'Unbekannt',
            email: companyData.email || '',
            activeModules,
            trialingModules,
            bundleActive,
            seats: {
              total: totalSeats,
              used: usedSeats,
            },
            monthlyTotal: companyMonthly,
            createdAt: companyData.createdAt?.toDate?.()?.toISOString() || '',
          });
        }
      }
    }

    // Nach monatlichem Umsatz sortieren
    companies.sort((a, b) => b.monthlyTotal - a.monthlyTotal);

    return NextResponse.json({
      success: true,
      stats,
      companies,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json(
      { 
        success: false, 
        error: 'Fehler beim Laden der Statistiken',
        details: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
