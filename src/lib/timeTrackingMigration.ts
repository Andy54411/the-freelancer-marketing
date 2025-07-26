// Migration-Funktion für TimeTracking-Korrekturen
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase/clients';

export class TimeTrackingMigration {
  /**
   * Korrigiert das TimeTracking für einen bestehenden Auftrag
   * Berechnet korrekte originalPlannedHours und kategorisiert Time Entries neu
   */
  static async fixTimeTrackingForOrder(orderId: string): Promise<void> {
    try {
      console.log(`🔧 [Migration] Starte TimeTracking-Korrektur für Order: ${orderId}`);

      const orderRef = doc(db, 'auftraege', orderId);
      const orderDoc = await getDoc(orderRef);

      if (!orderDoc.exists()) {
        throw new Error('Order not found');
      }

      const orderData = orderDoc.data();

      if (!orderData.timeTracking) {
        console.log('🔧 [Migration] Kein TimeTracking vorhanden');
        return;
      }

      // 1. Berechne korrekte originalPlannedHours
      let correctOriginalPlannedHours = orderData.jobTotalCalculatedHours || 8;

      if (
        orderData.jobDateFrom &&
        orderData.jobDateTo &&
        orderData.jobDateFrom !== orderData.jobDateTo
      ) {
        const startDate = new Date(orderData.jobDateFrom);
        const endDate = new Date(orderData.jobDateTo);
        const totalDays =
          Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const hoursPerDay = parseFloat(String(orderData.jobDurationString || 8));
        correctOriginalPlannedHours = totalDays * hoursPerDay;

        console.log(
          `🔧 [Migration] Mehrtägiger Auftrag: ${totalDays} Tage × ${hoursPerDay}h = ${correctOriginalPlannedHours}h`
        );
      } else {
        console.log(`🔧 [Migration] Eintägiger Auftrag: ${correctOriginalPlannedHours}h`);
      }

      // 2. Kategorisiere Time Entries neu und korrigiere billableAmount mit Firmen-Stundensatz
      const timeEntries = [...orderData.timeTracking.timeEntries];
      let totalOriginalHours = 0;

      // KORREKTUR: Verwende Firmen-Stundensatz aus companies Collection (mit users fallback) statt berechnet aus Auftragspreis
      const providerId = orderData.selectedAnbieterId;
      let correctHourlyRateInEuros = 41; // Fallback

      if (providerId) {
        try {
          // 1. Versuche zuerst companies Collection
          const companyRef = doc(db, 'companies', providerId);
          const companyDoc = await getDoc(companyRef);

          if (companyDoc.exists()) {
            const companyData = companyDoc.data();
            correctHourlyRateInEuros = companyData.hourlyRate || 41;
            console.log(
              `🔧 [Migration] Verwende Firmen-Stundensatz (companies): ${correctHourlyRateInEuros}€/h`
            );
          } else {
            // 2. Fallback: Suche in users Collection
            const userRef = doc(db, 'users', providerId);
            const userDoc = await getDoc(userRef);

            if (userDoc.exists()) {
              const userData = userDoc.data();
              correctHourlyRateInEuros = userData.hourlyRate || 41;
              console.log(
                `🔧 [Migration] Verwende User-Stundensatz (users fallback): ${correctHourlyRateInEuros}€/h`
              );
            } else {
              console.log(
                `🔧 [Migration] Provider nicht gefunden, verwende Fallback: ${correctHourlyRateInEuros}€/h`
              );
            }
          }
        } catch (error) {
          console.error(`🔧 [Migration] Fehler beim Laden des Providers:`, error);
          console.log(`🔧 [Migration] Verwende Fallback: ${correctHourlyRateInEuros}€/h`);
        }
      }

      const correctHourlyRateInCents = Math.round(correctHourlyRateInEuros * 100);

      console.log(`🔧 [Migration] Stundensatz-Korrektur:`);
      console.log(`  - Provider ID: ${providerId}`);
      console.log(
        `  - Company Rate: ${correctHourlyRateInEuros}€/h (${correctHourlyRateInCents} Cents)`
      );
      console.log(
        `  - Stored Rate: ${(orderData.timeTracking.hourlyRate / 100).toFixed(2)}€/h (${orderData.timeTracking.hourlyRate} Cents)`
      );

      const updatedTimeEntries = timeEntries.map((entry, index) => {
        // Berechne, wie viele Stunden als "original" zählen sollen
        const remainingOriginalHours = correctOriginalPlannedHours - totalOriginalHours;

        if (remainingOriginalHours > 0) {
          // Dieser Entry (oder ein Teil davon) sollte "original" sein
          if (entry.hours <= remainingOriginalHours) {
            // Kompletter Entry ist "original"
            totalOriginalHours += entry.hours;
            return {
              ...entry,
              category: 'original' as const,
            };
          } else {
            // Entry muss aufgeteilt werden - für jetzt behalten wir es als "original"
            // In einer komplexeren Implementierung würde man hier den Entry aufteilen
            totalOriginalHours += entry.hours;
            return {
              ...entry,
              category:
                entry.hours > remainingOriginalHours
                  ? ('additional' as const)
                  : ('original' as const),
            };
          }
        } else {
          // Alle verbleibenden Entries sind "additional" und benötigen korrekte billableAmount
          const correctedBillableAmount = Math.round(entry.hours * correctHourlyRateInCents);

          console.log(
            `🔧 [Migration] Entry ${index + 1}: Additional mit korrigierter billableAmount`
          );
          console.log(
            `  - ${entry.hours}h × ${correctHourlyRateInCents} Cents = ${correctedBillableAmount} Cents (${(correctedBillableAmount / 100).toFixed(2)}€)`
          );

          return {
            ...entry,
            category: 'additional' as const,
            billableAmount: correctedBillableAmount,
          };
        }
      });

      // 3. Berechne neue Statistiken
      const totalLoggedHours = updatedTimeEntries.reduce((sum, e) => sum + e.hours, 0);
      const originalHours = updatedTimeEntries
        .filter(e => e.category === 'original')
        .reduce((sum, e) => sum + e.hours, 0);
      const additionalHours = updatedTimeEntries
        .filter(e => e.category === 'additional')
        .reduce((sum, e) => sum + e.hours, 0);

      console.log(`🔧 [Migration] Korrektur-Ergebnis:`);
      console.log(`  - Korrekte geplante Stunden: ${correctOriginalPlannedHours}h`);
      console.log(`  - Total geloggte Stunden: ${totalLoggedHours}h`);
      console.log(`  - Original Stunden: ${originalHours}h`);
      console.log(`  - Zusätzliche Stunden: ${additionalHours}h`);

      // 4. Update das TimeTracking mit korrigiertem Stundensatz
      await updateDoc(orderRef, {
        'timeTracking.originalPlannedHours': correctOriginalPlannedHours,
        'timeTracking.totalLoggedHours': totalLoggedHours,
        'timeTracking.hourlyRate': correctHourlyRateInCents, // KORRIGIERE den Stundensatz
        'timeTracking.timeEntries': updatedTimeEntries,
        'timeTracking.lastUpdated': new Date(),
      });

      console.log(`✅ [Migration] TimeTracking erfolgreich korrigiert für Order: ${orderId}`);

      // 5. AUTOMATISCHE EINREICHUNG: Reiche zusätzliche Stunden zur Freigabe ein
      const additionalEntries = updatedTimeEntries.filter(
        e => e.category === 'additional' && e.status === 'logged'
      );

      if (additionalEntries.length > 0) {
        console.log(
          `🚀 [Migration] Reiche ${additionalEntries.length} zusätzliche Stunden automatisch zur Freigabe ein...`
        );

        // Importiere TimeTracker dynamisch um zirkuläre Abhängigkeiten zu vermeiden
        const { TimeTracker } = await import('@/lib/timeTracker');

        const additionalEntryIds = additionalEntries.map(e => e.id);
        const approvalRequestId = await TimeTracker.submitForCustomerApproval(
          orderId,
          additionalEntryIds,
          `Automatische Einreichung nach TimeTracking-Korrektur: ${additionalHours}h zusätzliche Arbeit über die geplanten ${correctOriginalPlannedHours}h hinaus.`
        );

        console.log(
          `✅ [Migration] Zusätzliche Stunden automatisch eingereicht. Approval Request ID: ${approvalRequestId}`
        );
      } else {
        console.log(`ℹ️ [Migration] Keine zusätzlichen Stunden zum Einreichen vorhanden.`);
      }
    } catch (error) {
      console.error(`❌ [Migration] Fehler bei TimeTracking-Korrektur:`, error);
      throw error;
    }
  }

  /**
   * Überprüft, ob ein TimeTracking eine Korrektur benötigt
   */
  static async checkIfMigrationNeeded(orderId: string): Promise<boolean> {
    try {
      const orderRef = doc(db, 'auftraege', orderId);
      const orderDoc = await getDoc(orderRef);

      if (!orderDoc.exists() || !orderDoc.data().timeTracking) {
        return false;
      }

      const orderData = orderDoc.data();
      const timeTracking = orderData.timeTracking;

      // Berechne korrekte originalPlannedHours
      let correctOriginalPlannedHours = orderData.jobTotalCalculatedHours || 8;

      if (
        orderData.jobDateFrom &&
        orderData.jobDateTo &&
        orderData.jobDateFrom !== orderData.jobDateTo
      ) {
        const startDate = new Date(orderData.jobDateFrom);
        const endDate = new Date(orderData.jobDateTo);
        const totalDays =
          Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const hoursPerDay = parseFloat(String(orderData.jobDurationString || 8));
        correctOriginalPlannedHours = totalDays * hoursPerDay;
      }

      // Prüfe, ob Korrektur nötig ist
      const needsMigration = timeTracking.originalPlannedHours !== correctOriginalPlannedHours;

      if (needsMigration) {
        console.log(`🔧 [Migration Check] Korrektur nötig für Order ${orderId}:`);
        console.log(`  - Aktuell: ${timeTracking.originalPlannedHours}h`);
        console.log(`  - Korrekt: ${correctOriginalPlannedHours}h`);
      }

      return needsMigration;
    } catch (error) {
      console.error('❌ [Migration Check] Fehler:', error);
      return false;
    }
  }
}
