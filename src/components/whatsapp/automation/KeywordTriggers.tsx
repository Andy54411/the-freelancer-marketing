/**
 * KeywordTriggers Component
 * 
 * Verwaltung von Keyword-basierten Auto-Antworten
 */
'use client';

import React from 'react';
import { Plus, Trash2, Edit2, Check, X, Zap, MessageSquare } from 'lucide-react';

interface KeywordTrigger {
  id: string;
  keywords: string[];
  response: string;
  matchType: 'exact' | 'contains' | 'startsWith';
  isActive: boolean;
  priority: number;
}

interface KeywordTriggersProps {
  triggers: KeywordTrigger[];
  onAdd: (trigger: Omit<KeywordTrigger, 'id'>) => void;
  onUpdate: (id: string, trigger: Partial<KeywordTrigger>) => void;
  onDelete: (id: string) => void;
  disabled?: boolean;
}

export function KeywordTriggers({ triggers, onAdd, onUpdate, onDelete, disabled }: KeywordTriggersProps) {
  const [isAdding, setIsAdding] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({
    keywords: '',
    response: '',
    matchType: 'contains' as 'exact' | 'contains' | 'startsWith',
    priority: 0,
  });

  const resetForm = () => {
    setForm({
      keywords: '',
      response: '',
      matchType: 'contains',
      priority: 0,
    });
  };

  const handleAdd = () => {
    if (!form.keywords.trim() || !form.response.trim()) return;
    
    onAdd({
      keywords: form.keywords.split(',').map(k => k.trim()).filter(Boolean),
      response: form.response,
      matchType: form.matchType,
      isActive: true,
      priority: form.priority,
    });
    
    resetForm();
    setIsAdding(false);
  };

  const handleEdit = (trigger: KeywordTrigger) => {
    setEditingId(trigger.id);
    setForm({
      keywords: trigger.keywords.join(', '),
      response: trigger.response,
      matchType: trigger.matchType,
      priority: trigger.priority,
    });
  };

  const handleSaveEdit = (id: string) => {
    onUpdate(id, {
      keywords: form.keywords.split(',').map(k => k.trim()).filter(Boolean),
      response: form.response,
      matchType: form.matchType,
      priority: form.priority,
    });
    setEditingId(null);
    resetForm();
  };

  const matchTypeLabels = {
    exact: 'Exakt',
    contains: 'Enthält',
    startsWith: 'Beginnt mit',
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-[#14ad9f]" />
          <h3 className="font-medium">Keyword-Trigger</h3>
        </div>
        {!disabled && !isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-[#14ad9f] text-white rounded-lg hover:bg-teal-600"
          >
            <Plus className="w-4 h-4" />
            Hinzufügen
          </button>
        )}
      </div>

      {/* Add Form */}
      {isAdding && (
        <div className="border border-[#14ad9f] rounded-lg p-4 bg-[#14ad9f]/5">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Keywords (kommagetrennt)</label>
              <input
                type="text"
                value={form.keywords}
                onChange={(e) => setForm(f => ({ ...f, keywords: e.target.value }))}
                placeholder="hallo, hi, guten tag"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14ad9f]/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Antwort</label>
              <textarea
                value={form.response}
                onChange={(e) => setForm(f => ({ ...f, response: e.target.value }))}
                placeholder="Hallo! Wie kann ich Ihnen helfen?"
                rows={3}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14ad9f]/20"
              />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Match-Typ</label>
                <select
                  value={form.matchType}
                  onChange={(e) => setForm(f => ({ ...f, matchType: e.target.value as typeof form.matchType }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14ad9f]/20"
                >
                  <option value="contains">Enthält</option>
                  <option value="exact">Exakt</option>
                  <option value="startsWith">Beginnt mit</option>
                </select>
              </div>
              <div className="w-24">
                <label className="block text-sm font-medium mb-1">Priorität</label>
                <input
                  type="number"
                  value={form.priority}
                  onChange={(e) => setForm(f => ({ ...f, priority: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14ad9f]/20"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => { setIsAdding(false); resetForm(); }}
              className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Abbrechen
            </button>
            <button
              onClick={handleAdd}
              className="px-3 py-1.5 bg-[#14ad9f] text-white rounded-lg hover:bg-teal-600"
            >
              Speichern
            </button>
          </div>
        </div>
      )}

      {/* Trigger List */}
      {triggers.length === 0 && !isAdding ? (
        <div className="text-center py-8 text-gray-500 border border-dashed rounded-lg">
          <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p>Keine Keyword-Trigger vorhanden</p>
          <p className="text-sm">Erstellen Sie Trigger für automatische Antworten</p>
        </div>
      ) : (
        <div className="space-y-2">
          {triggers.map(trigger => (
            <div
              key={trigger.id}
              className={`border rounded-lg p-4 transition-colors ${
                trigger.isActive ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'
              }`}
            >
              {editingId === trigger.id ? (
                /* Edit Mode */
                <div className="space-y-3">
                  <input
                    type="text"
                    value={form.keywords}
                    onChange={(e) => setForm(f => ({ ...f, keywords: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                  <textarea
                    value={form.response}
                    onChange={(e) => setForm(f => ({ ...f, response: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => { setEditingId(null); resetForm(); }}
                      className="p-1.5 text-gray-400 hover:bg-gray-100 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleSaveEdit(trigger.id)}
                      className="p-1.5 text-[#14ad9f] hover:bg-[#14ad9f]/10 rounded"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {trigger.keywords.map(kw => (
                        <span key={kw} className="px-2 py-0.5 bg-[#14ad9f]/10 text-[#14ad9f] text-xs rounded">
                          {kw}
                        </span>
                      ))}
                      <span className="text-xs text-gray-400">
                        ({matchTypeLabels[trigger.matchType]})
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{trigger.response}</p>
                  </div>
                  {!disabled && (
                    <div className="flex items-center gap-1 ml-4">
                      <button
                        onClick={() => onUpdate(trigger.id, { isActive: !trigger.isActive })}
                        className={`px-2 py-1 text-xs rounded ${
                          trigger.isActive 
                            ? 'bg-green-100 text-green-600' 
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {trigger.isActive ? 'Aktiv' : 'Inaktiv'}
                      </button>
                      <button
                        onClick={() => handleEdit(trigger)}
                        className="p-1.5 text-gray-400 hover:bg-gray-100 rounded"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(trigger.id)}
                        className="p-1.5 text-red-400 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
