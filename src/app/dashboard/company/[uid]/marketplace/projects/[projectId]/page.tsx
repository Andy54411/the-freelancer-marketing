'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, onSnapshot, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Euro,
  Clock,
  User,
  Building,
  FileText,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import MarketplaceProposalModal from '@/components/MarketplaceProposalModal';

interface ProjectRequestDetail {
  id: string;
  title: string;
  description: string;
  category: string;
  subcategory: string;
  location: string | { address?: string; coordinates?: any; type?: string } | any;
  preferredDate?: string;
  budgetAmount?: number;
  budgetRange?: { min: number; max: number; currency: string };
  estimatedBudget?: number;
  budgetType: string;
  urgency: string;
  priority?: string;
  createdAt: any;
  customerName?: string;
  customerEmail: string;
  customerUid: string;
  subcategoryData?: any;
  timeline?: string;
  status: string;
  projectRequirements?: string;
  requiredServices?: string[];
  originalPrompt?: string;
  projectType?: string;
  maxProposals?: number;
  aiGenerated?: boolean;
  source?: string;
  viewCount?: number;
}

interface CompanyProfile {
  id: string;
  uid: string;
  companyName: string;
  selectedCategory: string;
  selectedSubcategory: string;
  email: string;
  phone?: string;
  companyLogo?: string;
  profilePictureURL?: string;
  averageRating?: number;
  reviewCount?: number;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { firebaseUser: _firebaseUser } = useAuth();
  const [project, setProject] = useState<ProjectRequestDetail | null>(null);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProposalModal, setShowProposalModal] = useState(false);

  const uid = params?.uid ? (Array.isArray(params.uid) ? params.uid[0] : params.uid) : '';
  const projectId = params?.projectId
    ? Array.isArray(params.projectId)
      ? params.projectId[0]
      : params.projectId
    : '';

  useEffect(() => {
    const loadProjectDetails = async () => {
      if (!projectId) return;

      try {
        const projectDoc = await getDoc(doc(db, 'project_requests', projectId));

        if (!projectDoc.exists()) {
          toast.error('Projekt nicht gefunden');
          router.back();
          return;
        }

        const projectData = projectDoc.data();
        setProject({
          id: projectDoc.id,
          title: projectData.subcategoryData?.title || projectData.title || 'Projekt',
          description:
            projectData.description || projectData.subcategoryData?.projectDescription || '',
          category: projectData.category || projectData.serviceCategory || '',
          subcategory: projectData.subcategory || projectData.serviceSubcategory || '',
          location:
            typeof projectData.location === 'string'
              ? projectData.location
              : projectData.location && typeof projectData.location === 'object'
                ? projectData.location.address || 'Standort verfügbar'
                : '',
          preferredDate: projectData.preferredDate,
          budgetAmount: projectData.budgetAmount,
          budgetRange: projectData.budgetRange,
          estimatedBudget: projectData.estimatedBudget,
          budgetType: projectData.budgetType || 'negotiable',
          urgency: projectData.urgency || 'medium',
          priority: projectData.priority,
          createdAt: projectData.createdAt,
          customerName: projectData.customerName,
          customerEmail: projectData.customerEmail || '',
          customerUid: projectData.customerUid || '',
          subcategoryData: projectData.subcategoryData,
          timeline: projectData.timeline,
          status: projectData.status || 'open',
          projectRequirements: projectData.projectRequirements,
          requiredServices: projectData.requiredServices,
          originalPrompt: projectData.originalPrompt,
          projectType: projectData.projectType,
          maxProposals: projectData.maxProposals,
          aiGenerated: projectData.aiGenerated,
          source: projectData.source,
          viewCount: projectData.viewCount || 0,
        });

        // Erhöhe View-Count nur wenn Projekt erfolgreich geladen wurde
        await updateDoc(doc(db, 'project_requests', projectId), {
          viewCount: increment(1),
        });
      } catch (error) {
        console.error('Fehler beim Laden der Projektdetails:', error);
        toast.error('Fehler beim Laden der Projektdetails');
      } finally {
        setLoading(false);
      }
    };

    const loadCompanyProfile = async () => {
      if (!uid) return;

      try {
        const companyDoc = await getDoc(doc(db, 'companies', uid));
        if (companyDoc.exists()) {
          const data = companyDoc.data();
          setCompanyProfile({
            id: companyDoc.id,
            uid: companyDoc.id,
            companyName: data.companyName || data.businessName || '',
            selectedCategory: data.selectedCategory || '',
            selectedSubcategory: data.selectedSubcategory || '',
            email: data.email || '',
            phone: data.phone || data.phoneNumber || '',
            companyLogo: data.companyLogo || data.logoUrl || data.profilePictureURL || '',
            profilePictureURL: data.profilePictureURL || '',
            averageRating: data.averageRating || 0,
            reviewCount: data.reviewCount || 0,
          });
        }
      } catch (error) {
        console.error('Fehler beim Laden des Firmenprofils:', error);
      }
    };

    loadProjectDetails();
    loadCompanyProfile();
  }, [projectId, uid, router]);

  // Separater useEffect für Realtime-Updates des viewCount
  useEffect(() => {
    if (!projectId) return;

    const projectDocRef = doc(db, 'project_requests', projectId);
    const unsubscribe = onSnapshot(
      projectDocRef,
      docSnapshot => {
        if (docSnapshot.exists()) {
          const updatedData = docSnapshot.data();

          // Aktualisiere nur viewCount in Echtzeit
          setProject(prevProject => {
            if (!prevProject) return prevProject;

            return {
              ...prevProject,
              viewCount: updatedData.viewCount || 0,
            };
          });
        }
      },
      error => {
        console.error('Fehler beim Realtime-Update:', error);
      }
    );

    return () => unsubscribe();
  }, [projectId]);

  const formatBudget = (
    budgetAmount?: number,
    budgetType?: string,
    budgetRange?: { min: number; max: number; currency: string },
    estimatedBudget?: number
  ) => {
    // Zeige Budget-Range wenn verfügbar
    if (budgetRange && budgetRange.min > 0 && budgetRange.max > 0) {
      return `${budgetRange.min.toLocaleString('de-DE')} - ${budgetRange.max.toLocaleString('de-DE')} ${budgetRange.currency || 'EUR'}`;
    }

    // Zeige geschätztes Budget wenn verfügbar
    if (estimatedBudget && estimatedBudget > 0) {
      return `ca. ${estimatedBudget.toLocaleString('de-DE')}€`;
    }

    // Fallback auf ursprüngliches budgetAmount
    if (budgetAmount && budgetAmount > 0) {
      return `${budgetAmount.toLocaleString('de-DE')}€`;
    }

    switch (budgetType) {
      case 'negotiable':
        return 'Budget verhandelbar';
      case 'flexible':
        return 'Budget flexibel';
      default:
        return 'Keine Angabe';
    }
  };

  const formatDate = (date: any) => {
    if (!date) return 'Keine Angabe';

    try {
      const dateObj = date.toDate ? date.toDate() : new Date(date);
      return dateObj.toLocaleDateString('de-DE');
    } catch {
      return 'Keine Angabe';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'low':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'high':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getUrgencyLabel = (urgency: string) => {
    switch (urgency) {
      case 'low':
        return 'Niedrig';
      case 'medium':
        return 'Normal';
      case 'high':
        return 'Dringend';
      default:
        return 'Normal';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#14ad9f] mx-auto mb-4"></div>
          <p className="text-gray-600">Projekt wird geladen...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Projekt nicht gefunden</p>
          <Button variant="outline" onClick={() => router.back()} className="mt-4">
            Zurück
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{project.title}</h1>
            <p className="text-gray-600">
              {project.category} • {project.subcategory}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge className={getUrgencyColor(project.urgency)}>
            {getUrgencyLabel(project.urgency)}
          </Badge>
          <Button
            onClick={() => setShowProposalModal(true)}
            className="bg-[#14ad9f] hover:bg-[#129488] text-white"
          >
            <Send className="h-4 w-4 mr-2" />
            Angebot abgeben
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hauptinhalt */}
        <div className="lg:col-span-2 space-y-6">
          {/* Projektbeschreibung */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#14ad9f]" />
                Projektbeschreibung
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 whitespace-pre-wrap">
                {project.description || 'Keine Beschreibung verfügbar'}
              </p>
            </CardContent>
          </Card>

          {/* Projektanforderungen & Services */}
          {(project.projectRequirements || project.requiredServices) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-[#14ad9f]" />
                  Projektanforderungen
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {project.projectRequirements && (
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Anforderungen:</h4>
                    <p className="text-gray-700">{project.projectRequirements}</p>
                  </div>
                )}

                {project.requiredServices && project.requiredServices.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Benötigte Services:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {project.requiredServices.map((service, index) => (
                        <li key={index} className="text-gray-700">
                          {service}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Zusätzliche Details */}
          {project.subcategoryData && (
            <Card>
              <CardHeader>
                <CardTitle>Projektdetails</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(project.subcategoryData)
                    .filter(
                      ([key, value]) =>
                        (key !== 'title' &&
                          key !== 'projectDescription' &&
                          key !== 'subcategory' &&
                          value &&
                          value !== '' &&
                          value !== false &&
                          !Array.isArray(value)) ||
                        (Array.isArray(value) && value.length > 0)
                    )
                    .map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-gray-600 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').toLowerCase()}:
                        </span>
                        <span className="font-medium">
                          {Array.isArray(value) ? value.join(', ') : String(value)}
                        </span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Projekt-Info */}
          <Card>
            <CardHeader>
              <CardTitle>Projekt-Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span>
                  {typeof project.location === 'string'
                    ? project.location
                    : project.location && typeof project.location === 'object'
                      ? project.location.address || 'Standort verfügbar'
                      : 'Standort nicht angegeben'}
                </span>
              </div>

              {project.preferredDate && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span>Gewünschter Start: {formatDate(project.preferredDate)}</span>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Euro className="h-4 w-4 text-gray-500" />
                <span>
                  {formatBudget(
                    project.budgetAmount,
                    project.budgetType,
                    project.budgetRange,
                    project.estimatedBudget
                  )}
                </span>
              </div>

              {project.timeline && (
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span>{project.timeline}</span>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span>Erstellt: {formatDate(project.createdAt)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Projekt-Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Projekt-Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {project.priority && (
                <div className="flex justify-between">
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
                  <span className="font-medium">{project.projectType}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-gray-600">Aufrufe:</span>
                <span className="font-medium">{project.viewCount || 0}</span>
              </div>

              {project.maxProposals && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Max. Angebote:</span>
                  <span className="font-medium">{project.maxProposals}</span>
                </div>
              )}

              {project.aiGenerated && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Erstellt mit:</span>
                  <Badge variant="outline" className="text-[#14ad9f] border-[#14ad9f]">
                    KI-Assistent
                  </Badge>
                </div>
              )}

              {project.originalPrompt && (
                <div>
                  <span className="text-gray-600 text-sm">Original-Anfrage:</span>
                  <p className="text-sm italic text-gray-500 mt-1">
                    &ldquo;{project.originalPrompt}&rdquo;
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Kundeninformation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Auftraggeber
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="font-medium">{project.customerName || 'Nicht angegeben'}</p>
                <p className="text-sm text-gray-600">
                  Kontaktdaten verfügbar nach Angebots-Annahme
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Proposal Modal */}
      {showProposalModal && companyProfile && project && (
        <MarketplaceProposalModal
          isOpen={showProposalModal}
          onClose={() => setShowProposalModal(false)}
          project={{
            id: project.id,
            title: project.title,
            description: project.description,
            category: project.category,
            subcategory: project.subcategory,
            location: project.location,
            budgetAmount: project.budgetAmount,
            budgetType: project.budgetType,
            customerUid: project.customerUid,
            customerEmail: project.customerEmail,
            preferredDate: project.preferredDate,
            maxBudget: project.budgetAmount,
          }}
          companyId={uid}
          companyName={companyProfile.companyName}
        />
      )}
    </div>
  );
}
