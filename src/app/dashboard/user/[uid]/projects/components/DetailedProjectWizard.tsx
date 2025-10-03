'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, Calendar, MapPin, Euro, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { categories } from '@/lib/categoriesData';

interface Question {
  id: string;
  question: string;
  type: 'text' | 'select' | 'date_range' | 'location' | 'budget_range' | 'textarea';
  required: boolean;
  category: string;
  options?: string[];
}

interface DetailedProjectWizardProps {
  onProjectCreate: (projectData: any) => void;
  onBack: () => void;
  initialDescription?: string;
}

const DetailedProjectWizard: React.FC<DetailedProjectWizardProps> = ({
  onProjectCreate,
  onBack,
  initialDescription = '',
}) => {
  const [currentStep, setCurrentStep] = useState<'category' | 'questions' | 'review'>('category');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [projectDescription, setProjectDescription] = useState(initialDescription);
  const [loading, setLoading] = useState(false);

  // Schritt 1: Kategorie auswählen
  const handleCategorySelect = async (category: string, subcategory?: string) => {
    setSelectedCategory(category);
    setSelectedSubcategory(subcategory || '');
    setLoading(true);

    try {
      // Hole kategorie-spezifische Fragen von der KI
      const response = await fetch('/api/project-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'askDetailedQuestions',
          data: {
            category,
            subcategory,
            userInput: projectDescription,
          },
        }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        // Parse JSON response
        let questionsData;
        if (typeof result.data === 'string') {
          // Entferne Code-Blöcke falls vorhanden
          const cleanedData = result.data.replace(/```json\n?|\n?```/g, '').trim();
          questionsData = JSON.parse(cleanedData);
        } else {
          questionsData = result.data;
        }

        setQuestions(questionsData.questions || []);
        setCurrentStep('questions');
      } else {
        toast.error('Fehler beim Laden der Fragen');
      }
    } catch (error) {
      toast.error('Fehler beim Laden der kategorie-spezifischen Fragen');
    }

    setLoading(false);
  };

  // Schritt 2: Fragen beantworten
  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const canProceedToReview = () => {
    const requiredQuestions = questions.filter(q => q.required);
    return requiredQuestions.every(q => answers[q.id]?.trim());
  };

  // Schritt 3: Detaillierte Projektbeschreibung erstellen
  const createDetailedProject = async () => {
    setLoading(true);

    try {
      const response = await fetch('/api/project-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'createDetailedProject',
          data: {
            category: selectedCategory,
            subcategory: selectedSubcategory,
            originalDescription: projectDescription,
            answers,
          },
        }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        let projectData;
        if (typeof result.data === 'string') {
          const cleanedData = result.data.replace(/```json\n?|\n?```/g, '').trim();
          projectData = JSON.parse(cleanedData);
        } else {
          projectData = result.data;
        }

        // Projekt erstellen
        onProjectCreate(projectData);
        toast.success('Detailliertes Projekt wurde erfolgreich erstellt!');
      } else {
        toast.error('Fehler beim Erstellen des Projekts');
      }
    } catch (error) {
      toast.error('Fehler beim Erstellen der detaillierten Projektbeschreibung');
    }

    setLoading(false);
  };

  const renderCategoryStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Kategorie auswählen</h3>
        <p className="text-gray-600">Wählen Sie die passende Kategorie für Ihr Projekt</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
        {categories.map(category => (
          <Card key={category.title} className="cursor-pointer hover:bg-gray-50 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{category.title}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {category.subcategories.slice(0, 3).map(sub => (
                  <Badge
                    key={sub}
                    variant="secondary"
                    className="text-xs mr-1 mb-1 cursor-pointer hover:bg-[#14ad9f] hover:text-white transition-colors"
                    onClick={() => handleCategorySelect(category.title, sub)}
                  >
                    {sub}
                  </Badge>
                ))}
                {category.subcategories.length > 3 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => handleCategorySelect(category.title)}
                  >
                    Alle {category.subcategories.length} Services anzeigen
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderQuestionsStep = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => setCurrentStep('category')} className="p-2">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Zurück
        </Button>
        <div className="text-center">
          <h3 className="text-lg font-semibold">Projektdetails</h3>
          <p className="text-sm text-gray-600">
            {selectedCategory} - {selectedSubcategory}
          </p>
        </div>
        <div></div>
      </div>

      <div className="space-y-4 max-h-96 overflow-y-auto">
        {questions.map(question => (
          <div key={question.id} className="space-y-2">
            <Label className="text-sm font-medium flex items-center">
              {question.question}
              {question.required && <span className="text-red-500 ml-1">*</span>}
              {question.category === 'timing' && <Clock className="w-4 h-4 ml-2 text-gray-400" />}
              {question.category === 'location' && (
                <MapPin className="w-4 h-4 ml-2 text-gray-400" />
              )}
              {question.category === 'budget' && <Euro className="w-4 h-4 ml-2 text-gray-400" />}
            </Label>

            {question.type === 'textarea' ? (
              <Textarea
                placeholder="Ihre Antwort..."
                value={answers[question.id] || ''}
                onChange={e => handleAnswerChange(question.id, e.target.value)}
                className="min-h-20"
              />
            ) : question.type === 'select' && question.options ? (
              <Select
                value={answers[question.id] || ''}
                onValueChange={value => handleAnswerChange(question.id, value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Bitte auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  {question.options.map(option => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                type={question.type === 'budget_range' ? 'number' : 'text'}
                placeholder={
                  question.type === 'date_range'
                    ? 'z.B. nächste Woche, bis Ende des Monats'
                    : question.type === 'budget_range'
                      ? 'Budget in Euro'
                      : question.type === 'location'
                        ? 'Adresse oder Arbeitsort'
                        : 'Ihre Antwort...'
                }
                value={answers[question.id] || ''}
                onChange={e => handleAnswerChange(question.id, e.target.value)}
              />
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={() => setCurrentStep('category')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Zurück zur Kategorie
        </Button>
        <Button
          onClick={() => setCurrentStep('review')}
          disabled={!canProceedToReview()}
          className="bg-[#14ad9f] hover:bg-[#129488]"
        >
          Projekt erstellen
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  const renderReviewStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Projekt-Zusammenfassung</h3>
        <p className="text-gray-600">Überprüfen Sie Ihre Angaben vor der Erstellung</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {selectedCategory} - {selectedSubcategory}
          </CardTitle>
          <CardDescription>Basierend auf Ihren Antworten</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(answers).map(([questionId, answer]) => {
            const question = questions.find(q => q.id === questionId);
            return (
              <div key={questionId} className="flex justify-between text-sm">
                <span className="font-medium text-gray-600">{question?.question}:</span>
                <span className="text-right max-w-48 truncate">{answer}</span>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={() => setCurrentStep('questions')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Antworten bearbeiten
        </Button>
        <Button
          onClick={createDetailedProject}
          disabled={loading}
          className="bg-[#14ad9f] hover:bg-[#129488]"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Projekt wird erstellt...
            </>
          ) : (
            'Projekt jetzt erstellen'
          )}
        </Button>
      </div>
    </div>
  );

  if (loading && currentStep === 'category') {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#14ad9f]" />
        <span className="ml-3">Kategorie-spezifische Fragen werden geladen...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Fortschrittsanzeige */}
      <div className="flex items-center justify-between text-sm">
        <div
          className={`flex items-center ${currentStep === 'category' ? 'text-[#14ad9f] font-medium' : 'text-gray-400'}`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${currentStep === 'category' ? 'bg-[#14ad9f] text-white' : 'bg-gray-200'}`}
          >
            1
          </div>
          Kategorie
        </div>
        <div
          className={`w-12 h-0.5 ${currentStep !== 'category' ? 'bg-[#14ad9f]' : 'bg-gray-200'}`}
        ></div>
        <div
          className={`flex items-center ${currentStep === 'questions' ? 'text-[#14ad9f] font-medium' : currentStep === 'review' ? 'text-green-600 font-medium' : 'text-gray-400'}`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${currentStep === 'questions' ? 'bg-[#14ad9f] text-white' : currentStep === 'review' ? 'bg-green-500 text-white' : 'bg-gray-200'}`}
          >
            2
          </div>
          Details
        </div>
        <div
          className={`w-12 h-0.5 ${currentStep === 'review' ? 'bg-[#14ad9f]' : 'bg-gray-200'}`}
        ></div>
        <div
          className={`flex items-center ${currentStep === 'review' ? 'text-[#14ad9f] font-medium' : 'text-gray-400'}`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${currentStep === 'review' ? 'bg-[#14ad9f] text-white' : 'bg-gray-200'}`}
          >
            3
          </div>
          Erstellen
        </div>
      </div>

      {/* Aktueller Schritt */}
      {currentStep === 'category' && renderCategoryStep()}
      {currentStep === 'questions' && renderQuestionsStep()}
      {currentStep === 'review' && renderReviewStep()}

      {/* Zurück Button */}
      <div className="pt-4 border-t">
        <Button variant="ghost" onClick={onBack} className="w-full">
          Zum KI-Assistenten zurück
        </Button>
      </div>
    </div>
  );
};

export default DetailedProjectWizard;
