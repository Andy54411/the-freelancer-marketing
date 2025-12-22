'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Brain,
  Plus,
  Search,
  RefreshCw,
  Globe,
  Trash2,
  Edit,
  Save,
  X,
  ThumbsUp,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle,
  Loader2,
  BookOpen,
  TrendingUp,
  MessageSquare,
} from 'lucide-react';

interface KnowledgeEntry {
  id: string;
  question: string;
  answer: string;
  category: string;
  keywords: string[];
  priority: number;
  createdAt: string;
  updatedAt: string;
  usageCount: number;
  helpful: number;
  notHelpful: number;
  source: string;
  isActive: boolean;
}

interface Stats {
  total: number;
  active: number;
  byCategory: Record<string, number>;
  totalUsage: number;
  avgHelpfulRate: number;
}

const CATEGORIES = [
  { value: 'general', label: 'Allgemein' },
  { value: 'billing', label: 'Zahlung & Rechnung' },
  { value: 'technical', label: 'Technisch' },
  { value: 'account', label: 'Konto' },
  { value: 'webmail', label: 'Webmail' },
  { value: 'orders', label: 'Aufträge' },
  { value: 'platform', label: 'Plattform' },
];

export default function ChatbotKnowledgePage() {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlStatus, setCrawlStatus] = useState<{ count: number; pages: Array<{ url: string; title: string; lastCrawled: string }> } | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    category: 'general',
    keywords: '',
    priority: 5,
  });

  const fetchEntries = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (selectedCategory !== 'all') params.set('category', selectedCategory);

      const response = await fetch(`/api/admin/chatbot/knowledge?${params}`);
      const data = await response.json();

      if (data.success) {
        setEntries(data.entries);
        setStats(data.stats);
      }
    } catch {
      showNotification('error', 'Fehler beim Laden der Knowledge Base');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedCategory]);

  const fetchCrawlStatus = async () => {
    try {
      const response = await fetch('/api/admin/chatbot/crawl-website');
      const data = await response.json();
      if (data.success) {
        setCrawlStatus({ count: data.count, pages: data.pages });
      }
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    fetchEntries();
    fetchCrawlStatus();
  }, [fetchEntries]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleAddEntry = async () => {
    try {
      const response = await fetch('/api/admin/chatbot/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          keywords: formData.keywords.split(',').map(k => k.trim()).filter(Boolean),
        }),
      });

      const data = await response.json();
      if (data.success) {
        showNotification('success', 'Eintrag erfolgreich hinzugefügt');
        setShowAddForm(false);
        setFormData({ question: '', answer: '', category: 'general', keywords: '', priority: 5 });
        fetchEntries();
      } else {
        showNotification('error', data.error);
      }
    } catch {
      showNotification('error', 'Fehler beim Hinzufügen');
    }
  };

  const handleUpdateEntry = async (id: string, updates: Partial<KnowledgeEntry>) => {
    try {
      const response = await fetch(`/api/admin/chatbot/knowledge/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      const data = await response.json();
      if (data.success) {
        showNotification('success', 'Eintrag aktualisiert');
        setEditingId(null);
        fetchEntries();
      } else {
        showNotification('error', data.error);
      }
    } catch {
      showNotification('error', 'Fehler beim Aktualisieren');
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!confirm('Eintrag wirklich deaktivieren?')) return;

    try {
      const response = await fetch(`/api/admin/chatbot/knowledge/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        showNotification('success', 'Eintrag deaktiviert');
        fetchEntries();
      } else {
        showNotification('error', data.error);
      }
    } catch {
      showNotification('error', 'Fehler beim Löschen');
    }
  };

  const handleCrawlWebsite = async () => {
    setIsCrawling(true);
    try {
      const response = await fetch('/api/admin/chatbot/crawl-website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await response.json();
      if (data.success) {
        showNotification('success', data.message);
        fetchCrawlStatus();
      } else {
        showNotification('error', data.error);
      }
    } catch {
      showNotification('error', 'Fehler beim Crawlen');
    } finally {
      setIsCrawling(false);
    }
  };

  const handleInitialize = async () => {
    try {
      const response = await fetch('/api/admin/chatbot/initialize', {
        method: 'POST',
      });

      const data = await response.json();
      if (data.success) {
        showNotification('success', `Knowledge Base initialisiert: ${data.count} Einträge`);
        fetchEntries();
      } else {
        showNotification('error', data.error);
      }
    } catch {
      showNotification('error', 'Fehler beim Initialisieren');
    }
  };

  const getCategoryLabel = (value: string) => {
    return CATEGORIES.find(c => c.value === value)?.label || value;
  };

  const getHelpfulRate = (entry: KnowledgeEntry) => {
    const total = entry.helpful + entry.notHelpful;
    if (total === 0) return null;
    return Math.round((entry.helpful / total) * 100);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Brain className="text-teal-600" />
          Chatbot Knowledge Base
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Verwalte das Wissen deines Support-Chatbots
        </p>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${
          notification.type === 'success' 
            ? 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
            : 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-300'
        }`}>
          {notification.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          {notification.message}
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm">
              <BookOpen size={16} />
              Einträge
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {stats.active} / {stats.total}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm">
              <MessageSquare size={16} />
              Nutzungen
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {stats.totalUsage}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm">
              <TrendingUp size={16} />
              Hilfreich-Rate
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {Math.round(stats.avgHelpfulRate * 100)}%
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm">
              <Globe size={16} />
              Website-Seiten
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {crawlStatus?.count || 0}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
        >
          <Plus size={18} />
          Neuer Eintrag
        </button>
        <button
          onClick={handleCrawlWebsite}
          disabled={isCrawling}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isCrawling ? <Loader2 size={18} className="animate-spin" /> : <Globe size={18} />}
          Website crawlen
        </button>
        <button
          onClick={handleInitialize}
          className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          <RefreshCw size={18} />
          Initialisieren
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow mb-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Neuen Eintrag hinzufügen</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Frage</label>
              <input
                type="text"
                value={formData.question}
                onChange={e => setFormData({ ...formData, question: e.target.value })}
                className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Wie kann ich mein Passwort ändern?"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Antwort</label>
              <textarea
                value={formData.answer}
                onChange={e => setFormData({ ...formData, answer: e.target.value })}
                className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                rows={3}
                placeholder="Gehe zu Einstellungen > Sicherheit > Passwort ändern..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kategorie</label>
              <select
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priorität (1-10)</label>
              <input
                type="number"
                min={1}
                max={10}
                value={formData.priority}
                onChange={e => setFormData({ ...formData, priority: parseInt(e.target.value) || 5 })}
                className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Keywords (kommagetrennt)</label>
              <input
                type="text"
                value={formData.keywords}
                onChange={e => setFormData({ ...formData, keywords: e.target.value })}
                className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="passwort, ändern, zurücksetzen, sicherheit"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleAddEntry}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
            >
              <Save size={18} />
              Speichern
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300"
            >
              <X size={18} />
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Suchen..."
            />
          </div>
        </div>
        <select
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value)}
          className="px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        >
          <option value="all">Alle Kategorien</option>
          {CATEGORIES.map(cat => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>
      </div>

      {/* Entries List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-teal-600" size={32} />
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <BookOpen size={48} className="mx-auto mb-4 opacity-50" />
          <p>Keine Einträge gefunden</p>
          <button
            onClick={handleInitialize}
            className="mt-4 text-teal-600 hover:underline"
          >
            Knowledge Base initialisieren
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map(entry => (
            <KnowledgeEntryCard
              key={entry.id}
              entry={entry}
              isEditing={editingId === entry.id}
              onEdit={() => setEditingId(entry.id)}
              onSave={(updates) => handleUpdateEntry(entry.id, updates)}
              onCancel={() => setEditingId(null)}
              onDelete={() => handleDeleteEntry(entry.id)}
              getCategoryLabel={getCategoryLabel}
              getHelpfulRate={getHelpfulRate}
            />
          ))}
        </div>
      )}

      {/* Website Content Preview */}
      {crawlStatus && crawlStatus.pages.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Globe size={20} />
            Gecrawlte Website-Inhalte
          </h2>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {crawlStatus.pages.map((page, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{page.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">{page.url}</p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(page.lastCrawled).toLocaleDateString('de-DE')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface EntryCardProps {
  entry: KnowledgeEntry;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (updates: Partial<KnowledgeEntry>) => void;
  onCancel: () => void;
  onDelete: () => void;
  getCategoryLabel: (value: string) => string;
  getHelpfulRate: (entry: KnowledgeEntry) => number | null;
}

function KnowledgeEntryCard({ entry, isEditing, onEdit, onSave, onCancel, onDelete, getCategoryLabel, getHelpfulRate }: EntryCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [editedEntry, setEditedEntry] = useState(entry);

  const helpfulRate = getHelpfulRate(entry);

  if (isEditing) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow border-2 border-teal-500">
        <div className="space-y-3">
          <input
            type="text"
            value={editedEntry.question}
            onChange={e => setEditedEntry({ ...editedEntry, question: e.target.value })}
            className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
          <textarea
            value={editedEntry.answer}
            onChange={e => setEditedEntry({ ...editedEntry, answer: e.target.value })}
            className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            rows={3}
          />
          <div className="flex gap-3">
            <button
              onClick={() => onSave({ question: editedEntry.question, answer: editedEntry.answer })}
              className="flex items-center gap-2 px-3 py-1 bg-teal-600 text-white rounded hover:bg-teal-700"
            >
              <Save size={16} />
              Speichern
            </button>
            <button
              onClick={onCancel}
              className="flex items-center gap-2 px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              <X size={16} />
              Abbrechen
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg p-4 shadow ${!entry.isActive ? 'opacity-50' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 text-xs rounded">
              {getCategoryLabel(entry.category)}
            </span>
            <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded">
              P{entry.priority}
            </span>
            {entry.source !== 'manual' && (
              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs rounded">
                {entry.source}
              </span>
            )}
          </div>
          <h3 className="font-medium text-gray-900 dark:text-white">{entry.question}</h3>
          {expanded && (
            <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm">{entry.answer}</p>
          )}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-gray-400 hover:text-gray-600 ml-2"
        >
          {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <MessageSquare size={14} />
              {entry.usageCount}x verwendet
            </span>
            {helpfulRate !== null && (
              <span className="flex items-center gap-1">
                <ThumbsUp size={14} />
                {helpfulRate}% hilfreich
              </span>
            )}
            {entry.keywords.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {entry.keywords.slice(0, 5).map((kw, i) => (
                  <span key={i} className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                    {kw}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={onEdit}
              className="flex items-center gap-1 px-2 py-1 text-gray-600 hover:text-teal-600 dark:text-gray-400 dark:hover:text-teal-400"
            >
              <Edit size={14} />
              Bearbeiten
            </button>
            <button
              onClick={onDelete}
              className="flex items-center gap-1 px-2 py-1 text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
            >
              <Trash2 size={14} />
              Deaktivieren
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
