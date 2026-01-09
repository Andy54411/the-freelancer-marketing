/**
 * TemplatePicker Component
 * 
 * Auswahl einer Vorlage im Chat
 */
'use client';

import React from 'react';
import { Search, X, FileText, Loader2 } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  category: string;
  language: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  components: Array<{
    type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
    text?: string;
    format?: string;
  }>;
}

interface TemplatePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (template: Template, variables: Record<string, string>) => void;
  templates: Template[];
  isLoading?: boolean;
}

export function TemplatePicker({ isOpen, onClose, onSelect, templates, isLoading }: TemplatePickerProps) {
  const [search, setSearch] = React.useState('');
  const [selectedTemplate, setSelectedTemplate] = React.useState<Template | null>(null);
  const [variables, setVariables] = React.useState<Record<string, string>>({});

  const filteredTemplates = React.useMemo(() => {
    if (!search) return templates.filter(t => t.status === 'APPROVED');
    const q = search.toLowerCase();
    return templates.filter(t => 
      t.status === 'APPROVED' && 
      (t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q))
    );
  }, [templates, search]);

  const extractVariables = (template: Template): string[] => {
    const vars: string[] = [];
    template.components.forEach(comp => {
      if (comp.text) {
        const matches = comp.text.match(/\{\{(\d+)\}\}/g);
        if (matches) {
          matches.forEach(m => {
            const num = m.replace(/[{}]/g, '');
            if (!vars.includes(num)) vars.push(num);
          });
        }
      }
    });
    return vars.sort((a, b) => parseInt(a) - parseInt(b));
  };

  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template);
    const vars = extractVariables(template);
    const initialVars: Record<string, string> = {};
    vars.forEach(v => initialVars[v] = '');
    setVariables(initialVars);
  };

  const handleConfirm = () => {
    if (selectedTemplate) {
      onSelect(selectedTemplate, variables);
      onClose();
    }
  };

  const getPreviewText = (template: Template) => {
    let text = '';
    template.components.forEach(comp => {
      if (comp.text) {
        let replaced = comp.text;
        Object.entries(variables).forEach(([key, value]) => {
          replaced = replaced.replace(`{{${key}}}`, value || `[Variable ${key}]`);
        });
        text += replaced + '\n';
      }
    });
    return text.trim();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Vorlage auswählen</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {selectedTemplate ? (
          /* Variable Input View */
          <div className="flex-1 overflow-y-auto p-4">
            <button
              onClick={() => setSelectedTemplate(null)}
              className="text-sm text-[#14ad9f] hover:underline mb-4"
            >
              ← Andere Vorlage wählen
            </button>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h4 className="font-medium mb-2">{selectedTemplate.name}</h4>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                {getPreviewText(selectedTemplate)}
              </p>
            </div>

            {Object.keys(variables).length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium">Variablen ausfüllen</h4>
                {Object.keys(variables).map(key => (
                  <div key={key}>
                    <label className="block text-sm text-gray-600 mb-1">
                      Variable {key}
                    </label>
                    <input
                      type="text"
                      value={variables[key]}
                      onChange={(e) => setVariables(prev => ({ ...prev, [key]: e.target.value }))}
                      placeholder={`Wert für {{${key}}}`}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14ad9f]/20"
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Abbrechen
              </button>
              <button
                onClick={handleConfirm}
                className="px-4 py-2 bg-[#14ad9f] text-white rounded-lg hover:bg-teal-600"
              >
                Vorlage senden
              </button>
            </div>
          </div>
        ) : (
          /* Template List View */
          <>
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Vorlage suchen..."
                  className="w-full pl-9 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14ad9f]/20"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-[#14ad9f] animate-spin" />
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>Keine Vorlagen gefunden</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredTemplates.map(template => (
                    <button
                      key={template.id}
                      onClick={() => handleSelectTemplate(template)}
                      className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium">{template.name}</h4>
                          <p className="text-sm text-gray-500 mt-1">
                            {template.components.find(c => c.type === 'BODY')?.text?.slice(0, 100)}...
                          </p>
                        </div>
                        <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                          {template.language}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
