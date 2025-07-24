// DSGVO-konforme Newsletter Utility Funktionen
import { admin } from '@/firebase/server';
import crypto from 'crypto';

// DSGVO Newsletter-Abonnement Typ
export interface NewsletterSubscriber {
  id?: string;
  email: string;
  name?: string;
  subscribed: boolean;
  subscribedAt: Date;
  unsubscribedAt?: Date;
  source: 'manual' | 'website' | 'import' | 'footer';
  preferences?: string[];
  unsubscribeToken: string;
  unsubscribeReason?: 'user_request' | 'bounce' | 'spam' | 'admin';
  ipAddress?: string;
  userAgent?: string;
  consentGiven: boolean;
  consentTimestamp: Date;
  dataRetentionUntil?: Date; // DSGVO: Automatische Löschung nach X Jahren
}

// Generiere sicheren Abmelde-Token
export function generateUnsubscribeToken(email: string): string {
  return crypto
    .createHmac('sha256', process.env.NEWSLETTER_SECRET || 'default-secret')
    .update(email + Date.now())
    .digest('hex')
    .substring(0, 32);
}

// Generiere Abmelde-URL
export function generateUnsubscribeUrl(email: string, token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://taskilo.de';
  return `${baseUrl}/newsletter/unsubscribe?email=${encodeURIComponent(email)}&token=${token}`;
}

// DSGVO-konformer Newsletter-Abonnent hinzufügen
export async function addNewsletterSubscriber(
  email: string,
  options: {
    name?: string;
    source: 'manual' | 'website' | 'import' | 'footer';
    preferences?: string[];
    ipAddress?: string;
    userAgent?: string;
    consentGiven?: boolean;
  }
): Promise<{ success: boolean; subscriberId?: string; error?: string }> {
  try {
    // Prüfe ob bereits existiert
    const existingQuery = await admin
      .firestore()
      .collection('newsletterSubscribers')
      .where('email', '==', email)
      .get();

    if (!existingQuery.empty) {
      const existingDoc = existingQuery.docs[0];
      const existingData = existingDoc.data();

      // Wenn bereits abgemeldet, reaktivieren
      if (!existingData.subscribed) {
        await existingDoc.ref.update({
          subscribed: true,
          subscribedAt: admin.firestore.Timestamp.now(),
          unsubscribedAt: admin.firestore.FieldValue.delete(),
          unsubscribeReason: admin.firestore.FieldValue.delete(),
          consentGiven: options.consentGiven !== false,
          consentTimestamp: admin.firestore.Timestamp.now(),
        });

        return { success: true, subscriberId: existingDoc.id };
      } else {
        return { success: false, error: 'E-Mail bereits abonniert' };
      }
    }

    // Neuen Abonnenten erstellen
    const unsubscribeToken = generateUnsubscribeToken(email);
    const now = admin.firestore.Timestamp.now();

    // DSGVO: Daten-Retention (3 Jahre nach Abmeldung)
    const retentionDate = new Date();
    retentionDate.setFullYear(retentionDate.getFullYear() + 3);

    const subscriberData: Omit<NewsletterSubscriber, 'id'> = {
      email,
      name: options.name || undefined,
      subscribed: true,
      subscribedAt: now.toDate(),
      source: options.source,
      preferences: options.preferences || [],
      unsubscribeToken,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      consentGiven: options.consentGiven !== false,
      consentTimestamp: now.toDate(),
      dataRetentionUntil: retentionDate,
    };

    const docRef = await admin.firestore().collection('newsletterSubscribers').add(subscriberData);

    console.log('DSGVO Newsletter-Abonnent hinzugefügt:', {
      email,
      subscriberId: docRef.id,
      source: options.source,
      consentGiven: options.consentGiven,
    });

    return { success: true, subscriberId: docRef.id };
  } catch (error) {
    console.error('Fehler beim Newsletter-Abonnement:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
    };
  }
}

// Alle aktiven Newsletter-Abonnenten abrufen
export async function getActiveSubscribers(): Promise<NewsletterSubscriber[]> {
  try {
    const snapshot = await admin
      .firestore()
      .collection('newsletterSubscribers')
      .where('subscribed', '==', true)
      .orderBy('subscribedAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      subscribedAt: doc.data().subscribedAt.toDate(),
      unsubscribedAt: doc.data().unsubscribedAt?.toDate(),
      consentTimestamp: doc.data().consentTimestamp.toDate(),
      dataRetentionUntil: doc.data().dataRetentionUntil?.toDate(),
    })) as NewsletterSubscriber[];
  } catch (error) {
    console.error('Fehler beim Abrufen der Abonnenten:', error);
    return [];
  }
}

// Newsletter mit Abmelde-Link versenden
export function addUnsubscribeLinkToHtml(
  htmlContent: string,
  email: string,
  token: string
): string {
  const unsubscribeUrl = generateUnsubscribeUrl(email, token);

  const unsubscribeSection = `
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; text-align: center; font-size: 12px; color: #666;">
      <p>Sie erhalten diese E-Mail, weil Sie sich für unseren Newsletter angemeldet haben.</p>
      <p>
        <a href="${unsubscribeUrl}" style="color: #666; text-decoration: underline;">
          Vom Newsletter abmelden
        </a> | 
        <a href="mailto:support@taskilo.de" style="color: #666; text-decoration: underline;">
          Kontakt
        </a>
      </p>
      <p style="margin-top: 10px;">
        Taskilo GmbH<br>
        Datenschutz: <a href="https://taskilo.de/datenschutz" style="color: #666;">https://taskilo.de/datenschutz</a>
      </p>
    </div>
  `;

  // Füge Abmelde-Link vor schließendem </body> oder am Ende ein
  if (htmlContent.includes('</body>')) {
    return htmlContent.replace('</body>', unsubscribeSection + '</body>');
  } else {
    return htmlContent + unsubscribeSection;
  }
}

// DSGVO-konforme Datenbereinigung (automatisch alte Abonnenten löschen)
export async function cleanupExpiredSubscriberData(): Promise<{ deletedCount: number }> {
  try {
    const now = new Date();

    const expiredQuery = await admin
      .firestore()
      .collection('newsletterSubscribers')
      .where('dataRetentionUntil', '<=', admin.firestore.Timestamp.fromDate(now))
      .get();

    if (expiredQuery.empty) {
      return { deletedCount: 0 };
    }

    // Lösche abgelaufene Daten in Batches
    const batch = admin.firestore().batch();
    expiredQuery.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    console.log(`DSGVO Cleanup: ${expiredQuery.docs.length} abgelaufene Newsletter-Daten gelöscht`);

    return { deletedCount: expiredQuery.docs.length };
  } catch (error) {
    console.error('Fehler bei DSGVO Datenbereinigung:', error);
    return { deletedCount: 0 };
  }
}
