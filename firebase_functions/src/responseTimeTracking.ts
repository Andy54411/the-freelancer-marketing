import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// Initialize Firebase Admin
initializeApp();

const db = getFirestore();

/**
 * Scheduled function die alle 15 Minuten überfällige Antworten überprüft
 */
export const checkOverdueResponses = onSchedule('every 15 minutes', async (event) => {
  console.log('[checkOverdueResponses] Starting overdue check...');
  
  try {
    const now = new Date();
    
    // Finde alle unbeantworteten Nachrichten
    const metricsQuery = db.collection('responseTimeMetrics')
      .where('providerResponseTime', '==', null)
      .where('isOverdue', '!=', true);

    const metricsSnapshot = await metricsQuery.get();
    let overdueCount = 0;
    
    const batch = db.batch();
    
    for (const metricDoc of metricsSnapshot.docs) {
      const metric = metricDoc.data();
      const customerMessageTime = metric.customerMessageTime.toDate();
      const hoursElapsed = (now.getTime() - customerMessageTime.getTime()) / (1000 * 60 * 60);
      
      if (hoursElapsed > metric.guaranteeHours) {
        // Markiere als überfällig
        batch.update(metricDoc.ref, {
          isOverdue: true,
          hoursOverdue: Math.round((hoursElapsed - metric.guaranteeHours) * 100) / 100,
          overdueMarkedAt: Timestamp.now()
        });
        
        overdueCount++;
        
        console.log('[checkOverdueResponses] Marked as overdue:', {
          providerId: metric.providerId,
          chatId: metric.chatId,
          hoursOverdue: hoursElapsed - metric.guaranteeHours
        });
      }
    }
    
    if (overdueCount > 0) {
      await batch.commit();
      console.log(`[checkOverdueResponses] Marked ${overdueCount} responses as overdue`);
    } else {
      console.log('[checkOverdueResponses] No overdue responses found');
    }
    
  } catch (error) {
    console.error('[checkOverdueResponses] Error:', error);
  }
});

/**
 * Triggered wenn eine neue Nachricht in directChats erstellt wird
 * Startet Response Time Tracking für Kundenanfragen
 */
export const trackCustomerMessage = onDocumentCreated(
  'directChats/{chatId}/messages/{messageId}',
  async (event) => {
    const messageData = event.data?.data();
    const chatId = event.params.chatId;
    const messageId = event.params.messageId;
    
    if (!messageData) return;
    
    try {
      // Hole Chat-Informationen
      const chatDoc = await db.collection('directChats').doc(chatId).get();
      const chatData = chatDoc.data();
      
      if (!chatData) return;
      
      // Prüfe ob es eine Kundenanfrage ist (nicht vom Provider)
      const providerId = chatData.providerId;
      const companyId = chatData.companyId;
      const senderId = messageData.senderId;
      
      // Wenn die Nachricht vom Kunden (Company) stammt
      if (senderId === companyId && senderId !== providerId) {
        // Hole Provider-Garantie-Stunden
        let guaranteeHours = 24; // Default
        
        const providerDoc = await db.collection('firma').doc(providerId).get();
        if (providerDoc.exists) {
          const providerData = providerDoc.data();
          guaranteeHours = providerData?.responseTimeGuaranteeHours || 24;
        } else {
          // Versuche users Collection
          const userDoc = await db.collection('users').doc(providerId).get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            guaranteeHours = userData?.responseTimeGuaranteeHours || 24;
          }
        }
        
        // Erstelle Response Time Metric
        await db.collection('responseTimeMetrics').add({
          providerId,
          messageId,
          chatId,
          customerMessageTime: messageData.timestamp,
          guaranteeHours,
          createdAt: Timestamp.now(),
          isOverdue: false
        });
        
        console.log('[trackCustomerMessage] Started tracking for:', {
          providerId,
          chatId,
          messageId,
          guaranteeHours
        });
      }
      
    } catch (error) {
      console.error('[trackCustomerMessage] Error:', error);
    }
  }
);

/**
 * Triggered wenn eine Nachricht in directChats aktualisiert wird
 * Stoppt Response Time Tracking für Provider-Antworten
 */
export const trackProviderResponse = onDocumentCreated(
  'directChats/{chatId}/messages/{messageId}',
  async (event) => {
    const messageData = event.data?.data();
    const chatId = event.params.chatId;
    const messageId = event.params.messageId;
    
    if (!messageData) return;
    
    try {
      // Hole Chat-Informationen
      const chatDoc = await db.collection('directChats').doc(chatId).get();
      const chatData = chatDoc.data();
      
      if (!chatData) return;
      
      const providerId = chatData.providerId;
      const senderId = messageData.senderId;
      
      // Wenn die Nachricht vom Provider stammt
      if (senderId === providerId) {
        // Finde die letzte unbeantwortete Kundenanfrage in diesem Chat
        const metricsQuery = db.collection('responseTimeMetrics')
          .where('providerId', '==', providerId)
          .where('chatId', '==', chatId)
          .where('providerResponseTime', '==', null)
          .orderBy('customerMessageTime', 'desc')
          .limit(1);

        const metricsSnapshot = await metricsQuery.get();
        
        if (!metricsSnapshot.empty) {
          const metricDoc = metricsSnapshot.docs[0];
          const metricData = metricDoc.data();
          const responseTime = new Date();
          const customerMessageTime = metricData.customerMessageTime.toDate();
          
          // Berechne Antwortzeit in Stunden
          const responseTimeHours = (responseTime.getTime() - customerMessageTime.getTime()) / (1000 * 60 * 60);
          const isWithinGuarantee = responseTimeHours <= metricData.guaranteeHours;

          // Update das Metric-Dokument
          await metricDoc.ref.update({
            providerResponseTime: Timestamp.now(),
            responseTimeHours: Math.round(responseTimeHours * 100) / 100,
            isWithinGuarantee,
            responseMessageId: messageId
          });

          console.log('[trackProviderResponse] Response recorded:', {
            providerId,
            responseTimeHours,
            isWithinGuarantee,
            guaranteeHours: metricData.guaranteeHours
          });

          // Aktualisiere Provider-Statistiken
          await updateProviderStats(providerId);
        }
      }
      
    } catch (error) {
      console.error('[trackProviderResponse] Error:', error);
    }
  }
);

/**
 * Aktualisiert die Antwortzeit-Statistiken für einen Provider
 */
async function updateProviderStats(providerId: string): Promise<void> {
  try {
    // Hole alle Metriken der letzten 30 Tage
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const metricsQuery = db.collection('responseTimeMetrics')
      .where('providerId', '==', providerId)
      .where('providerResponseTime', '!=', null)
      .where('createdAt', '>=', Timestamp.fromDate(thirtyDaysAgo));

    const metricsSnapshot = await metricsQuery.get();
    const metrics = metricsSnapshot.docs.map(doc => doc.data());

    if (metrics.length === 0) return;

    // Berechne Statistiken
    const totalResponseTime = metrics.reduce((sum, metric) => sum + (metric.responseTimeHours || 0), 0);
    const averageResponseTimeHours = totalResponseTime / metrics.length;
    const responsesWithinGuarantee = metrics.filter(metric => metric.isWithinGuarantee).length;
    const guaranteeComplianceRate = (responsesWithinGuarantee / metrics.length) * 100;

    const stats = {
      averageResponseTimeHours: Math.round(averageResponseTimeHours * 100) / 100,
      totalMessages: metrics.length,
      responsesWithinGuarantee,
      guaranteeComplianceRate: Math.round(guaranteeComplianceRate * 100) / 100,
      lastUpdated: Timestamp.now()
    };

    // Aktualisiere Provider-Dokument
    const providerDocRef = db.collection('firma').doc(providerId);
    const providerDoc = await providerDocRef.get();
    
    if (providerDoc.exists) {
      await providerDocRef.update({
        responseTimeStats: stats,
        averageResponseTimeHours: stats.averageResponseTimeHours,
        guaranteeComplianceRate: stats.guaranteeComplianceRate,
        lastStatsUpdate: Timestamp.now()
      });
    } else {
      // Versuche auch in users Collection
      const userDocRef = db.collection('users').doc(providerId);
      const userDoc = await userDocRef.get();
      
      if (userDoc.exists) {
        await userDocRef.update({
          responseTimeStats: stats,
          averageResponseTimeHours: stats.averageResponseTimeHours,
          guaranteeComplianceRate: stats.guaranteeComplianceRate,
          lastStatsUpdate: Timestamp.now()
        });
      }
    }

    console.log('[updateProviderStats] Provider stats updated:', {
      providerId,
      stats
    });
  } catch (error) {
    console.error('[updateProviderStats] Error:', error);
  }
}
