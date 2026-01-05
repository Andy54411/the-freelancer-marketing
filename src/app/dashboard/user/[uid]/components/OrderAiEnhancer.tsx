'use client';

import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { Sparkles, Loader2, Check, X, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { generateOrderPrompt } from '@/config/ai-prompts';
import { categories as allCategories } from '@/data/categories';
import { AIFeedbackService } from '@/services/AIFeedbackService';

interface OrderAiEnhancerProps {
  description: string;
  onDescriptionChange: (value: string) => void;
  category: string | null;
  subcategory: string | null;
  firebaseUser: User;
  userId: string;
}

export default function OrderAiEnhancer({
  description,
  onDescriptionChange,
  category,
  subcategory,
  firebaseUser,
  userId,
}: OrderAiEnhancerProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [generatedPreview, setGeneratedPreview] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastGeneratedOutput, setLastGeneratedOutput] = useState('');
  const [originalDescription, setOriginalDescription] = useState('');

  // Minimale Zeichenanzahl für KI-Verbesserung
  const minChars = 20;
  const canEnhance = description.trim().length >= minChars;

  const handleEnhance = async () => {
    if (!canEnhance) {
      toast.error(`Bitte gib mindestens ${minChars} Zeichen ein`);
      return;
    }

    setIsGenerating(true);
    setOriginalDescription(description);

    try {
      // Kategorie-Namen ermitteln
      const categoryObj = allCategories.find(cat => cat.title === category);
      const categoryName = categoryObj?.title || category || '';
      const subcategoryName = subcategory || '';

      // Prompt generieren
      const prompt = generateOrderPrompt(categoryName, subcategoryName, description);

      // Firebase Auth Token abrufen
      const token = await firebaseUser.getIdToken(true);

      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Taskilo KI-Service nicht verfügbar');
      }

      const data = await response.json();

      if (data.response) {
        // Text bereinigen
        let cleanedResponse = data.response;
        cleanedResponse = cleanedResponse.replace(/```/g, '');
        cleanedResponse = cleanedResponse.trim();

        // Vorschau anzeigen
        setGeneratedPreview(cleanedResponse);
        setShowPreview(true);
        setLastGeneratedOutput(cleanedResponse);

        toast.success('Vorschau erstellt - prüfe den verbesserten Text');
      } else {
        throw new Error('Keine Antwort von der KI erhalten');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Fehler bei der Verbesserung';
      toast.error(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const applyEnhancedText = () => {
    onDescriptionChange(generatedPreview);
    setShowPreview(false);
    setShowFeedback(true);
    toast.success('Verbesserte Beschreibung übernommen');
  };

  const rejectEnhancedText = () => {
    setShowPreview(false);
    setGeneratedPreview('');
    toast.info('Ursprüngliche Beschreibung beibehalten');
  };

  const handleFeedback = async (rating: 'good' | 'bad') => {
    try {
      const categoryObj = allCategories.find(cat => cat.title === category);
      const categoryName = categoryObj?.title || category || '';

      await AIFeedbackService.saveFeedback({
        promptId: 'order-description',
        promptVersion: '1.0.0',
        category: categoryName,
        subcategory: subcategory || '',
        userInput: originalDescription,
        generatedOutput: lastGeneratedOutput,
        rating,
        userId: userId,
        companyId: userId,
      });

      setShowFeedback(false);
      toast.success(rating === 'good' ? 'Danke für dein Feedback' : 'Danke - wir verbessern uns');
    } catch (error) {
      console.error('Fehler beim Speichern des Feedbacks:', error);
    }
  };

  // Vorschau-Modal anzeigen
  if (showPreview) {
    return (
      <div className="space-y-4">
        <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-5 w-5 text-teal-600" />
            <span className="font-semibold text-teal-800">Taskilo KI Vorschlag</span>
          </div>
          
          <Textarea
            value={generatedPreview}
            onChange={(e) => setGeneratedPreview(e.target.value)}
            className="w-full min-h-[150px] bg-white border-teal-200 focus:border-teal-400 focus:ring-teal-400/20"
            placeholder="Verbesserter Text..."
          />
          
          <p className="text-xs text-teal-600 mt-2">
            Du kannst den Text vor dem Übernehmen noch anpassen.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={applyEnhancedText}
            className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
          >
            <Check className="h-4 w-4 mr-2" />
            Übernehmen
          </Button>
          <Button
            onClick={rejectEnhancedText}
            variant="outline"
            className="flex-1 border-gray-300"
          >
            <X className="h-4 w-4 mr-2" />
            Verwerfen
          </Button>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-2">Ursprünglicher Text:</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{originalDescription}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Feedback nach Übernahme */}
      {showFeedback && (
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
          <p className="text-sm text-teal-800 mb-2">War die KI-Verbesserung hilfreich?</p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleFeedback('good')}
              className="border-teal-300 text-teal-700 hover:bg-teal-100"
            >
              Ja, sehr gut
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleFeedback('bad')}
              className="border-gray-300 text-gray-600 hover:bg-gray-100"
            >
              Nicht hilfreich
            </Button>
          </div>
        </div>
      )}

      {/* KI-Button */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleEnhance}
        disabled={!canEnhance || isGenerating}
        className={`
          transition-all duration-200
          ${canEnhance 
            ? 'border-teal-300 text-teal-700 hover:bg-teal-50 hover:border-teal-400' 
            : 'border-gray-200 text-gray-400 cursor-not-allowed'
          }
        `}
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Taskilo KI analysiert...
          </>
        ) : (
          <>
            <Wand2 className="h-4 w-4 mr-2" />
            Mit Taskilo KI verbessern
          </>
        )}
      </Button>

      {!canEnhance && description.length > 0 && (
        <p className="text-xs text-gray-500">
          Noch {minChars - description.trim().length} Zeichen für KI-Verbesserung
        </p>
      )}
    </div>
  );
}
