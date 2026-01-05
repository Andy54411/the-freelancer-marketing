'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { db } from '@/firebase/clients';
import { doc, getDoc, onSnapshot, collection, getDocs } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import MarketplaceProposalCard from '@/components/marketplace/MarketplaceProposalCard';

interface ProjectRequest {
  id: string;
  title: string;
  description: string;
  category: string;
  subcategory: string;
  budgetAmount?: number;
  maxBudget?: number;
  budgetRange?: { min: number; max: number; currency: string };
  estimatedBudget?: number;
  budgetType: 'fixed' | 'hourly' | 'negotiable';
  timeline: string;
  startDate?: string;
  endDate?: string;
  preferredDate?: string;
  location: string | { address?: string; coordinates?: { lat: number; lng: number }; type?: string };
  isRemote: boolean;
  isActive: boolean;
  urgency: 'low' | 'medium' | 'high';
  priority?: string;
  requiredSkills: string[];
  projectRequirements?: string;
  requiredServices?: string[];
  originalPrompt?: string;
  projectType?: string;
  maxProposals?: number;
  aiGenerated?: boolean;
  source?: string;
  status:
    | 'open'
    | 'in_progress'
    | 'completed'
    | 'cancelled'
    | 'directly_assigned'
    | 'payment_pending';
  customerUid: string;
  customerEmail: string;
  proposals: Proposal[];
  createdAt: Date;
  updatedAt: Date;
  viewCount: number;
  // Felder für direkte Zuweisung
  selectedProviders?: (
    | string
    | { companyName?: string; name?: string; id: string; priceRange?: string; rating?: number }
  )[];

  hasSelectedProviders?: boolean;
  isDirectAssignment?: boolean;
  isPublic?: boolean;
  isMarketplaceRequest?: boolean; // NEU: Marktplatz-Projekt
  publishingFeePaid?: boolean;
  escrowId?: string;
  escrowPaidAt?: Date;
  acceptedProposalId?: string;
  acceptedProviderId?: string;
  subcategoryData?: {
    accommodation?: string;
    cuisine?: string;
    cuisineType?: string[];
    dietaryRestrictions?: string[];
    duration?: string;
    eventType?: string;
    guestCount?: string;
    kitchenEquipment?: string;
    projectDescription?: string;
    serviceType?: string;
    subcategory?: string;
    timeframe?: string;
    timeline?: string;
    [key: string]: string | string[] | undefined; // Für weitere dynamische Felder
  };
}

interface Proposal {
  id: string;
  providerId: string;
  companyUid?: string; // Für Company proposals
  companyId?: string; // Alias für providerId bei Marktplatz
  providerName: string;
  providerEmail: string;
  providerPhone?: string;
  providerAvatar?: string;
  providerRating?: number;
  providerReviewCount?: number;
  message: string;
  proposedPrice: number;
  proposedTimeline: string;
  availability: string;
  submittedAt: Date;
  status: 'pending' | 'accepted' | 'rejected' | 'declined' | 'withdrawn' | 'cancelled' | 'escrow_paid';
  totalAmount?: number;
  timeline?: string;
  serviceItems?: ServiceItem[];
  // Zusätzliche Company-Informationen
  companyDescription?: string;
  companyIndustry?: string;
  companyExperience?: string;
  companySkills?: string[];
  companyLocation?: string;
  // Marktplatz-Escrow Felder
  escrowPaid?: boolean;
  escrowId?: string;
  escrowPaidAt?: Date;
  companyWebsite?: string;
  estimatedDuration?: string;
}

interface ServiceItem {
  name: string;
  quantity?: number;
  price?: number;
  description?: string;
}

interface FirestoreProjectData {
  title?: string;
  description?: string;
  category?: string;
  serviceCategory?: string;
  subcategory?: string;
  serviceSubcategory?: string;
  budgetRange?: { min: number; max: number; currency: string };
  estimatedBudget?: number;
  budgetAmount?: number;
  budget?: number;
  maxBudget?: number;
  budgetType?: 'fixed' | 'hourly' | 'negotiable';
  timeline?: string;
  timeframe?: string;
  startDate?: string;
  endDate?: string;
  preferredDate?: string;
  location?: string | { address?: string; coordinates?: { lat: number; lng: number }; type?: string };
  isRemote?: boolean;
  isActive?: boolean;
  urgency?: 'low' | 'medium' | 'high';
  priority?: string;
  requiredSkills?: string[];
  projectRequirements?: string;
  requiredServices?: string[];
  originalPrompt?: string;
  projectType?: string;
  maxProposals?: number;
  aiGenerated?: boolean;
  source?: string;
  status?: string;
  customerUid?: string;
  customerEmail?: string;
  customerData?: { uid: string };
  proposals?: ProposalData[] | Record<string, ProposalData>;
  createdAt?: { toDate: () => Date } | string | number;
  updatedAt?: { toDate: () => Date } | string | number;
  viewCount?: number;
  subcategoryData?: Record<string, string | string[] | undefined>;
  selectedProviders?: (string | { companyName?: string; name?: string; id: string; priceRange?: string; rating?: number })[];
  hasSelectedProviders?: boolean;
  isDirectAssignment?: boolean;
  isPublic?: boolean;
  isMarketplaceRequest?: boolean;
  publishingFeePaid?: boolean;
  escrowId?: string;
  escrowPaidAt?: { toDate: () => Date };
  acceptedProposalId?: string;
  acceptedProviderId?: string;
  requestType?: 'direct' | 'marketplace';
}

interface ProposalData {
  id?: string;
  providerId?: string;
  companyId?: string;
  companyUid?: string;
  uid?: string;
  providerName?: string;
  providerEmail?: string;
  providerPhone?: string;
  providerAvatar?: string;
  providerRating?: number;
  providerReviewCount?: number;
  message?: string;
  proposedPrice?: number;
  proposedTimeline?: string;
  availability?: string;
  submittedAt?: { toDate: () => Date } | string | Date;
  status?: string;
  totalAmount?: number;
  timeline?: string;
  serviceItems?: ServiceItem[];
  estimatedDuration?: string;
  availableFrom?: string;
  paymentIntentId?: string;
  escrowPaid?: boolean;
  escrowId?: string;
  escrowPaidAt?: { toDate: () => Date };
  companyWebsite?: string;
}

interface CompanyData {
  companyName?: string;
  businessName?: string;
  displayName?: string;
  name?: string;
  email?: string;
  phone?: string;
  phoneNumber?: string;
  step3?: { profilePictureURL?: string };
  profileBannerImage?: string;
  averageRating?: number;
  rating?: number;
  reviewCount?: number;
  totalReviews?: number;
  publicDescription?: string;
  description?: string;
  industry?: string;
  selectedCategory?: string;
  yearsOfExperience?: string;
  skills?: string[];
  city?: string;
  location?: string;
  responseTime?: number;
}

// Hilfsfunktion zum sicheren Parsen von Firestore-Timestamps
const parseFirestoreDate = (value: { toDate?: () => Date } | string | number | Date | undefined | null): Date => {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  if (typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate();
  }
  if (typeof value === 'string' || typeof value === 'number') {
    return new Date(value);
  }
  return new Date();
};

// Typen für Status-Felder
type ProjectStatus = 'open' | 'in_progress' | 'completed' | 'cancelled' | 'directly_assigned' | 'payment_pending';
type ProposalStatus = 'pending' | 'accepted' | 'rejected' | 'declined' | 'withdrawn' | 'cancelled' | 'escrow_paid';

const isValidProjectStatus = (status: string | undefined): status is ProjectStatus => {
  return ['open', 'in_progress', 'completed', 'cancelled', 'directly_assigned', 'payment_pending'].includes(status || '');
};

const isValidProposalStatus = (status: string | undefined): status is ProposalStatus => {
  return ['pending', 'accepted', 'rejected', 'declined', 'withdrawn', 'cancelled', 'escrow_paid'].includes(status || '');
};

const ProjectDetailPage: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const uid = params?.uid as string;
  const projectId = params?.projectId as string;

  const [project, setProject] = useState<ProjectRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPublicProject, setIsPublicProject] = useState<boolean>(false); // NEU: Track ob öffentlich

  useEffect(() => {
    if (!uid || !user || !projectId) return;

    // Sicherheitsüberprüfung
    if (user.uid !== uid) {
      setError('Zugriff verweigert. Sie sind nicht berechtigt, dieses Projekt einzusehen.');
      setLoading(false);
      return;
    }

    const loadProjectDetails = async () => {
      try {
        // UNIFIED: Alle Projekte sind in project_requests
        const projectDocRef = doc(db, 'project_requests', projectId);
        const projectDocSnap = await getDoc(projectDocRef);

        if (!projectDocSnap.exists()) {
          setError('Projekt nicht gefunden.');
          setLoading(false);
          return;
        }

        const data = projectDocSnap.data() as FirestoreProjectData;
        
        // Setze ob es ein öffentliches Projekt ist basierend auf requestType
        // requestType: 'marketplace' = öffentlich, 'direct' = privat
        setIsPublicProject(data.requestType === 'marketplace' || data.isPublic === true);

        // Prüfe ob der User der Eigentümer ist (berücksichtige beide Schemas)
        const customerUid = data.customerData?.uid || data.customerUid;
        if (customerUid !== uid) {
          setError('Zugriff verweigert. Sie sind nicht der Eigentümer dieses Projekts.');
          setLoading(false);
          return;
        }

        // Verarbeite Proposals - lade aus Subcollection unter project_requests!
        let proposalsToProcess: ProposalData[] = [];

        try {
          // UNIFIED: Proposals sind unter project_requests/{id}/proposals
          const proposalsCollectionRef = collection(db, 'project_requests', projectId, 'proposals');
          const proposalsSnapshot = await getDocs(proposalsCollectionRef);

          proposalsToProcess = proposalsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }));
        } catch {
          // Fallback: Versuche aus dem Hauptdokument zu lesen
          if (Array.isArray(data.proposals)) {
            proposalsToProcess = data.proposals;
          } else if (data.proposals && typeof data.proposals === 'object') {
            // Falls proposals als Objekt gespeichert sind, konvertiere zu Array
            proposalsToProcess = Object.values(data.proposals);

            // Filtere nur echte Proposals (nicht payment_pending Einträge)
            proposalsToProcess = proposalsToProcess.filter(
              proposal =>
                proposal &&
                typeof proposal === 'object' &&
                proposal.status !== 'payment_pending' &&
                !proposal.paymentIntentId &&
                (proposal.providerId || proposal.companyUid || proposal.providerName)
            );
          } else {
            proposalsToProcess = [];
          }
        }

        const projectData: ProjectRequest = {
          id: projectDocSnap.id,
          title: data.title || 'Unbenanntes Projekt',
          description: data.description || '',
          category: data.category || data.serviceCategory || '',
          subcategory: data.subcategory || data.serviceSubcategory || 'Mietkoch', // Fallback für KI-generierte Projekte
          budgetAmount:
            data.budgetRange?.min || data.estimatedBudget || data.budgetAmount || data.budget,
          maxBudget: data.budgetRange?.max || data.maxBudget,
          budgetRange: data.budgetRange,
          estimatedBudget: data.estimatedBudget,
          budgetType: data.budgetRange ? 'negotiable' : data.budgetType || 'negotiable',
          timeline: data.timeline || data.timeframe || '',
          startDate: data.startDate || undefined,
          endDate: data.endDate || undefined,
          preferredDate: data.preferredDate || undefined,
          location:
            typeof data.location === 'string'
              ? data.location
              : data.location && typeof data.location === 'object'
                ? data.location.address || 'Standort verfügbar'
                : data.location || '',
          isRemote: data.isRemote || false,
          isActive: data.isActive !== false,
          urgency: (data.urgency as 'low' | 'medium' | 'high') || 'medium',
          priority: data.priority,
          requiredSkills: Array.isArray(data.requiredSkills) ? data.requiredSkills : [],
          projectRequirements: data.projectRequirements,
          requiredServices: data.requiredServices,
          originalPrompt: data.originalPrompt,
          projectType: data.projectType,
          maxProposals: data.maxProposals,
          aiGenerated: data.aiGenerated,
          source: data.source,
          status: isValidProjectStatus(data.status) ? data.status : 'open',
          customerUid: data.customerUid || '',
          customerEmail: data.customerEmail || '',
          proposals: [], // Wird später mit enhancedProposals ersetzt
          createdAt: parseFirestoreDate(data.createdAt),
          updatedAt: parseFirestoreDate(data.updatedAt || data.createdAt),
          viewCount: data.viewCount || 0,
          subcategoryData: data.subcategoryData || {},
          // Neue Felder für direkte Zuweisung
          selectedProviders: data.selectedProviders || [],
          hasSelectedProviders:
            data.hasSelectedProviders ||
            (data.selectedProviders && data.selectedProviders.length > 0),
          isDirectAssignment:
            data.isDirectAssignment ||
            (data.selectedProviders && data.selectedProviders.length > 0),
          isPublic: data.isPublic !== false, // Default true wenn nicht explizit false
        };

        // Erweitere Proposals mit Company-Daten

        const enhancedProposals = await Promise.all(
          proposalsToProcess.map(async (proposal: ProposalData) => {
            try {
              // Sichere providerId Behandlung
              const providerId =
                proposal.providerId || proposal.companyId || proposal.companyUid || proposal.uid;

              if (!providerId) {
                return {
                  id: proposal.id || `unknown_${Date.now()}`,
                  providerId: 'unknown',
                  providerName: proposal.providerName || 'Unbekannt',
                  providerEmail: proposal.providerEmail || '',
                  providerPhone: proposal.providerPhone || '',
                  providerAvatar: proposal.providerAvatar || '',
                  providerRating: proposal.providerRating || 0,
                  providerReviewCount: proposal.providerReviewCount || 0,
                  message: proposal.message || 'Keine Nachricht',
                  proposedPrice: proposal.proposedPrice || proposal.totalAmount || 0,
                  proposedTimeline:
                    proposal.proposedTimeline || proposal.timeline || 'Nicht angegeben',
                  availability: proposal.availability || 'Nicht angegeben',
                  submittedAt: parseFirestoreDate(proposal.submittedAt),
                  status: isValidProposalStatus(proposal.status) ? proposal.status : 'pending',
                  totalAmount: proposal.totalAmount || proposal.proposedPrice || 0,
                  timeline: proposal.timeline || proposal.proposedTimeline || 'Nicht angegeben',
                  serviceItems: proposal.serviceItems || [],
                };
              }

              // Lade Company-Daten direkt aus der companies collection (wo die Daten tatsächlich sind!)

              let companyData: CompanyData = {};

              // DIREKT aus companies collection laden - da sind die Daten!
              const companiesDocRef = doc(db, 'companies', providerId);
              const companiesDoc = await getDoc(companiesDocRef);

              if (companiesDoc.exists()) {
                companyData = companiesDoc.data();
              } else {
                // Nur als Fallback users collection
                const companyDocRef = doc(db, 'users', providerId);
                const companyDoc = await getDoc(companyDocRef);
                if (companyDoc.exists()) {
                  companyData = companyDoc.data();
                }
              }

              const enhancedProposal = {
                id: proposal.id || `${providerId}_${Date.now()}`,
                providerId: providerId,
                providerName:
                  companyData.companyName ||
                  companyData.businessName ||
                  companyData.displayName ||
                  companyData.name ||
                  proposal.providerName ||
                  'Unbekannt',
                providerEmail: companyData.email || proposal.providerEmail || '',
                providerPhone:
                  companyData.phone || companyData.phoneNumber || proposal.providerPhone || '',
                providerAvatar:
                  companyData.step3?.profilePictureURL || companyData.profileBannerImage || '',
                providerRating:
                  companyData.averageRating || companyData.rating || proposal.providerRating || 0,
                providerReviewCount:
                  companyData.reviewCount ||
                  companyData.totalReviews ||
                  proposal.providerReviewCount ||
                  0,
                message: proposal.message || 'Keine Nachricht',
                proposedPrice: proposal.proposedPrice || proposal.totalAmount || 0,
                proposedTimeline:
                  proposal.proposedTimeline ||
                  proposal.timeline ||
                  proposal.estimatedDuration ||
                  (proposal.serviceItems && proposal.serviceItems.length > 0
                    ? 'Nach Vereinbarung'
                    : 'Flexibel'),
                availability:
                  proposal.availability ||
                  proposal.availableFrom ||
                  (companyData.responseTime
                    ? `Antwort innerhalb ${companyData.responseTime}h`
                    : 'Sofort verfügbar'),
                submittedAt: parseFirestoreDate(proposal.submittedAt),
                status: isValidProposalStatus(proposal.status) ? proposal.status : 'pending',
                totalAmount: proposal.totalAmount || proposal.proposedPrice || 0,
                timeline: proposal.timeline || proposal.proposedTimeline || 'Flexibel',
                serviceItems: proposal.serviceItems || [],
                // Zusätzliche Company-Informationen
                companyDescription: companyData.publicDescription || companyData.description || '',
                companyIndustry: companyData.industry || companyData.selectedCategory || '',
                companyExperience: companyData.yearsOfExperience || '',
                companySkills: companyData.skills || [],
                companyLocation: companyData.city || companyData.location || '',
              };
              return enhancedProposal;
            } catch {
              // Fallback für defekte Proposals
              const fallbackProviderId =
                proposal.providerId ||
                proposal.companyId ||
                proposal.companyUid ||
                proposal.uid ||
                'unknown';
              return {
                id: proposal.id || `${fallbackProviderId}_${Date.now()}`,
                providerId: fallbackProviderId,
                providerName: proposal.providerName || 'Unbekannt',
                providerEmail: proposal.providerEmail || '',
                providerPhone: proposal.providerPhone || '',
                providerAvatar: proposal.providerAvatar || '',
                providerRating: proposal.providerRating || 0,
                providerReviewCount: proposal.providerReviewCount || 0,
                message: proposal.message || 'Keine Nachricht',
                proposedPrice: proposal.proposedPrice || proposal.totalAmount || 0,
                proposedTimeline:
                  proposal.proposedTimeline || proposal.timeline || 'Nicht angegeben',
                availability: proposal.availability || 'Nicht angegeben',
                submittedAt: parseFirestoreDate(proposal.submittedAt),
                status: isValidProposalStatus(proposal.status) ? proposal.status : 'pending',
                totalAmount: proposal.totalAmount || proposal.proposedPrice || 0,
                timeline: proposal.timeline || proposal.proposedTimeline || 'Nicht angegeben',
                serviceItems: proposal.serviceItems || [],
              };
            }
          })
        );

        projectData.proposals = enhancedProposals;

        setProject(projectData);
        setLoading(false);
      } catch {
        setError('Fehler beim Laden der Projektdetails');
        setLoading(false);
        toast.error('Fehler beim Laden der Projektdetails');
      }
    };

    loadProjectDetails();
  }, [uid, user, projectId]);

  // Realtime-Listener für Live-Updates der Statistiken
  useEffect(() => {
    if (!projectId) return;

    // Bestimme die richtige Collection basierend auf dem geladenen Projekt
    const getCollectionForProject = async () => {
      // Prüfe zuerst project_requests
      const projectDocRef = doc(db, 'project_requests', projectId);
      const docSnap = await getDoc(projectDocRef);

      if (docSnap.exists()) {
        return 'project_requests';
      }

      // Falls nicht gefunden, muss es quotes sein
      return 'quotes';
    };

    const setupListener = async () => {
      const collection = await getCollectionForProject();
      const projectDocRef = doc(db, collection, projectId);

      const unsubscribe = onSnapshot(
        projectDocRef,
        docSnapshot => {
          if (docSnapshot.exists()) {
            const updatedData = docSnapshot.data();

            // Aktualisiere NUR viewCount und updatedAt
            // Lasse proposals völlig unberührt (behält enhancedProposals)
            setProject(prev => {
              if (!prev) return prev;

              return {
                ...prev,
                viewCount: updatedData.viewCount || 0,
                updatedAt: updatedData.updatedAt?.toDate
                  ? updatedData.updatedAt.toDate()
                  : new Date(updatedData.updatedAt || Date.now()),
                // proposals bleiben unverändert (enhancedProposals bleiben erhalten)
              };
            });
          }
        },
        _error => {}
      );

      // Cleanup function
      return unsubscribe;
    };

    let unsubscribe: (() => void) | null = null;
    setupListener().then(cleanup => {
      unsubscribe = cleanup;
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [projectId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-green-100 text-green-800';
      case 'payment_pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'directly_assigned':
        return 'bg-purple-100 text-purple-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatBudget = (project: ProjectRequest) => {
    // Zeige Budget-Range wenn verfügbar
    if (project.budgetRange && project.budgetRange.min > 0 && project.budgetRange.max > 0) {
      return `${project.budgetRange.min.toLocaleString('de-DE')} - ${project.budgetRange.max.toLocaleString('de-DE')} ${project.budgetRange.currency || 'EUR'}`;
    }

    // Zeige geschätztes Budget wenn verfügbar
    if (project.estimatedBudget && project.estimatedBudget > 0) {
      return `ca. ${project.estimatedBudget.toLocaleString('de-DE')}€`;
    }

    // Fallback auf ursprüngliche Logik
    if (project.maxBudget && project.budgetAmount) {
      return `${project.budgetAmount.toLocaleString('de-DE', {
        style: 'currency',
        currency: 'EUR',
      })} - ${project.maxBudget.toLocaleString('de-DE', {
        style: 'currency',
        currency: 'EUR',
      })}`;
    } else if (project.budgetAmount) {
      return `${project.budgetAmount.toLocaleString('de-DE', {
        style: 'currency',
        currency: 'EUR',
      })}${project.budgetType === 'hourly' ? '/h' : ''}`;
    } else if (project.maxBudget) {
      return `Bis zu ${project.maxBudget.toLocaleString('de-DE', {
        style: 'currency',
        currency: 'EUR',
      })}`;
    }

    return 'Verhandelbar';
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-orange-100 text-orange-800';
      case 'low':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-[#14ad9f] via-teal-600 to-blue-600 relative -m-4 lg:-m-6 -mt-16">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10 flex items-center justify-center pt-32">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white text-lg">Lade Projektdetails...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-linear-to-br from-[#14ad9f] via-teal-600 to-blue-600 relative -m-4 lg:-m-6 -mt-16">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10 flex items-center justify-center pt-32">
          <div className="text-center">
            <AlertCircle className="h-16 w-16 text-white mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              {error || 'Projekt nicht gefunden'}
            </h3>
            <Button
              onClick={() => router.back()}
              variant="outline"
              className="text-[#14ad9f] border-white bg-white hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zurück zu Projekten
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-[#14ad9f] via-teal-600 to-blue-600 relative -m-4 lg:-m-6 -mt-16">
      <div className="absolute inset-0 bg-black/20"></div>

      {/* Header */}
      <div className="relative z-10 pt-24 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-6">
            <Button
              onClick={() => router.back()}
              variant="outline"
              size="sm"
              className="text-white border-white/30 bg-white/10 hover:bg-white/20 backdrop-blur-sm"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zurück
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">{project.title}</h1>
              <p className="text-white/80 mt-1">
                Erstellt am {project.createdAt.toLocaleDateString('de-DE')}
              </p>
            </div>
          </div>

          {/* Status Badges */}
          <div className="flex flex-wrap gap-3 mb-8">
            <Badge className={`${getStatusColor(project.status)} border-current`}>
              {project.status === 'open'
                ? 'Offen'
                : project.status === 'in_progress'
                  ? 'In Bearbeitung'
                  : project.status === 'completed'
                    ? 'Abgeschlossen'
                    : project.status === 'cancelled'
                      ? 'Abgebrochen'
                      : project.status === 'payment_pending'
                        ? 'Zahlung ausstehend'
                        : project.status === 'directly_assigned'
                          ? 'Direkt zugewiesen'
                          : 'Unbekannt'}
            </Badge>
            <Badge className={`${getUrgencyColor(project.urgency)} border-current`}>
              {project.urgency === 'high'
                ? 'Hoch'
                : project.urgency === 'medium'
                  ? 'Mittel'
                  : project.urgency === 'low'
                    ? 'Niedrig'
                    : 'Mittel'}
            </Badge>
            <Badge variant="outline" className="text-white border-white/30 bg-white/10">
              {project.category}
            </Badge>
            {project.subcategory && (
              <Badge variant="outline" className="text-white border-white/30 bg-white/10">
                {project.subcategory}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Projektdetails */}
            <div className="lg:col-span-2 space-y-6">
              {/* Beschreibung */}
              <Card className="bg-white/95 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle>Projektbeschreibung</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {project.description || 'Keine Beschreibung verfügbar.'}
                  </p>
                </CardContent>
              </Card>

              {/* Service-Details */}
              {project.subcategoryData && Object.keys(project.subcategoryData).length > 0 && (
                <Card className="bg-white/95 backdrop-blur-sm border-white/20">
                  <CardHeader>
                    <CardTitle>Service-Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Grundinformationen */}
                      {(project.subcategoryData.serviceType ||
                        project.subcategoryData.eventType ||
                        project.subcategoryData.guestCount ||
                        project.subcategoryData.duration) && (
                        <div className="space-y-3">
                          <h4 className="font-semibold text-gray-900 text-sm uppercase tracking-wide border-b pb-2">
                            Grundinformationen
                          </h4>

                          {project.subcategoryData.serviceType && (
                            <div className="flex justify-between items-center py-2">
                              <span className="text-gray-600">Service-Typ</span>
                              <Badge variant="outline" className="text-[#14ad9f] border-[#14ad9f]">
                                {project.subcategoryData.serviceType === 'hotel'
                                  ? 'Hotel'
                                  : project.subcategoryData.serviceType === 'private'
                                    ? 'Privat'
                                    : project.subcategoryData.serviceType}
                              </Badge>
                            </div>
                          )}

                          {project.subcategoryData.eventType && (
                            <div className="flex justify-between items-center py-2">
                              <span className="text-gray-600">Event-Typ</span>
                              <span className="font-medium text-gray-900">
                                {project.subcategoryData.eventType}
                              </span>
                            </div>
                          )}

                          {project.subcategoryData.guestCount && (
                            <div className="flex justify-between items-center py-2">
                              <span className="text-gray-600">Anzahl Gäste</span>
                              <span className="font-medium text-gray-900">
                                {project.subcategoryData.guestCount}
                              </span>
                            </div>
                          )}

                          {project.subcategoryData.duration && (
                            <div className="flex justify-between items-center py-2">
                              <span className="text-gray-600">Dauer</span>
                              <span className="font-medium text-gray-900">
                                {project.subcategoryData.duration === 'halbtag'
                                  ? 'Halbtag'
                                  : project.subcategoryData.duration === 'ganztag'
                                    ? 'Ganztag'
                                    : project.subcategoryData.duration}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Spezifische Anforderungen */}
                      {(project.subcategoryData.cuisine ||
                        project.subcategoryData.cuisineType ||
                        project.subcategoryData.dietaryRestrictions ||
                        project.subcategoryData.kitchenEquipment ||
                        project.subcategoryData.accommodation) && (
                        <div className="space-y-3">
                          <h4 className="font-semibold text-gray-900 text-sm uppercase tracking-wide border-b pb-2">
                            Spezifische Anforderungen
                          </h4>

                          {project.subcategoryData.cuisine && (
                            <div className="py-2">
                              <span className="text-gray-600 block mb-1">Küche</span>
                              <span className="font-medium text-gray-900">
                                {project.subcategoryData.cuisine === 'deutsch'
                                  ? 'Deutsche Küche'
                                  : project.subcategoryData.cuisine}
                              </span>
                            </div>
                          )}

                          {project.subcategoryData.cuisineType &&
                            project.subcategoryData.cuisineType.length > 0 && (
                              <div className="py-2">
                                <span className="text-gray-600 block mb-2">Küchen-Arten</span>
                                <div className="flex flex-wrap gap-1">
                                  {project.subcategoryData.cuisineType.map((cuisine, index) => (
                                    <Badge key={index} variant="secondary" className="text-xs">
                                      {cuisine === 'deutsch' ? 'Deutsche Küche' : cuisine}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                          {project.subcategoryData.dietaryRestrictions &&
                            project.subcategoryData.dietaryRestrictions.length > 0 && (
                              <div className="py-2">
                                <span className="text-gray-600 block mb-2">
                                  Diätetische Einschränkungen
                                </span>
                                <div className="flex flex-wrap gap-1">
                                  {project.subcategoryData.dietaryRestrictions.map(
                                    (restriction, index) => (
                                      <Badge key={index} variant="outline" className="text-xs">
                                        {restriction}
                                      </Badge>
                                    )
                                  )}
                                </div>
                              </div>
                            )}

                          {project.subcategoryData.kitchenEquipment && (
                            <div className="flex justify-between items-center py-2">
                              <span className="text-gray-600">Küchenausstattung</span>
                              <span className="font-medium text-gray-900">
                                {project.subcategoryData.kitchenEquipment === 'vorhanden'
                                  ? 'Vorhanden'
                                  : project.subcategoryData.kitchenEquipment === 'nicht_vorhanden'
                                    ? 'Nicht vorhanden'
                                    : project.subcategoryData.kitchenEquipment}
                              </span>
                            </div>
                          )}

                          {project.subcategoryData.accommodation && (
                            <div className="flex justify-between items-center py-2">
                              <span className="text-gray-600">Unterkunft</span>
                              <span className="font-medium text-gray-900">
                                {project.subcategoryData.accommodation === 'mit_übernachtung'
                                  ? 'Mit Übernachtung'
                                  : project.subcategoryData.accommodation === 'ohne_übernachtung'
                                    ? 'Ohne Übernachtung'
                                    : project.subcategoryData.accommodation}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Zusätzliche Projektbeschreibung */}
                    {project.subcategoryData.projectDescription && (
                      <div className="mt-6 pt-6 border-t">
                        <h4 className="font-semibold text-gray-900 mb-3">
                          Zusätzliche Projektbeschreibung
                        </h4>
                        <p className="text-gray-700 leading-relaxed">
                          {project.subcategoryData.projectDescription}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Angebote */}
              <Card className="bg-white/95 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Eingegangene Angebote (
                    {
                      project.proposals.filter(
                        proposal =>
                          proposal.status !== 'declined' &&
                          proposal.status !== 'withdrawn' &&
                          proposal.status !== 'cancelled'
                      ).length
                    }
                    )
                  </CardTitle>
                  {project.proposals.filter(
                    proposal =>
                      proposal.status !== 'declined' &&
                      proposal.status !== 'withdrawn' &&
                      proposal.status !== 'cancelled'
                  ).length === 0 && (
                    <CardDescription>
                      Noch keine Angebote eingegangen. Ihr Projekt ist öffentlich sichtbar.
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  {project.proposals.filter(
                    proposal =>
                      proposal.status !== 'declined' &&
                      proposal.status !== 'withdrawn' &&
                      proposal.status !== 'cancelled'
                  ).length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">Noch keine Angebote eingegangen</p>
                      {project.hasSelectedProviders || project.isDirectAssignment ? (
                        <p className="text-sm text-gray-400 mt-2">
                          Ihr Projekt wurde direkt an ausgewählte Anbieter zugewiesen.
                        </p>
                      ) : (
                        <p className="text-sm text-gray-400 mt-2">
                          Ihr Projekt ist öffentlich sichtbar und Anbieter können Angebote abgeben.
                        </p>
                      )}
                    </div>
                  ) : (
                    // UNIFIED: MarketplaceProposalCard für ALLE Projekte (Escrow ist IMMER erforderlich)
                    <div className="space-y-4">
                      {project.proposals
                        .filter(
                          proposal =>
                            proposal.status !== 'declined' &&
                            proposal.status !== 'withdrawn' &&
                            proposal.status !== 'cancelled'
                        )
                        .map((proposal) => (
                          <MarketplaceProposalCard
                            key={proposal.id}
                            proposal={{
                              id: proposal.id,
                              companyId: proposal.providerId || proposal.companyUid || '',
                              companyName: proposal.providerName,
                              companyLogo: proposal.providerAvatar,
                              message: proposal.message,
                              proposedPrice: proposal.proposedPrice || proposal.totalAmount || 0,
                              currency: 'EUR',
                              estimatedDuration: proposal.proposedTimeline || proposal.timeline,
                              availableDate: proposal.availability,
                              status: proposal.status === 'escrow_paid' ? 'escrow_paid' : 
                                     proposal.status === 'accepted' ? (proposal.escrowPaid ? 'escrow_paid' : 'accepted') :
                                     proposal.status === 'rejected' ? 'declined' :
                                     'pending',
                              createdAt: proposal.submittedAt,
                              escrowPaid: proposal.escrowPaid,
                              escrowId: proposal.escrowId,
                              companyEmail: proposal.escrowPaid ? proposal.providerEmail : undefined,
                              companyPhone: proposal.escrowPaid ? proposal.providerPhone : undefined,
                              companyWebsite: proposal.escrowPaid ? proposal.companyWebsite : undefined,
                            }}
                            projectId={project.id}
                            projectTitle={project.title}
                            customerId={project.customerUid}
                            onAcceptAndPay={(proposalId, amount) => {
                              toast.success(`Weiterleitung zur Zahlung (${amount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })})`);
                            }}
                            onDecline={(proposalId) => {
                              setProject(prev => {
                                if (!prev) return prev;
                                return {
                                  ...prev,
                                  proposals: prev.proposals.map(p => 
                                    p.id === proposalId ? { ...p, status: 'declined' as const } : p
                                  ),
                                };
                              });
                            }}
                          />
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Projektinfos */}
              <Card className="bg-white/95 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle>Projektinformationen</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Budget - neue Struktur mit budgetRange unterstützen */}
                  {(project.budgetAmount ||
                    project.maxBudget ||
                    project.budgetType === 'negotiable') && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Budget</h4>
                      <div className="text-2xl font-bold text-[#14ad9f]">
                        {formatBudget(project)}
                      </div>
                      {(project.budgetAmount ||
                        project.maxBudget ||
                        project.budgetRange ||
                        project.estimatedBudget) && (
                        <p className="text-sm text-gray-600 mt-1">
                          {project.budgetType === 'fixed'
                            ? 'Festpreis'
                            : project.budgetType === 'hourly'
                              ? 'Stundensatz'
                              : 'Verhandelbar'}
                        </p>
                      )}
                    </div>
                  )}

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Zeitrahmen</h4>
                    <div className="space-y-2">
                      {/* Hauptzeitrahmen - nur anzeigen wenn timeline vorhanden oder keine spezifischen Daten */}
                      {project.timeline && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span>{project.timeline}</span>
                        </div>
                      )}

                      {/* Spezifische Datums-Informationen */}
                      {project.startDate || project.endDate || project.preferredDate ? (
                        <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                          {project.startDate && (
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-4 w-4 text-green-600" />
                              <span className="text-gray-700">
                                <span className="font-medium text-green-600">Startdatum:</span>{' '}
                                {new Date(project.startDate).toLocaleDateString('de-DE')}
                              </span>
                            </div>
                          )}
                          {project.endDate && (
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-4 w-4 text-red-600" />
                              <span className="text-gray-700">
                                <span className="font-medium text-red-600">Enddatum:</span>{' '}
                                {new Date(project.endDate).toLocaleDateString('de-DE')}
                              </span>
                            </div>
                          )}
                          {project.preferredDate && (
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-4 w-4 text-blue-600" />
                              <span className="text-gray-700">
                                <span className="font-medium text-blue-600">Wunschtermin:</span>{' '}
                                {new Date(project.preferredDate).toLocaleDateString('de-DE')}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* Fallback nur wenn weder timeline noch Datums-Felder vorhanden */
                        !project.timeline && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-500" />
                            <span>Nicht angegeben</span>
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Standort</h4>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span>
                        {(() => {
                          const location = project.location as string | { address?: string; type?: string };
                          if (typeof location === 'object' && location?.address) {
                            return location.address;
                          } else if (typeof location === 'object' && location?.type === 'tbd') {
                            return 'Wird noch festgelegt';
                          } else if (typeof location === 'string') {
                            return location;
                          }
                          return 'Nicht angegeben';
                        })()}
                        {project.isRemote && ' (Remote möglich)'}
                      </span>
                    </div>
                  </div>

                  {project.requiredSkills.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Benötigte Fähigkeiten</h4>
                      <div className="flex flex-wrap gap-2">
                        {project.requiredSkills.map((skill, index) => (
                          <Badge key={index} variant="secondary">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Zuweisung-Informationen */}
              {project.hasSelectedProviders || project.isDirectAssignment ? (
                <Card className="bg-white/95 backdrop-blur-sm border-white/20">
                  <CardHeader>
                    <CardTitle className="text-[#14ad9f]">Direkte Zuweisung</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Projekt wurde direkt zugewiesen
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            Nur die ausgewählten Anbieter können dieses Projekt sehen und Angebote
                            abgeben.
                          </p>
                        </div>
                      </div>
                      {project.selectedProviders && project.selectedProviders.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-xs font-medium text-gray-700 mb-2">
                            Zugewiesene Anbieter:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {project.selectedProviders.map((provider, index) => {
                              // Wenn es ein String ist
                              if (typeof provider === 'string') {
                                return (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {provider}
                                  </Badge>
                                );
                              }

                              // Wenn es ein Objekt ist
                              if (typeof provider === 'object' && provider !== null) {
                                const displayName =
                                  provider.companyName ||
                                  provider.name ||
                                  provider.id ||
                                  'Unbekannter Anbieter';
                                return (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {displayName}
                                  </Badge>
                                );
                              }

                              // Fallback für andere Typen
                              return (
                                <Badge key={index} variant="outline" className="text-xs">
                                  Anbieter {index + 1}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-white/95 backdrop-blur-sm border-white/20">
                  <CardHeader>
                    <CardTitle className="text-[#14ad9f]">
                      {isPublicProject ? 'Öffentliches Projekt' : 'Private Anfrage'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-start gap-2">
                      <Eye className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {isPublicProject
                            ? 'Für alle Anbieter sichtbar'
                            : 'Nur für ausgewählte Anbieter'}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          {isPublicProject
                            ? 'Alle registrierten Anbieter können dieses Projekt sehen und Angebote abgeben.'
                            : 'Diese Anfrage wurde nur an spezifische Anbieter gesendet.'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Erweiterte Projekt-Details */}
              {(project.projectRequirements ||
                project.requiredServices?.length ||
                project.priority ||
                project.projectType ||
                project.maxProposals ||
                project.aiGenerated ||
                project.originalPrompt) && (
                <Card className="bg-white/95 backdrop-blur-sm border-white/20">
                  <CardHeader>
                    <CardTitle>Projekt-Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {project.projectRequirements && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Anforderungen:</h4>
                        <p className="text-gray-700 text-sm">{project.projectRequirements}</p>
                      </div>
                    )}

                    {project.requiredServices && project.requiredServices.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Benötigte Services:</h4>
                        <ul className="list-disc list-inside space-y-1">
                          {project.requiredServices.map((service, index) => (
                            <li key={index} className="text-gray-700 text-sm">
                              {service}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {project.priority && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Priorität:</span>
                        <Badge variant={project.priority === 'high' ? 'destructive' : 'secondary'}>
                          {project.priority === 'high'
                            ? 'Hoch'
                            : project.priority === 'medium'
                              ? 'Mittel'
                              : 'Niedrig'}
                        </Badge>
                      </div>
                    )}

                    {project.projectType && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Projekt-Typ:</span>
                        <span className="font-medium text-sm">{project.projectType}</span>
                      </div>
                    )}

                    {project.maxProposals && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Max. Angebote:</span>
                        <span className="font-medium text-sm">{project.maxProposals}</span>
                      </div>
                    )}

                    {project.aiGenerated && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Erstellt mit:</span>
                        <Badge variant="outline" className="text-[#14ad9f] border-[#14ad9f]">
                          KI-Assistent
                        </Badge>
                      </div>
                    )}

                    {project.originalPrompt && (
                      <div>
                        <span className="text-gray-600 text-sm block mb-1">Original-Anfrage:</span>
                        <p className="text-sm italic text-gray-500">
                          &ldquo;{project.originalPrompt}&rdquo;
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Statistiken */}
              <Card className="bg-white/95 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle>Statistiken</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Aufrufe</span>
                    <span className="font-semibold">{project.viewCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Angebote</span>
                    <span className="font-semibold">
                      {
                        project.proposals.filter(
                          proposal =>
                            proposal.status !== 'declined' &&
                            proposal.status !== 'withdrawn' &&
                            proposal.status !== 'cancelled'
                        ).length
                      }
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Zuletzt aktualisiert</span>
                    <span className="font-semibold text-sm">
                      {project.updatedAt.toLocaleDateString('de-DE')}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailPage;
