import { db } from '@/firebase/server';
import { JobPosting } from '@/types/career';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  MapPin,
  Clock,
  ArrowLeft,
  CheckCircle,
  Printer,
  Share2,
  Star,
  Building2,
} from 'lucide-react';
import Link from 'next/link';

const jobTypeTranslations: Record<string, string> = {
  'full-time': 'Vollzeit',
  'part-time': 'Teilzeit',
  contract: 'Vertragsbasis',
  freelance: 'Freiberuflich',
  internship: 'Praktikum',
  temporary: 'Aushilfe',
  apprenticeship: 'Ausbildung',
  working_student: 'Werkstudent',
};

export default async function JobDetailsPage({
  params,
}: {
  params: Promise<{ uid: string; jobId: string }>;
}) {
  const { uid, jobId } = await params;

  if (!db) {
    return <div>Database Error</div>;
  }

  // Fetch Job
  let job: JobPosting | null = null;

  // 1. Try Firestore Global Collection
  let jobDoc = await db.collection('jobs').doc(jobId).get();

  // 2. If not found, try Subcollections via Collection Group
  if (!jobDoc.exists) {
    const querySnapshot = await db.collectionGroup('jobs').where('id', '==', jobId).limit(1).get();
    if (!querySnapshot.empty) {
      jobDoc = querySnapshot.docs[0];
    }
  }

  if (jobDoc.exists) {
    job = { id: jobDoc.id, ...jobDoc.data() } as JobPosting;
  }

  if (!job) {
    notFound();
  }

  // Check if user has profile
  const profileDoc = await db
    .collection('users')
    .doc(uid)
    .collection('candidate_profile')
    .doc('main')
    .get();
  const _hasProfile = profileDoc.exists;

  // Check if already applied
  const applicationQuery = await db
    .collection('users')
    .doc(uid)
    .collection('job_applications')
    .where('jobId', '==', jobId)
    .get();

  const hasApplied = !applicationQuery.empty;

  // Fetch Similar Jobs (Real Data)
  const similarJobsSnapshot = await db
    .collection('jobs')
    .where('status', '==', 'active')
    .limit(4)
    .get();

  const similarJobs = similarJobsSnapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }) as JobPosting)
    .filter(j => j.id !== jobId)
    .slice(0, 3);

  // Fetch Company Details for "Company Info" section
  let companyDescription = '';
  let companyJobCount = 0;
  let applicationMethod = 'taskilo';
  let externalApplicationUrl = '';

  if (job.companyId) {
    try {
      const companyDoc = await db.collection('companies').doc(job.companyId).get();
      if (companyDoc.exists) {
        const data = companyDoc.data();
        companyDescription = data?.description || '';
        applicationMethod = data?.applicationMethod || 'taskilo';
        externalApplicationUrl = data?.externalApplicationUrl || '';
      }

      const jobsQuery = await db
        .collectionGroup('jobs')
        .where('companyId', '==', job.companyId)
        .where('status', '==', 'active')
        .count()
        .get();
      companyJobCount = jobsQuery.data().count;
    } catch (e) {
      console.error('Error fetching company details:', e);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-10 font-sans">
      {/* Top Navigation / Breadcrumb */}
      <div className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 h-12 flex items-center justify-between text-sm">
          <Link
            href={`/dashboard/user/${uid}/career/jobs`}
            className="inline-flex items-center text-gray-600 hover:text-teal-600 transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück zur Ergebnisliste
          </Link>
          <div className="text-gray-500">
            Stellenangebot <span className="font-bold text-gray-900">1</span> von{' '}
            <span className="font-bold text-gray-900">161</span>
          </div>
        </div>
      </div>

      {/* Job Header */}
      <div className="bg-white shadow-sm mb-6">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <Link href="#" className="text-lg text-gray-500 hover:text-teal-600 mb-1 block">
                {job.companyName}
              </Link>
              <h1 className="text-3xl font-bold text-[#14ad9f] mb-3">{job.title}</h1>
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" /> {job.location}
                </span>
                <span className="flex items-center gap-1 capitalize">
                  <Building2 className="h-4 w-4" /> {jobTypeTranslations[job.type] || job.type}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" /> {new Date(job.postedAt).toLocaleDateString('de-DE')}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              {hasApplied ? (
                <div className="bg-green-50 text-green-700 px-6 py-2 rounded-md flex items-center justify-center gap-2 border border-green-200">
                  <CheckCircle className="h-5 w-5" />
                  <span>Bereits beworben</span>
                </div>
              ) : applicationMethod === 'external' && externalApplicationUrl ? (
                <a
                  href={externalApplicationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full md:w-auto"
                >
                  <Button className="w-full md:w-auto bg-teal-600 hover:bg-teal-700 text-white font-semibold px-8">
                    Bewerbung starten <Share2 className="ml-2 h-4 w-4" />
                  </Button>
                </a>
              ) : (
                <Link
                  href={`/dashboard/user/${uid}/career/jobs/${jobId}/apply`}
                  className="w-full md:w-auto"
                >
                  <Button className="w-full md:w-auto bg-teal-600 hover:bg-teal-700 text-white font-semibold px-8">
                    Bewerbung starten
                  </Button>
                </Link>
              )}
              <div className="flex gap-2">
                <Link href={`/companies/${job.companyId}`}>
                  <Button variant="outline" size="icon" title="Unternehmensprofil">
                    <Building2 className="h-4 w-4" />
                  </Button>
                </Link>
                <Button variant="outline" size="icon" title="Drucken">
                  <Printer className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" title="Merken">
                  <Star className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-5xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Job Description */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="overflow-hidden border-none shadow-sm">
            {/* Header Image Placeholder */}
            <div className="h-64 bg-gray-200 w-full relative overflow-hidden">
              <img
                src={
                  job.headerImageUrl ||
                  'https://api.cvmanager.ch/images/uploads/279e972b-7b40-43d4-8a7d-423315bb4206.jpg'
                }
                alt="Job Header"
                className="w-full h-full object-cover"
                style={{ objectPosition: `center ${job.headerImagePositionY ?? 50}%` }}
              />
            </div>

            <CardContent className="p-8 space-y-8 text-gray-700 leading-relaxed">
              {/* Introduction */}
              <div id="introduction" dangerouslySetInnerHTML={{ __html: job.description }} />

              {/* Tasks */}
              {job.tasks ? (
                <div id="tasks" dangerouslySetInnerHTML={{ __html: job.tasks }} />
              ) : (
                <div id="tasks">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Deine Aufgaben</h2>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Zubereitung und Ausgabe unserer Speisen</li>
                    <li>Betreuung unserer Gäste mit einem Lächeln</li>
                    <li>Mitarbeit im täglichen Ablauf</li>
                    <li>Sicherstellen einer sauberen und angenehmen Arbeitsumgebung</li>
                    <li>Unterstützung bei der Eröffnung und Weiterentwicklung des Outlets</li>
                  </ul>
                </div>
              )}

              {/* Profile / Requirements */}
              <div id="profile">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Was du mitbringst</h2>
                {job.requirements ? (
                  <div dangerouslySetInnerHTML={{ __html: job.requirements }} />
                ) : (
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Freude an der Arbeit mit Lebensmitteln</li>
                    <li>Teamgeist, Zuverlässigkeit und Begeisterung</li>
                    <li>Qualitätsbewusstsein und ein Auge fürs Detail</li>
                    <li>Ausbildung oder Erfahrung im relevanten Bereich</li>
                  </ul>
                )}
              </div>

              {/* Benefits */}
              <div id="benefits">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Wir bieten dir</h2>
                {job.benefits ? (
                  <div dangerouslySetInnerHTML={{ __html: job.benefits }} />
                ) : (
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Ein engagiertes und herzliches Team</li>
                    <li>Ein kreatives Arbeitsumfeld mit viel Gestaltungsspielraum</li>
                    <li>Sonntag und Feiertag geschlossen</li>
                    <li>Moderne Arbeitsbedingungen</li>
                    <li>Entwicklungsmöglichkeiten</li>
                  </ul>
                )}
              </div>

              {/* Contact */}
              <div id="contact_container" className="pt-8 border-t">
                {job.contactInfo ? (
                  <div dangerouslySetInnerHTML={{ __html: job.contactInfo }} />
                ) : (
                  <>
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Kontakt</h2>
                    <p className="mb-2">
                      Fühlst Du dich von unserem Konzept angesprochen und bist für deine nächste
                      Herausforderung?
                    </p>
                    <p className="mb-4">
                      Dann sende uns jetzt deine Bewerbung. Wir freuen uns darauf, dich kennenlernen
                      zu dürfen.
                    </p>

                    <div className="font-medium">
                      <strong>{job.companyName}</strong>
                      <br />
                      Musterstraße 123
                      <br />
                      <span className="postalcode">12345</span> {job.location}
                      <br />
                      <div className="job_section mt-4">
                        <br />
                        <a
                          href="#"
                          rel="noreferrer noopener"
                          target="_blank"
                          className="text-teal-600 hover:underline"
                        >
                          www.{job.companyName.toLowerCase().replace(/\s+/g, '')}.ch
                        </a>
                      </div>
                      <br />
                      <div className="job_section" id="contact_fields"></div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>

            {/* Bottom CTA */}
            <div className="bg-gray-50 p-6 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex gap-2">
                <Button variant="outline" size="icon" title="Merken">
                  <Star className="h-4 w-4" />
                </Button>
              </div>
              {hasApplied ? (
                <div className="bg-green-50 text-green-700 px-6 py-2 rounded-md flex items-center justify-center gap-2 border border-green-200">
                  <CheckCircle className="h-5 w-5" />
                  <span>Bereits beworben</span>
                </div>
              ) : applicationMethod === 'external' && externalApplicationUrl ? (
                <a
                  href={externalApplicationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto"
                >
                  <Button className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 text-white font-semibold px-8">
                    Bewerbung starten <Share2 className="ml-2 h-4 w-4" />
                  </Button>
                </a>
              ) : (
                <Link
                  href={`/dashboard/user/${uid}/career/jobs/${jobId}/apply`}
                  className="w-full sm:w-auto"
                >
                  <Button className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 text-white font-semibold px-8">
                    Bewerbung starten
                  </Button>
                </Link>
              )}
            </div>
          </Card>

          {/* Company Info Card (New) */}
          <Card className="overflow-hidden border-none shadow-sm p-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Left: Logo & Links */}
              <div className="w-full md:w-48 shrink-0 flex flex-col items-center md:items-start text-center md:text-left border-b md:border-b-0 md:border-r border-gray-100 pb-6 md:pb-0 md:pr-6">
                <div className="w-32 h-32 relative mb-4 border border-gray-200 rounded-lg p-2 bg-white flex items-center justify-center">
                  {job.logoUrl ? (
                    <img
                      src={job.logoUrl}
                      alt={job.companyName}
                      className="max-w-full max-h-full object-contain"
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
                  Jobs: {companyJobCount} <ArrowLeft className="w-3 h-3 rotate-180" />
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
          </Card>
        </div>

        {/* Right Column: Sidebar / Similar Jobs */}
        <div className="space-y-6">
          {/* Company Info Box */}
          <Card className="border-none shadow-sm">
            <CardContent className="p-6">
              <h3 className="font-bold text-lg mb-2">{job.companyName}</h3>
              <Link
                href={`/companies/${job.companyId}`}
                className="text-teal-600 hover:underline text-sm flex items-center gap-1 mb-4"
              >
                Unternehmensprofil <ArrowLeft className="h-3 w-3 rotate-180" />
              </Link>
              <p className="text-sm text-gray-600">
                Hier könnte ein kurzer Text über das Unternehmen stehen. {job.companyName} ist ein
                führender Anbieter in seiner Branche.
              </p>
            </CardContent>
          </Card>

          {/* Similar Jobs */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="font-bold text-gray-900 mb-4">Bewerber interessierten sich auch für:</h3>
            <div className="space-y-4">
              {similarJobs.map(simJob => (
                <Link
                  key={simJob.id}
                  href={`/dashboard/user/${uid}/career/jobs/${simJob.id}`}
                  className="block group"
                >
                  <div className="flex gap-3">
                    <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center shrink-0">
                      <Building2 className="h-6 w-6 text-gray-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 group-hover:text-teal-600 transition-colors line-clamp-2">
                        {simJob.title}
                      </h4>
                      <div className="text-sm text-gray-500 mt-1">{simJob.companyName}</div>
                      <div className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                        <span>{simJob.location}</span>
                        <span>•</span>
                        <span>{jobTypeTranslations[simJob.type] || simJob.type}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Job Alert CTA */}
          <div className="bg-teal-50 rounded-lg p-6 border border-teal-100">
            <h3 className="font-bold text-teal-900 mb-2">Passende Jobs per Mail:</h3>
            <p className="text-sm text-teal-700 mb-4">
              Lassen Sie sich benachrichtigen, wenn neue Jobs wie dieser verfügbar sind.
            </p>
            <Button
              variant="outline"
              className="w-full border-teal-600 text-teal-700 hover:bg-teal-100"
            >
              Jobfinder erstellen
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
