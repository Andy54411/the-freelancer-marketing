'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Search,
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Tag,
  Plus,
  X,
  Info,
  BarChart3,
  ArrowLeft,
  Lightbulb,
  Sparkles,
  BookOpen,
  RefreshCw,
} from 'lucide-react';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { toast } from 'sonner';
import { KeywordAnalysisService, type KeywordAnalysisResult, type ProfileDataForAnalysis } from '@/services/KeywordAnalysisService';
import { categories as allCategories } from '@/data/categories';

interface CompanyData {
  selectedCategory?: string;
  selectedSubcategory?: string;
  bio?: string;
  description?: string;
  skills?: string[];
  searchTags?: string[];
  location?: string;
  companyName?: string;
  step2?: {
    companyAddress?: {
      city?: string;
    };
  };
  step3?: {
    selectedCategory?: string;
    selectedSubcategory?: string;
    bio?: string;
    skills?: string[];
    location?: string;
  };
}

export default function KeywordAnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.uid as string;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<KeywordAnalysisResult | null>(null);
  const [profileData, setProfileData] = useState<ProfileDataForAnalysis | null>(null);
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);
  
  // Tag-Verwaltung
  const [searchTags, setSearchTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  
  // Lade Company-Daten
  const loadCompanyData = useCallback(async () => {
    if (!companyId) return;
    
    setLoading(true);
    try {
      const docRef = doc(db, 'companies', companyId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data() as CompanyData;
        setCompanyData(data);
        
        // Extrahiere relevante Daten für Analyse
        const rawCategory = data.selectedCategory || data.step3?.selectedCategory || '';
        const categoryObj = allCategories.find(cat => 
          cat.id === rawCategory || cat.title === rawCategory
        );
        const categoryId = categoryObj?.id || rawCategory;
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const profileTitle = (data as any).profileTitle || '';
        
        const profile: ProfileDataForAnalysis = {
          title: profileTitle,
          description: data.bio || data.description || data.step3?.bio || '',
          category: categoryId,
          subcategory: data.selectedSubcategory || data.step3?.selectedSubcategory || '',
          skills: data.skills || data.step3?.skills || [],
          searchTags: data.searchTags || [],
          location: data.location || data.step3?.location || data.step2?.companyAddress?.city,
        };
        
        setProfileData(profile);
        setSearchTags(data.searchTags || []);
        
        // Generiere Tag-Vorschläge
        const suggestions = KeywordAnalysisService.getSuggestedTags(
          categoryId,
          profile.subcategory
        );
        setSuggestedTags(suggestions);
        
        // Führe Analyse durch
        const result = KeywordAnalysisService.analyzeProfile(profile);
        setAnalysisResult(result);
      }
    } catch (error) {
      console.error('Fehler beim Laden:', error);
      toast.error('Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  }, [companyId]);
  
  useEffect(() => {
    loadCompanyData();
  }, [loadCompanyData]);
  
  // Tag hinzufügen
  const addTag = (tag: string) => {
    if (searchTags.length >= 5) {
      toast.error('Maximal 5 Such-Tags erlaubt');
      return;
    }
    
    const normalizedTag = tag.trim().toLowerCase();
    if (normalizedTag.length < 2) {
      toast.error('Tag muss mindestens 2 Zeichen haben');
      return;
    }
    
    if (searchTags.some(t => t.toLowerCase() === normalizedTag)) {
      toast.error('Tag existiert bereits');
      return;
    }
    
    const newTags = [...searchTags, tag.trim()];
    setSearchTags(newTags);
    setNewTag('');
    
    // Aktualisiere Analyse
    if (profileData) {
      const updatedProfile = { ...profileData, searchTags: newTags };
      setProfileData(updatedProfile);
      const result = KeywordAnalysisService.analyzeProfile(updatedProfile);
      setAnalysisResult(result);
    }
  };
  
  // Tag entfernen
  const removeTag = (tagToRemove: string) => {
    const newTags = searchTags.filter(t => t !== tagToRemove);
    setSearchTags(newTags);
    
    // Aktualisiere Analyse
    if (profileData) {
      const updatedProfile = { ...profileData, searchTags: newTags };
      setProfileData(updatedProfile);
      const result = KeywordAnalysisService.analyzeProfile(updatedProfile);
      setAnalysisResult(result);
    }
  };
  
  // Tags speichern
  const saveTags = async () => {
    if (!companyId) return;
    
    setSaving(true);
    try {
      const docRef = doc(db, 'companies', companyId);
      await updateDoc(docRef, {
        searchTags,
        lastUpdated: serverTimestamp(),
      });
      
      toast.success('Such-Tags gespeichert');
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      toast.error('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };
  
  // Analyse aktualisieren
  const refreshAnalysis = () => {
    if (profileData) {
      const result = KeywordAnalysisService.analyzeProfile(profileData);
      setAnalysisResult(result);
      toast.success('Analyse aktualisiert');
    }
  };
  
  // Score-Farbe
  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-teal-600';
    if (score >= 55) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };
  
  // Grade-Farbe
  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'bg-green-100 text-green-800 border-green-300';
      case 'B': return 'bg-teal-100 text-teal-800 border-teal-300';
      case 'C': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'D': return 'bg-orange-100 text-orange-800 border-orange-300';
      default: return 'bg-red-100 text-red-800 border-red-300';
    }
  };
  
  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }
  
  if (!companyData || !profileData || !analysisResult) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          Profildaten konnten nicht geladen werden.
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Keyword-Analyse</h1>
            <p className="text-gray-600 mt-1">
              Optimiere dein Profil für bessere Auffindbarkeit in der Suche
            </p>
          </div>
        </div>
        <button
          onClick={refreshAnalysis}
          className="flex items-center gap-2 px-4 py-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Aktualisieren
        </button>
      </div>
      
      {/* Info Banner */}
      <div className="bg-linear-to-r from-teal-50 to-blue-50 border border-teal-200 rounded-xl p-5 flex items-start gap-4">
        <div className="p-2 bg-teal-100 rounded-lg">
          <Sparkles className="w-5 h-5 text-teal-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">SEO-Optimierung wie bei Fiverr</h3>
          <p className="text-sm text-gray-700 mt-1">
            Die Keyword-Analyse hilft dir, dein Profil für die Suche zu optimieren. 
            Verwende relevante Keywords in deiner Beschreibung und füge Such-Tags hinzu, 
            um von mehr Kunden gefunden zu werden.
          </p>
        </div>
      </div>
      
      {/* Score Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Gesamt-Score */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 col-span-1 md:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">SEO-Score</p>
              <div className="flex items-baseline gap-3 mt-1">
                <span className={`text-4xl font-bold ${getScoreColor(analysisResult.score)}`}>
                  {analysisResult.score}
                </span>
                <span className="text-gray-500">/100</span>
              </div>
            </div>
            <div className={`w-16 h-16 rounded-full border-4 flex items-center justify-center ${getGradeColor(analysisResult.grade)}`}>
              <span className="text-2xl font-bold">{analysisResult.grade}</span>
            </div>
          </div>
          <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                analysisResult.score >= 70 ? 'bg-teal-500' : 
                analysisResult.score >= 40 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${analysisResult.score}%` }}
            />
          </div>
        </div>
        
        {/* Lesbarkeit */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <BookOpen className="w-4 h-4" />
            <span className="text-sm">Lesbarkeit</span>
          </div>
          <p className={`text-2xl font-bold ${getScoreColor(analysisResult.readabilityScore)}`}>
            {analysisResult.readabilityScore}%
          </p>
        </div>
        
        {/* Keyword-Dichte */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <BarChart3 className="w-4 h-4" />
            <span className="text-sm">Keyword-Dichte</span>
          </div>
          <p className={`text-2xl font-bold ${
            analysisResult.keywordDensity <= 3 ? 'text-green-600' :
            analysisResult.keywordDensity <= 5 ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {analysisResult.keywordDensity.toFixed(1)}%
          </p>
          <p className="text-xs text-gray-500 mt-1">Optimal: 2-3%</p>
        </div>
      </div>
      
      {/* Such-Tags Section */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-teal-600" />
            <h2 className="text-lg font-semibold text-gray-900">Such-Tags</h2>
            <span className="text-sm text-gray-500">({searchTags.length}/5)</span>
          </div>
          <button
            onClick={saveTags}
            disabled={saving}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 text-sm font-medium"
          >
            {saving ? 'Speichern...' : 'Tags speichern'}
          </button>
        </div>
        
        <p className="text-sm text-gray-600 mb-4">
          Such-Tags helfen Kunden, dich zu finden. Wähle bis zu 5 relevante Keywords.
        </p>
        
        {/* Aktuelle Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          {searchTags.map((tag) => (
            <span 
              key={tag}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-100 text-teal-800 rounded-full text-sm font-medium"
            >
              {tag}
              <button
                onClick={() => removeTag(tag)}
                className="hover:bg-teal-200 rounded-full p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
          {searchTags.length === 0 && (
            <span className="text-gray-500 text-sm">Noch keine Tags hinzugefügt</span>
          )}
        </div>
        
        {/* Tag hinzufügen */}
        {searchTags.length < 5 && (
          <div className="flex gap-2 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newTag.trim()) {
                    addTag(newTag);
                  }
                }}
                placeholder="Tag eingeben..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
            <button
              onClick={() => newTag.trim() && addTag(newTag)}
              disabled={!newTag.trim()}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        )}
        
        {/* Vorgeschlagene Tags */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-yellow-500" />
            Vorgeschlagene Tags
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestedTags
              .filter(tag => !searchTags.some(t => t.toLowerCase() === tag.toLowerCase()))
              .slice(0, 10)
              .map((tag) => (
                <button
                  key={tag}
                  onClick={() => addTag(tag)}
                  disabled={searchTags.length >= 5}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  {tag}
                </button>
              ))}
          </div>
        </div>
      </div>
      
      {/* Verbesserungsvorschläge */}
      {analysisResult.suggestions.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-teal-600" />
            <h2 className="text-lg font-semibold text-gray-900">Verbesserungsvorschläge</h2>
          </div>
          
          <div className="space-y-3">
            {analysisResult.suggestions.map((suggestion, index) => (
              <div 
                key={index}
                className={`p-4 rounded-lg border ${
                  suggestion.priority === 'high' 
                    ? 'bg-red-50 border-red-200' 
                    : suggestion.priority === 'medium'
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  {suggestion.priority === 'high' ? (
                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  ) : suggestion.priority === 'medium' ? (
                    <Info className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                  ) : (
                    <Lightbulb className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-medium text-gray-900">{suggestion.message}</p>
                    <p className="text-sm text-gray-600 mt-1">{suggestion.impact}</p>
                    {suggestion.keyword && (
                      <span className="inline-block mt-2 px-2 py-1 bg-white/50 rounded text-sm font-mono">
                        {suggestion.keyword}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Keyword-Analyse Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Kategorie-Keywords */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-teal-600" />
            <h3 className="font-semibold text-gray-900">Kategorie-Keywords</h3>
          </div>
          
          <div className="space-y-2">
            {analysisResult.categoryKeywords.slice(0, 8).map((kw) => (
              <div 
                key={kw.keyword}
                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
              >
                <div className="flex items-center gap-2">
                  {kw.found ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <X className="w-4 h-4 text-gray-300" />
                  )}
                  <span className={kw.found ? 'text-gray-900' : 'text-gray-500'}>
                    {kw.keyword}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {kw.count > 0 && (
                    <span className="text-xs text-gray-500">{kw.count}x</span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    kw.importance === 'high' 
                      ? 'bg-red-100 text-red-700'
                      : kw.importance === 'medium'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {kw.importance === 'high' ? 'Wichtig' : kw.importance === 'medium' ? 'Mittel' : 'Optional'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Fehlende Keywords */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <h3 className="font-semibold text-gray-900">Fehlende wichtige Keywords</h3>
          </div>
          
          {analysisResult.missingHighPriorityKeywords.length > 0 ? (
            <div className="space-y-2">
              {analysisResult.missingHighPriorityKeywords.map((keyword) => (
                <div 
                  key={keyword}
                  className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg"
                >
                  <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" />
                  <div>
                    <span className="font-medium text-gray-900">{keyword}</span>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Füge dieses Keyword zu deiner Beschreibung hinzu
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-green-800">Alle wichtigen Keywords sind vorhanden</span>
            </div>
          )}
          
          {/* Wettbewerbsfähige Keywords */}
          <div className="mt-6">
            <p className="text-sm font-medium text-gray-700 mb-2">Wettbewerbsfähige Keywords</p>
            <div className="flex flex-wrap gap-1.5">
              {analysisResult.competitiveKeywords.map((keyword) => (
                <span 
                  key={keyword}
                  className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Tipps */}
      <div className="bg-linear-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Lightbulb className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Profi-Tipps für besseres Ranking</h3>
            <ul className="mt-3 space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <span>Verwende deine wichtigsten Keywords in den ersten 100 Zeichen deiner Beschreibung</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <span>Nutze alle 5 Such-Tags und wähle eine Mischung aus allgemeinen und spezifischen Keywords</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <span>Erwähne deinen Standort in der Beschreibung für besseres lokales Ranking</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <span>Vermeide Keyword-Stuffing - schreibe natürlich und für Menschen, nicht für Suchmaschinen</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <span>Aktualisiere dein Profil regelmässig - aktive Profile ranken besser</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
