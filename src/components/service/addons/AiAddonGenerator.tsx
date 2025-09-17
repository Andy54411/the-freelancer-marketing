'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Sparkles, Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AddonItem {
  name: string;
  description: string;
  price: number;
}

interface AiAddonGeneratorProps {
  onAddAddon: (addon: AddonItem) => void;
  selectedAddons?: AddonItem[];
  onToggleAddon?: (addon: AddonItem, isSelected: boolean) => void;
}

export default function AiAddonGenerator({ 
  onAddAddon, 
  selectedAddons = [], 
  onToggleAddon 
}: AiAddonGeneratorProps) {
  const [aiDescription, setAiDescription] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<AddonItem[]>([]);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Wrapper function for button click
  const handleGenerateClick = () => {
    generateAiAddons(0);
  };

  // Generate AI addons with retry logic
  const generateAiAddons = async (retryCount = 0) => {
    if (!aiDescription.trim()) {
      toast.error('Bitte beschreiben Sie Ihre Dienstleistung');
      return;
    }

    const maxRetries = 2;
    setIsGeneratingAi(true);
    
    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: `Analysiere diese Dienstleistungsbeschreibung und erstelle 6 sinnvolle Add-ons/Zusatzleistungen.

Beschreibung: ${aiDescription}

WICHTIG: Antworte NUR mit einem JSON-Array, keine Markdown-Formatierung, keine zusätzlichen Erklärungen.

Format:
[
  {
    "name": "Add-on Name",
    "description": "Kurze Beschreibung des Add-ons",
    "price": 25
  }
]

Achte darauf, dass:
- Die Add-ons zur Hauptdienstleistung passen
- Realistische Preise vorgeschlagen werden (in Euro)
- Die Namen prägnant und ansprechend sind
- Die Beschreibungen kurz aber aussagekräftig sind
- NUR das JSON-Array zurückgegeben wird, kein Markdown-Code`
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unbekannter Fehler' }));
        console.error('API Error:', response.status, errorData);
        
        // Use the improved error messages from the API
        const errorMessage = errorData.error || 'KI-Service nicht verfügbar';
        const isRetryable = errorData.retryable;
        
        if (response.status === 503) {
          throw new Error(`🤖 ${errorMessage}${isRetryable ? ' (Automatische Wiederholung erfolgte bereits)' : ''}`);
        } else if (response.status === 429) {
          throw new Error(`⏱️ ${errorMessage}`);
        } else if (response.status === 401) {
          throw new Error(`� ${errorMessage}`);
        } else if (response.status === 400) {
          throw new Error(`📝 ${errorMessage}`);
        } else {
          throw new Error(`❌ ${errorMessage} (Status: ${response.status})`);
        }
      }

      const data = await response.json();
      
      try {
        // Bereinige die AI-Antwort von Markdown-Code-Blöcken
        let cleanResponse = data.response;
        
        // Entferne alle Arten von Code-Block-Markierungen
        cleanResponse = cleanResponse.replace(/```json/g, '');
        cleanResponse = cleanResponse.replace(/```/g, '');
        cleanResponse = cleanResponse.replace(/`/g, '');
        
        // Entferne zusätzliche Whitespace und Zeilenwraps
        cleanResponse = cleanResponse.trim();
        
        // Versuche, JSON-Array zu finden falls es in Text eingebettet ist
        const jsonMatch = cleanResponse.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          cleanResponse = jsonMatch[0];
        }
        
        console.log('🧹 Bereinigte AI-Antwort:', cleanResponse);
        
        const suggestions = JSON.parse(cleanResponse);
        if (Array.isArray(suggestions)) {
          setAiSuggestions(suggestions);
          
          // Check if fallback was used and show appropriate message
          if (data.fallbackUsed) {
            toast.info(`${suggestions.length} Vorschläge generiert! (KI temporär nicht verfügbar - vorgefertigte Vorschläge verwendet)`, {
              duration: 5000
            });
          } else {
            toast.success(`${suggestions.length} Add-on Vorschläge von ${data.modelUsed || 'KI'} generiert!`);
          }
        } else {
          throw new Error('AI-Antwort ist kein Array');
        }
      } catch (parseError) {
        console.error('Fehler beim Parsen der AI-Antwort:', parseError);
        console.error('Rohe AI-Antwort:', data.response);
        toast.error('Die KI-Antwort konnte nicht verarbeitet werden. Die Antwort war nicht im erwarteten JSON-Format.');
      }
    } catch (error: any) {
      console.error('Fehler bei AI-Generierung:', error);
      
      // Check if we should retry for specific error types
      const shouldRetry = retryCount < maxRetries && (
        error.message?.includes('503') || 
        error.message?.includes('overloaded') ||
        error.message?.includes('Service Unavailable')
      );
      
      if (shouldRetry) {
        console.log(`🔄 Wiederholung ${retryCount + 1}/${maxRetries} wegen Server-Überlastung...`);
        toast.info(`🔄 Server überlastet - Wiederholung ${retryCount + 1}/${maxRetries}...`);
        
        // Wait before retry with exponential backoff
        const delay = 2000 * Math.pow(2, retryCount); // 2s, 4s, 8s
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Recursive retry - don't set loading to false yet
        return generateAiAddons(retryCount + 1);
      }
      
      // Final error handling - no more retries
      if (error.message?.includes('503') || error.message?.includes('overloaded')) {
        toast.error('🤖 Die KI ist überlastet. Versuchen Sie es in wenigen Minuten erneut.');
      } else if (error.message?.includes('429')) {
        toast.error('⏱️ Zu viele Anfragen. Warten Sie 30 Sekunden und probieren Sie es nochmal.');
      } else if (error.message?.includes('500')) {
        toast.error('🔧 Interner Fehler. Versuchen Sie es in wenigen Minuten erneut.');
      } else {
        toast.error(error.message || '❌ Fehler bei der KI-Generierung. Versuchen Sie es erneut.');
      }
      
      // Set loading to false only for final errors (no retry)
      setIsGeneratingAi(false);
    }
  };

  // Apply AI suggestion to main addons
  const applyAiSuggestion = (suggestion: AddonItem) => {
    const isSelected = selectedAddons.some(addon => 
      addon.name === suggestion.name && addon.price === suggestion.price
    );
    
    if (onToggleAddon) {
      onToggleAddon(suggestion, !isSelected);
      if (!isSelected) {
        toast.success(`"${suggestion.name}" ausgewählt!`);
      } else {
        toast.info(`"${suggestion.name}" abgewählt!`);
      }
    } else {
      // Fallback to old behavior
      onAddAddon(suggestion);
      toast.success(`"${suggestion.name}" zu Add-ons hinzugefügt!`);
    }
  };

  return (
    <Card className={`${aiSuggestions.length > 0 ? 'border-[#14ad9f]' : 'border-gray-200'}`}>
      <CardHeader>
        <CardTitle className="text-[#14ad9f] flex items-center">
          <Sparkles className="h-5 w-5 mr-2" />
          KI Add-on Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* AI Generate Section */}
        <div className="border rounded-lg p-4 bg-teal-50">
          <div className="space-y-3">
            <Textarea
              value={aiDescription}
              onChange={(e) => setAiDescription(e.target.value)}
              placeholder="Beschreiben Sie Ihre Dienstleistung für personalisierte Add-on Vorschläge..."
              rows={2}
              className="focus:border-[#14ad9f] focus:ring-[#14ad9f]"
            />
            <Button
              onClick={handleGenerateClick}
              disabled={isGeneratingAi || !aiDescription.trim()}
              className="bg-[#14ad9f] hover:bg-[#129488] text-white"
            >
              {isGeneratingAi ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generiert...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Add-ons generieren
                </>
              )}
            </Button>
            
            {/* Info-Hinweis */}
            <div className="text-xs text-[#14ad9f] bg-teal-50 p-2 rounded border border-teal-200">
              💡 Die KI kann manchmal überlastet sein. Falls ein Fehler auftritt, warten Sie kurz und versuchen Sie es erneut.
            </div>
          </div>

          {/* AI Suggestions */}
          {aiSuggestions.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm font-medium text-[#14ad9f]">
                  KI-Vorschläge ({aiSuggestions.length}) - Bearbeitbar
                </Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAiSuggestions([])}
                  className="text-red-600 hover:text-red-700"
                >
                  Alle löschen
                </Button>
              </div>
              <div className="space-y-3">
                {aiSuggestions.map((suggestion, index) => {
                  const isSelected = selectedAddons.some(addon => 
                    addon.name === suggestion.name && addon.price === suggestion.price
                  );
                  return (
                    <div 
                      key={index} 
                      className={`p-3 bg-white rounded border ${
                        isSelected ? 'border-[#14ad9f]' : 'border-teal-200'
                      }`}
                    >
                    <div className="grid gap-3">
                      {/* Name bearbeitbar */}
                      <div>
                        <Label className="text-xs text-gray-600">Name</Label>
                        <Input
                          value={suggestion.name}
                          onChange={(e) => {
                            const updated = [...aiSuggestions];
                            updated[index].name = e.target.value;
                            setAiSuggestions(updated);
                          }}
                          className="font-medium focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                        />
                      </div>
                      
                      {/* Beschreibung bearbeitbar */}
                      <div>
                        <Label className="text-xs text-gray-600">Beschreibung</Label>
                        <Textarea
                          value={suggestion.description}
                          onChange={(e) => {
                            const updated = [...aiSuggestions];
                            updated[index].description = e.target.value;
                            setAiSuggestions(updated);
                          }}
                          rows={2}
                          className="text-sm focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                        />
                      </div>
                      
                      {/* Preis bearbeitbar und Buttons */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <Label className="text-xs text-gray-600">Preis (€)</Label>
                          <Input
                            type="number"
                            value={suggestion.price}
                            onChange={(e) => {
                              const updated = [...aiSuggestions];
                              updated[index].price = Number(e.target.value);
                              setAiSuggestions(updated);
                            }}
                            className="focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                          />
                        </div>
                        <div className="flex gap-2 pt-4">
                          <Button
                            size="sm"
                            onClick={() => applyAiSuggestion(suggestion)}
                            className={
                              selectedAddons.some(addon => 
                                addon.name === suggestion.name && addon.price === suggestion.price
                              )
                                ? "bg-gray-400 hover:bg-gray-500 text-white"
                                : "bg-[#14ad9f] hover:bg-[#129488] text-white"
                            }
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            {selectedAddons.some(addon => 
                              addon.name === suggestion.name && addon.price === suggestion.price
                            ) ? 'Ausgewählt' : 'Auswählen'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const updated = aiSuggestions.filter((_, i) => i !== index);
                              setAiSuggestions(updated);
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}