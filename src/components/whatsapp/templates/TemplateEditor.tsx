/**
 * TemplateEditor Component
 * 
 * Erstellen und Bearbeiten von WhatsApp Message Templates
 */
'use client';

import React from 'react';
import { Save, Eye, X, Plus, Trash2, AlertCircle, Info, ImageIcon, FileText, Video } from 'lucide-react';

interface TemplateVariable {
  index: number;
  example: string;
}

interface TemplateButton {
  type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
  text: string;
  url?: string;
  phone_number?: string;
}

interface TemplateHeader {
  type: 'NONE' | 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'LOCATION';
  text?: string;
  example?: string;
}

interface TemplateData {
  name: string;
  language: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  header: TemplateHeader;
  body: string;
  footer?: string;
  buttons: TemplateButton[];
  variables: TemplateVariable[];
}

interface TemplateEditorProps {
  companyId: string;
  template?: TemplateData;
  onSave: (template: TemplateData) => Promise<void>;
  onCancel: () => void;
}

const LANGUAGES = [
  { code: 'de', name: 'Deutsch' },
  { code: 'en', name: 'Englisch' },
  { code: 'en_US', name: 'Englisch (US)' },
  { code: 'fr', name: 'Französisch' },
  { code: 'es', name: 'Spanisch' },
  { code: 'it', name: 'Italienisch' },
  { code: 'tr', name: 'Türkisch' },
];

const CATEGORIES = [
  { value: 'MARKETING', label: 'Marketing', description: 'Werbung, Angebote, Updates' },
  { value: 'UTILITY', label: 'Transaktional', description: 'Bestellbestätigungen, Lieferstatus' },
  { value: 'AUTHENTICATION', label: 'Authentifizierung', description: 'Verifizierungscodes, Login' },
];

export function TemplateEditor({ companyId: _companyId, template, onSave, onCancel }: TemplateEditorProps) {
  const [formData, setFormData] = React.useState<TemplateData>({
    name: template?.name || '',
    language: template?.language || 'de',
    category: template?.category || 'UTILITY',
    header: template?.header || { type: 'NONE' },
    body: template?.body || '',
    footer: template?.footer || '',
    buttons: template?.buttons || [],
    variables: template?.variables || [],
  });
  
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = React.useState(false);

  // Variablen aus Body extrahieren
  React.useEffect(() => {
    const matches = formData.body.match(/\{\{\d+\}\}/g) || [];
    const uniqueVars = [...new Set(matches)];
    const existingVars = formData.variables;
    
    const newVariables: TemplateVariable[] = uniqueVars.map(match => {
      const index = parseInt(match.replace(/[{}]/g, ''));
      const existing = existingVars.find(v => v.index === index);
      return {
        index,
        example: existing?.example || '',
      };
    });
    
    setFormData(prev => ({ ...prev, variables: newVariables }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.body]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name) {
      newErrors.name = 'Name ist erforderlich';
    } else if (!/^[a-z0-9_]+$/.test(formData.name)) {
      newErrors.name = 'Nur Kleinbuchstaben, Zahlen und Unterstriche erlaubt';
    }

    if (!formData.body) {
      newErrors.body = 'Nachrichtentext ist erforderlich';
    } else if (formData.body.length > 1024) {
      newErrors.body = 'Maximal 1024 Zeichen erlaubt';
    }

    if (formData.header.type === 'TEXT' && !formData.header.text) {
      newErrors.header = 'Header-Text ist erforderlich';
    }

    if (formData.footer && formData.footer.length > 60) {
      newErrors.footer = 'Maximal 60 Zeichen erlaubt';
    }

    // Variablen-Beispiele prüfen
    for (const variable of formData.variables) {
      if (!variable.example) {
        newErrors[`var_${variable.index}`] = `Beispielwert für Variable {{${variable.index}}} erforderlich`;
      }
    }

    // Buttons prüfen
    formData.buttons.forEach((btn, idx) => {
      if (!btn.text) {
        newErrors[`btn_${idx}`] = 'Button-Text erforderlich';
      }
      if (btn.type === 'URL' && !btn.url) {
        newErrors[`btn_${idx}_url`] = 'URL erforderlich';
      }
      if (btn.type === 'PHONE_NUMBER' && !btn.phone_number) {
        newErrors[`btn_${idx}_phone`] = 'Telefonnummer erforderlich';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await onSave(formData);
    } catch (error) {
      setErrors({ submit: error instanceof Error ? error.message : 'Fehler beim Speichern' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addButton = (type: TemplateButton['type']) => {
    if (formData.buttons.length >= 3) return;
    
    setFormData(prev => ({
      ...prev,
      buttons: [...prev.buttons, { type, text: '' }],
    }));
  };

  const updateButton = (index: number, updates: Partial<TemplateButton>) => {
    setFormData(prev => ({
      ...prev,
      buttons: prev.buttons.map((btn, i) => i === index ? { ...btn, ...updates } : btn),
    }));
  };

  const removeButton = (index: number) => {
    setFormData(prev => ({
      ...prev,
      buttons: prev.buttons.filter((_, i) => i !== index),
    }));
  };

  const getPreviewText = () => {
    let text = formData.body;
    formData.variables.forEach(v => {
      text = text.replace(`{{${v.index}}}`, v.example || `[Variable ${v.index}]`);
    });
    return text;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold">
          {template ? 'Template bearbeiten' : 'Neues Template erstellen'}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg flex items-center gap-1"
          >
            <Eye className="w-4 h-4" />
            Vorschau
          </button>
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>

      <div className="flex">
        {/* Formular */}
        <form onSubmit={handleSubmit} className="flex-1 p-4 space-y-4 overflow-y-auto max-h-[70vh]">
          {/* Name & Sprache */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Template-Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value.toLowerCase() }))}
                placeholder="z.B. bestellbestaetigung"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14ad9f]/20 ${
                  errors.name ? 'border-red-300' : 'border-gray-200'
                }`}
                disabled={!!template}
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sprache *
              </label>
              <select
                value={formData.language}
                onChange={(e) => setFormData(prev => ({ ...prev, language: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14ad9f]/20"
              >
                {LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Kategorie */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kategorie *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, category: cat.value as TemplateData['category'] }))}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    formData.category === cat.value
                      ? 'border-[#14ad9f] bg-[#14ad9f]/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-medium text-sm">{cat.label}</p>
                  <p className="text-xs text-gray-500">{cat.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Header */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Header (optional)
            </label>
            <div className="flex items-center gap-2 mb-2">
              {(['NONE', 'TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT'] as const).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, header: { type } }))}
                  className={`p-2 rounded-lg border flex items-center gap-1 text-sm ${
                    formData.header.type === type
                      ? 'border-[#14ad9f] bg-[#14ad9f]/5 text-[#14ad9f]'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  {type === 'NONE' && 'Kein'}
                  {type === 'TEXT' && <><FileText className="w-4 h-4" /> Text</>}
                  {type === 'IMAGE' && <><ImageIcon className="w-4 h-4" /> Bild</>}
                  {type === 'VIDEO' && <><Video className="w-4 h-4" /> Video</>}
                  {type === 'DOCUMENT' && <><FileText className="w-4 h-4" /> Dokument</>}
                </button>
              ))}
            </div>
            {formData.header.type === 'TEXT' && (
              <input
                type="text"
                value={formData.header.text || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, header: { ...prev.header, text: e.target.value } }))}
                placeholder="Header-Text eingeben..."
                maxLength={60}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14ad9f]/20"
              />
            )}
          </div>

          {/* Body */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nachrichtentext *
            </label>
            <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
              <Info className="w-3 h-3" />
              Verwende {"{{1}}"}, {"{{2}}"}, etc. für Variablen
            </div>
            <textarea
              value={formData.body}
              onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
              placeholder="Hallo {{1}}, Ihre Bestellung {{2}} wurde versandt..."
              rows={4}
              maxLength={1024}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14ad9f]/20 resize-none ${
                errors.body ? 'border-red-300' : 'border-gray-200'
              }`}
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              {errors.body && <span className="text-red-500">{errors.body}</span>}
              <span className="ml-auto">{formData.body.length}/1024</span>
            </div>
          </div>

          {/* Variablen */}
          {formData.variables.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Beispielwerte für Variablen
              </label>
              <div className="space-y-2">
                {formData.variables.map(v => (
                  <div key={v.index} className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 w-16">{`{{${v.index}}}`}</span>
                    <input
                      type="text"
                      value={v.example}
                      onChange={(e) => {
                        const newVars = formData.variables.map(variable =>
                          variable.index === v.index ? { ...variable, example: e.target.value } : variable
                        );
                        setFormData(prev => ({ ...prev, variables: newVars }));
                      }}
                      placeholder="Beispielwert"
                      className={`flex-1 px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14ad9f]/20 ${
                        errors[`var_${v.index}`] ? 'border-red-300' : 'border-gray-200'
                      }`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Footer (optional)
            </label>
            <input
              type="text"
              value={formData.footer}
              onChange={(e) => setFormData(prev => ({ ...prev, footer: e.target.value }))}
              placeholder="z.B. Antworten Sie STOP zum Abmelden"
              maxLength={60}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14ad9f]/20 ${
                errors.footer ? 'border-red-300' : 'border-gray-200'
              }`}
            />
            {errors.footer && <p className="text-xs text-red-500 mt-1">{errors.footer}</p>}
          </div>

          {/* Buttons */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Buttons (max. 3)
            </label>
            
            {formData.buttons.map((btn, idx) => (
              <div key={idx} className="flex items-start gap-2 mb-2 p-3 bg-gray-50 rounded-lg">
                <select
                  value={btn.type}
                  onChange={(e) => updateButton(idx, { type: e.target.value as TemplateButton['type'] })}
                  className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg"
                >
                  <option value="QUICK_REPLY">Schnellantwort</option>
                  <option value="URL">URL</option>
                  <option value="PHONE_NUMBER">Telefon</option>
                </select>
                
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={btn.text}
                    onChange={(e) => updateButton(idx, { text: e.target.value })}
                    placeholder="Button-Text"
                    maxLength={25}
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg"
                  />
                  
                  {btn.type === 'URL' && (
                    <input
                      type="url"
                      value={btn.url || ''}
                      onChange={(e) => updateButton(idx, { url: e.target.value })}
                      placeholder="https://beispiel.de"
                      className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg"
                    />
                  )}
                  
                  {btn.type === 'PHONE_NUMBER' && (
                    <input
                      type="tel"
                      value={btn.phone_number || ''}
                      onChange={(e) => updateButton(idx, { phone_number: e.target.value })}
                      placeholder="+49123456789"
                      className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg"
                    />
                  )}
                </div>
                
                <button
                  type="button"
                  onClick={() => removeButton(idx)}
                  className="p-1.5 hover:bg-gray-200 rounded"
                >
                  <Trash2 className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            ))}
            
            {formData.buttons.length < 3 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => addButton('QUICK_REPLY')}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Schnellantwort
                </button>
                <button
                  type="button"
                  onClick={() => addButton('URL')}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  URL
                </button>
                <button
                  type="button"
                  onClick={() => addButton('PHONE_NUMBER')}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Telefon
                </button>
              </div>
            )}
          </div>

          {/* Error */}
          {errors.submit && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4" />
              {errors.submit}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-[#14ad9f] text-white rounded-lg hover:bg-teal-600 flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {template ? 'Speichern' : 'Erstellen'}
            </button>
          </div>
        </form>

        {/* Preview */}
        {showPreview && (
          <div className="w-80 border-l border-gray-200 bg-gray-50 p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Vorschau</h3>
            <div className="bg-[url('/whatsapp-bg.png')] bg-gray-100 rounded-xl p-4">
              <div className="bg-white rounded-lg shadow-sm p-3 max-w-[250px]">
                {formData.header.type === 'TEXT' && formData.header.text && (
                  <p className="font-semibold text-sm mb-2">{formData.header.text}</p>
                )}
                {formData.header.type === 'IMAGE' && (
                  <div className="w-full h-32 bg-gray-200 rounded-lg mb-2 flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                
                <p className="text-sm whitespace-pre-wrap">{getPreviewText()}</p>
                
                {formData.footer && (
                  <p className="text-xs text-gray-500 mt-2">{formData.footer}</p>
                )}
                
                {formData.buttons.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-gray-100 space-y-1">
                    {formData.buttons.map((btn, idx) => (
                      <button
                        key={idx}
                        className="w-full py-1.5 text-center text-sm text-blue-500 hover:bg-gray-50 rounded"
                      >
                        {btn.text || 'Button'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
