'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Euro,
  MapPin,
  User,
  Building,
  Star,
  MessageSquare,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Phone,
  Mail,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { db } from '@/firebase/clients';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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
  startDate?: string;
  endDate?: string;
  preferredDate?: string;
  location: string;
  isRemote: boolean;
  urgency: 'low' | 'medium' | 'high';
  requiredSkills: string[];
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  customerUid: string;
  customerEmail: string;
  proposals: Proposal[];
  createdAt: Date;
  updatedAt: Date;
  viewCount: number;
}

interface Proposal {
  id: string;
  providerId: string;
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
  status: 'pending' | 'accepted' | 'rejected';
}

const ProjectDetailPage: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const uid = params?.uid as string;
  const projectId = params?.projectId as string;

  const [project, setProject] = useState<ProjectRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        const projectDocRef = doc(db, 'project_requests', projectId);
        const projectDocSnap = await getDoc(projectDocRef);

        if (!projectDocSnap.exists()) {
          setError('Projekt nicht gefunden.');
          setLoading(false);
          return;
        }

        const data = projectDocSnap.data();

        // Prüfe ob der User der Eigentümer ist
        if (data.customerUid !== uid) {
          setError('Zugriff verweigert. Sie sind nicht der Eigentümer dieses Projekts.');
          setLoading(false);
          return;
        }

        const projectData: ProjectRequest = {
          id: projectDocSnap.id,
          title: data.title || 'Unbenanntes Projekt',
          description: data.description || '',
          category: data.category || '',
          subcategory: data.subcategory || '',
          budgetAmount: data.budgetAmount,
          maxBudget: data.maxBudget,
          budgetType: data.budgetType || 'negotiable',
          timeline: data.timeline || '',
          startDate: data.startDate || undefined,
          endDate: data.endDate || undefined,
          preferredDate: data.preferredDate || undefined,
          location: data.location || '',
          isRemote: data.isRemote || false,
          urgency: data.urgency || 'medium',
          requiredSkills: data.requiredSkills || [],
          status: data.status || 'open',
          customerUid: data.customerUid || '',
          customerEmail: data.customerEmail || '',
          proposals: data.proposals || [],
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          viewCount: data.viewCount || 0,
        };

        setProject(projectData);
        setLoading(false);
      } catch (error) {
        console.error('Fehler beim Laden der Projektdetails:', error);
        setError('Fehler beim Laden der Projektdetails');
        setLoading(false);
        toast.error('Fehler beim Laden der Projektdetails');
      }
    };

    loadProjectDetails();
  }, [uid, user, projectId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-green-100 text-green-800';
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

  const getProposalStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#14ad9f] via-teal-600 to-blue-600 relative -m-4 lg:-m-6 -mt-16">
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
      <div className="min-h-screen bg-gradient-to-br from-[#14ad9f] via-teal-600 to-blue-600 relative -m-4 lg:-m-6 -mt-16">
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
    <div className="min-h-screen bg-gradient-to-br from-[#14ad9f] via-teal-600 to-blue-600 relative -m-4 lg:-m-6 -mt-16">
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
                    : 'Abgebrochen'}
            </Badge>
            <Badge className={`${getUrgencyColor(project.urgency)} border-current`}>
              {project.urgency === 'high'
                ? 'Hoch'
                : project.urgency === 'medium'
                  ? 'Mittel'
                  : 'Niedrig'}
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

              {/* Angebote */}
              <Card className="bg-white/95 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Eingegangene Angebote ({project.proposals.length})
                  </CardTitle>
                  {project.proposals.length === 0 && (
                    <CardDescription>
                      Noch keine Angebote eingegangen. Ihr Projekt ist öffentlich sichtbar.
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  {project.proposals.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">Noch keine Angebote eingegangen</p>
                      <p className="text-sm text-gray-400 mt-2">
                        Ihr Projekt ist öffentlich sichtbar und Anbieter können Angebote abgeben.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {project.proposals.map(proposal => (
                        <div
                          key={proposal.id}
                          className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={proposal.providerAvatar} />
                                <AvatarFallback>
                                  {proposal.providerName.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <h4 className="font-semibold text-gray-900">
                                  {proposal.providerName}
                                </h4>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  {proposal.providerRating && (
                                    <div className="flex items-center gap-1">
                                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                      <span>{proposal.providerRating.toFixed(1)}</span>
                                      {proposal.providerReviewCount && (
                                        <span>({proposal.providerReviewCount} Bewertungen)</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {getProposalStatusIcon(proposal.status)}
                              <span className="text-sm font-medium">
                                {proposal.status === 'accepted'
                                  ? 'Angenommen'
                                  : proposal.status === 'rejected'
                                    ? 'Abgelehnt'
                                    : 'Ausstehend'}
                              </span>
                            </div>
                          </div>

                          <p className="text-gray-700 mb-4">{proposal.message}</p>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div className="flex items-center gap-2 text-sm">
                              <Euro className="h-4 w-4 text-gray-500" />
                              <span className="font-semibold">
                                {proposal.proposedPrice.toLocaleString('de-DE', {
                                  style: 'currency',
                                  currency: 'EUR',
                                })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="h-4 w-4 text-gray-500" />
                              <span>{proposal.proposedTimeline}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-4 w-4 text-gray-500" />
                              <span>{proposal.availability}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              {proposal.providerEmail && (
                                <div className="flex items-center gap-1">
                                  <Mail className="h-4 w-4" />
                                  <span>{proposal.providerEmail}</span>
                                </div>
                              )}
                              {proposal.providerPhone && (
                                <div className="flex items-center gap-1">
                                  <Phone className="h-4 w-4" />
                                  <span>{proposal.providerPhone}</span>
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-gray-500">
                              Eingegangen am {proposal.submittedAt.toLocaleDateString('de-DE')}
                            </p>
                          </div>

                          {proposal.status === 'pending' && (
                            <div className="flex gap-2 mt-4">
                              <Button
                                size="sm"
                                className="bg-[#14ad9f] hover:bg-[#129488] text-white"
                                onClick={() => {
                                  // TODO: Angebot annehmen
                                  toast.success('Funktion wird noch implementiert');
                                }}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Annehmen
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  // TODO: Angebot ablehnen
                                  toast.success('Funktion wird noch implementiert');
                                }}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Ablehnen
                              </Button>
                            </div>
                          )}
                        </div>
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
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Budget</h4>
                    <div className="text-2xl font-bold text-[#14ad9f]">
                      {project.budgetAmount
                        ? `${project.budgetAmount.toLocaleString('de-DE', {
                            style: 'currency',
                            currency: 'EUR',
                          })}${project.budgetType === 'hourly' ? '/h' : ''}`
                        : project.maxBudget
                          ? `Bis zu ${project.maxBudget.toLocaleString('de-DE', {
                              style: 'currency',
                              currency: 'EUR',
                            })}`
                          : 'Verhandelbar'}
                    </div>
                    {(project.budgetAmount || project.maxBudget) && (
                      <p className="text-sm text-gray-600 mt-1">
                        {project.budgetType === 'fixed'
                          ? 'Festpreis'
                          : project.budgetType === 'hourly'
                            ? 'Stundensatz'
                            : 'Verhandelbar'}
                      </p>
                    )}
                  </div>

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
                        {project.location || 'Nicht angegeben'}
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
                    <span className="font-semibold">{project.proposals.length}</span>
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
