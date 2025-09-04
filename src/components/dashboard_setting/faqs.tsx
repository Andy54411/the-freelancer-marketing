'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { UserDataForSettings } from '@/components/dashboard/SettingsComponent';

export interface FAQsFormProps {
  formData: UserDataForSettings;
  handleChange: (path: string, value: any) => void;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category?: string;
  order?: number;
  featured?: boolean;
}

const FAQsForm: React.FC<FAQsFormProps> = ({ formData, handleChange }) => {
  // Initialize FAQs from formData only once on mount
  const [faqs, setFaqs] = useState<FAQ[]>(() => {
    return formData.step3?.faqs && Array.isArray(formData.step3.faqs) 
      ? formData.step3.faqs 
      : [];
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newFAQ, setNewFAQ] = useState<FAQ>({
    id: '',
    question: '',
    answer: '',
    category: '',
    featured: false
  });
  const [isAdding, setIsAdding] = useState(false);

  // Update formData when FAQs change (use a ref to track if we should update)
  const shouldUpdateFormData = useRef(false);
  
  useEffect(() => {
    // Mark that we should start updating form data after first render
    shouldUpdateFormData.current = true;
  }, []);

  useEffect(() => {
    if (shouldUpdateFormData.current) {
      handleChange('step3.faqs', faqs);
    }
  }, [faqs]);

  const addFAQ = () => {
    if (newFAQ.question.trim() && newFAQ.answer.trim()) {
      const faq: FAQ = {
        ...newFAQ,
        id: Date.now().toString(),
        order: faqs.length
      };
      setFaqs([...faqs, faq]);
      setNewFAQ({ id: '', question: '', answer: '', category: '', featured: false });
      setIsAdding(false);
    }
  };

  const deleteFAQ = (id: string) => {
    setFaqs(faqs.filter(faq => faq.id !== id));
  };

  const startEdit = (faq: FAQ) => {
    setEditingId(faq.id);
  };

  const saveEdit = (id: string, updatedFAQ: Partial<FAQ>) => {
    setFaqs(faqs.map(faq => 
      faq.id === id ? { ...faq, ...updatedFAQ } : faq
    ));
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const toggleFeatured = (id: string) => {
    setFaqs(faqs.map(faq => 
      faq.id === id ? { ...faq, featured: !faq.featured } : faq
    ));
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Häufig gestellte Fragen (FAQs)
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Erstellen Sie FAQs, um häufige Kundenfragen zu beantworten
          </p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center px-4 py-2 bg-[#14ad9f] text-white rounded-lg hover:bg-[#129488] transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          FAQ hinzufügen
        </button>
      </div>

      {/* Add New FAQ Form */}
      {isAdding && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Frage *
              </label>
              <input
                type="text"
                value={newFAQ.question}
                onChange={(e) => setNewFAQ({ ...newFAQ, question: e.target.value })}
                placeholder="z.B. Wie lange dauert die Lieferung?"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f] dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Antwort *
              </label>
              <textarea
                value={newFAQ.answer}
                onChange={(e) => setNewFAQ({ ...newFAQ, answer: e.target.value })}
                placeholder="Ihre detaillierte Antwort..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f] dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Kategorie
                </label>
                <input
                  type="text"
                  value={newFAQ.category}
                  onChange={(e) => setNewFAQ({ ...newFAQ, category: e.target.value })}
                  placeholder="z.B. Lieferung, Preise, etc."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f] dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newFAQ.featured}
                    onChange={(e) => setNewFAQ({ ...newFAQ, featured: e.target.checked })}
                    className="mr-2 text-[#14ad9f] focus:ring-[#14ad9f]"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Als Featured markieren
                  </span>
                </label>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={addFAQ}
                disabled={!newFAQ.question.trim() || !newFAQ.answer.trim()}
                className="flex items-center px-4 py-2 bg-[#14ad9f] text-white rounded-lg hover:bg-[#129488] disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                <Save className="w-4 h-4 mr-2" />
                Hinzufügen
              </button>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setNewFAQ({ id: '', question: '', answer: '', category: '', featured: false });
                }}
                className="flex items-center px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                <X className="w-4 h-4 mr-2" />
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAQs List */}
      <div className="space-y-4">
        {faqs.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>Noch keine FAQs erstellt.</p>
            <p className="text-sm">Klicken Sie auf &quot;FAQ hinzufügen&quot;, um zu beginnen.</p>
          </div>
        ) : (
          faqs.map((faq) => (
            <FAQItem
              key={faq.id}
              faq={faq}
              isEditing={editingId === faq.id}
              onEdit={startEdit}
              onSave={saveEdit}
              onCancel={cancelEdit}
              onDelete={deleteFAQ}
              onToggleFeatured={toggleFeatured}
            />
          ))
        )}
      </div>

      {faqs.length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                FAQ-Verwaltung
              </h3>
              <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                <p>
                  Ihre FAQs werden automatisch auf Ihrem Profil angezeigt und helfen Kunden, 
                  schnell Antworten auf ihre Fragen zu finden. Featured FAQs werden prominent angezeigt.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// FAQ Item Component
interface FAQItemProps {
  faq: FAQ;
  isEditing: boolean;
  onEdit: (faq: FAQ) => void;
  onSave: (id: string, updatedFAQ: Partial<FAQ>) => void;
  onCancel: () => void;
  onDelete: (id: string) => void;
  onToggleFeatured: (id: string) => void;
}

const FAQItem: React.FC<FAQItemProps> = ({
  faq,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onToggleFeatured
}) => {
  const [editData, setEditData] = useState(faq);

  useEffect(() => {
    setEditData(faq);
  }, [faq, isEditing]);

  if (isEditing) {
    return (
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-yellow-50 dark:bg-yellow-900/20">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Frage
            </label>
            <input
              type="text"
              value={editData.question}
              onChange={(e) => setEditData({ ...editData, question: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f] dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Antwort
            </label>
            <textarea
              value={editData.answer}
              onChange={(e) => setEditData({ ...editData, answer: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f] dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Kategorie
              </label>
              <input
                type="text"
                value={editData.category || ''}
                onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f] dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={editData.featured || false}
                  onChange={(e) => setEditData({ ...editData, featured: e.target.checked })}
                  className="mr-2 text-[#14ad9f] focus:ring-[#14ad9f]"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Featured</span>
              </label>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onSave(faq.id, editData)}
              disabled={!editData.question.trim() || !editData.answer.trim()}
              className="flex items-center px-3 py-1.5 bg-[#14ad9f] text-white rounded hover:bg-[#129488] disabled:bg-gray-400 disabled:cursor-not-allowed text-sm transition-colors"
            >
              <Save className="w-4 h-4 mr-1" />
              Übernehmen
            </button>
            <button
              onClick={onCancel}
              className="flex items-center px-3 py-1.5 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm transition-colors"
            >
              <X className="w-4 h-4 mr-1" />
              Abbrechen
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-medium text-gray-900 dark:text-white">
              {faq.question}
            </h3>
            {faq.featured && (
              <span className="px-2 py-1 bg-[#14ad9f] text-white text-xs rounded-full">
                Featured
              </span>
            )}
            {faq.category && (
              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-full">
                {faq.category}
              </span>
            )}
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
            {faq.answer}
          </p>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={() => onToggleFeatured(faq.id)}
            className={`p-1.5 rounded text-xs transition-colors ${
              faq.featured 
                ? 'bg-[#14ad9f] text-white hover:bg-[#129488]' 
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
            title={faq.featured ? 'Als Featured entfernen' : 'Als Featured markieren'}
          >
            ★
          </button>
          <button
            onClick={() => onEdit(faq)}
            className="p-1.5 text-gray-600 dark:text-gray-300 hover:text-[#14ad9f] transition-colors"
            title="Bearbeiten"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(faq.id)}
            className="p-1.5 text-gray-600 dark:text-gray-300 hover:text-red-600 transition-colors"
            title="Löschen"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default FAQsForm;
