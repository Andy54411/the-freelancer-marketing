'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Calendar, Clock, ArrowLeft, Share2, Printer, Star, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { JobPosting } from '@/types/career';
import { useJobFavorites } from '@/hooks/useJobFavorites';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface JobDetailClientProps {
  job: JobPosting;
}

export default function JobDetailClient({ job }: JobDetailClientProps) {
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useJobFavorites(job.id);

  const backHref = user ? `/dashboard/user/${user.uid}/career/jobs` : '/jobs';

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link in die Zwischenablage kopiert');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      {/* Top Navigation / Breadcrumb */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            href={backHref}
            className="flex items-center text-gray-600 hover:text-teal-600 transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zurück zur Ergebnisliste
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Job ID: {job.id}</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          {/* Header Section */}
          <div className="p-6 md:p-8 border-b border-gray-100">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              {/* Company Logo */}
              <div className="w-24 h-24 md:w-32 md:h-32 relative border border-gray-100 rounded-lg p-2 shrink-0 bg-white">
                <Image src={job.logoUrl} alt={job.company} fill className="object-contain p-2" />
              </div>

              {/* Title & Meta */}
              <div className="flex-1">
                <div className="text-teal-600 font-medium mb-1">{job.company}</div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">{job.title}</h1>

                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    {job.location}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-gray-400" />
                    {job.type}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    {job.date}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3 w-full md:w-auto">
                {job.externalLink ? (
                  <Button
                    asChild
                    className="bg-teal-600 hover:bg-teal-700 text-white w-full md:w-auto"
                  >
                    <a href={job.externalLink} target="_blank" rel="noopener noreferrer">
                      Jetzt bewerben
                    </a>
                  </Button>
                ) : (
                  <Button className="bg-teal-600 hover:bg-teal-700 text-white w-full md:w-auto">
                    Bewerbung starten
                  </Button>
                )}
                <div className="flex gap-2 justify-center md:justify-end">
                  <Button
                    variant="outline"
                    size="icon"
                    className="text-gray-500 hover:text-teal-600"
                    onClick={handleShare}
                    title="Link kopieren"
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
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
          <div className="p-6 md:p-8">
            {/* Hero Image (Placeholder) */}
            <div className="w-full h-64 md:h-80 bg-gray-100 rounded-lg mb-8 relative overflow-hidden">
              <Image
                src={`https://source.unsplash.com/1200x600/?restaurant,kitchen,chef&sig=${job.id}`}
                alt="Job Environment"
                fill
                className="object-cover"
                unoptimized // For unsplash source
              />
              {/* Fallback if unsplash fails or for static export */}
              <div className="absolute inset-0 flex items-center justify-center text-gray-400 bg-gray-200">
                <span className="text-lg">Arbeitsumgebung</span>
              </div>
            </div>

            {/* Job Description Content */}
            <div className="prose prose-teal max-w-none text-gray-700">
              {/* Introduction */}
              <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Über uns</h2>
                <p className="leading-relaxed">
                  {job.company} sucht Verstärkung! Werde Teil unseres Teams in {job.location}. Wir
                  stehen für Qualität, Leidenschaft und Gastfreundschaft.
                </p>
              </div>

              {/* Description from Data */}
              <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Stellenbeschreibung</h2>
                <div dangerouslySetInnerHTML={{ __html: job.description }} />
              </div>

              {/* Requirements (Mocked Structure if not in data) */}
              <div className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Das bringst Du mit</h2>
                <ul className="space-y-2 list-disc pl-5">
                  <li>Abgeschlossene Berufsausbildung oder vergleichbare Erfahrung</li>
                  <li>Leidenschaft für den Beruf und Liebe zum Detail</li>
                  <li>Teamfähigkeit, Zuverlässigkeit und Flexibilität</li>
                  <li>Gute Deutschkenntnisse</li>
                </ul>
              </div>

              {/* Benefits (Mocked) */}
              <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Das bieten wir Dir</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckIcon className="w-3 h-3 text-teal-600" />
                    </div>
                    <span>Attraktive Vergütung & Zuschläge</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckIcon className="w-3 h-3 text-teal-600" />
                    </div>
                    <span>Flexible Arbeitszeiten</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckIcon className="w-3 h-3 text-teal-600" />
                    </div>
                    <span>Weiterbildungsmöglichkeiten</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckIcon className="w-3 h-3 text-teal-600" />
                    </div>
                    <span>Mitarbeiterrabatte</span>
                  </div>
                </div>
              </div>

              {/* Contact */}
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
