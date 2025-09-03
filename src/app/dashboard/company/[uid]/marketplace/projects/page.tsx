'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Search,
  MapPin,
  Clock,
  Euro,
  Calendar,
  Eye,
  Filter,
  AlertCircle,
  CheckCircle2,
  MessageSquare,
} from 'lucide-react';
import { db } from '@/firebase/clients';
import { collection, query, where, orderBy, onSnapshot, limit, doc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import MarketplaceProposalModal from '@/components/MarketplaceProposalModal';

interface ProjectRequest {
  id: string;
  title: string;
  description: string;
  category: string;
  subcategory: string;
  budgetAmount?: number;
  maxBudget?: number;
  budgetType: 'fixed' | 'hourly' | 'negotiable';
  timeline: string;
  location: string;
  isRemote: boolean;
  urgency: 'low' | 'medium' | 'high';
  status: string;
  createdAt: { toDate?: () => Date; seconds?: number; nanoseconds?: number } | Date;
  customerUid: string;
  customerEmail: string;
  viewCount: number;
  proposalsCount?: number;
}

interface CompanyData {
  selectedCategory?: string;
  selectedSubcategory?: string;
  companyName?: string;
  displayName?: string;
  [key: string]: unknown;
}

export default function CompanyMarketplacePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const uid = params?.uid as string;

  const [projects, setProjects] = useState<ProjectRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedUrgency, setSelectedUrgency] = useState('');
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);

  // Modal States
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectRequest | null>(null);

  // Hilfsfunktion für Date-Konvertierung
  const getDateFromFirestore = (timestamp: ProjectRequest['createdAt']): Date => {
    if (!timestamp) return new Date();

    // Firebase Timestamp mit toDate Methode
    if (
      typeof timestamp === 'object' &&
      'toDate' in timestamp &&
      typeof timestamp.toDate === 'function'
    ) {
      return timestamp.toDate();
    }

    // Firebase Timestamp Objekt mit seconds
    if (typeof timestamp === 'object' && 'seconds' in timestamp && timestamp.seconds) {
      return new Date(timestamp.seconds * 1000);
    }

    // Bereits ein Date Objekt
    if (timestamp instanceof Date) {
      return timestamp;
    }

    // Fallback
    return new Date();
  };

  // Lade Unternehmensdaten
  useEffect(() => {
    if (!uid) return;

    const companyRef = doc(db, 'companies', uid);
    const unsubscribe = onSnapshot(companyRef, doc => {
      if (doc.exists()) {
        setCompanyData(doc.data());
      }
    });

    return () => unsubscribe();
  }, [uid]);

  // Lade verfügbare Projekte basierend auf Unternehmenskategorien
  useEffect(() => {
    if (!uid || !user || !companyData) return;

    // Debug: Zeige Unternehmensdaten
    console.log('🏢 Company Data:', companyData);

    // Extrahiere die Kategorien des Unternehmens
    const companyMainCategory = companyData.selectedCategory;
    const companySubcategory = companyData.selectedSubcategory;

    console.log('🎯 Company Categories:', { companyMainCategory, companySubcategory });

    // Wenn das Unternehmen keine Hauptkategorie hat, zeige keine Projekte
    if (!companyMainCategory) {
      console.log('❌ No main category found for company');
      setProjects([]);
      setLoading(false);
      return;
    }

    const projectRequestsRef = collection(db, 'project_requests');

    // Query: Hole ALLE aktiven öffentlichen Projekte der Hauptkategorie
    // und filtere clientseitig nach Subkategorie (wegen möglicher Dateninkonsistenzen)
    const q = query(
      projectRequestsRef,
      where('status', 'in', ['open', 'active']), // Unterstütze beide Status-Typen
      where('isPublic', '==', true), // Nur öffentliche Projekte
      where('category', '==', companyMainCategory),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    console.log(
      '🔍 Filtering by main category only for better compatibility:',
      companyMainCategory
    );

    const unsubscribe = onSnapshot(
      q,
      snapshot => {
        const availableProjects: ProjectRequest[] = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title || 'Unbenanntes Projekt',
            description: data.description || '',
            category: data.category || data.serviceCategory || '',
            subcategory: data.subcategory || data.serviceSubcategory || '',
            budgetAmount: data.budgetAmount,
            maxBudget: data.maxBudget,
            budgetType: data.budgetType || 'negotiable',
            timeline: data.timeline || '',
            location: data.location || '',
            isRemote: data.isRemote || false,
            urgency: data.urgency || 'medium',
            status: data.status || 'open',
            createdAt: data.createdAt,
            customerUid: data.customerUid || '',
            customerEmail: data.customerEmail || '',
            viewCount: data.viewCount || 0,
            proposalsCount: data.proposals?.length || 0,
          };
        });

        console.log('📊 Total projects found by main category:', availableProjects.length);

        // Clientseitige Filterung nach Subkategorie für bessere Datenkompatibilität
        let filteredProjects = availableProjects;
        if (companySubcategory) {
          filteredProjects = availableProjects.filter(project => {
            // Akzeptiere sowohl exakte Subkategorie als auch Projekte ohne Subkategorie (Fallback)
            const matchesSubcategory =
              !project.subcategory || project.subcategory === companySubcategory;
            console.log(
              `🎯 Project "${project.title}": subcategory="${project.subcategory}", matches=${matchesSubcategory}`
            );
            return matchesSubcategory;
          });
          console.log(
            '🎯 Projects after subcategory filter:',
            filteredProjects.length,
            'for subcategory:',
            companySubcategory
          );
        }

        console.log('✅ Final filtered projects:', filteredProjects.length);
        setProjects(filteredProjects);
        setLoading(false);
      },
      error => {
        console.error('Fehler beim Laden der Projekte:', error);
        toast.error('Fehler beim Laden der verfügbaren Projekte');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [uid, user, companyData]);

  // Handler-Funktionen
  const handleViewProject = (projectId: string) => {
    router.push(`/dashboard/company/${uid}/marketplace/projects/${projectId}`);
  };

  const handleSubmitProposal = (project: ProjectRequest) => {
    setSelectedProject(project);
    setIsProposalModalOpen(true);
  };

  // Filter-Funktionen
  const filteredProjects = projects.filter(project => {
    const matchesSearch =
      project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.category.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = !selectedCategory || project.category === selectedCategory;
    const matchesUrgency = !selectedUrgency || project.urgency === selectedUrgency;

    return matchesSearch && matchesCategory && matchesUrgency;
  });

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getUrgencyText = (urgency: string) => {
    switch (urgency) {
      case 'high':
        return 'Dringend';
      case 'medium':
        return 'Normal';
      case 'low':
        return 'Niedrig';
      default:
        return 'Normal';
    }
  };

  const formatBudget = (project: ProjectRequest) => {
    if (project.budgetType === 'negotiable') {
      return 'Budget verhandelbar';
    }

    if (project.budgetAmount) {
      return `${project.budgetAmount.toLocaleString('de-DE')}€`;
    }

    if (project.maxBudget) {
      return `bis ${project.maxBudget.toLocaleString('de-DE')}€`;
    }

    return 'Budget verhandelbar';
  };

  const formatTimeline = (timeline: string) => {
    if (!timeline) return 'Keine Angabe';

    // Verschiedene Timeline-Formate handhaben
    const timelineMap: { [key: string]: string } = {
      asap: 'So schnell wie möglich',
      within_week: 'Innerhalb einer Woche',
      within_month: 'Innerhalb eines Monats',
      flexible: 'Zeitlich flexibel',
      to_be_discussed: 'Nach Absprache',
    };

    return timelineMap[timeline] || timeline;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#14ad9f]"></div>
        </div>
      </div>
    );
  }

  const categories = [...new Set(projects.map(p => p.category).filter(Boolean))];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Projekt-Marktplatz</h1>
        <p className="text-gray-600 mt-1">
          Durchsuchen Sie verfügbare Projekte und bieten Sie Ihre Dienste an
        </p>
      </div>

      {/* Filter und Suche */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter & Suche
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Suche</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Projekt, Kategorie..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Kategorie</label>
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent"
              >
                <option value="">Alle Kategorien</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Dringlichkeit</label>
              <select
                value={selectedUrgency}
                onChange={e => setSelectedUrgency(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent"
              >
                <option value="">Alle</option>
                <option value="high">Dringend</option>
                <option value="medium">Normal</option>
                <option value="low">Niedrig</option>
              </select>
            </div>

            <div className="flex items-end">
              <Button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('');
                  setSelectedUrgency('');
                }}
                variant="outline"
                className="w-full"
              >
                Filter zurücksetzen
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistiken */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Verfügbare Projekte</p>
                <p className="text-2xl font-bold text-[#14ad9f]">{filteredProjects.length}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-[#14ad9f]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Dringende Projekte</p>
                <p className="text-2xl font-bold text-red-600">
                  {filteredProjects.filter(p => p.urgency === 'high').length}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Neue (heute)</p>
                <p className="text-2xl font-bold text-blue-600">
                  {
                    filteredProjects.filter(p => {
                      const projectDate = getDateFromFirestore(p.createdAt);
                      const today = new Date();
                      return projectDate.toDateString() === today.toDateString();
                    }).length
                  }
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Kategorien</p>
                <p className="text-2xl font-bold text-green-600">{categories.length}</p>
              </div>
              <Filter className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Projekt-Liste */}
      <div className="space-y-4">
        {filteredProjects.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Keine Projekte gefunden</h3>
              <p className="text-gray-600">
                {searchTerm || selectedCategory || selectedUrgency
                  ? 'Versuchen Sie andere Suchkriterien oder entfernen Sie Filter.'
                  : 'Aktuell sind keine neuen Projekte verfügbar.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredProjects.map(project => (
            <Card key={project.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-lg">{project.title}</CardTitle>
                      <Badge className={getUrgencyColor(project.urgency)}>
                        {getUrgencyText(project.urgency)}
                      </Badge>
                      {project.isRemote && (
                        <Badge
                          variant="outline"
                          className="bg-blue-50 text-blue-700 border-blue-200"
                        >
                          Remote möglich
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="font-medium text-[#14ad9f]">
                        {project.category} • {project.subcategory}
                      </span>
                      {project.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          <span>{project.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-sm text-gray-500 mb-1">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {getDateFromFirestore(project.createdAt).toLocaleDateString('de-DE')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Eye className="h-4 w-4" />
                      <span>{project.viewCount} Aufrufe</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 mb-4 line-clamp-2">{project.description}</p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-1">
                      <Euro className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">{formatBudget(project)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span>{formatTimeline(project.timeline)}</span>
                    </div>
                    {(project.proposalsCount ?? 0) > 0 && (
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-4 w-4 text-gray-500" />
                        <span>{project.proposalsCount} Angebote</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewProject(project.id)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Details
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleSubmitProposal(project)}
                      className="bg-[#14ad9f] hover:bg-[#129488] text-white"
                    >
                      Angebot abgeben
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Marketplace Proposal Modal */}
      {selectedProject && (
        <MarketplaceProposalModal
          isOpen={isProposalModalOpen}
          onClose={() => {
            setIsProposalModalOpen(false);
            setSelectedProject(null);
          }}
          project={selectedProject}
          companyId={uid}
          companyName={companyData?.companyName || companyData?.displayName || 'Unbekannte Firma'}
        />
      )}
    </div>
  );
}
