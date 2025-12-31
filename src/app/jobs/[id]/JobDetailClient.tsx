'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  MapPin,
  Calendar,
  Clock,
  ArrowLeft,
  Share2,
  Printer,
  Star,
  Mail,
  Building2,
  Facebook,
  Linkedin,
  Twitter,
  Link as LinkIcon,
  MessageCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { JobPosting } from '@/types/career';
import { useJobFavorites } from '@/hooks/useJobFavorites';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { GallerySlider } from '@/components/ui/gallery-slider';

interface JobDetailClientProps {
  job: JobPosting;
  companyDescription?: string;
  companyJobCount?: number;
  similarJobs?: JobPosting[];
  applicationMethod?: string;
  externalApplicationUrl?: string;
}

export default function JobDetailClient({
  job,
  companyDescription,
  companyJobCount,
  similarJobs = [],
  applicationMethod = 'taskilo',
  externalApplicationUrl,
}: JobDetailClientProps) {
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useJobFavorites(job.id);

  const backHref = user ? `/dashboard/user/${user.uid}/career/jobs` : '/jobs';

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link in die Zwischenablage kopiert');
  };

  const shareToSocial = (platform: string) => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`Schau dir diesen Job an: ${job.title} bei ${job.companyName}`);

    let shareUrl = '';

    switch (platform) {
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${text}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${text}%20${url}`;
        break;
      case 'email':
        window.location.href = `mailto:?subject=${text}&body=${url}`;
        return;
    }

    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const jobTypeMap: Record<string, string> = {
    'full-time': 'Vollzeit',
    'part-time': 'Teilzeit',
    contract: 'Vertragsbasis',
    freelance: 'Freiberuflich',
    internship: 'Praktikum',
    temporary: 'Aushilfe',
    apprenticeship: 'Ausbildung',
    working_student: 'Werkstudent',
  };

  const displayJobType = jobTypeMap[job.type] || job.type;

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Top Navigation / Breadcrumb */}
      <div className="bg-[#14ad9f]/95 border-b border-teal-700/30 sticky top-0 z-10 shadow-lg backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            href={backHref}
            className="flex items-center text-white/90 hover:text-white transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zurück zur Ergebnisliste
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/60">Job ID: {job.id}</span>
          </div>
        </div>
      </div>

      {/* Hero Section mit Header Image */}
      {job.headerImageUrl && (
        <div className="w-full h-96 relative bg-gray-100">
          <Image
            src={job.headerImageUrl}
            alt="Job Header"
            fill
            className="object-cover"
            style={{ objectPosition: `center ${job.headerImagePositionY ?? 50}%` }}
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/50 to-transparent" />
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header Section - Floating Card */}
        <div className="bg-white shadow-lg rounded-xl p-6 md:p-8 -mt-20 relative z-10 mb-8">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Company Logo */}
            <Link href={`/companies/${job.companyId}`} className="block group">
              <div className="w-24 h-24 md:w-32 md:h-32 relative border border-gray-100 rounded-lg p-2 shrink-0 bg-white flex items-center justify-center overflow-hidden group-hover:border-teal-200 transition-colors">
                {job.logoUrl ? (
                  <Image
                    src={job.logoUrl}
                    alt={job.companyName}
                    fill
                    className="object-contain p-2"
                  />
                ) : (
                  <div className="text-4xl font-bold text-gray-300">
                    {job.companyName.charAt(0)}
                  </div>
                )}
              </div>
            </Link>

            {/* Title & Meta */}
            <div className="flex-1">
              <Link
                href={`/companies/${job.companyId}`}
                className="text-[#14ad9f] font-medium mb-1 hover:underline inline-block"
              >
                {job.companyName}
              </Link>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">{job.title}</h1>

              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <Link
                    href={`/jobs?location=${encodeURIComponent(job.location)}`}
                    className="hover:text-teal-600 hover:underline"
                  >
                    {job.location}
                  </Link>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-gray-400" />
                  {displayJobType}
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  {new Date(job.postedAt).toLocaleDateString('de-DE')}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 w-full md:w-auto">
              {applicationMethod === 'external' && externalApplicationUrl ? (
                <a href={externalApplicationUrl} target="_blank" rel="noopener noreferrer">
                  <Button className="bg-[#14ad9f] hover:bg-teal-700 text-white w-full md:w-auto shadow-lg">
                    Bewerbung starten <LinkIcon className="ml-2 w-4 h-4" />
                  </Button>
                </a>
              ) : (
                <Link
                  href={
                    user
                      ? `/dashboard/user/${user.uid}/career/jobs/${job.id}/apply`
                      : `/?redirect=/dashboard/user/guest/career/jobs/${job.id}/apply`
                  }
                >
                  <Button className="bg-[#14ad9f] hover:bg-teal-700 text-white w-full md:w-auto shadow-lg">
                    Bewerbung starten
                  </Button>
                </Link>
              )}
              <div className="flex gap-2 justify-center md:justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="text-gray-500 hover:text-teal-600"
                      title="Teilen"
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => shareToSocial('facebook')}>
                      <Facebook className="mr-2 h-4 w-4" /> Facebook
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => shareToSocial('twitter')}>
                      <Twitter className="mr-2 h-4 w-4" /> Twitter
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => shareToSocial('linkedin')}>
                      <Linkedin className="mr-2 h-4 w-4" /> LinkedIn
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => shareToSocial('whatsapp')}>
                      <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => shareToSocial('email')}>
                      <Mail className="mr-2 h-4 w-4" /> E-Mail
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleShare}>
                      <LinkIcon className="mr-2 h-4 w-4" /> Link kopieren
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="outline"
                  size="icon"
                  className="text-gray-500 hover:text-teal-600"
                  onClick={handlePrint}
                  title="Drucken"
                >
                  <Printer className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className={`text-gray-500 hover:text-teal-600 ${isFavorite ? 'text-teal-600 border-teal-600' : ''}`}
                  onClick={toggleFavorite}
                  title={isFavorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
                >
                  <Star className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="space-y-8">
          {/* Job Description Content */}
          <div className="bg-white shadow-sm rounded-xl p-6 md:p-8">
            <div className="prose prose-teal max-w-none text-gray-700 wrap-break-word overflow-hidden">
              {/* Description from Data */}
              <div className="mb-8 [&_img]:max-w-full [&_img]:h-auto [&_iframe]:max-w-full [&_video]:max-w-full">
                <div dangerouslySetInnerHTML={{ __html: job.description }} />
              </div>

              {/* Tasks from Data */}
              {job.tasks && (
                <div className="mb-8 [&_img]:max-w-full [&_img]:h-auto">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Deine Aufgaben</h2>
                  <div dangerouslySetInnerHTML={{ __html: job.tasks }} />
                </div>
              )}

              {/* Requirements from Data */}
              {job.requirements && (
                <div className="mb-8 p-6 bg-teal-50/50 rounded-xl border border-teal-100 [&_img]:max-w-full [&_img]:h-auto">
                  <h2 className="text-xl font-bold text-[#14ad9f] mb-4">Das bringst Du mit</h2>
                  <div dangerouslySetInnerHTML={{ __html: job.requirements }} />
                </div>
              )}

              {/* Benefits from Data */}
              {job.benefits && (
                <div className="mb-8 [&_img]:max-w-full [&_img]:h-auto">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Das bieten wir Dir</h2>
                  <div dangerouslySetInnerHTML={{ __html: job.benefits }} />
                </div>
              )}

              {/* Contact */}
              {job.contactInfo && job.contactInfo.trim().length > 0 ? (
                <div className="bg-teal-50 p-6 rounded-lg border border-teal-100 mt-12 wrap-break-word [&_img]:max-w-full [&_img]:h-auto prose prose-teal max-w-none">
                  <h3 className="text-lg font-bold text-teal-900 mb-4">
                    Kontakt & Ansprechpartner
                  </h3>
                  <div dangerouslySetInnerHTML={{ __html: job.contactInfo }} />
                </div>
              ) : (
                <div className="bg-teal-50 p-6 rounded-lg border border-teal-100 mt-12">
                  <h3 className="text-lg font-bold text-teal-900 mb-2">Du hast Fragen?</h3>
                  <p className="text-teal-700 mb-4">
                    Unser Recruiting-Team steht Dir gerne zur Verfügung.
                  </p>
                  <Button
                    variant="outline"
                    className="bg-white border-teal-200 text-teal-700 hover:bg-teal-100 hover:text-teal-800"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Kontakt aufnehmen
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Gallery Images */}
          {job.galleryImages && job.galleryImages.length > 0 && (
            <div className="bg-white shadow-sm rounded-xl p-6 md:p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Einblicke</h2>
              <GallerySlider images={job.galleryImages} />
            </div>
          )}

          {/* Bottom Apply Button */}
          <div className="bg-white shadow-sm rounded-xl p-6 md:p-8 text-center">
            {applicationMethod === 'external' && externalApplicationUrl ? (
              <a href={externalApplicationUrl} target="_blank" rel="noopener noreferrer">
                <Button className="bg-[#14ad9f] hover:bg-teal-700 text-white px-10 py-6 text-lg shadow-lg">
                  Jetzt bewerben <LinkIcon className="ml-2 w-5 h-5" />
                </Button>
              </a>
            ) : (
              <Link
                href={
                  user
                    ? `/dashboard/user/${user.uid}/career/jobs/${job.id}/apply`
                    : `/?redirect=/dashboard/user/guest/career/jobs/${job.id}/apply`
                }
              >
                <Button className="bg-[#14ad9f] hover:bg-teal-700 text-white px-10 py-6 text-lg shadow-lg">
                  Jetzt bewerben
                </Button>
              </Link>
            )}
          </div>

          {/* Company Info Card */}
          <div className="bg-white shadow-sm rounded-xl p-6 md:p-8">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Left: Logo & Links */}
              <div className="w-full md:w-48 shrink-0 flex flex-col items-center md:items-start text-center md:text-left border-b md:border-b-0 md:border-r border-gray-100 pb-6 md:pb-0 md:pr-6">
                <div className="w-32 h-32 relative mb-4 border border-gray-200 rounded-lg p-2 bg-white flex items-center justify-center">
                  {job.logoUrl ? (
                    <Image
                      src={job.logoUrl}
                      alt={job.companyName}
                      fill
                      className="object-contain p-2"
                    />
                  ) : (
                    <Building2 className="w-12 h-12 text-gray-300" />
                  )}
                </div>
                <Link
                  href={`/companies/${job.companyId}`}
                  className="text-teal-600 hover:underline text-sm font-medium mb-1 flex items-center gap-1"
                >
                  Unternehmensprofil <ArrowLeft className="w-3 h-3 rotate-180" />
                </Link>
                <Link
                  href={`/companies/${job.companyId}?tab=jobs`}
                  className="text-teal-600 hover:underline text-sm font-medium flex items-center gap-1"
                >
                  Jobs: {companyJobCount || 0} <ArrowLeft className="w-3 h-3 rotate-180" />
                </Link>
              </div>

              {/* Right: Content */}
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  <Link
                    href={`/companies/${job.companyId}`}
                    className="hover:text-teal-600 transition-colors"
                  >
                    {job.companyName}
                  </Link>
                </h2>
                <div className="text-gray-600 leading-relaxed mb-4 line-clamp-4">
                  {companyDescription || 'Wir bewirten aus Leidenschaft!'}
                </div>
                <Link
                  href={`/companies/${job.companyId}`}
                  className="text-teal-600 hover:underline font-medium"
                >
                  Weiterlesen
                </Link>
              </div>
            </div>
          </div>

          {/* Similar Jobs Section */}
          {similarJobs.length > 0 && (
            <div className="bg-white shadow-sm rounded-xl p-6 md:p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                Bewerber interessierten sich auch für:
              </h2>
              <div className="space-y-4">
                {similarJobs.map(simJob => (
                  <div
                    key={simJob.id}
                    className="bg-white border border-gray-100 rounded-lg p-4 hover:shadow-md transition-shadow flex gap-4"
                  >
                    {/* Left: Logo */}
                    <div className="w-20 h-20 shrink-0 border border-gray-100 rounded-lg p-1 bg-white flex items-center justify-center overflow-hidden">
                      <Link
                        href={`/jobs/${simJob.id}`}
                        className="w-full h-full relative flex items-center justify-center"
                      >
                        {simJob.logoUrl ? (
                          <Image
                            src={simJob.logoUrl}
                            alt={simJob.companyName}
                            fill
                            className="object-contain p-1"
                          />
                        ) : (
                          <Building2 className="w-8 h-8 text-gray-300" />
                        )}
                      </Link>
                    </div>

                    {/* Right: Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <Link href={`/jobs/${simJob.id}`} className="group block">
                          <h3 className="text-lg font-bold text-teal-700 group-hover:text-teal-800 truncate pr-2">
                            {simJob.title}
                          </h3>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-400 hover:text-teal-600 -mt-1 -mr-2"
                        >
                          <Star className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="text-gray-600 italic text-sm mb-2">
                        <em>{simJob.companyName}</em>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-gray-500 mt-2">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span>{simJob.location}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{jobTypeMap[simJob.type] || simJob.type}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(simJob.postedAt).toLocaleDateString('de-DE')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Jobfinder CTA */}
          <div className="bg-teal-50 rounded-lg p-8 border border-teal-100">
            <h2 className="text-xl font-bold text-teal-900 mb-6">Passende Jobs per Mail:</h2>
            <div className="flex flex-col md:flex-row gap-4 items-start">
              <div className="flex-1 w-full">
                <input
                  type="email"
                  placeholder="Deine E-Mail-Adresse"
                  defaultValue={user?.email || ''}
                  className="w-full px-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
                <div className="mt-3 text-xs text-gray-500">
                  Es gelten unsere{' '}
                  <Link href="/terms" className="underline hover:text-teal-600">
                    Nutzungsbedingungen
                  </Link>
                  . Lies hier unsere{' '}
                  <Link href="/privacy" className="underline hover:text-teal-600">
                    Datenschutzerklärung
                  </Link>
                  .
                </div>
              </div>
              <Button className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-6 text-lg w-full md:w-auto whitespace-nowrap">
                Jobfinder erstellen
              </Button>
            </div>
          </div>

          {/* Further Links */}
          <div className="bg-white shadow-sm rounded-xl p-6 md:p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              Weitere interessante Jobs für
            </h2>

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-8">
                <div className="w-32 font-medium text-gray-900 shrink-0">Bereich</div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/jobs?category=kitchen"
                    className="text-gray-600 hover:text-teal-600 hover:underline"
                  >
                    Küche / Produktion
                  </Link>
                  <span className="text-gray-300">|</span>
                  <Link
                    href="/jobs?category=service"
                    className="text-gray-600 hover:text-teal-600 hover:underline"
                  >
                    Service
                  </Link>
                  <span className="text-gray-300">|</span>
                  <Link
                    href="/jobs?category=management"
                    className="text-gray-600 hover:text-teal-600 hover:underline"
                  >
                    Management
                  </Link>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-8">
                <div className="w-32 font-medium text-gray-900 shrink-0">Ort</div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/jobs?location=München"
                    className="text-gray-600 hover:text-teal-600 hover:underline"
                  >
                    München
                  </Link>
                  <span className="text-gray-300">|</span>
                  <Link
                    href="/jobs?location=Berlin"
                    className="text-gray-600 hover:text-teal-600 hover:underline"
                  >
                    Berlin
                  </Link>
                  <span className="text-gray-300">|</span>
                  <Link
                    href="/jobs?location=Hamburg"
                    className="text-gray-600 hover:text-teal-600 hover:underline"
                  >
                    Hamburg
                  </Link>
                  <span className="text-gray-300">|</span>
                  <Link
                    href="/jobs?location=Österreich"
                    className="text-gray-600 hover:text-teal-600 hover:underline"
                  >
                    Österreich
                  </Link>
                  <span className="text-gray-300">|</span>
                  <Link
                    href="/jobs?location=Schweiz"
                    className="text-gray-600 hover:text-teal-600 hover:underline"
                  >
                    Schweiz
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
