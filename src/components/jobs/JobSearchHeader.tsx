'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { z } from 'zod';
import {
  collection,
  query,
  where,
  getDocs,
  limit,
  orderBy,
  startAt,
  endAt,
  collectionGroup,
} from 'firebase/firestore';
import { db } from '@/firebase/clients';
import Image from 'next/image';

const SearchFormSchema = z.object({
  what: z.string().trim().max(200, 'Bitte kürzer suchen').optional(),
  where: z.string().trim().max(200, 'Bitte kürzer suchen').optional(),
  radius: z.enum(['0', '10', '20', '50', '100']),
});

type Suggestion =
  | { type: 'profession'; label: string }
  | { type: 'company'; label: string; logoUrl?: string; id: string };

export function JobSearchHeader() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [what, setWhat] = useState('');
  const [where, setWhere] = useState('');
  const [radius, setRadius] = useState<'0' | '10' | '20' | '50' | '100'>('20');
  const [isScrolled, setIsScrolled] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const locationWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
      if (
        locationWrapperRef.current &&
        !locationWrapperRef.current.contains(event.target as Node)
      ) {
        setShowLocationSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const fetchLocationSuggestions = async () => {
      if (where.trim().length < 2) {
        setLocationSuggestions([]);
        return;
      }

      const searchTerm = where.trim();
      const capitalizedSearch = searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1);

      try {
        const q = query(
          collectionGroup(db, 'jobs'),
          orderBy('location'),
          startAt(capitalizedSearch),
          endAt(capitalizedSearch + '\uf8ff'),
          limit(10)
        );

        const snapshot = await getDocs(q);
        const uniqueLocations = new Set<string>();
        snapshot.forEach(doc => {
          const data = doc.data();
          if (data.location) {
            uniqueLocations.add(data.location);
          }
        });

        setLocationSuggestions(Array.from(uniqueLocations).slice(0, 5));
      } catch (error) {
        console.error('Error fetching locations', error);
        setLocationSuggestions([]);
      }
    };

    const timeoutId = setTimeout(() => {
      fetchLocationSuggestions();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [where]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (what.trim().length < 2) {
        setSuggestions([]);
        return;
      }

      const searchTerm = what.trim();
      // Capitalize for Firestore search (assuming data is capitalized)
      const capitalizedSearch = searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1);

      try {
        const newSuggestions: Suggestion[] = [];

        // 1. Search Jobs (Titles) via collectionGroup
        // Note: This requires a composite index on 'jobs' collection group for 'title' field
        const jobsQuery = query(
          collectionGroup(db, 'jobs'),
          orderBy('title'),
          startAt(capitalizedSearch),
          endAt(capitalizedSearch + '\uf8ff'),
          limit(3)
        );

        // 2. Search Companies
        const companiesQuery = query(
          collection(db, 'companies'),
          orderBy('companyName'),
          startAt(capitalizedSearch),
          endAt(capitalizedSearch + '\uf8ff'),
          limit(3)
        );

        const [jobsSnapshot, companiesSnapshot] = await Promise.all([
          getDocs(jobsQuery),
          getDocs(companiesQuery),
        ]);

        // Process Jobs
        const uniqueJobTitles = new Set<string>();
        jobsSnapshot.forEach(doc => {
          const data = doc.data();
          if (data.title && !uniqueJobTitles.has(data.title)) {
            uniqueJobTitles.add(data.title);
            newSuggestions.push({ type: 'profession', label: data.title });
          }
        });

        // Process Companies
        companiesSnapshot.forEach(doc => {
          const data = doc.data();
          newSuggestions.push({
            type: 'company',
            label: data.companyName,
            logoUrl: data.logoUrl || data.profileImage,
            id: doc.id,
          });
        });

        setSuggestions(newSuggestions);
      } catch (error) {
        console.error('Error fetching suggestions', error);
        setSuggestions([]);
      }
    };

    const timeoutId = setTimeout(() => {
      fetchSuggestions();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [what]);

  // Helper function to check scroll state
  const checkScrollState = () => {
    // 1. Check Window Scroll
    if (window.scrollY > 20) {
      setIsScrolled(true);
      return;
    }

    // 2. Check Parent Scroll (for Dashboard)
    let element: HTMLElement | null = wrapperRef.current;
    while (element && element.parentElement) {
      const parent = element.parentElement;
      // Check if parent is scrollable
      const style = window.getComputedStyle(parent);
      const isScrollable = style.overflowY === 'auto' || style.overflowY === 'scroll';

      if (isScrollable) {
        setIsScrolled(parent.scrollTop > 20);
        return;
      }
      element = parent;
    }

    // 3. Default to false
    setIsScrolled(false);
  };

  useEffect(() => {
    const handleScroll = (event: Event) => {
      const target = event.target as HTMLElement | Document;

      // Check if it's the window/document scrolling
      if (target === document) {
        setIsScrolled(window.scrollY > 20);
        return;
      }

      // Check if it's an element scrolling that contains our component
      if (
        target instanceof HTMLElement &&
        wrapperRef.current &&
        target.contains(wrapperRef.current)
      ) {
        setIsScrolled(target.scrollTop > 20);
      }
    };

    // Capture true is key here to get scroll events from children
    window.addEventListener('scroll', handleScroll, { capture: true });

    // Initial check with a small delay to ensure layout is ready
    const timer = setTimeout(checkScrollState, 100);

    return () => {
      window.removeEventListener('scroll', handleScroll, { capture: true });
      clearTimeout(timer);
    };
  }, []);

  // Re-check scroll state when search params change (e.g. clearing filters)
  useEffect(() => {
    // Small timeout to allow layout to update (e.g. list shrinking)
    const timer = setTimeout(checkScrollState, 300); // Increased timeout
    return () => clearTimeout(timer);
  }, [searchParams]);

  useEffect(() => {
    const nextWhat = searchParams.get('what');
    if (nextWhat !== null) {
      setWhat(nextWhat);
    }
    const explicitWhere = searchParams.get('where');
    const fallbackLocation = searchParams.get('location');
    if (explicitWhere !== null) {
      setWhere(explicitWhere);
    } else if (fallbackLocation !== null) {
      setWhere(fallbackLocation);
    }
    const nextRadius = searchParams.get('radius');
    if (nextRadius !== null && SearchFormSchema.shape.radius.safeParse(nextRadius).success) {
      setRadius(nextRadius as '0' | '10' | '20' | '50' | '100');
    }
  }, [searchParams]);

  const handleSelectSuggestion = (suggestion: Suggestion) => {
    setWhat(suggestion.label);
    setShowSuggestions(false);
  };

  const handleSelectLocation = (location: string) => {
    setWhere(location);
    setShowLocationSuggestions(false);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = {
      what: what.trim().length > 0 ? what.trim() : undefined,
      where: where.trim().length > 0 ? where.trim() : undefined,
      radius,
    };

    const parsed = SearchFormSchema.safeParse(payload);
    if (!parsed.success) {
      return;
    }

    const params = new URLSearchParams();
    const { what: parsedWhat, where: parsedWhere, radius: parsedRadius } = parsed.data;

    if (typeof parsedWhat === 'string') {
      params.set('what', parsedWhat);
    } else {
      params.delete('what');
    }

    if (typeof parsedWhere === 'string') {
      params.set('where', parsedWhere);
    } else {
      params.delete('where');
    }

    params.set('radius', parsedRadius);

    const queryString = params.toString();
    router.push(queryString.length > 0 ? `/jobs?${queryString}` : '/jobs');
  };

  const fieldStyles =
    'h-12 w-full rounded-full border border-teal-100 bg-white px-6 text-[15px] text-gray-700 placeholder:text-gray-400 shadow-[0_4px_20px_rgba(13,180,166,0.08)] focus:border-[#14b8a6] focus:outline-none focus:ring-2 focus:ring-[#14b8a6]/20 transition-all';

  return (
    <div
      className={`w-full sticky top-0 z-40 transition-all duration-300 ${
        isScrolled ? 'bg-teal-600 py-4 shadow-md' : 'bg-white py-6'
      }`}
    >
      <div className="mx-auto flex w-full max-w-6xl justify-center px-4">
        <form
          onSubmit={handleSubmit}
          className="flex w-full flex-wrap items-center justify-center gap-4 lg:flex-nowrap"
        >
          <div className="flex-1 min-w-60 relative" ref={wrapperRef}>
            <input
              type="text"
              value={what}
              onChange={event => {
                setWhat(event.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Beruf, Stichwort oder Unternehmen"
              className={fieldStyles}
              autoComplete="off"
            />
            {showSuggestions && suggestions.length > 0 && (
              <ul className="absolute top-full left-0 mt-2 w-full bg-white border border-gray-100 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto py-2">
                {suggestions.map((suggestion, index) => (
                  <li key={index}>
                    <button
                      type="button"
                      onClick={() => handleSelectSuggestion(suggestion)}
                      className="w-full text-left px-5 py-3 hover:bg-teal-50 flex items-center justify-between group transition-colors"
                    >
                      {suggestion.type === 'profession' ? (
                        <span className="text-gray-700">
                          <strong className="font-bold text-gray-900">{suggestion.label}</strong>
                        </span>
                      ) : (
                        <>
                          <span className="text-gray-700">
                            <strong className="font-bold text-gray-900">{suggestion.label}</strong>
                          </span>
                          {suggestion.logoUrl && (
                            <span className="ml-3 w-8 h-8 relative rounded-md overflow-hidden border border-gray-100 bg-white shrink-0">
                              <Image
                                src={suggestion.logoUrl}
                                alt={suggestion.label}
                                fill
                                className="object-cover"
                                sizes="32px"
                              />
                            </span>
                          )}
                        </>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex-1 min-w-60 relative" ref={locationWrapperRef}>
            <input
              type="text"
              value={where}
              onChange={event => {
                setWhere(event.target.value);
                setShowLocationSuggestions(true);
              }}
              onFocus={() => setShowLocationSuggestions(true)}
              placeholder="Ort, Region"
              className={fieldStyles}
              autoComplete="off"
            />
            {showLocationSuggestions && locationSuggestions.length > 0 && (
              <ul className="absolute top-full left-0 mt-2 w-full bg-white border border-gray-100 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto py-2">
                {locationSuggestions.map((location, index) => (
                  <li key={index}>
                    <button
                      type="button"
                      onClick={() => handleSelectLocation(location)}
                      className="w-full text-left px-5 py-3 hover:bg-teal-50 flex items-center justify-between group transition-colors"
                    >
                      <span className="text-gray-700">
                        <strong className="font-bold text-gray-900">{location}</strong>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="w-[130px]">
            <div className="relative">
              <select
                value={radius}
                onChange={event => setRadius(event.target.value as typeof radius)}
                className={`${fieldStyles} appearance-none pr-10 font-medium`}
              >
                <option value="0">0 km</option>
                <option value="10">+ 10 km</option>
                <option value="20">+ 20 km</option>
                <option value="50">+ 50 km</option>
                <option value="100">+ 100 km</option>
              </select>
              <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-teal-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-4 w-4"
                >
                  <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </div>
          </div>

          <button
            type="submit"
            className={`h-12 rounded-full px-8 text-sm font-bold uppercase tracking-wider shadow-lg transition-all hover:shadow-xl min-w-40 ${
              isScrolled
                ? 'bg-white text-teal-600 hover:bg-gray-100'
                : 'bg-teal-600 text-white hover:bg-teal-700'
            }`}
            aria-label="Jobs suchen"
          >
            Jobs suchen
          </button>
        </form>
      </div>
    </div>
  );
}
