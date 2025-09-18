// src/app/api/process-payment-intent-locally/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { OrderNotificationService } from '../../../lib/order-notifications';

export async function POST(req: NextRequest) {
  try {
    // Dynamically import Firebase setup to avoid build-time initialization
    const { db, admin } = await import('@/firebase/server');

    // Check if Firebase is properly initialized
    if (!db || !admin) {
      return NextResponse.json({ error: 'Firebase nicht verfügbar' }, { status: 500 });
    }

    const { paymentIntentId } = await req.json();

    if (!paymentIntentId) {
      return NextResponse.json({ error: 'paymentIntentId is required' }, { status: 400 });
    }

    // Simuliere PaymentIntent-Daten basierend auf den bekannten Metadaten
    const tempJobDraftId = '255b1584-9aaf-4468-a733-2bff51c9516f';
    const firebaseUserId = 'pMcdifjaj0SFu7iqd93n3mCZHPk2';

    if (!tempJobDraftId || !firebaseUserId) {
      return NextResponse.json(
        {
          error: 'Kritische Metadaten fehlen',
          details: { tempJobDraftId, firebaseUserId },
        },
        { status: 400 }
      );
    }

    try {
      const tempJobDraftRef = db!.collection('temporaryJobDrafts').doc(tempJobDraftId);
      const auftragCollectionRef = db!.collection('auftraege');

      // Definiere Variablen außerhalb der Transaction für Notifications
      let newOrderId: string = '';
      let orderData: any = null;

      await db!.runTransaction(async transaction => {
        const tempJobDraftSnapshot = await transaction.get(tempJobDraftRef);

        if (tempJobDraftSnapshot.data()?.status === 'converted') {
          return;
        }

        if (!tempJobDraftSnapshot.exists) {
          throw new Error(`Temporärer Job-Entwurf ${tempJobDraftId} nicht gefunden.`);
        }

        const tempJobDraftData = tempJobDraftSnapshot.data()!;

        // Berechnung für die Clearing-Periode (z.B. 14 Tage)
        const clearingPeriodDays = 14;
        const paidAtDate = new Date();
        const clearingEndsDate = new Date(
          paidAtDate.getTime() + clearingPeriodDays * 24 * 60 * 60 * 1000
        );
        const clearingPeriodEndsAtTimestamp = admin.firestore.Timestamp.fromDate(clearingEndsDate);

        // KRITISCHE KORREKTUR: Berechne jobTotalCalculatedHours neu für Multi-Tag Aufträge
        let correctedJobTotalCalculatedHours = tempJobDraftData.jobTotalCalculatedHours;

        // Prüfe, ob es ein Multi-Tag Auftrag ist und korrigiere die Stunden
        if (tempJobDraftData.jobDateFrom && tempJobDraftData.jobDateTo) {
          const startDate = new Date(tempJobDraftData.jobDateFrom);
          const endDate = new Date(tempJobDraftData.jobDateTo);

          if (startDate.getTime() !== endDate.getTime()) {
            const daysDiff =
              Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

            const durationMatch = tempJobDraftData.jobDurationString?.match(/(\d+(\.\d+)?)/);
            const hoursPerDay = durationMatch ? parseFloat(durationMatch[1]) : 8;

            correctedJobTotalCalculatedHours = hoursPerDay * daysDiff;
          }
        }

        const auftragData = {
          ...tempJobDraftData,
          jobTotalCalculatedHours: correctedJobTotalCalculatedHours,
          status: 'zahlung_erhalten_clearing',
          paymentIntentId: paymentIntentId,
          paidAt: admin.firestore.FieldValue.serverTimestamp(),
          customerFirebaseUid: firebaseUserId,
          tempJobDraftRefId: tempJobDraftId,
          originalJobPriceInCents: 131200,
          buyerServiceFeeInCents: 0,
          sellerCommissionInCents: 5904,
          totalPlatformFeeInCents: 5904,
          totalAmountPaidByBuyer: 131200,
          applicationFeeAmountFromStripe: 5904,
          createdAt: new admin.firestore.Timestamp(
            tempJobDraftData?.createdAt?._seconds || Math.floor(Date.now() / 1000),
            tempJobDraftData?.createdAt?._nanoseconds || 0
          ),
          paymentMethodId: 'pm_test_local',
          stripeCustomerId: 'cus_Sv12wMFg0zBEND',
          clearingPeriodEndsAt: clearingPeriodEndsAtTimestamp,
          buyerApprovedAt: null,
        };

        const newAuftragRef = auftragCollectionRef.doc();
        newOrderId = newAuftragRef.id;
        orderData = auftragData;

        transaction.set(newAuftragRef, auftragData);

        transaction.update(tempJobDraftRef, {
          status: 'converted',
          convertedToOrderId: newAuftragRef.id,
        });
      });

      // 🔔 NOTIFICATION: Order erfolgreich erstellt
      if (newOrderId && orderData) {
        try {
          const orderNotificationData = {
            customerName: orderData.customerName || 'Kunde',
            providerName: orderData.providerName || 'Anbieter',
            subcategory: orderData.selectedSubcategory || 'Service',
            category: orderData.selectedCategory || 'Dienstleistung',
            amount: orderData.totalAmountPaidByBuyer || 0,
            dateFrom: orderData.jobDateFrom || new Date().toISOString().split('T')[0],
            dateTo: orderData.jobDateTo,
          };

          await OrderNotificationService.createNewOrderNotifications(
            newOrderId,
            firebaseUserId, // Customer ID
            orderData.selectedAnbieterId, // Provider ID
            orderNotificationData
          );
        } catch (notificationError) {}
      }

      return NextResponse.json({
        success: true,
        message: 'Auftrag erfolgreich lokal erstellt',
        orderId: newOrderId,
        tempJobDraftId: tempJobDraftId,
        paymentIntentId: paymentIntentId,
      });
    } catch (dbError: unknown) {
      let dbErrorMessage = 'Datenbankfehler bei der lokalen Auftragserstellung.';
      if (dbError instanceof Error) {
        dbErrorMessage = dbError.message;
      }

      return NextResponse.json(
        {
          error: 'Auftragserstellung fehlgeschlagen',
          details: dbErrorMessage,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Lokale Auftragserstellung fehlgeschlagen',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}
