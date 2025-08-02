'use client';

import React, { useState } from 'react';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import { toast } from 'sonner';
import { ProfileTabProps, FAQ } from './types';

const FAQManager: React.FC<ProfileTabProps> = ({ profile, setProfile }) => {
  const [newFAQ, setNewFAQ] = useState({ question: '', answer: '' });

  const addFAQ = () => {
    if (!newFAQ.question.trim() || !newFAQ.answer.trim()) {
      toast.error('Bitte fülle Frage und Antwort aus');
      return;
    }

    const faq: FAQ = {
      id: Date.now().toString(),
      question: newFAQ.question,
      answer: newFAQ.answer,
    };

    setProfile(prev =>
      prev
        ? {
            ...prev,
            faqs: [...prev.faqs, faq],
          }
        : null
    );

    setNewFAQ({ question: '', answer: '' });
    toast.success('FAQ hinzugefügt');
  };

  const removeFAQ = (id: string) => {
    setProfile(prev =>
      prev
        ? {
            ...prev,
            faqs: prev.faqs.filter(faq => faq.id !== id),
          }
        : null
    );
  };

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Häufig gestellte Fragen (FAQ)</h3>

      {/* Bestehende FAQs */}
      <div className="space-y-4 mb-4">
        {profile.faqs.map(faq => (
          <div key={faq.id} className="bg-white border rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">{faq.question}</h4>
            <p className="text-gray-600 mb-2">{faq.answer}</p>
            <button
              onClick={() => removeFAQ(faq.id)}
              className="text-red-600 hover:text-red-800 text-sm"
            >
              <FiTrash2 className="inline mr-1" /> Entfernen
            </button>
          </div>
        ))}
      </div>

      {/* Neue FAQ hinzufügen */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-semibold text-gray-900 mb-4">Neue FAQ hinzufügen</h4>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Frage"
            value={newFAQ.question}
            onChange={e => setNewFAQ(prev => ({ ...prev, question: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
          />
          <textarea
            placeholder="Antwort"
            value={newFAQ.answer}
            onChange={e => setNewFAQ(prev => ({ ...prev, answer: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
            rows={3}
          />
          <button
            onClick={addFAQ}
            className="bg-[#14ad9f] text-white px-4 py-2 rounded-md hover:bg-[#129488] transition-colors flex items-center gap-2"
          >
            <FiPlus /> Hinzufügen
          </button>
        </div>
      </div>
    </div>
  );
};

export default FAQManager;
