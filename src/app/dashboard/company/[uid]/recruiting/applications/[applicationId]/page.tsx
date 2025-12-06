import { db } from '@/firebase/server';
import { JobApplication, JobPosting } from '@/types/career';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Download,
  FileText,
  Briefcase,
  GraduationCap,
  Languages,
  Euro,
  Clock,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { ApplicationStatusSelect } from './ApplicationStatusSelect';
// import PrintablePdfAttachment from './PrintablePdfAttachment'; // Disabled due to webpack issues

import { PrintButton } from './PrintButton';

export default async function ApplicationDetailsPage({
  params,
}: {
  params: Promise<{ uid: string; applicationId: string }>;
}) {
  const { uid, applicationId } = await params;

  if (!db) {
    return <div>Database Error</div>;
  }

  let application: JobApplication | null = null;

  try {
    // 1. Try Company Subcollection (camelCase)
    let appDoc = await db
      .collection('companies')
      .doc(uid)
      .collection('jobApplications')
      .doc(applicationId)
      .get();

    // 2. Try Company Subcollection (snake_case)
    if (!appDoc.exists) {
      appDoc = await db
        .collection('companies')
        .doc(uid)
        .collection('job_applications')
        .doc(applicationId)
        .get();
    }

    // 3. Try Collection Group (if not found in company subcollection)
    if (!appDoc.exists) {
      const querySnapshot = await db
        .collectionGroup('job_applications')
        .where('id', '==', applicationId)
        .limit(1)
        .get();
      if (!querySnapshot.empty) {
        appDoc = querySnapshot.docs[0];
      }
    }

    // 4. Try Collection Group camelCase
    if (!appDoc.exists) {
      const querySnapshot = await db
        .collectionGroup('jobApplications')
        .where('id', '==', applicationId)
        .limit(1)
        .get();
      if (!querySnapshot.empty) {
        appDoc = querySnapshot.docs[0];
      }
    }

    if (appDoc.exists) {
      application = { id: appDoc.id, ...appDoc.data() } as JobApplication;
    }
  } catch (error) {
    console.error('Error fetching application:', error);
  }

  if (!application) {
    notFound();
  }

  // Fetch Job Details for context
  let jobTitle = 'Unbekannte Stelle';
  if (application.jobId) {
    try {
      // 1. Try Company Subcollection
      let jobDoc = await db
        .collection('companies')
        .doc(uid)
        .collection('jobs')
        .doc(application.jobId)
        .get();

      // 2. Try Global Collection (Fallback)
      if (!jobDoc.exists) {
        jobDoc = await db.collection('jobs').doc(application.jobId).get();
      }

      if (jobDoc.exists) {
        jobTitle = jobDoc.data()?.title || jobTitle;
      }
    } catch (e) {
      console.error('Error fetching job details:', e);
    }
  }

  const profile = application.applicantProfile;
  const personalData = application.personalData || {};

  return (
    <div className="space-y-6 pb-10 print:p-0 print:space-y-0 print:block">
      <style type="text/css" media="print">{`
        @page { size: A4; margin: 15mm; }
        body { background: white !important; color: #000 !important; font-family: ui-sans-serif, system-ui, sans-serif !important; }
        
        /* Hide UI Chrome */
        .no-print, header, nav, aside, .fixed, button, .print\\:hidden { display: none !important; }
        
        /* Reset Layout */
        .print-container { display: block !important; width: 100% !important; }
        .lg\\:col-span-2, .lg\\:grid-cols-3 { width: 100% !important; display: block !important; grid-template-columns: none !important; }
        
        /* Remove Card Styling */
        .rounded-lg, .rounded-md, .rounded-xl { border-radius: 0 !important; }
        .border, .border-2, .border-b { border: none !important; border-bottom: none !important; }
        .shadow, .shadow-sm, .shadow-md { box-shadow: none !important; }
        .bg-card, .bg-background, .bg-muted { background: transparent !important; }
        
        /* Typography & Spacing */
        h1 { font-size: 24pt !important; line-height: 1.2 !important; margin-bottom: 5mm !important; color: #000 !important; }
        h2, .text-2xl { font-size: 16pt !important; margin-bottom: 3mm !important; color: #000 !important; border-bottom: 1px solid #000 !important; padding-bottom: 1mm !important; margin-top: 8mm !important; }
        h3, .text-lg { font-size: 12pt !important; font-weight: bold !important; margin-bottom: 1mm !important; color: #000 !important; }
        p, div, span, a { font-size: 10pt !important; line-height: 1.4 !important; color: #000 !important; }
        .text-muted-foreground { color: #333 !important; }
        
        /* Specific Elements */
        .badge { border: 1px solid #000 !important; color: #000 !important; padding: 1px 4px !important; }
        a { text-decoration: none !important; color: #000 !important; }
        
        /* Timeline Reset */
        .absolute.w-0.5 { display: none !important; }
        .rounded-full { display: none !important; }
        .pl-6, .ml-6 { margin-left: 0 !important; padding-left: 0 !important; }
        
        /* Page Breaks */
        .break-inside-avoid { break-inside: avoid !important; page-break-inside: avoid !important; margin-bottom: 5mm !important; }
        .break-before-page { break-before: page !important; page-break-before: always !important; display: block !important; }
        
        /* Hide Icons in Print to look cleaner */
        .lucide { display: none !important; }
      `}</style>

      {/* Header Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between w-full print:block print:mb-4">
        <div className="flex items-start gap-4 flex-1 print:block">
          <Link href={`/dashboard/company/${uid}/recruiting/applications`} className="print:hidden">
            <Button
              variant="outline"
              size="icon"
              className="border-[#14ad9f]/30 bg-[#14ad9f]/5 hover:bg-[#14ad9f]/10"
            >
              <ArrowLeft className="h-4 w-4 text-[#14ad9f]" />
            </Button>
          </Link>
          <div className="print:w-full">
            <h1 className="text-2xl font-bold tracking-tight print:text-3xl print:mb-2">
              {profile.firstName} {profile.lastName}
            </h1>
            <p className="text-muted-foreground print:text-base print:text-black print:mb-4">
              Bewerbung als{' '}
              <span className="font-medium text-foreground print:text-black">{jobTitle}</span>
            </p>

            {/* Print-Only Contact Bar */}
            <div className="hidden print:flex print:flex-wrap print:gap-6 print:text-sm print:border-y print:border-black print:py-2 print:mb-6">
              <div className="flex items-center gap-2">
                <span className="font-semibold">Email:</span> {profile.email}
              </div>
              {(profile.phone || personalData.phone) && (
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Tel:</span> {profile.phone || personalData.phone}
                </div>
              )}
              {(profile.city || personalData.city) && (
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Ort:</span> {profile.zip || personalData.zip}{' '}
                  {profile.city || personalData.city}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 print:hidden">
          <PrintButton />
          <ApplicationStatusSelect
            applicationId={application.id}
            currentStatus={application.status}
            companyId={uid}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:block">
        {/* Left Column: Main Info */}
        <div className="lg:col-span-2 space-y-6 min-w-0 print:space-y-6">
          {/* Cover Letter / Message */}
          {(application.coverLetter || application.message) && (
            <Card className="break-inside-avoid print:shadow-none print:border-0 print:p-0">
              <CardHeader className="print:px-0 print:py-0 print:mb-2">
                <CardTitle className="flex items-center gap-2 print:text-lg print:border-b print:border-black print:pb-1">
                  <FileText className="h-5 w-5 text-[#14ad9f]" /> Anschreiben
                </CardTitle>
              </CardHeader>
              <CardContent className="print:px-0">
                <div className="whitespace-pre-wrap break-words break-all text-sm leading-relaxed print:text-sm text-justify">
                  {application.coverLetter || application.message}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Experience */}
          <Card className="break-inside-avoid print:shadow-none print:border-0 print:p-0">
            <CardHeader className="print:px-0 print:py-0 print:mb-2">
              <CardTitle className="flex items-center gap-2 print:text-lg print:border-b print:border-black print:pb-1">
                <Briefcase className="h-5 w-5 text-[#14ad9f]" /> Berufserfahrung
              </CardTitle>
            </CardHeader>
            <CardContent className="relative print:px-0">
              {profile.experience && profile.experience.length > 0 ? (
                <>
                  <div className="absolute left-[29px] top-2 bottom-0 w-0.5 bg-muted print:hidden" />
                  <div className="space-y-0 print:space-y-4">
                    {profile.experience.map((exp, i) => (
                      <div
                        key={i}
                        className="relative flex gap-6 pb-8 last:pb-0 print:pb-0 print:block"
                      >
                        <div className="relative z-10 flex flex-col items-center shrink-0 ml-6 pt-1 print:hidden">
                          <div className="h-4 w-4 rounded-full border-2 border-[#14ad9f] bg-background" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-1 print:flex-row print:justify-between print:mb-1">
                            <h3 className="font-semibold text-lg leading-snug print:text-sm print:font-bold">
                              {exp.title}
                            </h3>
                            <span className="hidden print:inline-block font-medium text-xs">
                              {new Date(exp.startDate).toLocaleDateString('de-DE', {
                                month: 'short',
                                year: 'numeric',
                              })}{' '}
                              -
                              {exp.endDate
                                ? new Date(exp.endDate).toLocaleDateString('de-DE', {
                                    month: 'short',
                                    year: 'numeric',
                                  })
                                : ' Heute'}
                            </span>
                            <Badge
                              variant="outline"
                              className="w-fit mt-1 sm:mt-0 border-[#14ad9f]/50 text-[#14ad9f] print:hidden"
                            >
                              {new Date(exp.startDate).toLocaleDateString('de-DE', {
                                month: 'short',
                                year: 'numeric',
                              })}{' '}
                              -
                              {exp.endDate
                                ? new Date(exp.endDate).toLocaleDateString('de-DE', {
                                    month: 'short',
                                    year: 'numeric',
                                  })
                                : ' Heute'}
                            </Badge>
                          </div>
                          <div className="text-muted-foreground font-medium mb-2 print:text-black print:text-xs print:mb-1">
                            {exp.company} • {exp.location}
                          </div>
                          {exp.description && (
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words break-all mb-2 print:text-black print:text-xs">
                              {exp.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground italic">Keine Berufserfahrung angegeben.</p>
              )}
            </CardContent>
          </Card>

          {/* Education */}
          <Card className="break-inside-avoid print:shadow-none print:border-0 print:p-0">
            <CardHeader className="print:px-0 print:py-0 print:mb-2">
              <CardTitle className="flex items-center gap-2 print:text-lg print:border-b print:border-black print:pb-1">
                <GraduationCap className="h-5 w-5 text-[#14ad9f]" /> Ausbildung
              </CardTitle>
            </CardHeader>
            <CardContent className="relative print:px-0">
              {profile.education && profile.education.length > 0 ? (
                <>
                  <div className="absolute left-[29px] top-2 bottom-0 w-0.5 bg-muted print:hidden" />
                  <div className="space-y-0 print:space-y-4">
                    {profile.education.map((edu, i) => (
                      <div
                        key={i}
                        className="relative flex gap-6 pb-8 last:pb-0 print:pb-0 print:block"
                      >
                        <div className="relative z-10 flex flex-col items-center shrink-0 ml-6 pt-1 print:hidden">
                          <div className="h-4 w-4 rounded-full border-2 border-[#14ad9f] bg-background" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-1 print:flex-row print:justify-between print:mb-1">
                            <h3 className="font-semibold text-lg leading-snug print:text-sm print:font-bold">
                              {edu.degree}
                            </h3>
                            <span className="hidden print:inline-block font-medium text-xs">
                              {new Date(edu.startDate).toLocaleDateString('de-DE', {
                                month: 'short',
                                year: 'numeric',
                              })}{' '}
                              -
                              {edu.endDate
                                ? new Date(edu.endDate).toLocaleDateString('de-DE', {
                                    month: 'short',
                                    year: 'numeric',
                                  })
                                : ' Heute'}
                            </span>
                            <Badge
                              variant="outline"
                              className="w-fit mt-1 sm:mt-0 border-[#14ad9f]/50 text-[#14ad9f] print:hidden"
                            >
                              {new Date(edu.startDate).toLocaleDateString('de-DE', {
                                month: 'short',
                                year: 'numeric',
                              })}{' '}
                              -
                              {edu.endDate
                                ? new Date(edu.endDate).toLocaleDateString('de-DE', {
                                    month: 'short',
                                    year: 'numeric',
                                  })
                                : ' Heute'}
                            </Badge>
                          </div>
                          <div className="text-muted-foreground font-medium mb-2 print:text-black print:text-xs print:mb-1">
                            {edu.institution} • {edu.location}
                          </div>
                          {edu.description && (
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words break-all mb-2 print:text-black print:text-xs">
                              {edu.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground italic">Keine Ausbildung angegeben.</p>
              )}
            </CardContent>
          </Card>

          {/* Qualifications / Certificates */}
          {profile.qualifications && profile.qualifications.length > 0 && (
            <Card className="break-inside-avoid print:shadow-none print:border-0 print:p-0">
              <CardHeader className="print:px-0 print:py-0 print:mb-2">
                <CardTitle className="flex items-center gap-2 print:text-lg print:border-b print:border-black print:pb-1">
                  <FileText className="h-5 w-5 text-[#14ad9f]" /> Zertifikate & Weiterbildungen
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 print:px-0">
                {profile.qualifications.map((qual, i) => (
                  <div
                    key={i}
                    className="flex items-start justify-between border-b last:border-0 pb-4 last:pb-0 print:border-0 print:pb-1"
                  >
                    <div>
                      <h4 className="font-semibold print:text-sm">{qual.name}</h4>
                      <div className="text-sm text-muted-foreground print:text-black print:text-xs">
                        {qual.issuer} {qual.date && `• ${qual.date}`}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Sidebar Info (Moves to bottom in print) */}
        <div className="space-y-6 print:space-y-6">
          {/* Contact Info (Hidden in Print, moved to top) */}
          <Card className="print:hidden">
            <CardHeader>
              <CardTitle className="text-lg">Kontakt</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-[#14ad9f]" />
                <a href={`mailto:${profile.email}`} className="text-sm hover:underline truncate">
                  {profile.email}
                </a>
              </div>
              {(profile.phone || personalData.phone) && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-[#14ad9f]" />
                  <a
                    href={`tel:${profile.phone || personalData.phone}`}
                    className="text-sm hover:underline"
                  >
                    {profile.phone || personalData.phone}
                  </a>
                </div>
              )}
              {(profile.city || personalData.city) && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-[#14ad9f]" />
                  <span className="text-sm">
                    {profile.zip || personalData.zip} {profile.city || personalData.city},{' '}
                    {profile.country || personalData.country}
                  </span>
                </div>
              )}
              {personalData.birthDate && (
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-[#14ad9f]" />
                  <span className="text-sm">
                    Geboren am {new Date(personalData.birthDate).toLocaleDateString('de-DE')}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Skills & Languages */}
          <Card className="break-inside-avoid print:shadow-none print:border-0 print:p-0">
            <CardHeader className="print:px-0 print:py-0 print:mb-2">
              <CardTitle className="text-lg print:text-lg print:border-b print:border-black print:pb-1">
                Qualifikationen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 print:px-0">
              {/* Skills */}
              <div>
                <h4 className="text-sm font-semibold mb-3 print:text-sm print:mb-1">Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {profile.skills && profile.skills.length > 0 ? (
                    profile.skills.map((skill, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="border-[#14ad9f]/30 bg-[#14ad9f]/5 text-[#14ad9f] hover:bg-[#14ad9f]/10 print:border print:border-gray-400 print:text-black print:bg-transparent print:text-xs"
                      >
                        {skill}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </div>
              </div>

              <Separator className="print:hidden" />

              {/* Languages */}
              <div className="print:mt-4">
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 print:text-sm print:mb-1">
                  <Languages className="h-4 w-4 text-[#14ad9f] print:hidden" /> Sprachen
                </h4>
                <div className="space-y-2">
                  {profile.languages && profile.languages.length > 0 ? (
                    profile.languages.map((lang, i) => (
                      <div
                        key={i}
                        className="flex justify-between text-sm print:justify-start print:gap-8"
                      >
                        <span className="font-medium print:text-xs">{lang.language}</span>
                        <span className="text-muted-foreground print:text-black print:text-xs">
                          {lang.level}
                        </span>
                      </div>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Expectations */}
          <Card className="break-inside-avoid print:shadow-none print:border-0 print:p-0">
            <CardHeader className="print:px-0 print:py-0 print:mb-2">
              <CardTitle className="text-lg print:text-lg print:border-b print:border-black print:pb-1">
                Rahmenbedingungen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 print:px-0">
              {profile.salaryExpectation && (
                <div className="flex items-start gap-3 print:block">
                  <Euro className="h-4 w-4 text-[#14ad9f] mt-1 print:hidden" />
                  <div>
                    <p className="text-sm font-medium print:inline-block print:w-32 print:text-xs">
                      Gehaltsvorstellung:
                    </p>
                    <p className="text-sm text-muted-foreground print:inline-block print:text-black print:text-xs">
                      {profile.salaryExpectation.amount} {profile.salaryExpectation.currency} /{' '}
                      {profile.salaryExpectation.period}
                    </p>
                  </div>
                </div>
              )}
              {profile.noticePeriod && (
                <div className="flex items-start gap-3 print:block">
                  <Clock className="h-4 w-4 text-[#14ad9f] mt-1 print:hidden" />
                  <div>
                    <p className="text-sm font-medium print:inline-block print:w-32 print:text-xs">
                      Kündigungsfrist:
                    </p>
                    <p className="text-sm text-muted-foreground print:inline-block print:text-black print:text-xs">
                      {profile.noticePeriod.duration} ({profile.noticePeriod.timing})
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attachments List */}
          <Card className="break-inside-avoid print:shadow-none print:border-0 print:p-0">
            <CardHeader className="print:px-0 print:py-0 print:mb-2">
              <CardTitle className="text-lg flex items-center gap-2 print:text-lg print:border-b print:border-black print:pb-1">
                <Download className="h-4 w-4 text-[#14ad9f] print:hidden" /> Anhänge
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 print:px-0">
              {application.attachments && application.attachments.length > 0 ? (
                application.attachments.map((att, i) => (
                  <div
                    key={i}
                    className="print:mb-1"
                    data-pdf-url={att.url}
                    data-pdf-name={att.name}
                  >
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center p-3 rounded-md border hover:bg-[#14ad9f]/5 hover:border-[#14ad9f]/30 transition-all group print:border-0 print:p-0 print:block"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate group-hover:text-[#14ad9f] transition-colors print:text-black print:text-xs">
                          • {att.name} ({att.type || 'Dokument'})
                        </p>
                      </div>
                      <Download className="h-4 w-4 text-[#14ad9f] opacity-0 group-hover:opacity-100 transition-opacity print:hidden" />
                    </a>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground italic">Keine Anhänge vorhanden.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* PRINT ONLY: Full Page Attachments */}
      <div className="hidden print:block">
        {application.attachments?.map((att, i) => (
          <div
            key={`print-att-${i}`}
            className="break-before-page w-full min-h-screen flex flex-col bg-white"
          >
            <h2 className="text-lg font-bold mb-4 border-b pb-2 mt-8 print:block">
              Anhang: {att.name}
            </h2>

            {/* Image Handling - Prints natively */}
            {att.type?.includes('image') || att.name.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
              <div className="flex-1 flex items-start justify-center p-4">
                <img
                  src={att.url}
                  className="max-w-full max-h-[90vh] object-contain border border-gray-200"
                  alt={att.name}
                />
              </div>
            ) : (
              /* PDF Platzhalter für Download */
              <div
                className="w-full min-h-screen flex items-center justify-center"
                data-pdf-url={att.url}
                data-pdf-name={att.name}
              >
                <div className="text-center p-8 bg-gray-50 border border-gray-200 rounded">
                  <FileText className="h-16 w-16 text-gray-400 mb-4 mx-auto" />
                  <p className="text-lg font-bold mb-2">PDF-Dokument: {att.name}</p>
                  <p className="text-gray-600 mb-4">
                    PDF wird beim Drucken automatisch heruntergeladen.
                  </p>
                  <a
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline text-sm"
                  >
                    Datei manuell öffnen
                  </a>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
