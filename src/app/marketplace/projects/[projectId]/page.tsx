'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MapPin,
  Clock,
  Euro,
  Calendar,
  Eye,
  ArrowLeft,
  Shield,
  FileText,
  User,
  Briefcase,
  CheckCircle,
  AlertCircle,
  Phone,
  Mail,
  MessageCircle,
  Paperclip,
  TrendingUp,
  Star,
  Sparkles,
  Lock,
  Award,
} from 'lucide-react';
import { db } from '@/firebase/clients';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { HeroHeader } from '@/components/hero8-header';
import UserHeader from '@/components/UserHeader';
import LoginPopup from '@/components/LoginPopup';

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
  city?: string;
  state?: string;
  country?: string;
  isRemote: boolean;
  urgency: 'low' | 'medium' | 'high' | 'urgent' | 'normal';
  status: string;
  createdAt: { toDate?: () => Date; seconds?: number; nanoseconds?: number } | Date;
  customerUid: string;
  viewCount: number;
  proposalsCount?: number;
  requestType: 'direct' | 'marketplace';
  isPublic: boolean;
  escrowRequired: boolean;
  requirements?: string[];
  attachments?: { name: string; url: string; type?: string }[];
  // Neue Felder
  preferredDate?: string | Date;
  projectScope?: 'einmalig' | 'wiederkehrend' | 'langfristig';
  siteVisitPossible?: boolean;
  workingHours?: 'werktags' | 'wochenende' | 'abends' | 'flexibel';
  requiredQualifications?: string[];
  contactPreference?: 'telefon' | 'email' | 'chat';
  customerVerified?: boolean;
  customerOrderCount?: number;
  customerResponseRate?: number;
  proposalDeadline?: string | Date;
  maxProposals?: number;
  isDemo?: boolean; // Markierung für Demo-Projekte
}

export default function PublicProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const projectId = params?.projectId as string;

  const [project, setProject] = useState<ProjectRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [showLoginPopup, setShowLoginPopup] = useState(false);

  const getDateFromFirestore = (timestamp: ProjectRequest['createdAt']): Date => {
    if (!timestamp) return new Date();

    if (
      typeof timestamp === 'object' &&
      'toDate' in timestamp &&
      typeof timestamp.toDate === 'function'
    ) {
      return timestamp.toDate();
    }

    if (typeof timestamp === 'object' && 'seconds' in timestamp && timestamp.seconds) {
      return new Date(timestamp.seconds * 1000);
    }

    if (timestamp instanceof Date) {
      return timestamp;
    }

    return new Date();
  };

  useEffect(() => {
    async function loadProject() {
      if (!projectId) {
        setError('Projekt-ID fehlt');
        setLoading(false);
        return;
      }

      try {
        // Zuerst in project_requests suchen
        let projectRef = doc(db, 'project_requests', projectId);
        let projectSnap = await getDoc(projectRef);

        // Falls nicht gefunden, in quotes suchen
        if (!projectSnap.exists()) {
          projectRef = doc(db, 'quotes', projectId);
          projectSnap = await getDoc(projectRef);
        }

        if (!projectSnap.exists()) {
          setError('Projekt nicht gefunden');
          setLoading(false);
          return;
        }

        const data = projectSnap.data();

        // Prüfe ob öffentlich
        if (!data.isPublic) {
          setError('Dieses Projekt ist nicht öffentlich');
          setLoading(false);
          return;
        }

        setProject({
          id: projectSnap.id,
          ...data,
        } as ProjectRequest);

        // View Count erhöhen (nur wenn User eingeloggt ist, da Schreibrechte erforderlich)
        try {
          await updateDoc(projectRef, {
            viewCount: increment(1),
          });
        } catch {
          // Ignorieren - nicht-authentifizierte User können viewCount nicht erhöhen
        }

        setLoading(false);
      } catch (err) {
        console.error('Fehler beim Laden:', err);
        setError('Fehler beim Laden des Projekts');
        setLoading(false);
      }
    }

    loadProject();
  }, [projectId]);

  const formatBudget = (proj: ProjectRequest): string => {
    if (proj.budgetAmount) {
      if (proj.maxBudget && proj.maxBudget !== proj.budgetAmount) {
        return `${proj.budgetAmount.toLocaleString('de-DE')} - ${proj.maxBudget.toLocaleString('de-DE')} EUR`;
      }
      return `${proj.budgetAmount.toLocaleString('de-DE')} EUR`;
    }
    return 'Auf Anfrage';
  };

  const getUrgencyBadge = (urgency: string) => {
    const urgencyConfig: Record<string, { label: string; className: string }> = {
      low: { label: 'Niedrig', className: 'bg-gray-100 text-gray-700 border-gray-200' },
      normal: { label: 'Normal', className: 'bg-blue-100 text-blue-700 border-blue-200' },
      medium: { label: 'Mittel', className: 'bg-amber-100 text-amber-700 border-amber-200' },
      high: { label: 'Hoch', className: 'bg-orange-100 text-orange-700 border-orange-200' },
      urgent: { label: 'Dringend', className: 'bg-red-100 text-red-700 border-red-200' },
    };
    const config = urgencyConfig[urgency] || urgencyConfig.normal;
    return <Badge className={`${config.className} border font-medium`}>{config.label}</Badge>;
  };

  const formatDate = (timestamp: ProjectRequest['createdAt']): string => {
    const date = getDateFromFirestore(timestamp);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const handleSubmitProposal = () => {
    // Nicht eingeloggt: Direkt zur Company-Registrierung weiterleiten
    if (!user) {
      router.push('/register/company');
      return;
    }

    // Eingeloggt bei Demo-Projekten: Modal anzeigen
    if (project?.isDemo) {
      setShowDemoModal(true);
      return;
    }
    
    // Eingeloggt: Zur Company-Auswahl/Dashboard weiterleiten
    router.push(`/dashboard/company/select?action=proposal&projectId=${projectId}`);
  };

  if (loading) {
    return (
      <>
        {user ? <UserHeader currentUid={user.uid} /> : <HeroHeader />}
        <div className="min-h-screen bg-gradient-to-b from-teal-900 via-teal-800 to-gray-50">
          {/* Hero Skeleton */}
          <div className="relative py-16 px-4">
            <div className="container mx-auto max-w-5xl">
              <div className="animate-pulse">
                <div className="h-6 bg-white/20 rounded w-32 mb-6" />
                <div className="h-10 bg-white/20 rounded w-2/3 mb-4" />
                <div className="h-6 bg-white/20 rounded w-1/2 mb-8" />
                <div className="flex gap-4">
                  <div className="h-20 bg-white/10 rounded-xl flex-1" />
                  <div className="h-20 bg-white/10 rounded-xl flex-1" />
                  <div className="h-20 bg-white/10 rounded-xl flex-1" />
                  <div className="h-20 bg-white/10 rounded-xl flex-1" />
                </div>
              </div>
            </div>
          </div>
          {/* Content Skeleton */}
          <div className="container mx-auto px-4 max-w-5xl -mt-8 pb-16">
            <div className="animate-pulse">
              <div className="bg-white rounded-2xl p-8 mb-6">
                <div className="h-6 bg-gray-200 rounded w-1/4 mb-4" />
                <div className="h-4 bg-gray-200 rounded w-full mb-2" />
                <div className="h-4 bg-gray-200 rounded w-3/4" />
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error || !project) {
    return (
      <>
        {user ? <UserHeader currentUid={user.uid} /> : <HeroHeader />}
        <div className="min-h-screen bg-gradient-to-b from-teal-900 via-teal-800 to-gray-50">
          <div className="container mx-auto px-4 py-16 max-w-lg">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-xl p-12 text-center"
            >
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="h-10 w-10 text-red-500" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">
                {error || 'Projekt nicht gefunden'}
              </h1>
              <p className="text-gray-500 mb-8">
                Das gesuchte Projekt existiert nicht oder ist nicht mehr verfügbar.
              </p>
              <Link href="/marketplace">
                <Button size="lg" className="bg-teal-600 hover:bg-teal-700">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Zurück zum Marktplatz
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {user ? <UserHeader currentUid={user.uid} /> : <HeroHeader />}
      <main className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-teal-600 via-teal-700 to-teal-900 pt-20 lg:pt-24">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }} />
          </div>

          <div className="relative z-10 container mx-auto px-4 py-12 lg:py-16 max-w-5xl">
            {/* Breadcrumb */}
            <motion.nav
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
              aria-label="Breadcrumb"
            >
              <ol className="flex items-center gap-2 text-sm">
                <li>
                  <Link
                    href="/"
                    className="text-white/70 hover:text-white transition-colors"
                  >
                    Start
                  </Link>
                </li>
                <li className="text-white/50">/</li>
                <li>
                  <Link
                    href="/marketplace"
                    className="text-white/70 hover:text-white transition-colors"
                  >
                    Marktplatz
                  </Link>
                </li>
                <li className="text-white/50">/</li>
                <li className="text-white font-medium truncate max-w-[250px]">
                  Projektdetails
                </li>
              </ol>
            </motion.nav>

            {/* Title & Meta */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-8"
            >
              <div className="flex flex-wrap items-center gap-3 mb-4">
                {getUrgencyBadge(project.urgency)}
                {project.isRemote && (
                  <Badge className="bg-white/20 text-white border border-white/30 font-medium backdrop-blur-sm">
                    Remote möglich
                  </Badge>
                )}
                {project.escrowRequired && (
                  <Badge className="bg-white/20 text-white border border-white/30 font-medium backdrop-blur-sm">
                    <Shield className="h-3 w-3 mr-1" />
                    Escrow-Schutz
                  </Badge>
                )}
              </div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
                {project.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-white/80 text-sm">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {formatDate(project.createdAt)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Eye className="h-4 w-4" />
                  {project.viewCount || 0} Aufrufe
                </span>
                {project.proposalsCount !== undefined && project.proposalsCount > 0 && (
                  <span className="flex items-center gap-1.5">
                    <FileText className="h-4 w-4" />
                    {project.proposalsCount} Angebot{project.proposalsCount !== 1 ? 'e' : ''}
                  </span>
                )}
                {project.category && (
                  <span className="flex items-center gap-1.5">
                    <Briefcase className="h-4 w-4" />
                    {project.category}
                    {project.subcategory && project.subcategory !== project.category && (
                      <span className="text-white/50">/ {project.subcategory}</span>
                    )}
                  </span>
                )}
              </div>
            </motion.div>

            {/* Stats Cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4"
            >
              <div className="bg-white/95 backdrop-blur-md rounded-xl p-5 shadow-lg">
                <div className="flex items-center gap-2 text-teal-700 text-sm mb-2">
                  <Euro className="h-4 w-4" />
                  Budget
                </div>
                <p className="font-bold text-gray-900 text-lg">{formatBudget(project)}</p>
                {project.budgetType && (
                  <p className="text-xs text-gray-500 mt-1">
                    {project.budgetType === 'fixed' ? 'Festpreis' : project.budgetType === 'hourly' ? 'Stundensatz' : 'Verhandelbar'}
                  </p>
                )}
              </div>

              <div className="bg-white/95 backdrop-blur-md rounded-xl p-5 shadow-lg">
                <div className="flex items-center gap-2 text-teal-700 text-sm mb-2">
                  <MapPin className="h-4 w-4" />
                  Standort
                </div>
                <p className="font-bold text-gray-900 text-lg">
                  {project.city || project.location || 'Flexibel'}
                </p>
                {project.isRemote && (
                  <p className="text-xs text-teal-600 mt-1">Remote möglich</p>
                )}
              </div>

              {project.timeline && (
                <div className="bg-white/95 backdrop-blur-md rounded-xl p-5 shadow-lg">
                  <div className="flex items-center gap-2 text-teal-700 text-sm mb-2">
                    <Clock className="h-4 w-4" />
                    Zeitrahmen
                  </div>
                  <p className="font-bold text-gray-900 text-lg">{project.timeline}</p>
                </div>
              )}

              {project.projectScope && (
                <div className="bg-white/95 backdrop-blur-md rounded-xl p-5 shadow-lg">
                  <div className="flex items-center gap-2 text-teal-700 text-sm mb-2">
                    <TrendingUp className="h-4 w-4" />
                    Projektart
                  </div>
                  <p className="font-bold text-gray-900 text-lg capitalize">{project.projectScope}</p>
                </div>
              )}
            </motion.div>
          </div>

          {/* Wave Divider */}
          <div className="absolute bottom-0 left-0 right-0">
            <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
              <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="#f9fafb"/>
            </svg>
          </div>
        </section>

        {/* Trust Badges */}
        <section className="bg-gray-50 py-8 border-b">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap justify-center gap-8 lg:gap-16">
              {[
                { icon: Shield, text: 'Escrow-Schutz', subtext: 'Sichere Zahlungen' },
                { icon: CheckCircle, text: 'Verifiziert', subtext: 'Geprüfter Kunde' },
                { icon: Lock, text: '100% Sicher', subtext: 'Daten geschützt' },
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 * index }}
                  className="flex items-center gap-3"
                >
                  <div className="p-2 bg-teal-100 rounded-lg">
                    <item.icon className="h-5 w-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{item.text}</p>
                    <p className="text-sm text-gray-500">{item.subtext}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-12">
          <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Description Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="shadow-lg border-0 overflow-hidden">
                  <CardContent className="p-6 md:p-8">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-teal-600" />
                      Projektbeschreibung
                    </h2>
                    <div className="prose max-w-none">
                      <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {project.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Additional Details */}
              {(project.workingHours || project.siteVisitPossible !== undefined || project.contactPreference) && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Card className="shadow-lg border-0">
                    <CardContent className="p-6 md:p-8">
                      <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-teal-600" />
                        Weitere Details
                      </h2>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {project.workingHours && (
                          <div className="bg-gray-50 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                              <Clock className="h-4 w-4" />
                              Arbeitszeiten
                            </div>
                            <p className="font-semibold capitalize">{project.workingHours}</p>
                          </div>
                        )}

                        {project.siteVisitPossible !== undefined && (
                          <div className="bg-gray-50 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                              <MapPin className="h-4 w-4" />
                              Vor-Ort Besichtigung
                            </div>
                            <p className="font-semibold">{project.siteVisitPossible ? 'Möglich' : 'Nicht möglich'}</p>
                          </div>
                        )}

                        {project.contactPreference && (
                          <div className="bg-gray-50 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                              {project.contactPreference === 'telefon' ? <Phone className="h-4 w-4" /> :
                               project.contactPreference === 'email' ? <Mail className="h-4 w-4" /> :
                               <MessageCircle className="h-4 w-4" />}
                              Bevorzugter Kontakt
                            </div>
                            <p className="font-semibold capitalize">{project.contactPreference}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Requirements */}
              {project.requirements && project.requirements.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <Card className="shadow-lg border-0">
                    <CardContent className="p-6 md:p-8">
                      <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-teal-600" />
                        Anforderungen
                      </h2>
                      <ul className="space-y-3">
                        {project.requirements.map((req, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <div className="mt-0.5 w-5 h-5 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <CheckCircle className="h-3 w-3 text-teal-600" />
                            </div>
                            <span className="text-gray-700">{req}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Qualifications */}
              {project.requiredQualifications && project.requiredQualifications.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <Card className="shadow-lg border-0">
                    <CardContent className="p-6 md:p-8">
                      <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Award className="h-5 w-5 text-teal-600" />
                        Benötigte Qualifikationen
                      </h2>
                      <div className="flex flex-wrap gap-2">
                        {project.requiredQualifications.map((qual, index) => (
                          <Badge 
                            key={index} 
                            className="bg-amber-50 text-amber-700 border border-amber-200 font-medium px-3 py-1"
                          >
                            {qual}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Attachments */}
              {project.attachments && project.attachments.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                >
                  <Card className="shadow-lg border-0">
                    <CardContent className="p-6 md:p-8">
                      <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Paperclip className="h-5 w-5 text-teal-600" />
                        Anhänge ({project.attachments.length})
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {project.attachments.map((attachment, index) => (
                          <a
                            key={index}
                            href={attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group"
                          >
                            <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                              <FileText className="h-5 w-5 text-teal-600" />
                            </div>
                            <span className="text-sm text-gray-700 truncate group-hover:text-teal-600 transition-colors">
                              {attachment.name}
                            </span>
                          </a>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>

            {/* Right Column - Sidebar */}
            <div className="space-y-6">
              {/* CTA Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Card className="shadow-lg border-0 sticky top-24 overflow-hidden">
                  <div className="bg-gradient-to-r from-teal-600 via-teal-700 to-teal-800 p-6 text-white">
                    <h3 className="font-bold text-lg mb-2">
                      {project.isDemo ? 'Interesse geweckt?' : 'Angebot senden'}
                    </h3>
                    <p className="text-sm text-white/90">
                      {project.isDemo 
                        ? 'Registriere dein Unternehmen für ähnliche Aufträge.'
                        : 'Zeige dem Kunden, warum du der richtige Partner bist.'
                      }
                    </p>
                  </div>
                  <CardContent className="p-6 bg-gray-50">
                    <Button
                      size="lg"
                      className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold h-12 shadow-md"
                      onClick={handleSubmitProposal}
                    >
                      <FileText className="h-5 w-5 mr-2" />
                      {project.isDemo ? 'Jetzt registrieren' : 'Angebot senden'}
                    </Button>
                    
                    {!user && (
                      <p className="text-xs text-gray-600 text-center mt-4">
                        Du wirst zur Registrierung weitergeleitet
                      </p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Customer Info */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Card className="shadow-lg border-0">
                  <CardContent className="p-6">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <User className="h-5 w-5 text-teal-600" />
                      Auftraggeber
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center">
                          <User className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">Privater Auftraggeber</span>
                            {project.customerVerified && (
                              <CheckCircle className="h-4 w-4 text-teal-500" />
                            )}
                          </div>
                          {project.customerVerified && (
                            <span className="text-xs text-teal-600">Verifiziert</span>
                          )}
                        </div>
                      </div>
                      
                      {(project.customerOrderCount || project.customerResponseRate) && (
                        <div className="pt-3 border-t space-y-2">
                          {project.customerOrderCount !== undefined && project.customerOrderCount > 0 && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Briefcase className="h-4 w-4 text-gray-400" />
                              {project.customerOrderCount} Aufträge vergeben
                            </div>
                          )}
                          {project.customerResponseRate !== undefined && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Star className="h-4 w-4 text-gray-400" />
                              {project.customerResponseRate}% Antwortrate
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Escrow Info */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <Card className="shadow-lg border-0 bg-gradient-to-br from-teal-50 to-white">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Shield className="h-6 w-6 text-teal-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-teal-800 mb-1">
                          Escrow-Schutz
                        </h3>
                        <p className="text-sm text-teal-700 leading-relaxed">
                          Sichere Zahlung: Dein Geld wird erst freigegeben, wenn die Leistung bestätigt wurde.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Trust Badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
                <Card className="shadow-lg border-0">
                  <CardContent className="p-6">
                    <div className="text-center">
                      <Lock className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                      <h4 className="font-medium text-gray-900 mb-1">100% Sicher & Seriös</h4>
                      <p className="text-xs text-gray-500">
                        Alle Projekte werden geprüft. Deine Daten sind geschützt.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>

          {/* Not logged in CTA */}
          {!user && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="mt-8"
            >
              <Card className="shadow-lg border-0 bg-gradient-to-r from-teal-600 via-teal-700 to-teal-800 text-white overflow-hidden">
                <CardContent className="p-8">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                      <h3 className="text-xl font-bold mb-2">
                        Bereit, Aufträge zu gewinnen?
                      </h3>
                      <p className="text-white/90">
                        Registriere dein Unternehmen kostenlos und sende Angebote für passende Projekte.
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button 
                        variant="outline" 
                        className="border-2 border-white bg-transparent text-white hover:bg-white hover:text-teal-700 font-semibold px-6"
                        onClick={() => setShowLoginPopup(true)}
                      >
                        Anmelden
                      </Button>
                      <Link href="/register/company">
                        <Button className="bg-white text-teal-700 hover:bg-gray-100 font-semibold px-6 shadow-md">
                          Kostenlos registrieren
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
          </div>
        </section>

        {/* Demo Project Modal */}
        {showDemoModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-md w-full"
            >
              <Card className="shadow-2xl border-0">
                <CardContent className="p-8">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <AlertCircle className="h-10 w-10 text-amber-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">
                      Projekt nicht mehr verfügbar
                    </h3>
                    <p className="text-gray-600 mb-8 leading-relaxed">
                      Dieses Projekt wurde bereits vergeben oder ist nicht mehr aktiv. 
                      Registriere dein Unternehmen kostenlos, um ähnliche Projekte zu finden.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => setShowDemoModal(false)}
                      >
                        Schließen
                      </Button>
                      <Button
                        size="lg"
                        className="bg-teal-600 hover:bg-teal-700"
                        onClick={() => router.push('/register/company')}
                      >
                        Kostenlos registrieren
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}

        {/* Login Popup */}
        <LoginPopup
          isOpen={showLoginPopup}
          onClose={() => setShowLoginPopup(false)}
          onLoginSuccess={() => {
            setShowLoginPopup(false);
            router.refresh();
          }}
        />
      </main>
    </>
  );
}
