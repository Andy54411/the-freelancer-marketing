/**
 * Module API
 * 
 * GET: Liste verfügbare Module und deren Status
 * POST: Modul buchen oder Bundle aktivieren
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/firebase/server';
import {
  BASE_MODULES,
  PREMIUM_MODULES,
  MODULE_BUNDLE,
  calculateModulesPrice,
} from '@/lib/moduleConfig';
import { ModuleSubscriptionService } from '@/services/subscription/ModuleSubscriptionService';

// ============================================================================
// GET: Module-Übersicht
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await params;
    
    // Auth prüfen
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Nicht autorisiert' },
        { status: 401 }
      );
    }

    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Server-Auth nicht verfügbar' },
        { status: 500 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    
    // Prüfe Berechtigung (Inhaber oder Admin)
    if (decodedToken.uid !== uid && decodedToken.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Keine Berechtigung' },
        { status: 403 }
      );
    }

    // Aktive Module laden
    const summary = await ModuleSubscriptionService.getModuleSummary(uid);
    const subscriptions = await ModuleSubscriptionService.getModuleSubscriptions(uid);

    // Module-Liste aufbauen
    const baseModules = Object.values(BASE_MODULES).map(module => ({
      ...module,
      status: 'included' as const,
      statusLabel: 'Im Abo enthalten',
    }));

    const premiumModules = Object.values(PREMIUM_MODULES).map(module => {
      const subscription = subscriptions.find(s => s.moduleId === module.id);
      const isActive = summary.activeModules.includes(module.id);
      const isTrialing = summary.trialingModules.includes(module.id);
      const isBundleActive = summary.bundleActive;
      
      let status: 'active' | 'trial' | 'available' | 'bundle';
      let statusLabel: string;
      
      if (isBundleActive) {
        status = 'bundle';
        statusLabel = 'Im Bundle enthalten';
      } else if (isActive) {
        status = 'active';
        statusLabel = 'Aktiv';
      } else if (isTrialing) {
        status = 'trial';
        const daysLeft = subscription?.trialEndDate 
          ? Math.ceil((subscription.trialEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : 0;
        statusLabel = `Testphase (${daysLeft} Tage)`;
      } else {
        status = 'available';
        statusLabel = 'Verfügbar';
      }

      return {
        ...module,
        status,
        statusLabel,
        subscription: subscription || null,
        trialUsed: subscription?.trialUsed || false,
      };
    });

    // Bundle-Info
    const bundleInfo = {
      ...MODULE_BUNDLE,
      isActive: summary.bundleActive,
    };

    // Preisberechnung
    const activeModuleIds = summary.activeModules.filter(
      id => !summary.bundleActive || !MODULE_BUNDLE.includes.includes(id as 'whatsapp' | 'advertising' | 'recruiting' | 'workspace')
    );
    const monthlyTotal = summary.bundleActive 
      ? MODULE_BUNDLE.price.monthly 
      : calculateModulesPrice(activeModuleIds, 'monthly');

    return NextResponse.json({
      success: true,
      data: {
        baseModules,
        premiumModules,
        bundle: bundleInfo,
        summary: {
          activeModules: summary.activeModules,
          trialingModules: summary.trialingModules,
          bundleActive: summary.bundleActive,
          monthlyTotal,
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    console.error('[Modules API] GET Fehler:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Fehler beim Laden der Module',
        details: message,
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST: Modul buchen
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await params;
    
    // Auth prüfen
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Nicht autorisiert' },
        { status: 401 }
      );
    }

    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Server-Auth nicht verfügbar' },
        { status: 500 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    
    // Prüfe Berechtigung (nur Inhaber)
    if (decodedToken.uid !== uid) {
      return NextResponse.json(
        { success: false, error: 'Nur der Inhaber kann Module buchen' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, moduleId, billingInterval = 'monthly', withTrial = true } = body;

    // Bundle buchen
    if (action === 'subscribe-bundle') {
      const result = await ModuleSubscriptionService.subscribeBundle({
        companyId: uid,
        billingInterval,
        startTrial: withTrial,
      });

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Bundle erfolgreich gebucht',
        data: {
          subscriptionIds: result.subscriptionIds,
        },
      });
    }

    // Einzelnes Modul buchen
    if (action === 'subscribe') {
      if (!moduleId) {
        return NextResponse.json(
          { success: false, error: 'moduleId erforderlich' },
          { status: 400 }
        );
      }

      const result = await ModuleSubscriptionService.subscribeModule({
        companyId: uid,
        moduleId,
        billingInterval,
        startTrial: withTrial,
      });

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: withTrial ? 'Testphase gestartet' : 'Modul erfolgreich gebucht',
        data: {
          subscriptionId: result.subscriptionId,
        },
      });
    }

    // Modul kündigen
    if (action === 'cancel') {
      if (!moduleId) {
        return NextResponse.json(
          { success: false, error: 'moduleId erforderlich' },
          { status: 400 }
        );
      }

      const result = await ModuleSubscriptionService.cancelModule(
        uid,
        moduleId,
        body.reason || 'Vom Nutzer gekündigt'
      );

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Modul wird zum Periodenende gekündigt',
        data: {
          effectiveDate: result.effectiveDate,
        },
      });
    }

    return NextResponse.json(
      { success: false, error: 'Ungültige Aktion' },
      { status: 400 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    console.error('[Modules API] POST Fehler:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Fehler beim Verarbeiten der Anfrage',
        details: message,
      },
      { status: 500 }
    );
  }
}
