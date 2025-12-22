'use client';

import React, { useEffect, useState } from 'react';
import { JobFilterSidebar } from './JobFilterSidebar';
import { JobSearchHeader } from './JobSearchHeader';
import { JobCard } from './JobCard';
import { JobPosting } from '@/types/career';
import { Mail, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/firebase/clients';
import { findCategoryBySubcategory } from '@/lib/categoriesData';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  collectionGroup,
} from 'firebase/firestore';
import { useSearchParams } from 'next/navigation';
import { GERMAN_CITIES } from '@/lib/cityCoordinates';
import { useGoogleMaps } from '@/contexts/GoogleMapsLoaderContext';

function getCoordinates(cityName: string) {
  const normalized = cityName.toLowerCase().trim();
  // Try exact match first
  let city = GERMAN_CITIES.find(c => c.name.toLowerCase() === normalized);

  // If not found, try to find if the input is part of a city name (e.g. "Frankfurt" -> "Frankfurt am Main")
  if (!city) {
    city = GERMAN_CITIES.find(c => c.name.toLowerCase().includes(normalized));
  }
  return city;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

// Mock Data removed

export function JobBoard() {
  const { user } = useAuth();
  const { isLoaded, google } = useGoogleMaps();
  const searchParams = useSearchParams();
  const urlLocation = searchParams.get('location');
  const searchWhat = searchParams.get('what');
  const searchWhere = searchParams.get('where');
  const radiusParam = searchParams.get('radius');

  const [allJobs, setAllJobs] = useState<JobPosting[]>([]); // Raw fetch
  const [userFilters, setUserFilters] = useState<any>(null); // Firestore prefs
  const [sidebarFilters, setSidebarFilters] = useState<Record<string, string[]>>({}); // Local clicks
  const [loading, setLoading] = useState(true);
  const [searchCoords, setSearchCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Effect to geocode search location
  useEffect(() => {
    const geocodeLocation = async () => {
      if (!searchWhere) {
        setSearchCoords(null);
        return;
      }

      // 1. Try local lookup first (faster, cheaper, works without API key)
      const localCity = getCoordinates(searchWhere);
      if (localCity) {
        setSearchCoords({ lat: localCity.lat, lng: localCity.lng });
        return;
      }

      if (!isLoaded || !google) {
        // setSearchCoords(null); // Don't reset if we are waiting for google
        return;
      }

      try {
        const geocoder = new google.maps.Geocoder();
        const result = await geocoder.geocode({ address: searchWhere });
        if (result.results && result.results[0]) {
          const loc = result.results[0].geometry.location;
          setSearchCoords({ lat: loc.lat(), lng: loc.lng() });
        }
      } catch (e) {
        console.warn('Geocoding failed (API Key restriction?), falling back to text search', e);
        setSearchCoords(null);
      }
    };

    geocodeLocation();
  }, [searchWhere, isLoaded, google]);

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

        // 2. Fetch Jobs (Real Data Only)
        let fetchedJobs: JobPosting[] = [];
        try {
          // Use collectionGroup to query across all 'jobs' subcollections
          const jobsSnapshot = await getDocs(
            query(
              collectionGroup(db, 'jobs'),
              where('status', '==', 'active'),
              orderBy('postedAt', 'desc'),
              limit(50)
            )
          );
          if (!jobsSnapshot.empty) {
            fetchedJobs = jobsSnapshot.docs.map(doc => {
              const data = doc.data();
              return {
                id: doc.id,
                ...data,
                // Convert Firestore Timestamps to ISO strings
                createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
                postedAt: data.postedAt?.toDate?.()?.toISOString() || data.postedAt,
                updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
              } as JobPosting;
            });
          }
        } catch (e) {
          console.error('Firestore jobs fetch failed', e);
        }

        setAllJobs(fetchedJobs);
      } catch (error) {
        console.error('Error loading job board:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchJobsAndFilters();
  }, [user]);

  // 1. Apply User Filters (Firestore) -> Base Jobs
  const baseJobs = React.useMemo(() => {
    let jobs = allJobs;

    // URL Search Params (Highest Priority)
    if (searchWhere) {
      const whereLower = searchWhere.toLowerCase().trim();
      const radius = parseInt(radiusParam || '0', 10);

      if (radius > 0 && searchCoords) {
        jobs = jobs.filter(job => {
          // 1. Try using stored coordinates (New Jobs)
          if (job.coordinates) {
            const dist = calculateDistance(
              searchCoords.lat,
              searchCoords.lng,
              job.coordinates.lat,
              job.coordinates.lng
            );
            return dist <= radius;
          }

          // 2. Try using static list (Old Jobs / Fallback)
          const jobCoords = getCoordinates(job.location);
          if (jobCoords) {
            const dist = calculateDistance(
              searchCoords.lat,
              searchCoords.lng,
              jobCoords.lat,
              jobCoords.lng
            );
            return dist <= radius;
          }

          // 3. Fallback: String match (No radius support)
          return job.location && job.location.toLowerCase().includes(whereLower);
        });
      } else {
        // Exact match (radius 0 or undefined)
        jobs = jobs.filter(job => job.location && job.location.toLowerCase().includes(whereLower));
      }
    } else if (urlLocation) {
      const locLower = urlLocation.toLowerCase().trim();
      jobs = jobs.filter(job => job.location && job.location.toLowerCase().includes(locLower));
    }

    if (searchWhat) {
      const phrase = searchWhat.toLowerCase().trim();
      jobs = jobs.filter(
        job =>
          job.title.toLowerCase().includes(phrase) ||
          job.companyName.toLowerCase().includes(phrase) ||
          job.description.toLowerCase().includes(phrase) ||
          (job.tasks && job.tasks.toLowerCase().includes(phrase)) ||
          (job.requirements && job.requirements.toLowerCase().includes(phrase))
      );
    }

    if (userFilters) {
      jobs = jobs.filter(job => {
        // Location Filter (only if not already filtered by URL)
        if (
          !urlLocation &&
          !searchWhere &&
          userFilters.location &&
          !job.location.toLowerCase().includes(userFilters.location.toLowerCase())
        ) {
          return false;
        }

        // Search Phrase (only if not already filtered by URL)
        if (!searchWhat && userFilters.searchPhrase) {
          const phrase = userFilters.searchPhrase.toLowerCase();
          const matches =
            job.title.toLowerCase().includes(phrase) ||
            job.description.toLowerCase().includes(phrase) ||
            job.companyName.toLowerCase().includes(phrase);
          if (!matches) return false;
        }

        // Salary Filter
        if (userFilters.salary) {
          const minSalary = parseInt(userFilters.salary, 10);
          if (!isNaN(minSalary) && minSalary > 0) {
            // If job has no salary info, we might want to keep it or hide it.
            // Usually, if I filter for salary, I want to see jobs that match.
            // But many jobs don't have salary info.
            // Let's assume if job has salary info, it must match.
            if (job.salaryRange?.max) {
              if (job.salaryRange.max < minSalary) return false;
            }
            // If job has only min salary
            else if (job.salaryRange?.min) {
              if (job.salaryRange.min < minSalary) return false;
            }
            // If job has no salary info, we keep it (or drop it? Let's keep it for now to not hide too much)
          }
        }

        return true;
      });
    }
    return jobs;
  }, [allJobs, userFilters, urlLocation, searchWhat, searchWhere, radiusParam, searchCoords]);

  const salaryRange = React.useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    let hasSalary = false;

    baseJobs.forEach(job => {
      if (job.salaryRange?.min) {
        min = Math.min(min, job.salaryRange.min);
        hasSalary = true;
      }
      if (job.salaryRange?.max) {
        max = Math.max(max, job.salaryRange.max);
        hasSalary = true;
      }
    });

    if (!hasSalary) return undefined;
    // Add some padding or rounding
    min = Math.floor(min / 1000) * 1000;
    max = Math.ceil(max / 1000) * 1000;

    return { min, max };
  }, [baseJobs]);

  // 2. Apply Sidebar Filters -> Displayed Jobs
  const displayedJobs = React.useMemo(() => {
    let jobs = baseJobs;

    const now = new Date();

    // Salary Filter
    if (sidebarFilters.salaryMin?.length && sidebarFilters.salaryMax?.length) {
      const minFilter = parseInt(sidebarFilters.salaryMin[0]);
      const maxFilter = parseInt(sidebarFilters.salaryMax[0]);

      jobs = jobs.filter(job => {
        if (!job.salaryRange) return false;
        const jobMin = job.salaryRange.min || 0;
        const jobMax = job.salaryRange.max || jobMin;

        // Check for overlap between [jobMin, jobMax] and [minFilter, maxFilter]
        return Math.max(jobMin, minFilter) <= Math.min(jobMax, maxFilter);
      });
    }

    // Filter by Sidebar selections
    if (sidebarFilters.location?.length) {
      jobs = jobs.filter(job =>
        sidebarFilters.location.includes(job.location.split(',')[0].trim())
      );
    }
    if (sidebarFilters.type?.length) {
      jobs = jobs.filter(job => {
        // Handle both English and German values if necessary, or just match string
        // Since we normalized in Sidebar, we expect German values in sidebarFilters.type
        // But job.type might be English or German.
        // Ideally we normalize job.type here too or just check inclusion if we trust the data.
        // For now, simple inclusion check, assuming data migration or new data.
        const types = job.type.split(',').map(t => t.trim());
        // Also check against translations if needed, but let's stick to direct match first
        return sidebarFilters.type.some(t => types.includes(t));
      });
    }

    // Category Filter
    if (sidebarFilters.category?.length) {
      jobs = jobs.filter(job => job.category && sidebarFilters.category.includes(job.category));
    }

    // Region Filter
    if (sidebarFilters.region?.length) {
      jobs = jobs.filter(job => job.region && sidebarFilters.region.includes(job.region));
    }

    // Languages Filter
    if (sidebarFilters.languages?.length) {
      jobs = jobs.filter(
        job => job.languages && job.languages.some(lang => sidebarFilters.languages.includes(lang))
      );
    }

    // Career Level Filter
    if (sidebarFilters.careerLevel?.length) {
      jobs = jobs.filter(
        job => job.careerLevel && sidebarFilters.careerLevel.includes(job.careerLevel)
      );
    }

    // Title Filter
    if (sidebarFilters.title?.length) {
      jobs = jobs.filter(job => sidebarFilters.title.includes(job.title));
    }

    // Industry Filter
    if (sidebarFilters.industry?.length) {
      jobs = jobs.filter(job => {
        let industry = job.industry;

        if (!industry) {
          industry = findCategoryBySubcategory(job.title);
        }

        if (!industry) {
          const companyLower = job.companyName.toLowerCase();
          if (companyLower.includes('hotel') || companyLower.includes('resort'))
            industry = 'Hotellerie';
          else if (
            companyLower.includes('restaurant') ||
            companyLower.includes('bar') ||
            companyLower.includes('café') ||
            companyLower.includes('bistro')
          )
            industry = 'Gastronomie';
          else if (companyLower.includes('gmbh') || companyLower.includes('ag'))
            industry = 'Dienstleistung';
        }
        return industry && sidebarFilters.industry.includes(industry);
      });
    }

    if (sidebarFilters.date?.length) {
      jobs = jobs.filter(job => {
        if (!job.postedAt) return false;
        try {
          const jobDate = new Date(job.postedAt);
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
        } catch {
          return false;
        }
      });
    }

    return jobs;
  }, [baseJobs, sidebarFilters]);

  const handleSidebarFilterChange = (category: string, value: string | number | number[]) => {
    setSidebarFilters(prev => {
      if (category === 'salaryMin' || category === 'salaryMax') {
        return {
          ...prev,
          [category]: [String(value)],
        };
      }

      const strValue = String(value);
      const current = prev[category] || [];
      const updated = current.includes(strValue)
        ? current.filter(v => v !== strValue)
        : [...current, strValue];
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
    <>
      <JobSearchHeader />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Column: Filters */}
          <div className="w-full lg:w-1/4">
            <JobFilterSidebar
              jobs={baseJobs} // Pass baseJobs so counts reflect all possibilities within user prefs
              activeFilters={sidebarFilters}
              onFilterChange={handleSidebarFilterChange}
              onClearFilters={handleClearFilters}
              salaryRange={salaryRange}
            />
          </div>

          {/* Right Column: Results */}
          <div className="w-full lg:w-3/4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
              <p className="text-lg text-gray-700">
                {userFilters || Object.keys(sidebarFilters).length > 0 || searchWhat || searchWhere
                  ? 'Gefilterte Suche'
                  : 'Alle Jobs'}
                : <span className="font-bold text-teal-600">{displayedJobs.length}</span> Treffer
              </p>
              <Button className="bg-teal-600 hover:bg-teal-700 text-white">
                <Mail className="w-4 h-4 mr-2" />
                Passende Jobs per Mail
              </Button>
            </div>

            {/* Job List */}
            <div className="space-y-4">
              {displayedJobs.length > 0 ? (
                displayedJobs.map(job => <JobCard key={job.id} job={job} />)
              ) : (
                <div className="text-center py-12 border rounded-lg bg-gray-50">
                  <h3 className="text-lg font-medium text-gray-900">Keine Jobs gefunden</h3>
                  <p className="text-gray-500 mt-1">Versuchen Sie es mit weniger Filtern.</p>
                </div>
              )}
            </div>

            {/* Pagination */}
            <div className="mt-8 flex justify-between items-center border-t border-gray-200 pt-4">
              <div className="text-sm text-gray-600">
                <span className="font-bold text-gray-900">25</span> |{' '}
                <span className="cursor-pointer hover:text-teal-600">50</span> Jobs pro Seite
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">1 von 1</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
