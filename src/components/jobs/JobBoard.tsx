'use client';

import React, { useEffect, useState } from 'react';
import { JobFilterSidebar } from './JobFilterSidebar';
import { JobCard } from './JobCard';
import { MOCK_JOBS, Job } from '@/lib/mock-jobs';
import { Mail, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/firebase/clients';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

// Mock Data extracted from the user's HTML
// const MOCK_JOBS removed - imported from lib

export function JobBoard() {
  const { user } = useAuth();
  const [allJobs, setAllJobs] = useState<Job[]>([]); // Raw fetch
  const [userFilters, setUserFilters] = useState<any>(null); // Firestore prefs
  const [sidebarFilters, setSidebarFilters] = useState<Record<string, string[]>>({}); // Local clicks
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJobsAndFilters = async () => {
      setLoading(true);
      try {
        // 1. Fetch User Filters
        if (user?.uid) {
          const filterDoc = await getDoc(doc(db, 'users', user.uid, 'preferences', 'jobboard'));
          if (filterDoc.exists()) {
            setUserFilters(filterDoc.data());
          }
        }

        // 2. Fetch Jobs (Try Firestore first, fallback to Mock if empty/error)
        let fetchedJobs: Job[] = [];
        try {
          const jobsSnapshot = await getDocs(
            query(collection(db, 'jobs'), where('status', '==', 'active'), orderBy('postedAt', 'desc'), limit(50))
          );
          if (!jobsSnapshot.empty) {
            fetchedJobs = jobsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job));
          }
        } catch (e) {
          console.log('Firestore jobs fetch failed or empty, using mock data', e);
        }

        if (fetchedJobs.length === 0) {
          fetchedJobs = MOCK_JOBS;
        }

        setAllJobs(fetchedJobs);

      } catch (error) {
        console.error('Error loading job board:', error);
        setAllJobs(MOCK_JOBS); // Fallback
      } finally {
        setLoading(false);
      }
    };

    fetchJobsAndFilters();
  }, [user]);

  // 1. Apply User Filters (Firestore) -> Base Jobs
  const baseJobs = React.useMemo(() => {
    let jobs = allJobs;
    if (userFilters) {
      jobs = jobs.filter(job => {
        // Location Filter
        if (userFilters.location && !job.location.toLowerCase().includes(userFilters.location.toLowerCase())) {
          return false;
        }
        
        // Search Phrase
        if (userFilters.searchPhrase) {
          const phrase = userFilters.searchPhrase.toLowerCase();
          const matches = 
            job.title.toLowerCase().includes(phrase) || 
            job.description.toLowerCase().includes(phrase) ||
            job.company.toLowerCase().includes(phrase);
          if (!matches) return false;
        }
        return true;
      });
    }
    return jobs;
  }, [allJobs, userFilters]);

  // 2. Apply Sidebar Filters -> Displayed Jobs
  const displayedJobs = React.useMemo(() => {
    let jobs = baseJobs;
    
    // Helper to parse German date DD.MM.YYYY
    const parseDate = (dateStr: string) => {
      const [day, month, year] = dateStr.split('.').map(Number);
      return new Date(year, month - 1, day);
    };
    const now = new Date();

    // Filter by Sidebar selections
    if (sidebarFilters.location?.length) {
      jobs = jobs.filter(job => sidebarFilters.location.includes(job.location.split(',')[0].trim()));
    }
    if (sidebarFilters.type?.length) {
      jobs = jobs.filter(job => {
        const types = job.type.split(',').map(t => t.trim());
        return sidebarFilters.type.some(t => types.includes(t));
      });
    }
    if (sidebarFilters.industry?.length) {
      jobs = jobs.filter(job => job.industry && sidebarFilters.industry.includes(job.industry));
    }
    if (sidebarFilters.jobGroup?.length) {
      jobs = jobs.filter(job => job.jobGroup && sidebarFilters.jobGroup.includes(job.jobGroup));
    }
    if (sidebarFilters.date?.length) {
      jobs = jobs.filter(job => {
        if (!job.date) return false;
        try {
          const jobDate = parseDate(job.date);
          const diffTime = Math.abs(now.getTime() - jobDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          return sidebarFilters.date.some(filter => {
            if (filter === '< 3 Tage') return diffDays < 3;
            if (filter === '3 - 7 Tage') return diffDays >= 3 && diffDays <= 7;
            if (filter === '7 - 14 Tage') return diffDays > 7 && diffDays <= 14;
            if (filter === '2 - 4 Wochen') return diffDays > 14 && diffDays <= 28;
            if (filter === '> 4 Wochen') return diffDays > 28;
            return false;
          });
        } catch { return false; }
      });
    }

    return jobs;
  }, [baseJobs, sidebarFilters]);

  const handleSidebarFilterChange = (category: string, value: string) => {
    setSidebarFilters(prev => {
      const current = prev[category] || [];
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [category]: updated };
    });
  };

  const handleClearFilters = () => {
    setUserFilters(null);
    setSidebarFilters({});
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Column: Filters */}
        <div className="w-full lg:w-1/4">
          <JobFilterSidebar 
            jobs={baseJobs} // Pass baseJobs so counts reflect all possibilities within user prefs
            activeFilters={sidebarFilters}
            onFilterChange={handleSidebarFilterChange}
            onClearFilters={handleClearFilters}
          />
        </div>

        {/* Right Column: Results */}
        <div className="w-full lg:w-3/4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
            <p className="text-lg text-gray-700">
              {(userFilters || Object.keys(sidebarFilters).length > 0) ? 'Gefilterte Suche' : 'Alle Jobs'}: <span className="font-bold text-teal-600">{displayedJobs.length}</span> Treffer
            </p>
            <Button className="bg-teal-600 hover:bg-teal-700 text-white">
              <Mail className="w-4 h-4 mr-2" />
              Passende Jobs per Mail
            </Button>
          </div>

          {/* Job List */}
          <div className="space-y-4">
            {displayedJobs.length > 0 ? (
              displayedJobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))
            ) : (
              <div className="text-center py-12 border rounded-lg bg-gray-50">
                <h3 className="text-lg font-medium text-gray-900">Keine Jobs gefunden</h3>
                <p className="text-gray-500 mt-1">
                  Versuchen Sie es mit weniger Filtern.
                </p>
              </div>
            )}
          </div>

          {/* Pagination */}
          <div className="mt-8 flex justify-between items-center border-t border-gray-200 pt-4">
            <div className="text-sm text-gray-600">
              <span className="font-bold text-gray-900">25</span> | <span className="cursor-pointer hover:text-teal-600">50</span> Jobs pro Seite
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">1 von 1</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
