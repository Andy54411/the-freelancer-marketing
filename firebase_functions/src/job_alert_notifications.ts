import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { FirestoreEvent } from 'firebase-functions/v2/firestore';
import { QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { logger } from 'firebase-functions';

const db = getFirestore();
const messaging = getMessaging();

interface JobData {
  title: string;
  companyName: string;
  companyId: string;
  location?: string;
  category?: string;
  type?: string;
  description?: string;
  status: string;
  postedAt: any;
  jobGroup?: string;
}

interface JobfinderData {
  jobGroups?: string[];
  location?: string;
  radius?: string;
  searchPhrase?: string;
  industries?: string[];
  categories?: string[];
  ranks?: string[];
  employment?: string[];
  active: boolean;
  email?: string;
  createdAt?: any;
}

/**
 * Trigger: Neuer Job erstellt
 * Prüft alle aktiven Jobfinder und sendet Push-Benachrichtigungen
 */
export const onJobCreated = onDocumentCreated(
  'companies/{companyId}/jobs/{jobId}',
  async (event: FirestoreEvent<QueryDocumentSnapshot | undefined, { companyId: string; jobId: string }>) => {
    const { companyId, jobId } = event.params;

    if (!event.data) {
      logger.warn(`[onJobCreated] No data found for job ${jobId}`);
      return;
    }

    const jobData = event.data.data() as JobData;

    if (jobData.status !== 'active') {
      logger.info(`[onJobCreated] Job ${jobId} is not active, skipping`);
      return;
    }

    logger.info(`[onJobCreated] Processing new job: ${jobData.title} from ${jobData.companyName}`, {
      location: jobData.location,
      category: jobData.category,
      jobGroup: jobData.jobGroup,
    });

    try {
      const usersSnapshot = await db.collection('users').get();
      let notificationsSent = 0;
      let alertsMatched = 0;
      let usersWithTokens = 0;
      let jobfindersFound = 0;

      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const userData = userDoc.data();
        const fcmTokens = userData?.fcmTokens as string[] | undefined;
        
        if (!fcmTokens || fcmTokens.length === 0) {
          continue;
        }
        usersWithTokens++;

        const jobfinderSnapshot = await db
          .collection('users')
          .doc(userId)
          .collection('jobfinder')
          .where('active', '==', true)
          .get();

        jobfindersFound += jobfinderSnapshot.size;

        for (const jobfinderDoc of jobfinderSnapshot.docs) {
          const jobfinderData = jobfinderDoc.data() as JobfinderData;

          if (doesJobMatchJobfinder(jobData, jobfinderData)) {
            alertsMatched++;
            logger.info(`[onJobCreated] Job matches jobfinder ${jobfinderDoc.id} for user ${userId}`);

            const sent = await sendJobAlertNotification(
              userId,
              jobData,
              jobfinderDoc.id,
              jobId,
              companyId,
              fcmTokens
            );
            
            if (sent) {
              notificationsSent++;
              await jobfinderDoc.ref.update({
                matchCount: ((jobfinderData as any).matchCount || 0) + 1,
                lastNotifiedAt: new Date().toISOString(),
              });
            }
          }
        }
      }

      logger.info(`[onJobCreated] Finished`, {
        usersWithTokens,
        jobfindersFound,
        alertsMatched,
        notificationsSent,
      });

    } catch (error) {
      logger.error(`[onJobCreated] Error processing job alerts:`, error);
    }
  }
);

function doesJobMatchJobfinder(job: JobData, jobfinder: JobfinderData): boolean {
  // Suchbegriff prüfen
  if (jobfinder.searchPhrase && jobfinder.searchPhrase.trim() !== '') {
    const term = jobfinder.searchPhrase.toLowerCase();
    const title = (job.title || '').toLowerCase();
    const description = (job.description || '').toLowerCase();
    const company = (job.companyName || '').toLowerCase();

    if (!title.includes(term) && !description.includes(term) && !company.includes(term)) {
      return false;
    }
  }

  // Standort: Nur prüfen wenn beide Werte vorhanden sind
  // Wenn Jobfinder keinen Standort hat oder Job keinen hat, matcht es
  if (jobfinder.location && jobfinder.location.trim() !== '' && job.location) {
    const jobLocation = job.location.toLowerCase();
    const searchLocation = jobfinder.location.toLowerCase();
    
    if (!jobLocation.includes(searchLocation) && !searchLocation.includes(jobLocation)) {
      return false;
    }
  }

  // Job-Gruppen: Wenn Jobfinder Job-Gruppen hat, muss Job matchen
  // Aber wenn Jobfinder keine hat oder Job keine hat, matcht es
  if (jobfinder.jobGroups && jobfinder.jobGroups.length > 0 && job.jobGroup) {
    if (!jobfinder.jobGroups.includes(job.jobGroup)) {
      return false;
    }
  }

  // Kategorien
  if (jobfinder.categories && jobfinder.categories.length > 0 && job.category) {
    if (!jobfinder.categories.includes(job.category)) {
      return false;
    }
  }

  // Wenn alle Filter leer sind oder gematcht haben
  return true;
}

async function sendJobAlertNotification(
  userId: string,
  job: JobData,
  jobfinderId: string,
  jobId: string,
  companyId: string,
  fcmTokens: string[]
): Promise<boolean> {
  try {
    const notification = {
      title: `Neuer Job: ${job.title}`,
      body: `${job.companyName}${job.location ? ` in ${job.location}` : ''} - Passend zu deinem Jobfinder!`,
    };

    const data = {
      type: 'job_alert',
      jobId: jobId,
      companyId: companyId,
      jobfinderId: jobfinderId,
      click_action: 'FLUTTER_NOTIFICATION_CLICK',
    };

    logger.info(`[sendJobAlertNotification] Sending to ${fcmTokens.length} tokens for user ${userId}`);

    const invalidTokens: string[] = [];
    let successCount = 0;

    for (const token of fcmTokens) {
      try {
        await messaging.send({
          token: token,
          notification: notification,
          data: data,
          android: {
            priority: 'high',
            notification: {
              channelId: 'job_alerts',
              icon: '@mipmap/ic_launcher',
              color: '#14ad9f',
            },
          },
          apns: {
            payload: {
              aps: {
                sound: 'default',
                badge: 1,
              },
            },
          },
        });
        successCount++;
        logger.info(`[sendJobAlertNotification] Success for token ${token.substring(0, 20)}...`);
      } catch (error: any) {
        if (error.code === 'messaging/registration-token-not-registered' ||
            error.code === 'messaging/invalid-registration-token') {
          invalidTokens.push(token);
          logger.warn(`[sendJobAlertNotification] Invalid token: ${token.substring(0, 20)}...`);
        } else {
          logger.error(`[sendJobAlertNotification] Error:`, error.message);
        }
      }
    }

    if (invalidTokens.length > 0) {
      const validTokens = fcmTokens.filter(t => !invalidTokens.includes(t));
      await db.collection('users').doc(userId).update({
        fcmTokens: validTokens,
      });
      logger.info(`[sendJobAlertNotification] Removed ${invalidTokens.length} invalid tokens`);
    }

    await db.collection('users').doc(userId).collection('notifications').add({
      type: 'job_alert',
      title: notification.title,
      body: notification.body,
      jobId: jobId,
      companyId: companyId,
      jobfinderId: jobfinderId,
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    return successCount > 0;
  } catch (error) {
    logger.error(`[sendJobAlertNotification] Error:`, error);
    return false;
  }
}
