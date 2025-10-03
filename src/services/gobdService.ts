// GoBD Service für Taskilo - Festschreibungs-Backend
import {
  GoBDDocument,
  GoBDLockStatus,
  GoBDPeriodLock,
  GoBDSettings,
  GoBDComplianceReport,
  StornoRequest,
  CreditNoteRequest,
  GoBDAuditEntry } from
'@/types/gobdTypes';
import { db } from '@/firebase/clients';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  Timestamp,
  writeBatch } from
'firebase/firestore';
import { toast } from 'sonner';

export class GoBDService {

  /**
   * Automatische Festschreibung bei Rechnungsversand
   */
  static async autoLockOnSend(
  companyId: string,
  documentId: string,
  userId: string,
  userName: string)
  : Promise<boolean> {
    try {
      // Erst prüfen ob Dokument existiert
      const docRef = doc(db, 'companies', companyId, 'invoices', documentId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        console.error(`Document ${documentId} not found in company ${companyId}`);
        toast.error('Dokument nicht gefunden - Festschreibung übersprungen');
        return false;
      }

      const docData = docSnap.data();

      // Bereits gesperrt?
      if (docData.gobdStatus?.isLocked) {

        return true; // Nicht als Fehler behandeln
      }

      const lockStatus: GoBDLockStatus = {
        isLocked: true,
        lockedAt: new Date(),
        lockedBy: userId,
        lockReason: 'auto',
        auditTrail: [{
          id: `audit-${Date.now()}`,
          timestamp: new Date(),
          userId,
          userName,
          action: 'locked',
          documentId,
          documentType: docData.documentType || 'invoice',
          reason: 'Automatische Festschreibung bei E-Mail-Versand'
        }]
      };

      await updateDoc(docRef, {
        'gobdStatus': lockStatus,
        'isLocked': true, // Legacy field für Kompatibilität
        'lockedAt': Timestamp.fromDate(new Date()),
        'lockedBy': userId
      });

      toast.success('Dokument wurde automatisch festgeschrieben (GoBD-konform)');
      return true;
    } catch (error) {
      console.error('Auto-lock failed:', error);

      // Detaillierteres Error-Handling
      if (error instanceof Error) {
        if (error.message.includes('permission')) {
          toast.error('Berechtigung fehlt - Festschreibung übersprungen');
        } else if (error.message.includes('not-found')) {
          toast.error('Dokument nicht gefunden - Festschreibung übersprungen');
        } else {
          toast.error(`Festschreibung fehlgeschlagen: ${error.message}`);
        }
      } else {
        toast.error('Automatische Festschreibung fehlgeschlagen');
      }

      return false;
    }
  }

  /**
   * Manuelle Festschreibung einzelner Dokumente
   */
  static async lockDocument(
  companyId: string,
  documentId: string,
  userId: string,
  userName: string,
  reason?: string)
  : Promise<boolean> {
    try {
      // Prüfe ob Dokument bereits gesperrt
      const docRef = doc(db, 'companies', companyId, 'invoices', documentId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error('Dokument nicht gefunden');
      }

      const data = docSnap.data();
      if (data.gobdStatus?.isLocked) {
        toast.warning('Dokument ist bereits festgeschrieben');
        return false;
      }

      const lockStatus: GoBDLockStatus = {
        isLocked: true,
        lockedAt: new Date(),
        lockedBy: userId,
        lockReason: 'manual',
        auditTrail: [{
          id: `audit-${Date.now()}`,
          timestamp: new Date(),
          userId,
          userName,
          action: 'locked',
          documentId,
          documentType: data.documentType || 'invoice',
          reason: reason || 'Manuelle Festschreibung'
        }]
      };

      await updateDoc(docRef, {
        'gobdStatus': lockStatus,
        'isLocked': true,
        'lockedAt': Timestamp.fromDate(new Date()),
        'lockedBy': userId
      });

      toast.success('Dokument wurde festgeschrieben');
      return true;
    } catch (error) {
      console.error('Manual lock failed:', error);
      toast.error('Festschreibung fehlgeschlagen: ' + (error as Error).message);
      return false;
    }
  }

  /**
   * Festschreibung für Zeitraum (Monatsabschluss)
   */
  static async lockPeriod(
  companyId: string,
  period: string, // "2025-10"
  userId: string,
  userName: string)
  : Promise<GoBDPeriodLock | null> {
    try {
      // Hole alle Dokumente des Zeitraums
      const startDate = new Date(`${period}-01`);
      const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);

      const q = query(
        collection(db, 'companies', companyId, 'invoices'),
        where('createdAt', '>=', Timestamp.fromDate(startDate)),
        where('createdAt', '<=', Timestamp.fromDate(endDate))
      );

      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);

      let documentCount = 0;
      let totalAmount = 0;
      const documentTypes: Record<string, number> = {};

      // Festschreibung aller Dokumente im Batch
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();

        // Skip bereits gesperrte Dokumente
        if (data.gobdStatus?.isLocked) {
          return;
        }

        documentCount++;
        totalAmount += data.total || 0;

        const docType = data.documentType || 'invoice';
        documentTypes[docType] = (documentTypes[docType] || 0) + 1;

        const lockStatus: GoBDLockStatus = {
          isLocked: true,
          lockedAt: new Date(),
          lockedBy: userId,
          lockReason: 'period-end',
          lockPeriod: period,
          auditTrail: [{
            id: `audit-${Date.now()}`,
            timestamp: new Date(),
            userId,
            userName,
            action: 'locked',
            documentId: docSnap.id,
            documentType: docType,
            reason: `Monatsabschluss ${period}`
          }]
        };

        batch.update(doc(db, 'companies', companyId, 'invoices', docSnap.id), {
          'gobdStatus': lockStatus,
          'isLocked': true,
          'lockedAt': Timestamp.fromDate(new Date()),
          'lockedBy': userId
        });
      });

      // Erstelle Periode-Lock Datensatz
      const periodLock: GoBDPeriodLock = {
        id: `lock-${companyId}-${period}`,
        companyId,
        period,
        lockedAt: new Date(),
        lockedBy: userId,
        documentCount,
        totalAmount,
        documentTypes,
        auditTrail: [{
          id: `audit-${Date.now()}`,
          timestamp: new Date(),
          userId,
          userName,
          action: 'locked',
          documentId: period,
          documentType: 'invoice',
          reason: `Monatsabschluss ${period} - ${documentCount} Dokumente festgeschrieben`
        }]
      };

      batch.set(doc(db, 'gobdPeriodLocks', periodLock.id), periodLock);

      await batch.commit();

      toast.success(`Monatsabschluss ${period} abgeschlossen: ${documentCount} Dokumente festgeschrieben`);
      return periodLock;
    } catch (error) {
      console.error('Period lock failed:', error);
      toast.error('Monatsabschluss fehlgeschlagen: ' + (error as Error).message);
      return null;
    }
  }

  /**
   * Stornorechnung erstellen
   */
  static async createStorno(
  companyId: string,
  request: StornoRequest,
  userId: string,
  userName: string)
  : Promise<string | null> {
    try {
      // Prüfe Original-Dokument
      // Hole Original-Dokument
      const originalDoc = await getDoc(doc(db, 'companies', companyId, 'invoices', request.originalDocumentId));
      if (!originalDoc.exists()) {
        throw new Error('Original-Dokument nicht gefunden');
      }

      const originalData = originalDoc.data();

      // Erstelle Storno-Dokument
      const stornoId = `storno-${Date.now()}`;
      const stornoData = {
        ...originalData,
        id: stornoId,
        documentType: 'cancellation',
        documentNumber: `ST-${originalData.documentNumber}`,
        originalDocumentId: request.originalDocumentId,
        stornoReason: request.reason,
        stornoDate: request.stornoDate,
        // Negative Beträge für Storno
        total: -(originalData.total || 0),
        subtotal: -(originalData.subtotal || 0),
        taxAmount: -(originalData.taxAmount || 0),
        createdAt: Timestamp.fromDate(request.stornoDate),
        gobdStatus: {
          isLocked: true, // Storno sofort festschreiben
          lockedAt: new Date(),
          lockedBy: userId,
          lockReason: 'auto',
          auditTrail: [{
            id: `audit-${Date.now()}`,
            timestamp: new Date(),
            userId,
            userName,
            action: 'locked',
            documentId: stornoId,
            documentType: 'cancellation',
            reason: `Storno für ${originalData.documentNumber}: ${request.reason}`
          }]
        }
      };

      // Speichere Storno
      await setDoc(doc(db, 'companies', companyId, 'invoices', stornoId), stornoData);

      // Update Original mit Storno-Referenz
      await updateDoc(doc(db, 'companies', companyId, 'invoices', request.originalDocumentId), {
        stornoDocumentId: stornoId,
        'gobdStatus.auditTrail': [...(originalData.gobdStatus?.auditTrail || []), {
          id: `audit-${Date.now()}`,
          timestamp: new Date(),
          userId,
          userName,
          action: 'storno',
          documentId: request.originalDocumentId,
          documentType: originalData.documentType,
          reason: `Storniert durch ${stornoId}: ${request.reason}`,
          metadata: { stornoDocumentId: stornoId }
        }]
      });

      toast.success(`Stornorechnung ${stornoData.documentNumber} erstellt`);
      return stornoId;
    } catch (error) {
      console.error('Storno creation failed:', error);
      toast.error('Storno-Erstellung fehlgeschlagen: ' + (error as Error).message);
      return null;
    }
  }

  /**
   * GoBD-Einstellungen laden
   */
  static async getSettings(companyId: string): Promise<GoBDSettings> {
    try {
      const settingsDoc = await getDoc(doc(db, 'gobdSettings', companyId));

      if (settingsDoc.exists()) {
        return settingsDoc.data() as GoBDSettings;
      }

      // Default-Einstellungen
      const defaultSettings: GoBDSettings = {
        companyId,
        autoLockOnSend: true,
        autoLockOnExport: true,
        lockDeadlineDays: 30,
        allowStornoAfterLock: true,
        requireApprovalForUnlock: false,
        notificationSettings: {
          lockDeadlineReminder: true,
          lockConfirmation: true,
          stornoNotification: true
        }
      };

      await setDoc(doc(db, 'gobdSettings', companyId), defaultSettings);
      return defaultSettings;
    } catch (error) {
      console.error('Failed to load GoBD settings:', error);
      throw error;
    }
  }

  /**
   * GoBD-Einstellungen speichern
   */
  static async updateSettings(settings: GoBDSettings): Promise<void> {
    try {
      await setDoc(doc(db, 'gobdSettings', settings.companyId), settings);
      toast.success('GoBD-Einstellungen gespeichert');
    } catch (error) {
      console.error('Failed to update GoBD settings:', error);
      toast.error('Einstellungen konnten nicht gespeichert werden');
      throw error;
    }
  }

  /**
   * Compliance-Report generieren
   */
  static async generateComplianceReport(
  companyId: string,
  period: string)
  : Promise<GoBDComplianceReport> {
    try {
      const startDate = new Date(`${period}-01`);
      const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);

      const q = query(
        collection(db, 'companies', companyId, 'invoices'),
        where('createdAt', '>=', Timestamp.fromDate(startDate)),
        where('createdAt', '<=', Timestamp.fromDate(endDate))
      );

      const querySnapshot = await getDocs(q);
      const documents = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as any[];

      const summary = {
        totalDocuments: documents.length,
        lockedDocuments: documents.filter((d) => d.gobdStatus?.isLocked).length,
        unlockedDocuments: documents.filter((d) => !d.gobdStatus?.isLocked).length,
        overdueDocuments: documents.filter((d) => {
          if (d.gobdStatus?.isLocked) return false;
          const deadline = new Date(d.createdAt.toDate());
          deadline.setDate(deadline.getDate() + 30);
          return deadline < new Date();
        }).length,
        stornoDocuments: documents.filter((d) => d.documentType === 'cancellation').length
      };

      const status = summary.overdueDocuments > 0 ? 'non-compliant' :
      summary.unlockedDocuments > 0 ? 'warning' : 'compliant';

      const report: GoBDComplianceReport = {
        companyId,
        period,
        generatedAt: new Date(),
        status,
        summary,
        issues: [], // TODO: Implement issue detection
        recommendations: [] // TODO: Implement recommendations
      };

      return report;
    } catch (error) {
      console.error('Compliance report generation failed:', error);
      throw error;
    }
  }
}