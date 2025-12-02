'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { doc, getDoc, collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import {
  MapPin,
  Globe,
  Mail,
  Phone,
  Clock,
  Calendar,
  Briefcase,
  ChevronRight,
  Star,
  Share2,
  ArrowLeft,
  Monitor,
  Bell,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Header from '@/components/Header';

interface CompanyData {
  id: string;
  companyName: string;
  description?: string;
  logoUrl?: string;
  headerImageUrl?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  zip?: string;
  country?: string;
  employeeCount?: string;
  foundedYear?: string;
  industry?: string;
  socialMedia?: {
    linkedin?: string;
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
}

interface JobData {
  id: string;
  title: string;
  location: string;
  type: string; // full-time, part-time, etc.
  createdAt: any;
  department?: string;
}

export default function CompanyProfilePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const companyId = params.id as string;

  const [company, setCompany] = useState<CompanyData | null>(null);
  const [jobs, setJobs] = useState<JobData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('about');

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchData = async () => {
      if (!companyId) return;

      try {
        setLoading(true);

        // Fetch Company Data
        const companyDoc = await getDoc(doc(db, 'companies', companyId));
        if (companyDoc.exists()) {
          const data = companyDoc.data();
          setCompany({
            id: companyDoc.id,
            companyName: data.companyName || data.firmenname || 'Unbekanntes Unternehmen',
            description: data.description,
            logoUrl:
              data.logoUrl ||
              data.profilePictureURL ||
              data.profilbildUrl ||
              data.companyLogo ||
              data.photoURL ||
              data.step3?.profilePictureURL,
            headerImageUrl:
              data.headerImageUrl ||
              data.profileBannerImage ||
              data.step3?.profileBannerImage ||
              data.bannerUrl ||
              data.coverUrl,
            website: data.website,
            email: data.email,
            phone: data.phone,
            address: data.address,
            city: data.city,
            zip: data.postalCode || data.zip,
            country: data.country,
            employeeCount: data.employeeCount,
            foundedYear: data.foundedYear,
            industry: data.industry,
            socialMedia: data.socialMedia,
          });

          // Fetch Jobs
          // Assuming jobs are in a subcollection 'jobs' or 'jobPostings'
          // Or a top level collection with companyId
          // Based on instructions: "Company-based subcollections (ALWAYS USE)"
          // So likely: companies/{companyId}/jobs

          const jobsRef = collection(db, 'companies', companyId, 'jobs');
          // Note: orderBy might require an index, so we might need to be careful or catch errors
          // For now, let's just get them.
          const jobsSnapshot = await getDocs(jobsRef);

          const jobsList: JobData[] = jobsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          })) as JobData[];

          setJobs(jobsList);
        }
      } catch (error) {
        console.error('Error fetching company profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [companyId]);

  if (loading) {
    return <CompanyProfileSkeleton />;
  }

  if (!company) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Unternehmen nicht gefunden</h1>
          <p className="text-gray-500 mt-2">
            Das gesuchte Unternehmen existiert nicht oder wurde entfernt.
          </p>
          <Link href="/">
            <Button className="mt-4" variant="outline">
              Zurück zur Startseite
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <div className="bg-white border-b border-gray-200">
        <Header />
      </div>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 relative z-10">
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          {/* Company Header Info */}
          <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6 items-center">
            <div className="w-24 h-24 md:w-32 md:h-32 bg-white border border-gray-200 shadow-sm overflow-hidden relative shrink-0 flex items-center justify-center">
              {company.logoUrl ? (
                <img
                  src={company.logoUrl}
                  alt={company.companyName}
                  className="w-full h-full object-contain p-2"
                />
              ) : (
                <div className="text-4xl font-bold text-gray-300">
                  {company.companyName.charAt(0)}
                </div>
              )}
            </div>

            <div className="flex-1 w-full">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-[#003366] mb-2">
                    {company.companyName}
                  </h1>
                  {company.website && (
                    <a
                      href={
                        company.website.startsWith('http')
                          ? company.website
                          : `https://${company.website}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-600 hover:text-[#003366] flex items-center gap-2 text-sm"
                    >
                      <Monitor className="w-4 h-4" />
                      {company.website.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                  <Button className="flex-1 md:flex-none bg-[#86B848] hover:bg-[#75a33e] text-white font-medium px-6">
                    <Bell className="w-4 h-4 mr-2" />
                    Aktuelle Jobs per E-Mail
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="border-t border-gray-200">
            <Tabs value={activeTab} className="w-full" onValueChange={setActiveTab}>
              <div className="px-6 md:px-8">
                <TabsList className="h-14 bg-transparent p-0 space-x-8">
                  <TabsTrigger
                    value="about"
                    className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-[#003366] data-[state=active]:text-[#003366] data-[state=active]:shadow-none px-0 text-base font-medium text-gray-600 hover:text-[#003366]"
                  >
                    Über das Unternehmen
                  </TabsTrigger>
                  <TabsTrigger
                    value="jobs"
                    className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-[#003366] data-[state=active]:text-[#003366] data-[state=active]:shadow-none px-0 text-base font-medium text-gray-600 hover:text-[#003366]"
                  >
                    Jobs <span className="ml-2 text-gray-500">({jobs.length})</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="bg-gray-50 p-6 md:p-8 min-h-[400px]">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Main Content Area (Left 2/3) */}
                  <div className="lg:col-span-2 space-y-8">
                    <TabsContent
                      value="about"
                      className="mt-0 space-y-8 animate-in fade-in-50 duration-300"
                    >
                      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 md:p-8">
                          <h2 className="text-xl font-semibold text-gray-900 mb-4">Über uns</h2>
                          <div className="prose prose-teal max-w-none text-gray-600">
                            {company.description ? (
                              <div
                                dangerouslySetInnerHTML={{
                                  __html: company.description.replace(/\n/g, '<br/>'),
                                }}
                              />
                            ) : (
                              <p className="italic text-gray-400">Keine Beschreibung verfügbar.</p>
                            )}
                          </div>
                        </div>

                        <div className="border-t border-gray-100 p-6 md:p-8">
                          <h2 className="text-xl font-semibold text-gray-900 mb-4">Kontakt</h2>
                          <div className="space-y-3 text-gray-600">
                            <div className="font-medium text-gray-900">{company.companyName}</div>
                            {company.address && <div>{company.address}</div>}
                            {(company.zip || company.city) && (
                              <div>{[company.zip, company.city].filter(Boolean).join(' ')}</div>
                            )}
                            {company.country && <div>{company.country}</div>}

                            <div className="pt-4 space-y-2">
                              {company.phone && (
                                <div className="flex items-center gap-2">
                                  <Phone className="w-4 h-4 text-gray-400" />
                                  <a href={`tel:${company.phone}`} className="hover:text-teal-600">
                                    {company.phone}
                                  </a>
                                </div>
                              )}
                              {company.email && (
                                <div className="flex items-center gap-2">
                                  <Mail className="w-4 h-4 text-gray-400" />
                                  <a
                                    href={`mailto:${company.email}`}
                                    className="hover:text-teal-600"
                                  >
                                    {company.email}
                                  </a>
                                </div>
                              )}
                              {company.website && (
                                <div className="flex items-center gap-2">
                                  <Globe className="w-4 h-4 text-gray-400" />
                                  <a
                                    href={
                                      company.website.startsWith('http')
                                        ? company.website
                                        : `https://${company.website}`
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:text-teal-600"
                                  >
                                    Webseite besuchen
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="jobs" className="mt-0 animate-in fade-in-50 duration-300">
                      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                          <h2 className="text-xl font-semibold text-gray-900">Offene Stellen</h2>
                          <div className="text-sm text-gray-500">{jobs.length} Jobs gefunden</div>
                        </div>

                        {jobs.length > 0 ? (
                          <div className="divide-y divide-gray-100">
                            {jobs.map(job => (
                              <div
                                key={job.id}
                                className="block p-6 hover:bg-gray-50 transition-colors group relative"
                              >
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h3 className="text-lg font-medium text-teal-700 group-hover:text-teal-800 mb-1">
                                      <Link href={`/jobs/${job.id}`} className="focus:outline-none">
                                        <span className="absolute inset-0" aria-hidden="true" />
                                        {job.title}
                                      </Link>
                                    </h3>
                                    <div className="flex flex-wrap gap-4 text-sm text-gray-500 mt-2 relative z-10">
                                      <div className="flex items-center gap-1">
                                        <MapPin className="w-3.5 h-3.5" />
                                        <Link
                                          href={`/jobs?location=${encodeURIComponent(job.location)}`}
                                          className="hover:text-teal-600 hover:underline"
                                        >
                                          {job.location}
                                        </Link>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5" />
                                        {job.type === 'full-time'
                                          ? 'Vollzeit'
                                          : job.type === 'part-time'
                                            ? 'Teilzeit'
                                            : job.type}
                                      </div>
                                      {job.createdAt && (
                                        <div className="flex items-center gap-1">
                                          <Calendar className="w-3.5 h-3.5" />
                                          {new Date(
                                            job.createdAt.seconds * 1000
                                          ).toLocaleDateString('de-DE')}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-teal-600 transition-colors" />
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-12 text-center text-gray-500">
                            <Briefcase className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                            <p>Aktuell sind keine offenen Stellen ausgeschrieben.</p>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </div>

                  {/* Sidebar (Right 1/3) */}
                  <div className="lg:col-span-1 space-y-6">
                    {/* Mini Job List (Always visible or only on About tab?) */}
                    {/* Based on HTML, it seems to be visible on the right side */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                      <div className="p-4 border-b border-gray-100 bg-gray-50">
                        <h3 className="font-semibold text-gray-900">Aktuelle Jobs</h3>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {jobs.slice(0, 5).map(job => (
                          <Link
                            key={job.id}
                            href={`/jobs/${job.id}`}
                            className="block p-4 hover:bg-gray-50 transition-colors"
                          >
                            <div className="font-medium text-teal-700 text-sm mb-1 truncate">
                              {job.title}
                            </div>
                            <div className="text-xs text-gray-500 flex justify-between">
                              <span>{job.location}</span>
                              <span>{job.type === 'full-time' ? 'VZ' : 'TZ'}</span>
                            </div>
                          </Link>
                        ))}
                        {jobs.length === 0 && (
                          <div className="p-4 text-sm text-gray-500 text-center">
                            Keine Jobs verfügbar
                          </div>
                        )}
                        {jobs.length > 5 && (
                          <button
                            onClick={() => setActiveTab('jobs')}
                            className="w-full p-3 text-sm text-teal-600 font-medium hover:bg-gray-50 text-center block"
                          >
                            Alle {jobs.length} Jobs anzeigen
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Share / Actions */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                      <h3 className="font-semibold text-gray-900 mb-3 text-sm">Teilen</h3>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1">
                          <Share2 className="w-4 h-4 mr-2" />
                          Teilen
                        </Button>
                      </div>
                    </div>

                    {/* Report Content */}
                    <div className="text-right">
                      <button className="text-xs text-gray-400 hover:text-gray-600 flex items-center justify-end gap-1 ml-auto">
                        <span className="w-3 h-3 bg-gray-300 rounded-full flex items-center justify-center text-[8px] text-white font-bold">
                          !
                        </span>
                        Inhalt melden
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}

function CompanyProfileSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <div className="h-48 md:h-64 w-full bg-gray-200 animate-pulse" />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-10">
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6 items-end">
            <Skeleton className="w-32 h-32 rounded-lg" />
            <div className="flex-1 w-full space-y-4">
              <Skeleton className="h-8 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          </div>
          <div className="p-8 space-y-6">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </div>
    </div>
  );
}
