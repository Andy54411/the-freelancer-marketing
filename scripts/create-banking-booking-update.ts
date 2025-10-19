import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/clients';

interface UpdateNotification {
  version: string;
  title: string;
  description: string;
  category: 'feature' | 'improvement' | 'bugfix' | 'compliance';
  impact: 'low' | 'medium' | 'high' | 'critical';
  releaseDate: Date;
  technicalDetails?: string;
  userActions?: string[];
}

export class UpdateNotificationService {
  static async createUpdate(update: Omit<UpdateNotification, 'releaseDate'>) {
    try {
      const updateDoc = {
        ...update,
        releaseDate: serverTimestamp(),
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'updates'), updateDoc);

      console.log('✅ Update notification created:', docRef.id);
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('❌ Error creating update notification:', error);
      return { success: false, error: (error as Error).message };
    }
  }
}

// Create the notification
UpdateNotificationService.createUpdate({
  version: '2024.12.15-compliance',
  title: 'Buchungskonten-Integration für Banking-Transaktionen',
  description:
    'Vollständige Integration von SKR03-Buchungskonten in das Banking-Verknüpfungssystem mit strikter Einnahmen/Ausgaben-Trennung nach deutschem Steuerrecht.',
  category: 'compliance',
  impact: 'high',
  technicalDetails: `
• Neue BookingAccountSelectionModal für SKR03-Kontenwahl
• Strikte Validierung: RE-Rechnungen nur mit positiven Transaktionen
• Erweiterte TransactionLink-Datenstruktur mit Buchungskonten
• Automatische Filterung nach Dokumenttyp (Erlös 8000-8999, Aufwand 4000-7999)
• GoBD-konforme Buchungshistorie mit Audit-Trail
  `,
  userActions: [
    'Bei Transaktionsverknüpfung wird automatisch Buchungskonten-Modal geöffnet',
    'Auswahl des passenden SKR03-Kontos erforderlich für Verknüpfung',
    'System verhindert falsche Zuordnungen (Einnahmen/Ausgaben)',
    'Buchungskonten werden in Verknüpfungshistorie gespeichert',
  ],
});
