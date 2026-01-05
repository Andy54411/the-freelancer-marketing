import { db } from '@/firebase/server';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

/**
 * Service für Proposal-Management mit Subcollections
 * UNIFIED: Struktur ist jetzt project_requests/{projectId}/proposals/{proposalId}
 * Legacy: quotes/{quoteId}/proposals/{proposalId} wird weiterhin unterstützt
 */

export interface ProposalData {
  id?: string; // Optional ID field for subcollection documents
  companyUid: string;
  providerId?: string; // Same as companyUid for consistency
  message: string;
  serviceItems?: Array<{
    title: string;
    description: string;
    price?: number;
    quantity?: number;
    unitPrice?: number;
    total?: number;
    // Neue Felder für zeitbasierte Projekte
    isTimeBasedProject?: boolean;
    startDate?: string;
    endDate?: string;
    hoursPerDay?: number;
    workingDays?: string[];
  }>;
  totalAmount: number;
  currency: string;
  timeline: string;
  terms?: string;
  additionalNotes?: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  submittedAt: string;
  acceptedAt?: string; // For when proposal is accepted
  paidAt?: string; // For when payment is completed
  paymentIntentId?: string; // Revolut payment ID
  orderId?: string; // Related order ID
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  // Neue Felder für erweiterte Angebote
  validUntil?: string;
  notes?: string;
}

export class ProposalSubcollectionService {
  /**
   * UNIFIED: Create a new proposal in project_requests subcollection
   * Dies ist die neue Hauptmethode für alle Proposals
   */
  static async createProposalForProject(
    projectId: string,
    proposalData: ProposalData,
    fullResponse?: Record<string, unknown>
  ): Promise<string> {
    const proposalId = proposalData.companyUid; // Use companyUid as document ID

    const proposalRef = db!
      .collection('project_requests')
      .doc(projectId)
      .collection('proposals')
      .doc(proposalId);

    const now = Timestamp.now();
    const proposal = {
      ...proposalData,
      providerId: proposalData.companyUid,
      createdAt: now,
      updatedAt: now,
    };

    await proposalRef.set(proposal);

    // Update project status
    const projectUpdate: Record<string, unknown> = {
      status: 'has_proposals',
      lastProposalAt: now,
      proposalCount: FieldValue.increment(1),
      updatedAt: now,
    };

    if (fullResponse) {
      projectUpdate.lastResponse = fullResponse;
    }

    await db!
      .collection('project_requests')
      .doc(projectId)
      .update(projectUpdate);

    return proposalId;
  }

  /**
   * Get all proposals for a project (UNIFIED)
   */
  static async getProposalsForProject(projectId: string): Promise<ProposalData[]> {
    const proposalsSnapshot = await db!
      .collection('project_requests')
      .doc(projectId)
      .collection('proposals')
      .get();

    return proposalsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as ProposalData[];
  }

  /**
   * LEGACY: Create a new proposal in subcollection (alte Struktur)
   * @deprecated Nutze createProposalForProject stattdessen
   */
  static async createProposal(
    quoteId: string,
    proposalData: ProposalData,
    companyId: string,
    fullResponse?: any
  ): Promise<void> {
    const proposalId = proposalData.companyUid; // Use companyUid as document ID

    const proposalRef = db!
      .collection('companies')
      .doc(companyId)
      .collection('quotes')
      .doc(quoteId)
      .collection('proposals')
      .doc(proposalId);

    const now = Timestamp.now();
    const proposal = {
      ...proposalData,
      providerId: proposalData.companyUid, // Ensure providerId is set for consistency
      createdAt: now,
      updatedAt: now,
    };

    await proposalRef.set(proposal);

    // Update quote status - include response if provided
    const quoteUpdate: any = {
      status: 'responded',
      lastResponseAt: now,
      responseCount: FieldValue.increment(1),
    };

    if (fullResponse) {
      quoteUpdate.response = fullResponse;
      quoteUpdate.responseAt = now;
    }

    await db!
      .collection('companies')
      .doc(companyId)
      .collection('quotes')
      .doc(quoteId)
      .update(quoteUpdate);
  }

  /**
   * Get all proposals for a quote
   */
  static async getProposalsForQuote(quoteId: string, companyId: string): Promise<ProposalData[]> {
    const proposalsSnapshot = await db!
      .collection('companies')
      .doc(companyId)
      .collection('quotes')
      .doc(quoteId)
      .collection('proposals')
      .orderBy('createdAt', 'desc')
      .get();

    return proposalsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as ProposalData[];
  }

  /**
   * Get a specific proposal
   */
  static async getProposal(
    quoteId: string,
    proposalId: string,
    companyId: string
  ): Promise<ProposalData | null> {
    const proposalDoc = await db!
      .collection('companies')
      .doc(companyId)
      .collection('quotes')
      .doc(quoteId)
      .collection('proposals')
      .doc(proposalId)
      .get();

    if (!proposalDoc.exists) {
      return null;
    }

    return {
      id: proposalDoc.id,
      ...proposalDoc.data(),
    } as ProposalData;
  }

  /**
   * Update proposal status (accept/decline)
   */
  static async updateProposalStatus(
    quoteId: string,
    proposalId: string,
    status: 'accepted' | 'declined',
    companyId: string,
    updateData?: Partial<ProposalData>
  ): Promise<void> {
    const proposalRef = db!
      .collection('companies')
      .doc(companyId)
      .collection('quotes')
      .doc(quoteId)
      .collection('proposals')
      .doc(proposalId);

    const updates = {
      status,
      updatedAt: Timestamp.now(),
      ...updateData,
    };

    await proposalRef.update(updates);

    // If accepted, decline all other proposals
    if (status === 'accepted') {
      await this.declineOtherProposals(quoteId, proposalId, companyId);

      // Update quote status
      await db!.collection('companies').doc(companyId).collection('quotes').doc(quoteId).update({
        status: 'accepted',
        acceptedProposalId: proposalId,
        acceptedAt: Timestamp.now(),
      });
    }
  }

  /**
   * Decline all other proposals when one is accepted
   */
  static async declineOtherProposals(
    quoteId: string,
    acceptedProposalId: string,
    companyId: string
  ): Promise<void> {
    const proposalsSnapshot = await db!
      .collection('companies')
      .doc(companyId)
      .collection('quotes')
      .doc(quoteId)
      .collection('proposals')
      .where('status', '==', 'pending')
      .get();

    const batch = db!.batch();
    const now = Timestamp.now();

    proposalsSnapshot.docs.forEach(doc => {
      if (doc.id !== acceptedProposalId) {
        batch.update(doc.ref, {
          status: 'declined',
          declinedAt: now,
          updatedAt: now,
          declineReason: 'Another proposal was accepted',
        });
      }
    });

    // Check if batch has operations before committing
    const batchHasOperations = proposalsSnapshot.docs.some(doc => doc.id !== acceptedProposalId);
    if (batchHasOperations) {
      await batch.commit();
    }
  }

  /**
   * Check if company has already submitted a proposal
   */
  static async hasExistingProposal(
    quoteId: string,
    companyUid: string,
    companyId: string
  ): Promise<boolean> {
    const proposalDoc = await db!
      .collection('companies')
      .doc(companyId)
      .collection('quotes')
      .doc(quoteId)
      .collection('proposals')
      .doc(companyUid)
      .get();

    return proposalDoc.exists;
  }

  /**
   * UNIFIED: Check if company has already submitted a proposal for a project
   */
  static async hasExistingProposalForProject(
    projectId: string,
    companyUid: string
  ): Promise<boolean> {
    const proposalDoc = await db!
      .collection('project_requests')
      .doc(projectId)
      .collection('proposals')
      .doc(companyUid)
      .get();

    return proposalDoc.exists;
  }

  /**
   * Get proposals by company (for provider dashboard)
   */
  static async getProposalsByCompany(
    companyUid: string,
    limit: number = 50,
    companyId: string
  ): Promise<
    Array<{
      proposalId: string;
      quoteId: string;
      proposal: any;
      quote: any;
    }>
  > {
    // This requires a collection group query since proposals are in subcollections
    const proposalsSnapshot = await db!
      .collectionGroup('proposals')
      .where('companyUid', '==', companyUid)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    const proposalsWithQuoteData: Array<{
      proposalId: string;
      quoteId: string;
      proposal: any;
      quote: any;
    }> = [];

    for (const proposalDoc of proposalsSnapshot.docs) {
      const proposalData = proposalDoc.data();

      // Get parent quote data
      const quoteId = proposalDoc.ref.parent.parent?.id;
      if (quoteId) {
        const quoteDoc = await db!
          .collection('companies')
          .doc(companyId)
          .collection('quotes')
          .doc(quoteId)
          .get();
        if (quoteDoc.exists) {
          const quoteData = quoteDoc.data();

          proposalsWithQuoteData.push({
            proposalId: proposalDoc.id,
            quoteId,
            proposal: proposalData,
            quote: quoteData,
          });
        }
      }
    }

    return proposalsWithQuoteData;
  }

  /**
   * Delete a proposal (soft delete - mark as deleted)
   */
  static async deleteProposal(
    quoteId: string,
    proposalId: string,
    companyId: string
  ): Promise<void> {
    const proposalRef = db!
      .collection('companies')
      .doc(companyId)
      .collection('quotes')
      .doc(quoteId)
      .collection('proposals')
      .doc(proposalId);

    await proposalRef.update({
      status: 'deleted',
      deletedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  }

  /**
   * Get proposal count for a quote
   */
  static async getProposalCount(quoteId: string, companyId: string): Promise<number> {
    const proposalsSnapshot = await db!
      .collection('companies')
      .doc(companyId)
      .collection('quotes')
      .doc(quoteId)
      .collection('proposals')
      .where('status', '!=', 'deleted')
      .get();

    return proposalsSnapshot.size;
  }

  /**
   * Migrate from legacy array structure to subcollections
   * (Used by migration script and for backwards compatibility)
   */
  static async migrateLegacyProposals(
    quoteId: string,
    proposalsArray: any[],
    companyId: string
  ): Promise<void> {
    const batch = db!.batch();
    const now = Timestamp.now();

    proposalsArray.forEach(proposal => {
      if (proposal.companyUid) {
        const proposalRef = db!
          .collection('companies')
          .doc(companyId)
          .collection('quotes')
          .doc(quoteId)
          .collection('proposals')
          .doc(proposal.companyUid);

        batch.set(proposalRef, {
          ...proposal,
          createdAt: proposal.submittedAt ? new Date(proposal.submittedAt) : now,
          updatedAt: now,
          migratedAt: now,
          migratedFrom: 'proposals_array',
        });
      }
    });

    await batch.commit();

    // Remove proposals array from quote
    await db!.collection('companies').doc(companyId).collection('quotes').doc(quoteId).update({
      proposals: FieldValue.delete(),
      proposalsMigratedAt: now,
      proposalsInSubcollection: true,
    });
  }
}
