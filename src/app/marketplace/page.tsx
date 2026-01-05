'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  MapPin,
  Euro,
  Calendar,
  Eye,
  Filter,
  AlertCircle,
  ArrowRight,
  Users,
  Shield,
  Sparkles,
  TrendingUp,
  CheckCircle,
  X,
  Layers,
  Globe,
  Wallet,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';
import { db } from '@/firebase/clients';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { HeroHeader } from '@/components/hero8-header';
import UserHeader from '@/components/UserHeader';
import { categories } from '@/lib/categoriesData';

interface ProjectRequest {
  id: string;
  title: string;
  description: string;
  category: string;
  subcategory: string;
  budgetAmount?: number;
  maxBudget?: number;
  budgetType: 'fixed' | 'hourly' | 'negotiable';
  timeline: string;
  location: string;
  country?: string;
  state?: string;
  city?: string;
  isRemote: boolean;
  urgency: 'low' | 'medium' | 'high' | 'urgent' | 'normal';
  status: string;
  createdAt: { toDate?: () => Date; seconds?: number; nanoseconds?: number } | Date;
  customerUid: string;
  viewCount: number;
  proposalsCount?: number;
  requestType: 'direct' | 'marketplace';
  isPublic: boolean;
  // Neue Felder
  attachments?: { url: string; name: string; type: string }[];
  preferredDate?: string | Date;
  projectScope?: 'einmalig' | 'wiederkehrend' | 'langfristig';
  siteVisitPossible?: boolean;
  workingHours?: 'werktags' | 'wochenende' | 'abends' | 'flexibel';
  requiredQualifications?: string[];
  contactPreference?: 'telefon' | 'email' | 'chat';
  customerVerified?: boolean;
  customerOrderCount?: number;
  customerResponseRate?: number;
  proposalDeadline?: string | Date;
  maxProposals?: number;
}

const _GERMAN_STATES = [
  'Baden-Württemberg', 'Bayern', 'Berlin', 'Brandenburg', 'Bremen',
  'Hamburg', 'Hessen', 'Mecklenburg-Vorpommern', 'Niedersachsen',
  'Nordrhein-Westfalen', 'Rheinland-Pfalz', 'Saarland', 'Sachsen',
  'Sachsen-Anhalt', 'Schleswig-Holstein', 'Thüringen'
];

const BUDGET_RANGES = [
  { value: '', label: 'Alle Budgets' },
  { value: '0-500', label: 'Bis 500 EUR', min: 0, max: 500 },
  { value: '500-1000', label: '500 - 1.000 EUR', min: 500, max: 1000 },
  { value: '1000-5000', label: '1.000 - 5.000 EUR', min: 1000, max: 5000 },
  { value: '5000-10000', label: '5.000 - 10.000 EUR', min: 5000, max: 10000 },
  { value: '10000-50000', label: '10.000 - 50.000 EUR', min: 10000, max: 50000 },
  { value: '50000+', label: 'Über 50.000 EUR', min: 50000, max: Infinity },
];

export default function PublicMarketplacePage() {
  const router = useRouter();
  const { user } = useAuth();

  const [projects, setProjects] = useState<ProjectRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedBudget, setSelectedBudget] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [locationInput, setLocationInput] = useState('');
  const locationInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  // Subkategorien basierend auf ausgewählter Kategorie
  const availableSubcategories = selectedCategory
    ? categories.find(c => c.title.toLowerCase() === selectedCategory.toLowerCase())?.subcategories || []
    : [];

  const getDateFromFirestore = (timestamp: ProjectRequest['createdAt']): Date => {
    if (!timestamp) return new Date();
    if (typeof timestamp === 'object' && 'toDate' in timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    if (typeof timestamp === 'object' && 'seconds' in timestamp && timestamp.seconds) {
      return new Date(timestamp.seconds * 1000);
    }
    if (timestamp instanceof Date) {
      return timestamp;
    }
    return new Date();
  };

  useEffect(() => {
    const projectsRef = collection(db, 'project_requests');
    const projectsQuery = query(
      projectsRef,
      where('isPublic', '==', true),
      where('status', 'in', ['open', 'pending', 'has_proposals', 'active']),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      projectsQuery,
      (snapshot) => {
        const projectsData: ProjectRequest[] = [];
        snapshot.forEach((docSnapshot) => {
          const data = docSnapshot.data();
          projectsData.push({ id: docSnapshot.id, ...data } as ProjectRequest);
        });
        projectsData.sort((a, b) => {
          const dateA = getDateFromFirestore(a.createdAt);
          const dateB = getDateFromFirestore(b.createdAt);
          return dateB.getTime() - dateA.getTime();
        });
        setProjects(projectsData);
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Google Places Autocomplete initialisieren
  const initPlacesAutocomplete = useCallback(() => {
    if (!locationInputRef.current || !window.google?.maps?.places || autocompleteRef.current) return;

    try {
      autocompleteRef.current = new window.google.maps.places.Autocomplete(locationInputRef.current, {
        componentRestrictions: { country: ['de', 'at', 'ch'] },
        types: ['(cities)'],
        fields: ['address_components', 'geometry', 'formatted_address', 'name'],
      });

      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();
        if (!place?.address_components) return;

        let city = '';
        let state = '';
        let country = '';

        place.address_components.forEach((component) => {
          const types = component.types;
          if (types.includes('locality')) {
            city = component.long_name;
          } else if (types.includes('administrative_area_level_1')) {
            state = component.long_name;
          } else if (types.includes('country')) {
            country = component.long_name;
          }
        });

        setSelectedCity(city);
        setLocationInput(city);
        
        if (state) {
          setSelectedState(state);
        }
        
        const countryLower = country.toLowerCase();
        if (countryLower.includes('deutschland') || countryLower.includes('germany')) {
          setSelectedCountry('deutschland');
        } else if (countryLower.includes('österreich') || countryLower.includes('austria')) {
          setSelectedCountry('österreich');
        } else if (countryLower.includes('schweiz') || countryLower.includes('switzerland')) {
          setSelectedCountry('schweiz');
        }
      });
    } catch {
      // Fallback - kein Autocomplete
    }
  }, []);

  useEffect(() => {
    // Warten bis Google Maps geladen ist
    if (window.google?.maps?.places) {
      initPlacesAutocomplete();
      return;
    } else {
      const checkGoogle = setInterval(() => {
        if (window.google?.maps?.places) {
          initPlacesAutocomplete();
          clearInterval(checkGoogle);
        }
      }, 500);
      return () => clearInterval(checkGoogle);
    }
  }, [initPlacesAutocomplete, showFilters]);

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      searchTerm === '' ||
      project.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.subcategory?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory =
      selectedCategory === '' || project.category?.toLowerCase() === selectedCategory.toLowerCase();
    
    const matchesSubcategory =
      selectedSubcategory === '' || project.subcategory?.toLowerCase() === selectedSubcategory.toLowerCase();
    
    const matchesCountry =
      selectedCountry === '' || project.country?.toLowerCase() === selectedCountry.toLowerCase();
    
    const matchesState =
      selectedState === '' || project.state === selectedState;
    
    const matchesCity =
      selectedCity === '' || project.city?.toLowerCase().includes(selectedCity.toLowerCase()) ||
      project.location?.toLowerCase().includes(selectedCity.toLowerCase());
    
    let matchesBudget = true;
    if (selectedBudget) {
      const budgetRange = BUDGET_RANGES.find(b => b.value === selectedBudget);
      if (budgetRange && budgetRange.min !== undefined) {
        const projectBudget = project.budgetAmount || project.maxBudget || 0;
        matchesBudget = projectBudget >= budgetRange.min && projectBudget <= (budgetRange.max || Infinity);
      }
    }
    
    return matchesSearch && matchesCategory && matchesSubcategory && matchesCountry && matchesState && matchesCity && matchesBudget;
  });

  const formatBudget = (project: ProjectRequest): string => {
    if (project.budgetAmount) {
      if (project.maxBudget && project.maxBudget !== project.budgetAmount) {
        return `${project.budgetAmount.toLocaleString('de-DE')} - ${project.maxBudget.toLocaleString('de-DE')}`;
      }
      return project.budgetAmount.toLocaleString('de-DE');
    }
    return 'Auf Anfrage';
  };

  const getUrgencyConfig = (urgency: string) => {
    const config: Record<string, { label: string; color: string }> = {
      low: { label: 'Flexibel', color: 'bg-gray-100 text-gray-700' },
      normal: { label: 'Normal', color: 'bg-blue-100 text-blue-700' },
      medium: { label: 'Mittel', color: 'bg-yellow-100 text-yellow-700' },
      high: { label: 'Priorität', color: 'bg-orange-100 text-orange-700' },
      urgent: { label: 'Dringend', color: 'bg-red-100 text-red-700' },
    };
    return config[urgency] || config.normal;
  };

  const formatDate = (timestamp: ProjectRequest['createdAt']): string => {
    const date = getDateFromFirestore(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Gerade eben';
    if (diffHours < 24) return `Vor ${diffHours} Stunde${diffHours !== 1 ? 'n' : ''}`;
    if (diffDays < 7) return `Vor ${diffDays} Tag${diffDays !== 1 ? 'en' : ''}`;
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const handleProjectClick = (projectId: string) => {
    // Projekte sind öffentlich einsehbar - Login erst beim Angebot senden erforderlich
    router.push(`/marketplace/projects/${projectId}`);
  };

  const activeFiltersCount = [
    selectedCategory, 
    selectedSubcategory, 
    selectedCountry, 
    selectedState, 
    selectedCity, 
    selectedBudget, 
    searchTerm
  ].filter(Boolean).length;

  const resetAllFilters = () => {
    setSelectedCategory('');
    setSelectedSubcategory('');
    setSelectedCountry('');
    setSelectedState('');
    setSelectedCity('');
    setSelectedBudget('');
    setSearchTerm('');
  };

  return (
    <>
      {user ? <UserHeader currentUid={user.uid} /> : <HeroHeader />}
      <main className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-teal-600 via-teal-700 to-teal-900 pt-20 lg:pt-24">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }} />
          </div>
          
          <div className="relative z-10 container mx-auto px-4 py-12 lg:py-16">
            {/* Breadcrumb */}
            <motion.nav
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 max-w-4xl mx-auto"
              aria-label="Breadcrumb"
            >
              <ol className="flex items-center gap-2 text-sm">
                <li>
                  <Link
                    href="/"
                    className="text-white/70 hover:text-white transition-colors"
                  >
                    Start
                  </Link>
                </li>
                <li className="text-white/50">/</li>
                <li className="text-white font-medium">
                  Marktplatz
                </li>
              </ol>
            </motion.nav>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-4xl mx-auto text-center"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6"
              >
                <Sparkles className="h-4 w-4 text-yellow-300" />
                <span className="text-sm font-medium text-white/90">
                  {projects.length} aktive Projekte warten auf dich
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight"
              >
                Finde dein nächstes
                <span className="block text-teal-200">Traum-Projekt</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="text-lg md:text-xl text-white/80 mb-10 max-w-2xl mx-auto"
              >
                Entdecke spannende Aufträge von verifizierten Kunden. 
                Mit Escrow-Schutz für sichere Zahlungen.
              </motion.p>

              {/* Search Bar */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="max-w-2xl mx-auto"
              >
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-teal-400 to-cyan-400 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-300" />
                  <div className="relative flex items-center bg-white rounded-xl shadow-2xl overflow-hidden">
                    <div className="flex-shrink-0 pl-5 pr-3 flex items-center justify-center">
                      <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Suche nach Projekten, Skills oder Kategorien..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="flex-1 py-5 text-lg bg-transparent text-gray-900 placeholder:text-gray-400 outline-none"
                    />
                    <Button
                      onClick={() => setShowFilters(!showFilters)}
                      variant="ghost"
                      className="flex-shrink-0 mr-2 text-gray-500 hover:text-teal-600 relative"
                    >
                      <Filter className="h-5 w-5" />
                      {activeFiltersCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-5 w-5 bg-teal-500 text-white text-xs rounded-full flex items-center justify-center">
                          {activeFiltersCount}
                        </span>
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>

              {/* Filter Dropdown - Außerhalb des max-w-2xl für volle Breite */}
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  className="mt-6 w-full max-w-[1400px] mx-auto bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-100 overflow-hidden text-left"
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-teal-500 to-teal-600 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-white/20 rounded-md">
                            <SlidersHorizontal className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <h3 className="font-medium text-white text-sm">Erweiterte Filter</h3>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowFilters(false)}
                          className="text-white/80 hover:text-white hover:bg-white/20"
                        >
                          <X className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="p-4 space-y-4">
                      {/* Kategorie & Subkategorie */}
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="p-1 bg-teal-100 rounded">
                            <Layers className="h-3.5 w-3.5 text-teal-600" />
                          </div>
                          <h4 className="font-medium text-gray-900 text-sm">Kategorie</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Hauptkategorie</label>
                            <select
                              value={selectedCategory}
                              onChange={(e) => {
                                setSelectedCategory(e.target.value);
                                setSelectedSubcategory('');
                              }}
                              className="w-full rounded-lg border-0 bg-white shadow-sm px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 transition-shadow"
                            >
                              <option value="">Alle Kategorien</option>
                              {categories.map((cat) => (
                                <option key={cat.title} value={cat.title}>{cat.title}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Subkategorie</label>
                            <select
                              value={selectedSubcategory}
                              onChange={(e) => setSelectedSubcategory(e.target.value)}
                              disabled={!selectedCategory}
                              className="w-full rounded-lg border-0 bg-white shadow-sm px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 transition-shadow disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                            >
                              <option value="">Alle Subkategorien</option>
                              {availableSubcategories.map((sub) => (
                                <option key={sub} value={sub}>{sub}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Standort */}
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="p-1 bg-teal-100 rounded">
                            <Globe className="h-3.5 w-3.5 text-teal-600" />
                          </div>
                          <h4 className="font-medium text-gray-900 text-sm">Standort</h4>
                        </div>
                        <div className="space-y-3">
                          {/* Place Picker Input */}
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Stadt oder Ort suchen</label>
                            <div className="relative">
                              <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-teal-500 z-10" />
                              <input
                                ref={locationInputRef}
                                type="text"
                                placeholder="Stadt eingeben..."
                                value={locationInput}
                                onChange={(e) => setLocationInput(e.target.value)}
                                className="w-full rounded-lg border-0 bg-white shadow-sm pl-8 pr-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 transition-shadow placeholder:text-gray-400"
                              />
                            </div>
                          </div>
                          {/* Ausgewaehlte Werte anzeigen */}
                          {(selectedCountry || selectedState || selectedCity) && (
                            <div className="flex flex-wrap gap-2">
                              {selectedCountry && (
                                <Badge variant="secondary" className="bg-teal-100 text-teal-700 hover:bg-teal-200">
                                  {selectedCountry.charAt(0).toUpperCase() + selectedCountry.slice(1)}
                                  <button
                                    onClick={() => { setSelectedCountry(''); setSelectedState(''); }}
                                    className="ml-1.5 hover:text-teal-900"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              )}
                              {selectedState && (
                                <Badge variant="secondary" className="bg-teal-100 text-teal-700 hover:bg-teal-200">
                                  {selectedState}
                                  <button
                                    onClick={() => setSelectedState('')}
                                    className="ml-1.5 hover:text-teal-900"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              )}
                              {selectedCity && (
                                <Badge variant="secondary" className="bg-teal-100 text-teal-700 hover:bg-teal-200">
                                  {selectedCity}
                                  <button
                                    onClick={() => { setSelectedCity(''); setLocationInput(''); }}
                                    className="ml-1.5 hover:text-teal-900"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Projektgröße */}
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="p-1 bg-teal-100 rounded">
                            <Wallet className="h-3.5 w-3.5 text-teal-600" />
                          </div>
                          <h4 className="font-medium text-gray-900 text-sm">Projektgröße</h4>
                        </div>
                        <div className="flex flex-nowrap gap-1.5 overflow-x-auto pb-1">
                          {BUDGET_RANGES.map((range) => (
                            <button
                              key={range.value}
                              onClick={() => setSelectedBudget(selectedBudget === range.value ? '' : range.value)}
                              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border whitespace-nowrap shrink-0 ${
                                selectedBudget === range.value
                                  ? 'bg-teal-500 text-white border-teal-500 shadow-md shadow-teal-500/25'
                                  : 'bg-white text-gray-600 border-gray-200 hover:border-teal-300 hover:text-teal-700 hover:bg-teal-50'
                              }`}
                            >
                              {range.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="bg-gray-50 px-4 py-3 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {activeFiltersCount > 0 ? (
                            <>
                              <div className="flex items-center gap-1 bg-teal-100 text-teal-700 px-2.5 py-1 rounded-full text-xs font-medium">
                                <Filter className="h-3 w-3" />
                                {activeFiltersCount} aktiv
                              </div>
                            </>
                          ) : (
                            <span className="text-gray-400 text-xs">Keine Filter</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          {activeFiltersCount > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={resetAllFilters}
                              className="text-gray-600 hover:text-gray-900"
                            >
                              <RotateCcw className="h-4 w-4 mr-2" />
                              Zurücksetzen
                            </Button>
                          )}
                          <Button
                            size="sm"
                            onClick={() => setShowFilters(false)}
                            className="bg-teal-600 hover:bg-teal-700 text-white"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Anwenden
                          </Button>
                        </div>
                      </div>
                    </div>
                </motion.div>
              )}
            </motion.div>
          </div>

          {/* Wave Divider */}
          <div className="absolute bottom-0 left-0 right-0">
            <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
              <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="#f9fafb"/>
            </svg>
          </div>
        </section>

        {/* Trust Badges */}
        <section className="bg-gray-50 py-8 border-b">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap justify-center gap-8 lg:gap-16">
              {[
                { icon: Shield, text: 'Escrow-Schutz', subtext: 'Sichere Zahlungen' },
                { icon: Users, text: 'Verifiziert', subtext: 'Geprüfte Kunden' },
                { icon: TrendingUp, text: 'Wachstum', subtext: 'Neue Aufträge täglich' },
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 * index }}
                  className="flex items-center gap-3"
                >
                  <div className="p-2 bg-teal-100 rounded-lg">
                    <item.icon className="h-5 w-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{item.text}</p>
                    <p className="text-sm text-gray-500">{item.subtext}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Projects Section */}
        <section className="py-12 lg:py-16">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {loading ? 'Lade Projekte...' : `${filteredProjects.length} Projekte verfügbar`}
                </h2>
                <p className="text-gray-500 mt-1">Aktuelle Aufträge von verifizierten Kunden</p>
              </div>
            </div>

            {loading ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-6 bg-gray-200 rounded w-3/4 mb-4" />
                      <div className="h-4 bg-gray-200 rounded w-full mb-2" />
                      <div className="h-4 bg-gray-200 rounded w-2/3 mb-4" />
                      <div className="flex gap-2">
                        <div className="h-6 bg-gray-200 rounded-full w-20" />
                        <div className="h-6 bg-gray-200 rounded-full w-16" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredProjects.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-16"
              >
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-6">
                  <AlertCircle className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Keine Projekte gefunden</h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  {activeFiltersCount > 0
                    ? 'Versuche andere Suchkriterien oder Filter.'
                    : 'Momentan sind keine öffentlichen Projekte verfügbar.'}
                </p>
                {activeFiltersCount > 0 && (
                  <Button
                    variant="outline"
                    onClick={resetAllFilters}
                  >
                    Filter zurücksetzen
                  </Button>
                )}
              </motion.div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredProjects.map((project, index) => (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.05 }}
                  >
                    <Card
                      className="h-full hover:shadow-xl transition-all duration-300 cursor-pointer group border-0 shadow-md hover:-translate-y-1"
                      onClick={() => handleProjectClick(project.id)}
                    >
                      <CardContent className="p-5">
                        {/* Header mit Badges */}
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {project.customerVerified && (
                                <span className="inline-flex items-center gap-0.5 text-xs text-teal-600 font-medium">
                                  <CheckCircle className="h-3 w-3" />
                                  Verifiziert
                                </span>
                              )}
                              {project.attachments && project.attachments.length > 0 && (
                                <span className="inline-flex items-center gap-0.5 text-xs text-gray-500">
                                  <Sparkles className="h-3 w-3" />
                                  {project.attachments.length} Anhang{project.attachments.length > 1 ? 'e' : ''}
                                </span>
                              )}
                            </div>
                            <h3 className="font-semibold text-gray-900 group-hover:text-teal-600 transition-colors line-clamp-2">
                              {project.title}
                            </h3>
                          </div>
                          <div className={`px-2 py-1 rounded-full text-xs font-medium shrink-0 ${getUrgencyConfig(project.urgency).color}`}>
                            {getUrgencyConfig(project.urgency).label}
                          </div>
                        </div>

                        {/* Description */}
                        <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                          {project.description}
                        </p>

                        {/* Meta-Informationen */}
                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-3">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-gray-400" />
                            <span className="truncate">{project.city || project.location || 'Remote'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-gray-400" />
                            <span>{formatDate(project.createdAt)}</span>
                          </div>
                          {project.timeline && (
                            <div className="flex items-center gap-1">
                              <Sparkles className="h-3 w-3 text-gray-400" />
                              <span className="truncate">{project.timeline}</span>
                            </div>
                          )}
                          {project.projectScope && (
                            <div className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3 text-gray-400" />
                              <span className="capitalize">{project.projectScope}</span>
                            </div>
                          )}
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          <Badge variant="secondary" className="bg-teal-50 text-teal-700 hover:bg-teal-50 text-xs">
                            {project.category}
                          </Badge>
                          {project.subcategory && project.subcategory !== project.category && (
                            <Badge variant="secondary" className="bg-gray-100 text-gray-600 hover:bg-gray-100 text-xs">
                              {project.subcategory}
                            </Badge>
                          )}
                          {project.isRemote && (
                            <Badge variant="secondary" className="bg-blue-50 text-blue-600 hover:bg-blue-50 text-xs">
                              Remote
                            </Badge>
                          )}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                          <div className="flex items-center gap-1">
                            <Euro className="h-4 w-4 text-teal-600" />
                            <span className="font-semibold text-teal-600 text-sm">{formatBudget(project)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            {(project.proposalsCount ?? 0) > 0 && (
                              <span className="flex items-center gap-1" title="Anzahl Angebote">
                                <Users className="h-3 w-3" />
                                {project.proposalsCount}
                              </span>
                            )}
                            {project.viewCount > 0 && (
                              <span className="flex items-center gap-1" title="Aufrufe">
                                <Eye className="h-3 w-3" />
                                {project.viewCount}
                              </span>
                            )}
                            <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-teal-600 group-hover:translate-x-1 transition-all" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* CTA Section */}
        {!user && (
          <section className="py-16 bg-gradient-to-r from-teal-600 to-teal-700">
            <div className="container mx-auto px-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="max-w-3xl mx-auto text-center"
              >
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                  Bereit für neue Aufträge?
                </h2>
                <p className="text-lg text-white/80 mb-8">
                  Registriere dich kostenlos und erhalte Zugang zu allen Projekten.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/register/company">
                    <Button size="lg" className="bg-white text-teal-700 hover:bg-gray-100 shadow-lg">
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Kostenlos registrieren
                    </Button>
                  </Link>
                  <Link href="/about">
                    <Button size="lg" className="bg-teal-800 text-white border-2 border-white hover:bg-teal-900">
                      Mehr erfahren
                    </Button>
                  </Link>
                </div>
              </motion.div>
            </div>
          </section>
        )}
      </main>
    </>
  );
}
