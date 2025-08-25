// Double-Opt-In System für Newsletter mit Resend
import { admin } from '../firebase/server';
import { generateUnsubscribeToken } from './newsletter-gdpr';
import { sendNewsletterConfirmationViaResend } from './resend-newsletter';
import crypto from 'crypto';

// Bestätigungs-Token generieren
export function generateConfirmationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Bestätigungs-E-Mail senden
export async function sendConfirmationEmail(
  email: string,
  name: string | undefined,
  confirmationToken: string
): Promise<{ success: boolean; error?: string }> {
  try {

    // 🚀 RESEND als einzige Methode
    try {

      const resendResult = await sendNewsletterConfirmationViaResend(
        email,
        name,
        confirmationToken
      );

      if (resendResult.success) {

        return { success: true };
      } else {

        return {
          success: false,
          error: resendResult.error || 'E-Mail-Versand über Resend fehlgeschlagen',
        };
      }
    } catch (resendError) {

      return {
        success: false,
        error: resendError instanceof Error ? resendError.message : 'Unbekannter Resend-Fehler',
      };
    }
  } catch (error) {

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
    };
  }
}

// Pending Newsletter-Anmeldung erstellen
export async function createPendingSubscription(
  email: string,
  options: {
    name?: string;
    source: 'manual' | 'website' | 'import' | 'footer';
    preferences?: string[];
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<{ success: boolean; error?: string; token?: string }> {
  try {
    // Prüfe ob bereits bestätigt
    const existingConfirmed = await admin
      .firestore()
      .collection('newsletterSubscribers')
      .where('email', '==', email)
      .where('subscribed', '==', true)
      .get();

    if (!existingConfirmed.empty) {
      return { success: false, error: 'E-Mail-Adresse bereits bestätigt und angemeldet' };
    }

    // Prüfe ob bereits pending
    const existingPending = await admin
      .firestore()
      .collection('newsletterPendingConfirmations')
      .where('email', '==', email)
      .get();

    // Lösche alte pending confirmations für diese E-Mail
    if (!existingPending.empty) {
      const batch = admin.firestore().batch();
      existingPending.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    }

    // Erstelle neuen Bestätigungstoken
    const confirmationToken = generateConfirmationToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 Stunden gültig

    // Speichere pending confirmation
    const pendingData = {
      email,
      name: options.name || null,
      source: options.source,
      preferences: options.preferences || [],
      ipAddress: options.ipAddress || null,
      userAgent: options.userAgent || null,
      confirmationToken,
      createdAt: admin.firestore.Timestamp.now(),
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
      confirmed: false,
    };

    await admin.firestore().collection('newsletterPendingConfirmations').add(pendingData);

    // Sende Bestätigungs-E-Mail
    const emailResult = await sendConfirmationEmail(email, options.name, confirmationToken);

    if (!emailResult.success) {
      return { success: false, error: 'Fehler beim Senden der Bestätigungs-E-Mail' };
    }

    return { success: true, token: confirmationToken };
  } catch (error) {

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
    };
  }
}

// Newsletter-Anmeldung bestätigen
export async function confirmNewsletterSubscription(
  email: string,
  confirmationToken: string
): Promise<{ success: boolean; error?: string; subscriberId?: string }> {
  try {
    // Finde pending confirmation
    const pendingQuery = await admin
      .firestore()
      .collection('newsletterPendingConfirmations')
      .where('email', '==', email)
      .where('confirmationToken', '==', confirmationToken)
      .where('confirmed', '==', false)
      .limit(1)
      .get();

    if (pendingQuery.empty) {
      return { success: false, error: 'Ungültiger oder abgelaufener Bestätigungslink' };
    }

    const pendingDoc = pendingQuery.docs[0];
    const pendingData = pendingDoc.data();

    // Prüfe Ablaufzeit
    const now = new Date();
    const expiresAt = pendingData.expiresAt.toDate();

    if (now > expiresAt) {
      // Lösche abgelaufene Bestätigung
      await pendingDoc.ref.delete();
      return { success: false, error: 'Bestätigungslink ist abgelaufen' };
    }

    // Prüfe ob bereits bestätigt
    const existingSubscriber = await admin
      .firestore()
      .collection('newsletterSubscribers')
      .where('email', '==', email)
      .get();

    if (!existingSubscriber.empty) {
      // Aktiviere bestehenden Subscriber falls deaktiviert
      const subscriberDoc = existingSubscriber.docs[0];
      const subscriberData = subscriberDoc.data();

      if (!subscriberData.subscribed) {
        await subscriberDoc.ref.update({
          subscribed: true,
          subscribedAt: admin.firestore.Timestamp.now(),
          confirmedAt: admin.firestore.Timestamp.now(),
          unsubscribedAt: admin.firestore.FieldValue.delete(),
          unsubscribeReason: admin.firestore.FieldValue.delete(),
        });
      }

      // Markiere pending als bestätigt und lösche
      await pendingDoc.ref.delete();

      return { success: true, subscriberId: subscriberDoc.id };
    }

    // Erstelle neuen bestätigten Subscriber
    const unsubscribeToken = generateUnsubscribeToken(email);

    const subscriberData = {
      email,
      name: pendingData.name,
      subscribed: true,
      subscribedAt: admin.firestore.Timestamp.now(),
      confirmedAt: admin.firestore.Timestamp.now(),
      source: pendingData.source,
      preferences: pendingData.preferences,
      unsubscribeToken,
      ipAddress: pendingData.ipAddress,
      userAgent: pendingData.userAgent,
      consentGiven: true,
      consentTimestamp: pendingData.createdAt,
      // DSGVO: Daten-Retention (3 Jahre nach Abmeldung)
      dataRetentionUntil: admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000)
      ),
    };

    const subscriberRef = await admin
      .firestore()
      .collection('newsletterSubscribers')
      .add(subscriberData);

    // Lösche pending confirmation
    await pendingDoc.ref.delete();

    return { success: true, subscriberId: subscriberRef.id };
  } catch (error) {

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
    };
  }
}

// Abgelaufene pending confirmations bereinigen
export async function cleanupExpiredPendingConfirmations(): Promise<{ deletedCount: number }> {
  try {
    const now = admin.firestore.Timestamp.now();

    const expiredQuery = await admin
      .firestore()
      .collection('newsletterPendingConfirmations')
      .where('expiresAt', '<=', now)
      .get();

    if (expiredQuery.empty) {
      return { deletedCount: 0 };
    }

    // Lösche abgelaufene Bestätigungen
    const batch = admin.firestore().batch();
    expiredQuery.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    return { deletedCount: expiredQuery.docs.length };
  } catch (error) {

    return { deletedCount: 0 };
  }
}
