// src/hooks/useB2BPayment.ts
import { useState, useCallback } from 'react';
import { db } from '@/firebase/clients';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  orderBy,
  getDocs,
} from 'firebase/firestore';

interface B2BPaymentProject {
  id: string;
  title: string;
  description?: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';

  // Financial
  totalBudget: number;
  paidAmount: number;
  remainingAmount: number;

  // Milestones
  milestones: B2BPaymentMilestone[];

  // Parties
  customerId: string;
  providerId: string;
  providerStripeAccountId: string;

  // Payment Terms
  paymentTermsDays: number;
  currency: string;
  taxRate: number;

  // Timestamps
  createdAt: any;
  updatedAt: any;
}

interface B2BPaymentMilestone {
  id: string;
  title: string;
  description?: string;
  amount: number;
  status: 'pending' | 'paid' | 'cancelled';
  dueDate?: string;
  paidAt?: any;
  paymentIntentId?: string;
}

interface B2BPaymentHistory {
  id: string;
  projectId: string;
  milestoneId?: string;
  amount: number;
  platformFee: number;
  providerAmount: number;
  status: 'pending' | 'succeeded' | 'failed' | 'cancelled';
  paymentIntentId: string;
  createdAt: any;
  paidAt?: any;
}

export function useB2BPayment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create B2B Project
  const createB2BProject = useCallback(
    async (projectData: {
      title: string;
      description?: string;
      totalBudget: number;
      customerId: string;
      providerId: string;
      providerStripeAccountId: string;
      paymentTermsDays?: number;
      currency?: string;
      taxRate?: number;
      milestones?: Omit<B2BPaymentMilestone, 'id' | 'status'>[];
    }): Promise<string> => {
      setLoading(true);
      setError(null);

      try {
        const projectId = `b2b_project_${Date.now()}`;

        const project: B2BPaymentProject = {
          id: projectId,
          title: projectData.title,
          description: projectData.description,
          status: 'draft',

          totalBudget: projectData.totalBudget,
          paidAmount: 0,
          remainingAmount: projectData.totalBudget,

          milestones:
            projectData.milestones?.map((milestone, index) => ({
              ...milestone,
              id: `milestone_${index + 1}`,
              status: 'pending' as const,
            })) || [],

          customerId: projectData.customerId,
          providerId: projectData.providerId,
          providerStripeAccountId: projectData.providerStripeAccountId,

          paymentTermsDays: projectData.paymentTermsDays || 30,
          currency: projectData.currency || 'eur',
          taxRate: projectData.taxRate || 0,

          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        // Save to Firebase
        await setDoc(doc(db, 'b2b_projects', projectId), project);

        return projectId;
      } catch (err: any) {
        setError(err.message || 'Failed to create B2B project');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Get B2B Project
  const getB2BProject = useCallback(
    async (projectId: string): Promise<B2BPaymentProject | null> => {
      setLoading(true);
      setError(null);

      try {
        const projectDoc = await getDoc(doc(db, 'b2b_projects', projectId));

        if (!projectDoc.exists()) {
          return null;
        }

        return { id: projectDoc.id, ...projectDoc.data() } as B2BPaymentProject;
      } catch (err: any) {
        setError(err.message || 'Failed to get B2B project');
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Process B2B Payment Success
  const processB2BPaymentSuccess = useCallback(
    async (paymentIntentId: string, projectId: string, milestoneId?: string): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        // Get payment details from Firestore
        const paymentDoc = await getDoc(doc(db, 'b2b_payments', paymentIntentId));

        if (!paymentDoc.exists()) {
          throw new Error('Payment record not found');
        }

        const paymentData = paymentDoc.data();

        // Update payment status
        await updateDoc(doc(db, 'b2b_payments', paymentIntentId), {
          status: 'succeeded',
          paidAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        // Update project
        const projectRef = doc(db, 'b2b_projects', projectId);
        const projectDoc = await getDoc(projectRef);

        if (projectDoc.exists()) {
          const project = projectDoc.data() as B2BPaymentProject;

          const updatedPaidAmount = project.paidAmount + paymentData.grossAmount;
          const updatedRemainingAmount = project.totalBudget - updatedPaidAmount;

          // Update milestones if applicable
          let updatedMilestones = project.milestones;
          if (milestoneId) {
            updatedMilestones = project.milestones.map(milestone =>
              milestone.id === milestoneId
                ? {
                    ...milestone,
                    status: 'paid' as const,
                    paidAt: serverTimestamp(),
                    paymentIntentId,
                  }
                : milestone
            );
          }

          // Determine new project status
          let newStatus = project.status;
          if (updatedRemainingAmount <= 0) {
            newStatus = 'completed';
          } else if (project.status === 'draft') {
            newStatus = 'active';
          }

          await updateDoc(projectRef, {
            paidAmount: updatedPaidAmount,
            remainingAmount: updatedRemainingAmount,
            milestones: updatedMilestones,
            status: newStatus,
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err: any) {
        setError(err.message || 'Failed to process B2B payment');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Get B2B Payment History
  const getB2BPaymentHistory = useCallback(
    async (projectId: string): Promise<B2BPaymentHistory[]> => {
      setLoading(true);
      setError(null);

      try {
        const paymentsQuery = query(
          collection(db, 'b2b_payments'),
          where('projectId', '==', projectId),
          orderBy('createdAt', 'desc')
        );

        const snapshot = await getDocs(paymentsQuery);

        const payments: B2BPaymentHistory[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as B2BPaymentHistory[];

        return payments;
      } catch (err: any) {
        setError(err.message || 'Failed to get B2B payment history');
        return [];
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Calculate B2B Project Stats
  const calculateB2BProjectStats = useCallback((project: B2BPaymentProject) => {
    const completedMilestones = project.milestones.filter(m => m.status === 'paid').length;
    const totalMilestones = project.milestones.length;
    const progressPercentage =
      totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;
    const paymentPercentage =
      project.totalBudget > 0 ? (project.paidAmount / project.totalBudget) * 100 : 0;

    return {
      completedMilestones,
      totalMilestones,
      progressPercentage: Math.round(progressPercentage),
      paymentPercentage: Math.round(paymentPercentage),
      isCompleted: project.status === 'completed',
      nextMilestone: project.milestones.find(m => m.status === 'pending'),
    };
  }, []);

  return {
    loading,
    error,
    createB2BProject,
    getB2BProject,
    processB2BPaymentSuccess,
    getB2BPaymentHistory,
    calculateB2BProjectStats,
  };
}
