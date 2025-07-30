// src/app/api/admin/debug-logs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

interface DebugLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  source: string;
  message: string;
  data?: Record<string, unknown>;
  orderId?: string;
  stripeEventId?: string;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dateFilter = searchParams.get('date') || '24h';
    const levelFilter = searchParams.get('level') || 'all';
    const limitParam = parseInt(searchParams.get('limit') || '200');

    // Berechne Zeitraum
    const now = new Date();
    let startTime: Date;

    switch (dateFilter) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // System-Debug-Logs aus verschiedenen Quellen sammeln
    const debugLogs: DebugLog[] = [];

    interface DebugLog {
      id: string;
      timestamp: string;
      level: 'info' | 'warning' | 'error' | 'debug';
      source: string;
      message: string;
      data?: Record<string, unknown>;
      orderId?: string;
      stripeEventId?: string;
    }

    // 1. Firebase Logs (wenn vorhanden)
    try {
      const logsRef = db.collection('system_logs');
      let logsQuery = logsRef
        .where('timestamp', '>=', startTime)
        .orderBy('timestamp', 'desc')
        .limit(limitParam);

      if (levelFilter !== 'all') {
        logsQuery = db
          .collection('system_logs')
          .where('level', '==', levelFilter)
          .where('timestamp', '>=', startTime)
          .orderBy('timestamp', 'desc')
          .limit(limitParam);
      }

      const logsSnapshot = await logsQuery.get();
      logsSnapshot.forEach(doc => {
        const data = doc.data();
        debugLogs.push({
          id: doc.id,
          timestamp: data.timestamp?.toDate?.()?.toISOString() || new Date().toISOString(),
          level: data.level || 'info',
          source: data.source || 'unknown',
          message: data.message || 'No message',
          data: data.data,
          orderId: data.orderId,
          stripeEventId: data.stripeEventId,
        });
      });
    } catch (_error) {
      console.log('No system_logs collection found, creating sample logs');
    }

    // 2. Webhook-Fehler aus Error-Sammlung
    try {
      const webhookErrorsQuery = db
        .collection('webhook_errors')
        .where('timestamp', '>=', startTime)
        .orderBy('timestamp', 'desc')
        .limit(50);

      const webhookErrorsSnapshot = await webhookErrorsQuery.get();
      webhookErrorsSnapshot.forEach(doc => {
        const data = doc.data();
        debugLogs.push({
          id: doc.id,
          timestamp: data.timestamp.toDate().toISOString(),
          level: 'error',
          source: 'stripe-webhooks',
          message: `Webhook failed: ${data.event_type || 'unknown'}`,
          data: data,
          stripeEventId: data.stripe_event_id,
        });
      });
    } catch (_webhookError) {
      console.log('No webhook_errors collection found');
    }

    // 3. Payment-Fehler aus Aufträgen
    try {
      const ordersQuery = db
        .collection('auftraege')
        .where('lastUpdated', '>=', startTime)
        .limit(100);

      const ordersSnapshot = await ordersQuery.get();
      ordersSnapshot.forEach(doc => {
        const orderData = doc.data();

        // Prüfe auf Payment-Fehler
        if (orderData.paymentErrors && orderData.paymentErrors.length > 0) {
          orderData.paymentErrors.forEach((errorItem: Record<string, unknown>, index: number) => {
            const debugLog: DebugLog = {
              id: `error-${doc.id}-payment-${index}`,
              timestamp:
                (errorItem.timestamp as string) || orderData.lastUpdated.toDate().toISOString(),
              level: 'error',
              source: 'payment',
              message: `Payment error in order: ${(errorItem.message as string) || 'Unknown payment error'}`,
              orderId: doc.id,
              data: {
                error: errorItem,
              },
            };
            debugLogs.push(debugLog);
          });
        }

        // Prüfe auf Time-Tracking-Probleme
        if (orderData.timeTracking?.errors) {
          orderData.timeTracking.errors.forEach((error: Record<string, unknown>, index: number) => {
            debugLogs.push({
              id: `${doc.id}_timetracking_error_${index}`,
              timestamp:
                (error.timestamp as string) || orderData.lastUpdated.toDate().toISOString(),
              level: 'warning',
              source: 'time-tracking',
              message: `Time tracking issue: ${(error.message as string) || 'Unknown time tracking error'}`,
              orderId: doc.id,
              data: {
                error: error,
                totalHours: orderData.timeTracking?.totalHours,
              },
            });
          });
        }
      });
    } catch (error) {
      console.log('Error fetching order-related errors:', error);
    }

    // Sortiere nach Timestamp (neueste zuerst)
    const sortedLogs = debugLogs.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    console.log(`[DebugLogs] Total logs loaded: ${sortedLogs.length}`);

    // Level-Filter anwenden falls nicht bereits in der Query
    const filteredLogs =
      levelFilter === 'all' ? sortedLogs : sortedLogs.filter(log => log.level === levelFilter);

    return NextResponse.json({
      logs: filteredLogs.slice(0, limitParam),
      total: filteredLogs.length,
      dateRange: {
        from: startTime.toISOString(),
        to: now.toISOString(),
      },
      filters: {
        date: dateFilter,
        level: levelFilter,
      },
      sources: [...new Set(filteredLogs.map(log => log.source))],
      levels: [...new Set(filteredLogs.map(log => log.level))],
    });
  } catch (error) {
    console.error('Error fetching debug logs:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch debug logs',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
