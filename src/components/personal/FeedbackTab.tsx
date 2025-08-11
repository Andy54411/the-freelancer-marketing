'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Star, Plus, Minus, Save, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { PersonalService, EmployeeFeedback } from '@/services/personalService';

interface FeedbackTabProps {
  employeeId: string;
  companyId: string;
}

const FeedbackTab: React.FC<FeedbackTabProps> = ({ employeeId, companyId }) => {
  const [performanceRating, setPerformanceRating] = useState<number>(3);
  const [feedbackNotes, setFeedbackNotes] = useState<string>('');
  const [goals, setGoals] = useState<string[]>(['']);
  const [achievements, setAchievements] = useState<string[]>(['']);
  const [developmentAreas, setDevelopmentAreas] = useState<string[]>(['']);
  const [feedbackHistory, setFeedbackHistory] = useState<EmployeeFeedback[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFeedbackHistory();
  }, [companyId, employeeId]);

  const loadFeedbackHistory = async () => {
    try {
      const history = await PersonalService.getEmployeeFeedback(companyId, employeeId);
      setFeedbackHistory(history);
    } catch (error) {
      console.error('Fehler beim Laden der Feedback-Historie:', error);
    }
  };

  const saveFeedback = async () => {
    try {
      setLoading(true);

      // Validierung
      if (!feedbackNotes.trim() && goals.filter(g => g.trim()).length === 0) {
        toast.error('Bitte geben Sie mindestens Notizen oder Ziele ein');
        return;
      }

      const feedbackData = {
        companyId,
        employeeId,
        date: new Date().toISOString(),
        rating: performanceRating,
        notes: feedbackNotes,
        goals: goals.filter(goal => goal.trim() !== ''),
        achievements: achievements.filter(achievement => achievement.trim() !== ''),
        developmentAreas: developmentAreas.filter(area => area.trim() !== ''),
        reviewer: 'Admin', // TODO: Get from auth context
      };

      // Echte Firebase-Speicherung
      await PersonalService.saveFeedback(companyId, feedbackData);
      toast.success('Feedback erfolgreich gespeichert!');

      // Felder zurücksetzen nach erfolgreichem Speichern
      setFeedbackNotes('');
      setPerformanceRating(3);
      setGoals(['']);
      setAchievements(['']);
      setDevelopmentAreas(['']);

      // Historie neu laden
      await loadFeedbackHistory();
    } catch (error) {
      console.error('Fehler beim Speichern des Feedbacks:', error);
      toast.error('Fehler beim Speichern des Feedbacks');
    } finally {
      setLoading(false);
    }
  };

  const addGoal = () => {
    setGoals([...goals, '']);
  };

  const removeGoal = (index: number) => {
    if (goals.length > 1) {
      setGoals(goals.filter((_, i) => i !== index));
    }
  };

  const updateGoal = (index: number, value: string) => {
    const newGoals = [...goals];
    newGoals[index] = value;
    setGoals(newGoals);
  };

  const addAchievement = () => {
    setAchievements([...achievements, '']);
  };

  const removeAchievement = (index: number) => {
    if (achievements.length > 1) {
      setAchievements(achievements.filter((_, i) => i !== index));
    }
  };

  const updateAchievement = (index: number, value: string) => {
    const newAchievements = [...achievements];
    newAchievements[index] = value;
    setAchievements(newAchievements);
  };

  const addDevelopmentArea = () => {
    setDevelopmentAreas([...developmentAreas, '']);
  };

  const removeDevelopmentArea = (index: number) => {
    if (developmentAreas.length > 1) {
      setDevelopmentAreas(developmentAreas.filter((_, i) => i !== index));
    }
  };

  const updateDevelopmentArea = (index: number, value: string) => {
    const newAreas = [...developmentAreas];
    newAreas[index] = value;
    setDevelopmentAreas(newAreas);
  };

  const renderStarRating = () => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            onClick={() => setPerformanceRating(star)}
            className="focus:outline-none"
          >
            <Star
              className={`h-6 w-6 ${
                star <= performanceRating ? 'text-yellow-400 fill-current' : 'text-gray-300'
              }`}
            />
          </button>
        ))}
        <span className="ml-2 text-sm text-muted-foreground">({performanceRating}/5)</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Neues Feedback erstellen */}
      <Card>
        <CardHeader>
          <CardTitle>Neues Feedback erstellen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Performance Rating */}
          <div>
            <Label>Leistungsbewertung</Label>
            <div className="mt-2">{renderStarRating()}</div>
          </div>

          {/* Feedback Notizen */}
          <div>
            <Label htmlFor="feedbackNotes">Notizen & Beobachtungen</Label>
            <Textarea
              id="feedbackNotes"
              value={feedbackNotes}
              onChange={e => setFeedbackNotes(e.target.value)}
              placeholder="Detaillierte Notizen zur Leistung und Entwicklung des Mitarbeiters..."
              rows={4}
              className="mt-1"
            />
          </div>

          {/* Ziele */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Ziele für die nächste Periode</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addGoal}
                className="text-[#14ad9f] border-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
              >
                <Plus className="h-4 w-4 mr-1" />
                Ziel hinzufügen
              </Button>
            </div>
            <div className="space-y-2">
              {goals.map((goal, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={goal}
                    onChange={e => updateGoal(index, e.target.value)}
                    placeholder={`Ziel ${index + 1}...`}
                    className="flex-1"
                  />
                  {goals.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeGoal(index)}
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Erfolge */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Erreichte Erfolge</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addAchievement}
                className="text-[#14ad9f] border-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
              >
                <Plus className="h-4 w-4 mr-1" />
                Erfolg hinzufügen
              </Button>
            </div>
            <div className="space-y-2">
              {achievements.map((achievement, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={achievement}
                    onChange={e => updateAchievement(index, e.target.value)}
                    placeholder={`Erfolg ${index + 1}...`}
                    className="flex-1"
                  />
                  {achievements.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeAchievement(index)}
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Entwicklungsfelder */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Entwicklungsfelder</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addDevelopmentArea}
                className="text-[#14ad9f] border-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
              >
                <Plus className="h-4 w-4 mr-1" />
                Feld hinzufügen
              </Button>
            </div>
            <div className="space-y-2">
              {developmentAreas.map((area, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={area}
                    onChange={e => updateDevelopmentArea(index, e.target.value)}
                    placeholder={`Entwicklungsfeld ${index + 1}...`}
                    className="flex-1"
                  />
                  {developmentAreas.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeDevelopmentArea(index)}
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={saveFeedback}
              disabled={loading}
              className="bg-[#14ad9f] hover:bg-[#129488] text-white"
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Speichern...' : 'Feedback speichern'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Feedback Historie */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Feedback-Historie
          </CardTitle>
        </CardHeader>
        <CardContent>
          {feedbackHistory.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Noch kein Feedback vorhanden</p>
          ) : (
            <div className="space-y-4">
              {feedbackHistory.map(feedback => (
                <div key={feedback.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {new Date(feedback.date).toLocaleDateString('de-DE')}
                      </span>
                      <div className="flex items-center">
                        {[1, 2, 3, 4, 5].map(star => (
                          <Star
                            key={star}
                            className={`h-4 w-4 ${
                              star <= feedback.rating
                                ? 'text-yellow-400 fill-current'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                        <span className="ml-1 text-sm text-muted-foreground">
                          ({feedback.rating}/5)
                        </span>
                      </div>
                    </div>
                    <span className="text-sm text-muted-foreground">von {feedback.reviewer}</span>
                  </div>

                  {feedback.notes && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Notizen:</p>
                      <p className="text-sm">{feedback.notes}</p>
                    </div>
                  )}

                  {feedback.goals && feedback.goals.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Ziele:</p>
                      <ul className="text-sm list-disc list-inside space-y-1">
                        {feedback.goals.map((goal, index) => (
                          <li key={index}>{goal}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {feedback.achievements && feedback.achievements.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Erfolge:</p>
                      <ul className="text-sm list-disc list-inside space-y-1">
                        {feedback.achievements.map((achievement, index) => (
                          <li key={index}>{achievement}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {feedback.developmentAreas && feedback.developmentAreas.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">
                        Entwicklungsfelder:
                      </p>
                      <ul className="text-sm list-disc list-inside space-y-1">
                        {feedback.developmentAreas.map((area, index) => (
                          <li key={index}>{area}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FeedbackTab;
