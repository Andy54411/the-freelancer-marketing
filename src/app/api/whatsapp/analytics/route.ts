/**
 * WhatsApp Analytics API
 * 
 * Ruft Messaging-Statistiken von Meta ab
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, isFirebaseAvailable } from '@/firebase/server';

export async function GET(request: NextRequest) {
  try {
    if (!isFirebaseAvailable() || !db) {
      return NextResponse.json({ success: false, error: 'Firebase nicht verfügbar' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const granularity = searchParams.get('granularity') || 'DAY'; // DAY, MONTH

    if (!companyId) {
      return NextResponse.json({ success: false, error: 'Company ID erforderlich' }, { status: 400 });
    }

    // Hole WhatsApp Connection
    const connectionDoc = await db
      .collection('companies')
      .doc(companyId)
      .collection('whatsappConnection')
      .doc('current')
      .get();

    if (!connectionDoc.exists) {
      return NextResponse.json({ success: false, error: 'WhatsApp nicht verbunden' }, { status: 400 });
    }

    const connection = connectionDoc.data();
    const { accessToken, wabaId } = connection || {};

    if (!accessToken || !wabaId) {
      return NextResponse.json({ success: false, error: 'WhatsApp API nicht konfiguriert' }, { status: 400 });
    }

    // Berechne Zeitraum (Standard: letzte 30 Tage)
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Meta Analytics API aufrufen
    const analyticsUrl = new URL(`https://graph.facebook.com/v18.0/${wabaId}`);
    analyticsUrl.searchParams.append('fields', 'analytics.start(' + Math.floor(start.getTime() / 1000) + ').end(' + Math.floor(end.getTime() / 1000) + ').granularity(' + granularity + ')');
    analyticsUrl.searchParams.append('access_token', accessToken);

    const analyticsResponse = await fetch(analyticsUrl.toString());

    let metaAnalytics = null;
    if (analyticsResponse.ok) {
      const data = await analyticsResponse.json();
      metaAnalytics = data.analytics;
    }

    // Conversation Analytics
    const conversationUrl = new URL(`https://graph.facebook.com/v18.0/${wabaId}/conversation_analytics`);
    conversationUrl.searchParams.append('start', Math.floor(start.getTime() / 1000).toString());
    conversationUrl.searchParams.append('end', Math.floor(end.getTime() / 1000).toString());
    conversationUrl.searchParams.append('granularity', granularity);
    conversationUrl.searchParams.append('access_token', accessToken);

    const conversationResponse = await fetch(conversationUrl.toString());
    
    let conversationAnalytics = null;
    if (conversationResponse.ok) {
      const data = await conversationResponse.json();
      conversationAnalytics = data.data;
    }

    // Lokale Statistiken aus Firestore
    const messagesRef = db
      .collection('companies')
      .doc(companyId)
      .collection('whatsappMessages');

    const localMessagesSnapshot = await messagesRef
      .where('timestamp', '>=', start)
      .where('timestamp', '<=', end)
      .get();

    const localMessages = localMessagesSnapshot.docs.map(doc => doc.data());

    // Berechne lokale Statistiken
    const inbound = localMessages.filter(m => m.direction === 'inbound').length;
    const outbound = localMessages.filter(m => m.direction === 'outbound').length;
    const delivered = localMessages.filter(m => m.status === 'delivered').length;
    const read = localMessages.filter(m => m.status === 'read').length;
    const failed = localMessages.filter(m => m.status === 'failed').length;

    // Unique Conversations
    const uniquePhones = new Set(localMessages.map(m => m.phone));

    // Durchschnittliche Antwortzeit berechnen
    let totalResponseTime = 0;
    let responseCount = 0;
    const messagesByPhone: Record<string, typeof localMessages> = {};

    localMessages.forEach(m => {
      if (!messagesByPhone[m.phone]) {
        messagesByPhone[m.phone] = [];
      }
      messagesByPhone[m.phone].push(m);
    });

    Object.values(messagesByPhone).forEach(msgs => {
      const sorted = msgs.sort((a, b) => {
        const aTime = a.timestamp?.toDate?.() || new Date(a.timestamp);
        const bTime = b.timestamp?.toDate?.() || new Date(b.timestamp);
        return aTime.getTime() - bTime.getTime();
      });

      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i - 1].direction === 'inbound' && sorted[i].direction === 'outbound') {
          const inTime = sorted[i - 1].timestamp?.toDate?.() || new Date(sorted[i - 1].timestamp);
          const outTime = sorted[i].timestamp?.toDate?.() || new Date(sorted[i].timestamp);
          const diff = outTime.getTime() - inTime.getTime();
          if (diff > 0 && diff < 24 * 60 * 60 * 1000) { // Max 24h
            totalResponseTime += diff;
            responseCount++;
          }
        }
      }
    });

    const avgResponseTimeMs = responseCount > 0 ? totalResponseTime / responseCount : 0;
    const avgResponseTimeMinutes = Math.round(avgResponseTimeMs / 60000);

    // Nachrichten pro Tag
    const messagesByDay: Record<string, { inbound: number; outbound: number }> = {};
    localMessages.forEach(m => {
      const date = (m.timestamp?.toDate?.() || new Date(m.timestamp)).toISOString().split('T')[0];
      if (!messagesByDay[date]) {
        messagesByDay[date] = { inbound: 0, outbound: 0 };
      }
      if (m.direction === 'inbound') {
        messagesByDay[date].inbound++;
      } else {
        messagesByDay[date].outbound++;
      }
    });

    // Template-Nutzung
    const templateUsage: Record<string, number> = {};
    localMessages.filter(m => m.templateId).forEach(m => {
      templateUsage[m.templateId] = (templateUsage[m.templateId] || 0) + 1;
    });

    return NextResponse.json({
      success: true,
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
        granularity,
      },
      summary: {
        totalMessages: localMessages.length,
        inbound,
        outbound,
        delivered,
        read,
        failed,
        uniqueConversations: uniquePhones.size,
        avgResponseTimeMinutes,
        deliveryRate: outbound > 0 ? Math.round((delivered / outbound) * 100) : 0,
        readRate: delivered > 0 ? Math.round((read / delivered) * 100) : 0,
      },
      messagesByDay: Object.entries(messagesByDay).map(([date, counts]) => ({
        date,
        ...counts,
      })).sort((a, b) => a.date.localeCompare(b.date)),
      templateUsage: Object.entries(templateUsage).map(([templateId, count]) => ({
        templateId,
        count,
      })).sort((a, b) => b.count - a.count),
      metaAnalytics,
      conversationAnalytics,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Fehler beim Laden der Analytics',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    }, { status: 500 });
  }
}
