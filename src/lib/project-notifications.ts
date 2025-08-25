// Project Request Notification Service für Angebote zu Projekten
import { ResendEmailService } from './resend-email-service';
import { admin, db } from '@/firebase/server'; // Use centralized Firebase setup

// Firebase Admin is already initialized in @/firebase/server
// No need to initialize here

export interface ProjectNotification {
  id?: string;
  userId: string;
  type: 'new_proposal' | 'proposal_accepted' | 'proposal_declined' | 'project_created';
  title: string;
  message: string;
  projectId: string;
  projectTitle: string;
  link: string;
  isRead: boolean;
  createdAt: Date | admin.firestore.FieldValue;
  metadata?: {
    customerName?: string;
    companyName?: string;
    subcategory?: string;
    proposedPrice?: number;
    isCustomerAction?: boolean;
  };
}

export class ProjectNotificationService {
  /**
   * Benachrichtigt den Kunden über ein neues Angebot zu seinem Projekt
   */
  static async createNewProposalNotification(
    projectId: string,
    customerUid: string,
    companyUid: string,
    proposalData: {
      customerName?: string;
      companyName: string;
      subcategory: string;
      proposedPrice?: number;
      proposedTimeline?: string;
      message?: string;
    }
  ): Promise<void> {
    try {
      const priceText = proposalData.proposedPrice
        ? ` Angebotspreis: ${proposalData.proposedPrice.toLocaleString('de-DE')} €`
        : '';

      const timelineText = proposalData.proposedTimeline
        ? ` Timeline: ${proposalData.proposedTimeline}`
        : '';

      // CUSTOMER NOTIFICATION - Neues Angebot erhalten
      const customerNotification: Omit<ProjectNotification, 'id'> = {
        userId: customerUid,
        type: 'new_proposal',
        title: '💼 Neues Angebot erhalten!',
        message: `${proposalData.companyName} hat Ihnen ein Angebot für "${proposalData.subcategory}" gesendet.${priceText}${timelineText}`,
        projectId,
        projectTitle: `${proposalData.subcategory} - ${proposalData.companyName}`,
        link: `/dashboard/user/${customerUid}/projects/${projectId}`,
        isRead: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        metadata: {
          customerName: proposalData.customerName,
          companyName: proposalData.companyName,
          subcategory: proposalData.subcategory,
          proposedPrice: proposalData.proposedPrice,
          isCustomerAction: false,
        },
      };

      // COMPANY NOTIFICATION - Angebot gesendet Bestätigung
      const companyNotification: Omit<ProjectNotification, 'id'> = {
        userId: companyUid,
        type: 'project_created',
        title: '✅ Angebot gesendet!',
        message: `Ihr Angebot für "${proposalData.subcategory}" wurde erfolgreich gesendet. Sie erhalten eine Benachrichtigung, sobald der Kunde reagiert.`,
        projectId,
        projectTitle: `${proposalData.subcategory} - ${proposalData.customerName || 'Kunde'}`,
        link: `/dashboard/company/${companyUid}/quotes/incoming/${projectId}`,
        isRead: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        metadata: {
          customerName: proposalData.customerName,
          companyName: proposalData.companyName,
          subcategory: proposalData.subcategory,
          proposedPrice: proposalData.proposedPrice,
          isCustomerAction: false,
        },
      };

      // Send notifications parallel
      await Promise.all([
        db.collection('notifications').add(customerNotification),
        db.collection('notifications').add(companyNotification),
      ]);

    } catch (error) {

      throw error;
    }
  }

  /**
   * Benachrichtigt über Angebotsstatus-Änderungen (Annahme/Ablehnung)
   */
  static async createProposalStatusNotification(
    projectId: string,
    targetUserUid: string,
    status: 'accepted' | 'declined',
    proposalData: {
      customerName?: string;
      companyName?: string;
      subcategory: string;
      proposedPrice?: number;
      isCustomerAction?: boolean; // Um zu unterscheiden, wer die Aktion ausgeführt hat
    }
  ): Promise<void> {
    try {
      let title: string;
      let message: string;
      let link: string;

      if (status === 'accepted') {
        if (proposalData.isCustomerAction) {
          // Company wird benachrichtigt, dass Kunde das Angebot angenommen hat
          title = '🎉 Angebot angenommen!';
          message = `${proposalData.customerName} hat Ihr Angebot für "${proposalData.subcategory}" angenommen! Projekt kann jetzt gestartet werden.`;
          link = `/dashboard/company/${targetUserUid}/quotes/incoming/${projectId}`;
        } else {
          // Customer wird benachrichtigt über eigene Annahme
          title = '✅ Angebot angenommen';
          message = `Sie haben das Angebot für "${proposalData.subcategory}" von ${proposalData.companyName} angenommen.`;
          link = `/dashboard/user/${targetUserUid}/projects/${projectId}`;
        }
      } else {
        if (proposalData.isCustomerAction) {
          // Company wird benachrichtigt, dass Kunde das Angebot abgelehnt hat
          title = '❌ Angebot abgelehnt';
          message = `${proposalData.customerName} hat Ihr Angebot für "${proposalData.subcategory}" abgelehnt.`;
          link = `/dashboard/company/${targetUserUid}/quotes/incoming/${projectId}`;
        } else {
          // Customer wird benachrichtigt über eigene Ablehnung
          title = '❌ Angebot abgelehnt';
          message = `Sie haben das Angebot für "${proposalData.subcategory}" von ${proposalData.companyName} abgelehnt.`;
          link = `/dashboard/user/${targetUserUid}/projects/${projectId}`;
        }
      }

      const notification: Omit<ProjectNotification, 'id'> = {
        userId: targetUserUid,
        type: status === 'accepted' ? 'proposal_accepted' : 'proposal_declined',
        title,
        message,
        projectId,
        projectTitle: proposalData.subcategory,
        link,
        isRead: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        metadata: proposalData,
      };

      await db.collection('notifications').add(notification);

    } catch (error) {

      throw error;
    }
  }

  /**
   * Benachrichtigt über neue Projektanfragen (kann für Marketplace-Features verwendet werden)
   */
  static async createNewProjectNotification(
    projectId: string,
    projectData: {
      title: string;
      description: string;
      category: string;
      subcategory: string;
      customerName?: string;
      customerUid: string;
      budget?: {
        min?: number;
        max?: number;
        type?: string;
      };
      location?: string;
    }
  ): Promise<void> {
    try {
      // Diese Funktion kann später für Marketplace-Features verwendet werden
      // um relevante Anbieter über neue Projektanfragen zu benachrichtigen

      // TODO: Implementiere Matching-Logic um relevante Companies zu finden
      // und sie über neue Projektanfragen zu benachrichtigen
    } catch (error) {

      throw error;
    }
  }
}
