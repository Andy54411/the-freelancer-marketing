'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BookOpen,
  Plus,
  Trash2,
  Save,
  Edit3,
  CheckCircle,
  AlertCircle,
  Search,
  Tag,
  X,
} from 'lucide-react';
import { db } from '@/firebase/clients';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
} from 'firebase/firestore';

interface KnowledgeEntry {
  id: string;
  question: string;
  answer: string;
  category: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ChatbotKnowledgeEditorProps {
  companyId: string;
}

const DEFAULT_CATEGORIES = [
  'Allgemein',
  'Produkte',
  'Preise',
  'Lieferung',
  'Rückgabe',
  'Öffnungszeiten',
  'Kontakt',
  'Zahlungen',
];

export default function ChatbotKnowledgeEditor({ companyId }: ChatbotKnowledgeEditorProps) {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Formular-State
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    category: 'Allgemein',
    isActive: true,
  });

  const loadEntries = useCallback(async () => {
    if (!companyId) return;

    try {
      setLoading(true);
      const q = query(
        collection(db, 'companies', companyId, 'whatsappChatbotKnowledge'),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      
      const loadedEntries: KnowledgeEntry[] = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
        createdAt: docSnap.data().createdAt?.toDate?.() || new Date(),
        updatedAt: docSnap.data().updatedAt?.toDate?.() || new Date(),
      })) as KnowledgeEntry[];

      setEntries(loadedEntries);
    } catch {
      setError('Wissensdatenbank konnte nicht geladen werden');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const addEntry = async () => {
    if (!formData.question.trim() || !formData.answer.trim()) {
      setError('Frage und Antwort sind erforderlich');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const newEntry = {
        ...formData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const docRef = await addDoc(
        collection(db, 'companies', companyId, 'whatsappChatbotKnowledge'),
        newEntry
      );

      setEntries(prev => [{
        id: docRef.id,
        ...newEntry,
      }, ...prev]);

      setFormData({
        question: '',
        answer: '',
        category: 'Allgemein',
        isActive: true,
      });
      setShowAddForm(false);
    } catch {
      setError('Eintrag konnte nicht gespeichert werden');
    } finally {
      setSaving(false);
    }
  };

  const updateEntry = async (entry: KnowledgeEntry) => {
    try {
      setSaving(true);
      setError(null);

      await updateDoc(
        doc(db, 'companies', companyId, 'whatsappChatbotKnowledge', entry.id),
        {
          question: entry.question,
          answer: entry.answer,
          category: entry.category,
          isActive: entry.isActive,
          updatedAt: new Date(),
        }
      );

      setEntries(prev =>
        prev.map(e => (e.id === entry.id ? { ...entry, updatedAt: new Date() } : e))
      );
      setEditingId(null);
    } catch {
      setError('Eintrag konnte nicht aktualisiert werden');
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = async (id: string) => {
    if (!confirm('Möchten Sie diesen Eintrag wirklich löschen?')) return;

    try {
      await deleteDoc(doc(db, 'companies', companyId, 'whatsappChatbotKnowledge', id));
      setEntries(prev => prev.filter(e => e.id !== id));
    } catch {
      setError('Eintrag konnte nicht gelöscht werden');
    }
  };

  const toggleActive = async (entry: KnowledgeEntry) => {
    try {
      await updateDoc(
        doc(db, 'companies', companyId, 'whatsappChatbotKnowledge', entry.id),
        {
          isActive: !entry.isActive,
          updatedAt: new Date(),
        }
      );

      setEntries(prev =>
        prev.map(e =>
          e.id === entry.id ? { ...e, isActive: !e.isActive, updatedAt: new Date() } : e
        )
      );
    } catch {
      setError('Status konnte nicht geändert werden');
    }
  };

  // Gefilterte Einträge
  const filteredEntries = entries.filter(entry => {
    const matchesSearch =
      entry.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !filterCategory || entry.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  // Einzigartige Kategorien aus den Einträgen
  const usedCategories = [...new Set(entries.map(e => e.category))];
  const allCategories = [...new Set([...DEFAULT_CATEGORIES, ...usedCategories])].sort();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Wissensdatenbank</h2>
              <p className="text-sm text-gray-500">FAQ und Antworten für den KI-Chatbot</p>
            </div>
          </div>

          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#14ad9f] text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Neuer Eintrag
          </button>
        </div>
      </div>

      {/* Suchleiste und Filter */}
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Fragen oder Antworten durchsuchen..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none"
            />
          </div>

          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none"
          >
            <option value="">Alle Kategorien</option>
            {allCategories.map(cat => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <div className="text-sm text-gray-500">
            {filteredEntries.length} von {entries.length} Einträgen
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Neuer Eintrag Formular */}
      {showAddForm && (
        <div className="mx-6 mt-4 p-4 bg-teal-50 border border-teal-200 rounded-xl">
          <h3 className="font-medium text-gray-900 mb-4">Neuer Wissenseintrag</h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Kategorie</label>
                <select
                  value={formData.category}
                  onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none"
                >
                  {allCategories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={e => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="rounded border-gray-300 text-[#14ad9f] focus:ring-[#14ad9f]"
                  />
                  <span className="text-sm text-gray-700">Aktiv</span>
                </label>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Frage / Stichwort</label>
              <input
                type="text"
                value={formData.question}
                onChange={e => setFormData(prev => ({ ...prev, question: e.target.value }))}
                placeholder="z.B. Was sind die Lieferzeiten?"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Antwort</label>
              <textarea
                value={formData.answer}
                onChange={e => setFormData(prev => ({ ...prev, answer: e.target.value }))}
                rows={4}
                placeholder="Die Antwort, die der Chatbot geben soll..."
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setFormData({
                    question: '',
                    answer: '',
                    category: 'Allgemein',
                    isActive: true,
                  });
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={addEntry}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-[#14ad9f] text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Einträge Liste */}
      <div className="p-6">
        {filteredEntries.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Keine Einträge gefunden</p>
            {searchTerm || filterCategory ? (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterCategory('');
                }}
                className="mt-2 text-[#14ad9f] text-sm hover:underline"
              >
                Filter zurücksetzen
              </button>
            ) : (
              <p className="text-sm mt-1">Fügen Sie Wissen hinzu, damit der Chatbot antworten kann</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEntries.map(entry => (
              <div
                key={entry.id}
                className={`p-4 rounded-xl border transition-colors ${
                  entry.isActive
                    ? 'border-gray-200 bg-white'
                    : 'border-gray-100 bg-gray-50 opacity-60'
                }`}
              >
                {editingId === entry.id ? (
                  // Bearbeitungsmodus
                  <EditEntryForm
                    entry={entry}
                    categories={allCategories}
                    onSave={updateEntry}
                    onCancel={() => setEditingId(null)}
                    saving={saving}
                  />
                ) : (
                  // Ansichtsmodus
                  <div>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                          <Tag className="w-3 h-3" />
                          {entry.category}
                        </span>
                        {!entry.isActive && (
                          <span className="inline-flex items-center px-2 py-0.5 bg-gray-200 text-gray-600 rounded text-xs">
                            Inaktiv
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleActive(entry)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            entry.isActive
                              ? 'text-green-600 hover:bg-green-50'
                              : 'text-gray-400 hover:bg-gray-100'
                          }`}
                          title={entry.isActive ? 'Deaktivieren' : 'Aktivieren'}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingId(entry.id)}
                          className="p-1.5 text-gray-400 hover:text-[#14ad9f] hover:bg-teal-50 rounded-lg transition-colors"
                          title="Bearbeiten"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteEntry(entry.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Löschen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <h4 className="font-medium text-gray-900 mb-2">{entry.question}</h4>
                    <p className="text-sm text-gray-600 whitespace-pre-line">{entry.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Bearbeitungsformular-Komponente
function EditEntryForm({
  entry,
  categories,
  onSave,
  onCancel,
  saving,
}: {
  entry: KnowledgeEntry;
  categories: string[];
  onSave: (entry: KnowledgeEntry) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [editData, setEditData] = useState({
    question: entry.question,
    answer: entry.answer,
    category: entry.category,
    isActive: entry.isActive,
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Kategorie</label>
          <select
            value={editData.category}
            onChange={e => setEditData(prev => ({ ...prev, category: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={editData.isActive}
              onChange={e => setEditData(prev => ({ ...prev, isActive: e.target.checked }))}
              className="rounded border-gray-300 text-[#14ad9f] focus:ring-[#14ad9f]"
            />
            <span className="text-sm text-gray-700">Aktiv</span>
          </label>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block">Frage / Stichwort</label>
        <input
          type="text"
          value={editData.question}
          onChange={e => setEditData(prev => ({ ...prev, question: e.target.value }))}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block">Antwort</label>
        <textarea
          value={editData.answer}
          onChange={e => setEditData(prev => ({ ...prev, answer: e.target.value }))}
          rows={4}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none"
        />
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm transition-colors"
        >
          Abbrechen
        </button>
        <button
          onClick={() => onSave({ ...entry, ...editData })}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-[#14ad9f] text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
        >
          {saving ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Speichern
        </button>
      </div>
    </div>
  );
}
