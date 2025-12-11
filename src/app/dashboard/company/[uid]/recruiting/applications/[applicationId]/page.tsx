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
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { ApplicationStatusSelect } from './ApplicationStatusSelect';
import { ApplicationChat } from './ApplicationChat';
import { ApplicationNotes } from './ApplicationNotes';
// import PrintablePdfAttachment from './PrintablePdfAttachment'; // Disabled due to webpack issues

import { PrintButton } from './PrintButton';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
  let sourcePath = '';

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
      sourcePath = appDoc.ref.path;
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
        @page { 
          size: A4; 
          margin: 20mm 15mm 20mm 15mm;
        }
        
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        
        body { 
          background: white !important; 
          color: #1a1a1a !important; 
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif !important;
          font-size: 10pt !important;
          line-height: 1.5 !important;
        }
        
        /* Hide UI Chrome */
        .no-print, header, nav, aside, .fixed, button, .print\\:hidden { 
          display: none !important; 
        }
        
        /* Reset Layout */
        .print-container { display: block !important; width: 100% !important; }
        .lg\\:col-span-2, .lg\\:grid-cols-3 { 
          width: 100% !important; 
          display: block !important; 
          grid-template-columns: none !important; 
        }
        
        /* Remove Card Styling */
        .rounded-lg, .rounded-md, .rounded-xl { border-radius: 0 !important; }
        .shadow, .shadow-sm, .shadow-md { box-shadow: none !important; }
        .bg-card, .bg-background, .bg-muted { background: transparent !important; }
        
        /* ===== HEADER SECTION ===== */
        .print-header {
          display: flex !important;
          align-items: flex-start !important;
          gap: 20px !important;
          padding-bottom: 15px !important;
          border-bottom: 3px solid #14ad9f !important;
          margin-bottom: 20px !important;
        }
        
        .print-avatar { 
          display: block !important; 
          width: 80px !important; 
          height: 80px !important; 
          border-radius: 50% !important;
          border: 3px solid #14ad9f !important;
          overflow: hidden !important;
          flex-shrink: 0 !important;
          background: #f0f0f0 !important;
        }
        .print-avatar img { 
          width: 100% !important; 
          height: 100% !important; 
          object-fit: cover !important; 
        }
        
        .print-header-info {
          flex: 1 !important;
        }
        
        .print-header-info h1 {
          font-size: 22pt !important;
          font-weight: 700 !important;
          color: #1a1a1a !important;
          margin: 0 0 5px 0 !important;
          line-height: 1.2 !important;
        }
        
        .print-header-info .job-title {
          font-size: 12pt !important;
          color: #14ad9f !important;
          font-weight: 600 !important;
          margin-bottom: 10px !important;
        }
        
        .print-contact-row {
          display: flex !important;
          flex-wrap: wrap !important;
          gap: 20px !important;
          font-size: 9pt !important;
          color: #444 !important;
        }
        
        .print-contact-item {
          display: flex !important;
          align-items: center !important;
          gap: 5px !important;
        }
        
        .print-contact-item strong {
          color: #1a1a1a !important;
        }
        
        /* ===== SECTION STYLES ===== */
        .print-section {
          margin-bottom: 20px !important;
          page-break-inside: avoid !important;
        }
        
        .print-section-title {
          font-size: 13pt !important;
          font-weight: 700 !important;
          color: #14ad9f !important;
          border-bottom: 2px solid #14ad9f !important;
          padding-bottom: 5px !important;
          margin-bottom: 12px !important;
          text-transform: uppercase !important;
          letter-spacing: 0.5px !important;
        }
        
        /* Card Headers in Print */
        h2, .text-2xl, [class*="CardTitle"] { 
          font-size: 13pt !important; 
          font-weight: 700 !important;
          color: #14ad9f !important;
          border-bottom: 2px solid #14ad9f !important;
          padding-bottom: 5px !important;
          margin-bottom: 12px !important;
          margin-top: 20px !important;
        }
        
        h3, .text-lg { 
          font-size: 11pt !important; 
          font-weight: 600 !important; 
          color: #1a1a1a !important;
          margin-bottom: 3px !important;
        }
        
        p, div, span, a { 
          font-size: 10pt !important; 
          line-height: 1.5 !important; 
          color: #333 !important; 
        }
        
        .text-muted-foreground { color: #555 !important; }
        
        /* ===== EXPERIENCE & EDUCATION ENTRIES ===== */
        .print-entry {
          margin-bottom: 15px !important;
          padding-left: 15px !important;
          border-left: 3px solid #e0e0e0 !important;
        }
        
        .print-entry-header {
          display: flex !important;
          justify-content: space-between !important;
          align-items: baseline !important;
          margin-bottom: 3px !important;
        }
        
        .print-entry-title {
          font-size: 11pt !important;
          font-weight: 600 !important;
          color: #1a1a1a !important;
        }
        
        .print-entry-date {
          font-size: 9pt !important;
          color: #666 !important;
          font-style: italic !important;
        }
        
        .print-entry-subtitle {
          font-size: 10pt !important;
          color: #14ad9f !important;
          font-weight: 500 !important;
          margin-bottom: 5px !important;
        }
        
        .print-entry-description {
          font-size: 9pt !important;
          color: #444 !important;
          line-height: 1.4 !important;
        }
        
        /* ===== BADGES & TAGS ===== */
        .badge, [class*="Badge"] { 
          display: inline-block !important;
          border: 1px solid #14ad9f !important; 
          color: #14ad9f !important; 
          background: transparent !important;
          padding: 2px 8px !important;
          border-radius: 3px !important;
          font-size: 8pt !important;
          margin: 2px !important;
        }
        
        /* ===== SKILLS SECTION ===== */
        .print-skills {
          display: flex !important;
          flex-wrap: wrap !important;
          gap: 8px !important;
        }
        
        /* ===== HIDE ELEMENTS ===== */
        .lucide { display: none !important; }
        .absolute.w-0.5 { display: none !important; }
        .rounded-full:not(.print-avatar) { display: none !important; }
        
        /* Timeline Reset */
        .pl-6, .ml-6 { margin-left: 0 !important; padding-left: 0 !important; }
        
        /* Page Breaks */
        .break-inside-avoid { 
          break-inside: avoid !important; 
          page-break-inside: avoid !important; 
        }
        .break-before-page { 
          break-before: page !important; 
          page-break-before: always !important; 
        }
        
        /* Links */
        a { text-decoration: none !important; color: #333 !important; }
        
        /* ===== FOOTER ===== */
        .print-footer {
          position: fixed !important;
          bottom: 0 !important;
          left: 0 !important;
          right: 0 !important;
          text-align: center !important;
          font-size: 8pt !important;
          color: #999 !important;
          padding-top: 10px !important;
          border-top: 1px solid #e0e0e0 !important;
        }
      `}</style>

      {/* Header Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between w-full print:mb-0">
        {/* Screen Header */}
        <div className="flex items-start gap-4 flex-1 print:hidden">
          <Link href={`/dashboard/company/${uid}/recruiting/applications`}>
            <Button
              variant="outline"
              size="icon"
              className="border-[#14ad9f]/30 bg-[#14ad9f]/5 hover:bg-[#14ad9f]/10"
            >
              <ArrowLeft className="h-4 w-4 text-[#14ad9f]" />
            </Button>
          </Link>
          
          {/* Profile Picture */}
          <Avatar className="h-16 w-16 border-2 border-[#14ad9f]/30 shrink-0">
            <AvatarImage 
              src={profile.profilePictureUrl || personalData.profilePictureUrl} 
              alt={`${profile.firstName} ${profile.lastName}`}
            />
            <AvatarFallback className="bg-[#14ad9f]/10 text-[#14ad9f] text-xl font-semibold">
              {profile.firstName?.[0]}{profile.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {profile.firstName} {profile.lastName}
            </h1>
            <p className="text-muted-foreground">
              Bewerbung als{' '}
              <span className="font-medium text-foreground">{jobTitle}</span>
            </p>
          </div>
        </div>
        
        {/* Print Header - Professional Layout */}
        <div className="hidden print:flex print-header">
          {/* Profile Picture for Print */}
          {(profile.profilePictureUrl || personalData.profilePictureUrl) && (
            <div className="print-avatar">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={profile.profilePictureUrl || personalData.profilePictureUrl} 
                alt={`${profile.firstName} ${profile.lastName}`}
              />
            </div>
          )}
          
          <div className="print-header-info">
            <h1>{profile.firstName} {profile.lastName}</h1>
            <div className="job-title">Bewerbung als {jobTitle}</div>
            <div className="print-contact-row">
              <div className="print-contact-item">
                <strong>E-Mail:</strong> {profile.email}
              </div>
              {(profile.phone || personalData.phone) && (
                <div className="print-contact-item">
                  <strong>Tel:</strong> {profile.phone || personalData.phone}
                </div>
              )}
              {(profile.city || personalData.city) && (
                <div className="print-contact-item">
                  <strong>Ort:</strong> {profile.zip || personalData.zip} {profile.city || personalData.city}
                </div>
              )}
              {personalData.birthDate && (
                <div className="print-contact-item">
                  <strong>Geb.:</strong> {new Date(personalData.birthDate).toLocaleDateString('de-DE')}
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

      {/* Print Date */}
      <div className="hidden print:block text-right text-xs text-gray-500 mb-4">
        Ausgedruckt am {format(new Date(), 'dd.MM.yyyy', { locale: de })}
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

          {/* Interview Details */}
          {(application.status === 'interview' || application.status === 'interview_accepted') && (
             <Card className="break-inside-avoid print:shadow-none print:border-0 print:p-0 border-[#14ad9f]/50 bg-[#14ad9f]/5">
              <CardHeader className="print:px-0 print:py-0 print:mb-2">
                <CardTitle className="flex items-center gap-2 print:text-lg print:border-b print:border-black print:pb-1 text-[#14ad9f]">
                  <Calendar className="h-5 w-5" /> Interview-Einladung
                </CardTitle>
              </CardHeader>
              <CardContent className="print:px-0 space-y-4">
                {application.interviewMessage && (
                   <div className="bg-white/50 p-4 rounded-lg border border-[#14ad9f]/20">
                      <h4 className="font-semibold mb-2 text-sm">Nachricht an Bewerber:</h4>
                      <div className="text-sm" dangerouslySetInnerHTML={{ __html: application.interviewMessage }} />
                   </div>
                )}

                {application.isVideoCall && (
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                      <h4 className="font-semibold text-blue-700 text-sm">Video-Call Interview</h4>
                    </div>
                    {application.videoLink ? (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-blue-900">Link:</span>
                        <a href={application.videoLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate max-w-[300px]">
                          {application.videoLink}
                        </a>
                      </div>
                    ) : (
                      <p className="text-sm text-blue-600">Link wird noch bereitgestellt</p>
                    )}
                  </div>
                )}
                
                <div>
                  <h4 className="font-semibold mb-2 text-sm">Vorgeschlagene Termine:</h4>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {application.interviewSlots?.map((slot: any, i: number) => {
                       let date: Date;
                       try {
                         if (typeof slot === 'string') {
                           date = new Date(slot);
                         } else if (typeof slot === 'object' && slot.date) {
                           // Handle legacy object format
                           date = new Date(slot.date);
                           if (slot.time) {
                             const [hours, minutes] = slot.time.split(':').map(Number);
                             date.setHours(hours, minutes);
                           }
                         } else {
                           return null;
                         }
                         
                         if (isNaN(date.getTime())) return null;
                       } catch { return null; }

                       const isAccepted = application.acceptedSlot === (typeof slot === 'string' ? slot : JSON.stringify(slot)) || 
                                        (application.acceptedSlot && typeof slot === 'string' && new Date(application.acceptedSlot).getTime() === date.getTime());

                       return (
                        <div key={i} className={`p-3 rounded-lg border text-center text-sm ${
                          isAccepted
                            ? 'bg-[#14ad9f] text-white border-[#14ad9f]' 
                            : 'bg-white border-gray-200'
                        }`}>
                          <div className="font-medium">{format(date, 'dd.MM.yyyy', { locale: de })}</div>
                          <div>{format(date, 'HH:mm', { locale: de })} Uhr</div>
                          {isAccepted && (
                            <div className="mt-1 text-xs font-bold bg-white/20 rounded px-1">Bestätigt</div>
                          )}
                        </div>
                       );
                    })}
                  </div>
                </div>

                {application.status === 'interview_accepted' && application.acceptedSlot && (
                   <div className="flex items-center gap-2 text-green-600 font-medium bg-green-50 p-3 rounded-lg border border-green-200">
                      <Clock className="h-4 w-4" />
                      Termin bestätigt für: {(() => {
                        try {
                          const date = new Date(application.acceptedSlot);
                          return !isNaN(date.getTime()) 
                            ? format(date, 'dd.MM.yyyy HH:mm', { locale: de }) 
                            : 'Ungültiges Datum';
                        } catch {
                          return 'Ungültiges Datum';
                        }
                      })()} Uhr
                   </div>
                )}
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
                          {exp.certificateUrl && (
                            <a
                              href={exp.certificateUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-sm text-[#14ad9f] hover:underline print:hidden"
                            >
                              <FileText className="h-4 w-4" />
                              Arbeitszeugnis herunterladen
                            </a>
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
                          {edu.certificateUrl && (
                            <a
                              href={edu.certificateUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-sm text-[#14ad9f] hover:underline print:hidden"
                            >
                              <FileText className="h-4 w-4" />
                              Zeugnis herunterladen
                            </a>
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
                    <div className="flex-1">
                      <h4 className="font-semibold print:text-sm">{qual.name}</h4>
                      <div className="text-sm text-muted-foreground print:text-black print:text-xs">
                        {qual.issuer} {qual.date && `• ${qual.date}`}
                      </div>
                      {qual.certificateUrl && (
                        <a
                          href={qual.certificateUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm text-[#14ad9f] hover:underline mt-1 print:hidden"
                        >
                          <Download className="h-4 w-4" />
                          Zertifikat herunterladen
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Chat Section */}
          <div className="print:hidden">
            <ApplicationChat 
              applicationId={application.id}
              companyId={uid}
              applicantId={application.applicantId}
              applicantName={`${profile.firstName} ${profile.lastName}`}
            />
          </div>
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

          {/* Internal Notes */}
          <ApplicationNotes
            applicationId={application.id}
            companyId={uid}
            initialNotes={application.internalNotes || ''}
          />

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
              {/* Priorität: Bewerbungsdaten > Profildaten */}
              {(application.salaryExpectation || profile.salaryExpectation) && (
                <div className="flex items-start gap-3 print:block">
                  <Euro className="h-4 w-4 text-[#14ad9f] mt-1 print:hidden" />
                  <div>
                    <p className="text-sm font-medium print:inline-block print:w-32 print:text-xs">
                      Gehaltsvorstellung:
                    </p>
                    <p className="text-sm text-muted-foreground print:inline-block print:text-black print:text-xs">
                      {(application.salaryExpectation?.amount || profile.salaryExpectation?.amount) || '-'}{' '}
                      {(application.salaryExpectation?.currency || profile.salaryExpectation?.currency) || 'EUR'} /{' '}
                      {(application.salaryExpectation?.period || profile.salaryExpectation?.period) || '-'}
                    </p>
                  </div>
                </div>
              )}
              {(application.noticePeriod || profile.noticePeriod) && (
                <div className="flex items-start gap-3 print:block">
                  <Clock className="h-4 w-4 text-[#14ad9f] mt-1 print:hidden" />
                  <div>
                    <p className="text-sm font-medium print:inline-block print:w-32 print:text-xs">
                      Kündigungsfrist:
                    </p>
                    <p className="text-sm text-muted-foreground print:inline-block print:text-black print:text-xs">
                      {(application.noticePeriod?.duration || profile.noticePeriod?.duration) || '-'}
                      {(application.noticePeriod?.timing || profile.noticePeriod?.timing) && 
                        ` (${application.noticePeriod?.timing || profile.noticePeriod?.timing})`}
                    </p>
                  </div>
                </div>
              )}
              {application.earliestStartDate && (
                <div className="flex items-start gap-3 print:block">
                  <Calendar className="h-4 w-4 text-[#14ad9f] mt-1 print:hidden" />
                  <div>
                    <p className="text-sm font-medium print:inline-block print:w-32 print:text-xs">
                      Frühester Start:
                    </p>
                    <p className="text-sm text-muted-foreground print:inline-block print:text-black print:text-xs">
                      {new Date(application.earliestStartDate).toLocaleDateString('de-DE')}
                    </p>
                  </div>
                </div>
              )}
              {!application.salaryExpectation && !profile.salaryExpectation && 
               !application.noticePeriod && !profile.noticePeriod && 
               !application.earliestStartDate && (
                <p className="text-sm text-muted-foreground italic">Keine Angaben vorhanden.</p>
              )}
            </CardContent>
          </Card>

          {/* Attachments List - Hidden in Print (shown at bottom instead) */}
          <Card className="break-inside-avoid print:hidden">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Download className="h-4 w-4 text-[#14ad9f]" /> Anhänge
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {application.attachments && application.attachments.length > 0 ? (
                application.attachments.map((att, i) => (
                  <div
                    key={i}
                    data-pdf-url={att.url}
                    data-pdf-name={att.name}
                  >
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center p-3 rounded-md border hover:bg-[#14ad9f]/5 hover:border-[#14ad9f]/30 transition-all group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate group-hover:text-[#14ad9f] transition-colors">
                          {att.name}
                        </p>
                        <p className="text-xs text-muted-foreground">{att.type || 'Dokument'}</p>
                      </div>
                      <Download className="h-4 w-4 text-[#14ad9f] opacity-0 group-hover:opacity-100 transition-opacity" />
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

      {/* PRINT ONLY: Attachment Summary (No full pages for PDFs) */}
      {application.attachments && application.attachments.length > 0 && (
        <div className="hidden print:block print:mt-8 print:border-t print:border-gray-300 print:pt-4">
          <h2 className="text-sm font-bold mb-2 text-[#14ad9f]">ANHÄNGE</h2>
          <p className="text-xs text-gray-600 mb-2">
            Folgende Dokumente wurden mit der Bewerbung eingereicht:
          </p>
          <ul className="text-xs space-y-1">
            {application.attachments.map((att, i) => (
              <li key={`print-att-list-${i}`} className="flex items-center gap-2">
                <span className="text-[#14ad9f]">•</span>
                <span className="font-medium">{att.name}</span>
                <span className="text-gray-500">({att.type || 'Dokument'})</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-gray-500 mt-2 italic">
            Die Dokumente können im Online-Portal heruntergeladen werden.
          </p>
        </div>
      )}
    </div>
  );
}
