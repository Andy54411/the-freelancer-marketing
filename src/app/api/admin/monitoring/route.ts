// src/app/api/admin/monitoring/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/firebase/server';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY!;

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
    apiVersion: '2024-06-20',
  })
  : null;

interface MonitoringMetrics {
  timestamp: string;
  payments: {
    total: number;
    successful: number;
    failed: number;
    pending: number;
    totalVolume: number;
    averageAmount: number;
  };
  webhooks: {
    total: number;
    delivered: number;
    failed: number;
    pending: number;
    healthScore: number;
  };
  accounts: {
    main: {
      active: boolean;
      paymentsEnabled: boolean;
      payoutsEnabled: boolean;
    };
    connected: {
      total: number;
      active: number;
      withIssues: number;
    };
  };
  system: {
    apiLatency: number;
    errorRate: number;
    uptime: number;
  };
}

export async function GET(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const realTime = searchParams.get('realtime') === 'true';
    const interval = searchParams.get('interval') || '5min'; // 5min, 15min, 1h, 1d

    const now = new Date();
    const startTime = Date.now();

    // Real-time Überwachungsintervall
    let timeWindow: number;
    switch (interval) {
      case '1min':
        timeWindow = 60 * 1000;
        break;
      case '5min':
        timeWindow = 5 * 60 * 1000;
        break;
      case '15min':
        timeWindow = 15 * 60 * 1000;
        break;
      case '1h':
        timeWindow = 60 * 60 * 1000;
        break;
      case '1d':
        timeWindow = 24 * 60 * 60 * 1000;
        break;
      default:
        timeWindow = 5 * 60 * 1000;
    }

    const created = Math.floor((now.getTime() - timeWindow) / 1000);

    console.log(`[Monitoring] Real-time check - interval: ${interval}, window: ${timeWindow}ms`);

    // 1. Parallellade alle kritischen Daten
    const [recentEvents, recentPaymentIntents, recentCharges, connectedAccounts, webhookEndpoints] =
      await Promise.all([
        stripe.events.list({ limit: 100, created: { gte: created } }),
        stripe.paymentIntents.list({ limit: 50, created: { gte: created } }),
        stripe.charges.list({ limit: 50, created: { gte: created } }),
        stripe.accounts.list({ limit: 100 }),
        stripe.webhookEndpoints.list({ limit: 50 }),
      ]);

    // 2. Sammle Connected Account Status
    const connectedAccountsStatus = await Promise.all(
      connectedAccounts.data.slice(0, 10).map(async account => {
        try {
          const accountDetails = await stripe.accounts.retrieve(account.id);
          return {
            id: account.id,
            active: accountDetails.charges_enabled && accountDetails.payouts_enabled,
            charges_enabled: accountDetails.charges_enabled,
            payouts_enabled: accountDetails.payouts_enabled,
            hasIssues: !accountDetails.charges_enabled || !accountDetails.payouts_enabled,
          };
        } catch (error) {
          return {
            id: account.id,
            active: false,
            charges_enabled: false,
            payouts_enabled: false,
            hasIssues: true,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      })
    );

    // 3. Berechne Payment-Metriken
    const paymentMetrics = {
      total: recentPaymentIntents.data.length + recentCharges.data.length,
      successful: [
        ...recentPaymentIntents.data.filter(pi => pi.status === 'succeeded'),
        ...recentCharges.data.filter(ch => ch.status === 'succeeded'),
      ].length,
      failed: [
        ...recentPaymentIntents.data.filter(pi => ['failed', 'canceled'].includes(pi.status)),
        ...recentCharges.data.filter(ch => ch.status === 'failed'),
      ].length,
      pending: [
        ...recentPaymentIntents.data.filter(pi =>
          ['processing', 'requires_action', 'requires_payment_method'].includes(pi.status)
        ),
        ...recentCharges.data.filter(ch => ch.status === 'pending'),
      ].length,
      totalVolume: [...recentPaymentIntents.data, ...recentCharges.data].reduce(
        (sum, item) => sum + (item.amount || 0),
        0
      ),
      averageAmount: 0,
    };

    paymentMetrics.averageAmount =
      paymentMetrics.total > 0 ? paymentMetrics.totalVolume / paymentMetrics.total : 0;

    // 4. Berechne Webhook-Metriken
    const webhookMetrics = {
      total: recentEvents.data.length,
      delivered: recentEvents.data.filter(e => e.pending_webhooks === 0).length,
      failed: recentEvents.data.filter(e => e.type.includes('failed')).length,
      pending: recentEvents.data.filter(e => e.pending_webhooks > 0).length,
      healthScore: 0,
    };

    webhookMetrics.healthScore =
      webhookMetrics.total > 0
        ? Math.round((webhookMetrics.delivered / webhookMetrics.total) * 100)
        : 100;

    // 5. System-Metriken
    const apiLatency = Date.now() - startTime;
    const errorRate = (paymentMetrics.failed / Math.max(paymentMetrics.total, 1)) * 100;

    const metrics: MonitoringMetrics = {
      timestamp: now.toISOString(),
      payments: paymentMetrics,
      webhooks: webhookMetrics,
      accounts: {
        main: {
          active: true, // Hauptkonto ist immer aktiv wenn API funktioniert
          paymentsEnabled: true,
          payoutsEnabled: true,
        },
        connected: {
          total: connectedAccounts.data.length,
          active: connectedAccountsStatus.filter(acc => acc.active).length,
          withIssues: connectedAccountsStatus.filter(acc => acc.hasIssues).length,
        },
      },
      system: {
        apiLatency,
        errorRate,
        uptime: 100, // TODO: Echte Uptime-Berechnung
      },
    };

    // 6. Echtzeit-Alerts generieren
    const alerts: Array<{
      type: string;
      message: string;
      timestamp: string;
    }> = [];

    if (webhookMetrics.healthScore < 80) {
      alerts.push({
        type: 'critical',
        message: `Webhook-Gesundheit kritisch: ${webhookMetrics.healthScore}%`,
        timestamp: now.toISOString(),
      });
    }

    if (errorRate > 10) {
      alerts.push({
        type: 'warning',
        message: `Hohe Fehlerrate: ${errorRate.toFixed(1)}%`,
        timestamp: now.toISOString(),
      });
    }

    if (apiLatency > 5000) {
      alerts.push({
        type: 'warning',
        message: `Hohe API-Latenz: ${apiLatency}ms`,
        timestamp: now.toISOString(),
      });
    }

    if (metrics.accounts.connected.withIssues > 0) {
      alerts.push({
        type: 'info',
        message: `${metrics.accounts.connected.withIssues} Connected Accounts haben Probleme`,
        timestamp: now.toISOString(),
      });
    }

    // 7. Speichere Metriken für historische Analyse (optional)
    if (realTime) {
      try {
        await db.collection('monitoring_metrics').add({
          ...metrics,
          interval,
          alerts: alerts.length,
        });
      } catch (error) {
        console.error('Error saving monitoring metrics:', error);
      }
    }

    return NextResponse.json({
      metrics,
      alerts,
      health: {
        overall:
          webhookMetrics.healthScore >= 95 && errorRate < 5 && apiLatency < 2000
            ? 'excellent'
            : webhookMetrics.healthScore >= 80 && errorRate < 10 && apiLatency < 5000
              ? 'good'
              : 'warning',
        details: {
          payments: paymentMetrics.total > 0 && errorRate < 10 ? 'healthy' : 'warning',
          webhooks:
            webhookMetrics.healthScore >= 90
              ? 'healthy'
              : webhookMetrics.healthScore >= 75
                ? 'warning'
                : 'critical',
          accounts: metrics.accounts.connected.withIssues === 0 ? 'healthy' : 'warning',
          api: apiLatency < 2000 ? 'healthy' : 'warning',
        },
      },
      real_time: realTime,
      interval,
      next_check: new Date(now.getTime() + timeWindow).toISOString(),
      response_time_ms: apiLatency,
    });
  } catch (error) {
    console.error('Error in monitoring API:', error);
    return NextResponse.json(
      {
        error: 'Monitoring system error',
        details: error instanceof Error ? error.message : 'Unknown error',
        metrics: null,
        alerts: [
          {
            type: 'critical',
            message: 'Monitoring system nicht verfügbar',
            timestamp: new Date().toISOString(),
          },
        ],
      },
      { status: 500 }
    );
  }
}

// POST endpoint für manuellen Health-Check
export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  }

  try {
    const { action } = await req.json();

    switch (action) {
      case 'health-check':
        // Vollständiger System-Health-Check
        const startTime = Date.now();

        const [accountInfo, balance] = await Promise.all([
          // Verwende accounts.retrieve() ohne Account-ID für das eigene Konto
          stripe.accounts.retrieve(),
          stripe.balance.retrieve(),
        ]);

        const healthCheck = {
          timestamp: new Date().toISOString(),
          stripe_api: {
            status: 'connected',
            account_id: accountInfo.id,
            response_time: Date.now() - startTime,
          },
          account: {
            charges_enabled: accountInfo.charges_enabled,
            payouts_enabled: accountInfo.payouts_enabled,
            country: accountInfo.country,
            default_currency: accountInfo.default_currency,
          },
          balance: {
            available: balance.available,
            pending: balance.pending,
          },
        };

        return NextResponse.json({
          success: true,
          health_check: healthCheck,
          status: 'All systems operational',
        });

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in health check:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Health check failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
