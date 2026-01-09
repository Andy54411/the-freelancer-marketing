import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MapPin, Calendar, Clock, ArrowLeft, Share2, Printer, Star } from 'lucide-react';
import Link from 'next/link';
import { GallerySlider } from '@/components/ui/gallery-slider';

interface JobPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: any; // Using any for form values to avoid strict type matching issues with partial data
  companyName: string;
  companyId?: string;
}

export function JobPreviewDialog({
  open,
  onOpenChange,
  data,
  companyName,
  companyId,
}: JobPreviewDialogProps) {
  // Mock date for preview
  const postedDate = new Date().toLocaleDateString('de-DE');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle>Vorschau der Stellenanzeige</DialogTitle>
          <DialogDescription>So wird die Anzeige für Bewerber aussehen.</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 bg-gray-100">
          <div className="min-h-full pb-10 font-sans">
            {/* Top Navigation / Breadcrumb Mock */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
              <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
                <div className="flex items-center text-gray-600 text-sm font-medium cursor-not-allowed">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Zurück zur Ergebnisliste
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Vorschau Modus</span>
                </div>
              </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-8">
              <div className="bg-white shadow-sm rounded-lg overflow-hidden">
                {/* Header Image if available */}
                {data.headerImageUrl && (
                  <div className="h-64 w-full relative bg-gray-100">
                    <img
                      src={data.headerImageUrl}
                      alt="Job Header"
                      className="w-full h-full object-cover"
                      style={{ objectPosition: `center ${data.headerImagePositionY ?? 50}%` }}
                    />
                  </div>
                )}

                {/* Header Section */}
                <div className="p-6 md:p-8 border-b border-gray-100">
                  <div className="flex flex-col md:flex-row gap-6 items-start">
                    {/* Company Logo Placeholder */}
                    <div className="w-24 h-24 md:w-32 md:h-32 relative border border-gray-100 rounded-lg p-2 shrink-0 bg-white flex items-center justify-center overflow-hidden">
                      {data.logoUrl ? (
                        <img
                          src={data.logoUrl}
                          alt={companyName}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="text-4xl font-bold text-gray-300">
                          {companyName.charAt(0)}
                        </div>
                      )}
                    </div>

                    {/* Title & Meta */}
                    <div className="flex-1">
                      {companyId ? (
                        <Link
                          href={`/companies/${companyId}`}
                          target="_blank"
                          className="text-teal-600 font-medium mb-1 hover:underline inline-block"
                        >
                          {companyName}
                        </Link>
                      ) : (
                        <div className="text-teal-600 font-medium mb-1">{companyName}</div>
                      )}
                      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                        {data.title || 'Stellentitel'}
                      </h1>

                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          {data.location ? (
                            <Link
                              href={`/jobs?location=${encodeURIComponent(data.location)}`}
                              className="hover:text-teal-600 hover:underline transition-colors"
                              target="_blank"
                            >
                              {data.location}
                            </Link>
                          ) : (
                            'Standort'
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-gray-400" />
                          {data.type === 'full-time'
                            ? 'Vollzeit'
                            : data.type === 'part-time'
                              ? 'Teilzeit'
                              : data.type === 'contract'
                                ? 'Befristet'
                                : data.type === 'freelance'
                                  ? 'Freelance'
                                  : data.type === 'internship'
                                    ? 'Praktikum'
                                    : data.type}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {postedDate}
                        </div>
                      </div>
                    </div>

                    {/* Actions Mock */}
                    <div className="flex flex-col gap-3 w-full md:w-auto opacity-50 pointer-events-none">
                      <Button className="bg-teal-600 text-white w-full md:w-auto">
                        Bewerbung starten
                      </Button>
                      <div className="flex gap-2 justify-center md:justify-end">
                        <Button variant="outline" size="icon">
                          <Share2 className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="icon">
                          <Printer className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="icon">
                          <Star className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main Content Area */}
                <div className="p-6 md:p-8">
                  {/* Hero Image / Environment */}
                  <div className="w-full h-64 md:h-80 bg-gray-100 rounded-lg mb-8 relative overflow-hidden">
                    {data.headerImageUrl ? (
                      <img
                        src={data.headerImageUrl}
                        alt="Job Environment"
                        className="w-full h-full object-cover"
                        style={{ objectPosition: `center ${data.headerImagePositionY ?? 50}%` }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
                        <span className="text-lg">Arbeitsumgebung (Platzhalter)</span>
                      </div>
                    )}
                  </div>

                  {/* Job Description Content */}
                  <div className="prose prose-teal max-w-none text-gray-700">
                    {/* Description */}
                    <div className="mb-8">
                      {data.description ? (
                        <div dangerouslySetInnerHTML={{ __html: data.description }} />
                      ) : (
                        <p className="text-gray-400 italic">Keine Beschreibung angegeben</p>
                      )}
                    </div>

                    {/* Tasks */}
                    {data.tasks && (
                      <div className="mb-8">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Deine Aufgaben</h2>
                        <div dangerouslySetInnerHTML={{ __html: data.tasks }} />
                      </div>
                    )}

                    {/* Requirements */}
                    {data.requirements && (
                      <div className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-100">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Das bringst Du mit</h2>
                        <div dangerouslySetInnerHTML={{ __html: data.requirements }} />
                      </div>
                    )}

                    {/* Benefits */}
                    {data.benefits && (
                      <div className="mb-8">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Das bieten wir Dir</h2>
                        <div dangerouslySetInnerHTML={{ __html: data.benefits }} />
                      </div>
                    )}

                    {/* Gallery Images */}
                    {data.galleryImages && data.galleryImages.length > 0 && (
                      <div className="mb-12 mt-12">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Einblicke</h2>
                        <GallerySlider images={data.galleryImages} />
                      </div>
                    )}

                    {/* Contact */}
                    {data.contactInfo ? (
                      <div className="bg-teal-50 p-6 rounded-lg border border-teal-100 mt-12">
                        <div dangerouslySetInnerHTML={{ __html: data.contactInfo }} />
                      </div>
                    ) : (
                      <div className="bg-teal-50 p-6 rounded-lg border border-teal-100 mt-12">
                        <h3 className="text-lg font-bold text-teal-900 mb-2">Du hast Fragen?</h3>
                        <p className="text-teal-700 mb-4">
                          Unser Recruiting-Team steht Dir gerne zur Verfügung.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="p-4 border-t bg-white flex justify-end gap-4 shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Schließen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
