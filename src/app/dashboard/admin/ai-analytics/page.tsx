'use client';

import { useState, useEffect } from 'react';
import { AIFeedbackService } from '@/services/AIFeedbackService';
import type { AIFeedback, PromptStatistics } from '@/config/ai-prompts';
import { categoryPromptExtensions, subcategoryPromptExtensions } from '@/config/ai-prompts';
import {
  ThumbsUp,
  ThumbsDown,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Layers,
} from 'lucide-react';

export default function AIPromptAnalyticsPage() {
  const [statistics, setStatistics] = useState<PromptStatistics | null>(null);
  const [feedbacks, setFeedbacks] = useState<AIFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'good' | 'bad'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [expandedFeedback, setExpandedFeedback] = useState<string | null>(null);

  // Alle verfügbaren Kategorien aus den Prompt-Erweiterungen
  const availableCategories = Object.keys(categoryPromptExtensions).filter(k => k !== 'default');

  const loadData = async () => {
    setLoading(true);
    try {
      const [stats, allFeedback] = await Promise.all([
        AIFeedbackService.getStatistics(),
        AIFeedbackService.getAllFeedback(200),
      ]);
      setStatistics(stats);
      setFeedbacks(allFeedback);
    } catch (error) {
      console.error('Fehler beim Laden der Daten:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Gefilterte Feedbacks
  const filteredFeedbacks = feedbacks.filter(fb => {
    if (filter !== 'all' && fb.rating !== filter) return false;
    if (categoryFilter !== 'all' && fb.category !== categoryFilter) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-teal-600" />
            Taskilo KI Analytics
          </h1>
          <p className="text-gray-600 mt-1">
            Analyse und Optimierung der KI-generierten Inhalte
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
        >
          <RefreshCw className="w-4 h-4" />
          Aktualisieren
        </button>
      </div>

      {/* Statistik-Karten */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Gesamt */}
          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Gesamt Generierungen</p>
                <p className="text-3xl font-bold text-gray-900">{statistics.totalGenerations}</p>
              </div>
              <BarChart3 className="w-10 h-10 text-gray-400" />
            </div>
          </div>

          {/* Erfolgsrate */}
          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Erfolgsrate</p>
                <p className="text-3xl font-bold text-teal-600">{statistics.successRate}%</p>
              </div>
              {statistics.successRate >= 70 ? (
                <TrendingUp className="w-10 h-10 text-green-500" />
              ) : (
                <TrendingDown className="w-10 h-10 text-red-500" />
              )}
            </div>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-teal-500 rounded-full"
                style={{ width: `${statistics.successRate}%` }}
              ></div>
            </div>
          </div>

          {/* Positive Bewertungen */}
          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Positiv bewertet</p>
                <p className="text-3xl font-bold text-green-600">{statistics.goodRatings}</p>
              </div>
              <ThumbsUp className="w-10 h-10 text-green-400" />
            </div>
          </div>

          {/* Negative Bewertungen */}
          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Negativ bewertet</p>
                <p className="text-3xl font-bold text-red-600">{statistics.badRatings}</p>
              </div>
              <ThumbsDown className="w-10 h-10 text-red-400" />
            </div>
          </div>
        </div>
      )}

      {/* Kategorie-Analyse */}
      {statistics && Object.keys(statistics.byCategory).length > 0 && (
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Erfolgsrate nach Kategorie</h2>
          <div className="space-y-3">
            {Object.entries(statistics.byCategory)
              .sort((a, b) => b[1].total - a[1].total)
              .map(([category, data]) => {
                const rate = data.total > 0 ? Math.round((data.good / data.total) * 100) : 0;
                return (
                  <div key={category} className="flex items-center gap-4">
                    <div className="w-48 font-medium text-gray-700 truncate">{category}</div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${rate >= 70 ? 'bg-green-500' : rate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${rate}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="w-24 text-right">
                      <span className={`font-semibold ${rate >= 70 ? 'text-green-600' : rate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {rate}%
                      </span>
                      <span className="text-gray-400 text-sm ml-1">({data.total})</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Subkategorie-Analyse */}
      {statistics && statistics.bySubcategory && Object.keys(statistics.bySubcategory).length > 0 && (
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Layers className="w-5 h-5 text-teal-600" />
            Erfolgsrate nach Subkategorie
          </h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {Object.entries(statistics.bySubcategory)
              .sort((a, b) => b[1].total - a[1].total)
              .map(([subcategory, data]) => {
                const rate = data.total > 0 ? Math.round((data.good / data.total) * 100) : 0;
                const hasCustomPrompt = subcategoryPromptExtensions[subcategory.toLowerCase()];
                return (
                  <div key={subcategory} className="flex items-center gap-4">
                    <div className="w-48 font-medium text-gray-700 truncate flex items-center gap-1">
                      {subcategory}
                      {hasCustomPrompt && (
                        <span className="inline-block w-2 h-2 bg-teal-500 rounded-full" title="Hat spezifischen Prompt" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${rate >= 70 ? 'bg-green-500' : rate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${rate}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="w-24 text-right">
                      <span className={`font-semibold ${rate >= 70 ? 'text-green-600' : rate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {rate}%
                      </span>
                      <span className="text-gray-400 text-sm ml-1">({data.total})</span>
                    </div>
                  </div>
                );
              })}
          </div>
          <div className="mt-4 pt-4 border-t text-sm text-gray-500">
            <span className="inline-block w-2 h-2 bg-teal-500 rounded-full mr-1"></span>
            = Hat spezifischen Subkategorie-Prompt ({Object.keys(subcategoryPromptExtensions).length} konfiguriert)
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-600">Filter:</span>
        </div>
        
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as 'all' | 'good' | 'bad')}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="all">Alle Bewertungen</option>
          <option value="good">Nur Positiv</option>
          <option value="bad">Nur Negativ</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="all">Alle Kategorien</option>
          {availableCategories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        <span className="text-sm text-gray-500">
          {filteredFeedbacks.length} Ergebnisse
        </span>
      </div>

      {/* Feedback-Liste */}
      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Feedback-Details</h2>
        </div>
        
        {filteredFeedbacks.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Noch keine Feedbacks vorhanden
          </div>
        ) : (
          <div className="divide-y">
            {filteredFeedbacks.map((fb) => (
              <div key={fb.id} className="p-4">
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedFeedback(expandedFeedback === fb.id ? null : fb.id || null)}
                >
                  <div className="flex items-center gap-3">
                    {fb.rating === 'good' ? (
                      <ThumbsUp className="w-5 h-5 text-green-500" />
                    ) : (
                      <ThumbsDown className="w-5 h-5 text-red-500" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{fb.category} - {fb.subcategory}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(fb.createdAt).toLocaleDateString('de-DE', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                  {expandedFeedback === fb.id ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                
                {expandedFeedback === fb.id && (
                  <div className="mt-4 space-y-4 pl-8">
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Nutzer-Input:</p>
                      <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{fb.userInput}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Generierte Ausgabe:</p>
                      <div 
                        className="text-gray-700 bg-gray-50 p-3 rounded-lg prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: fb.generatedOutput }}
                      />
                    </div>
                    {fb.feedback && (
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">Zusätzliches Feedback:</p>
                        <p className="text-gray-700 bg-yellow-50 p-3 rounded-lg">{fb.feedback}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Prompt-Konfiguration Hinweis */}
      <div className="bg-teal-50 border border-teal-200 rounded-lg p-6">
        <h3 className="font-semibold text-teal-900 mb-2">Prompt-Konfiguration</h3>
        <p className="text-teal-700 text-sm mb-3">
          Die Prompts werden zentral in <code className="bg-teal-100 px-1 rounded">src/config/ai-prompts.ts</code> verwaltet.
          Dort können kategorie- und subkategorie-spezifische Anpassungen vorgenommen werden.
        </p>
        <div className="flex gap-6 text-sm text-teal-600">
          <span>Hauptkategorien: {availableCategories.length}</span>
          <span>Subkategorien: {Object.keys(subcategoryPromptExtensions).length}</span>
        </div>
      </div>
    </div>
  );
}
