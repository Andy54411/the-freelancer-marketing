'use client';

import React, { useState } from 'react';
import {
  Send as FiSend,
  Loader2 as FiLoader,
  Euro as FiEuro,
  Clock as FiClock,
  Calendar as FiCalendar,
  FileText as FiFileText,
  Plus as FiPlus,
  X as FiX,
} from 'lucide-react';

interface TimeBasedQuoteFormProps {
  onSubmit: (data: TimeBasedQuoteData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

interface TimeBasedQuoteData {
  message: string;
  timeBasedProjects: TimeBasedProject[];
  additionalNotes?: string;
  timeline?: string;
  terms?: string;
  validUntil?: string;
}

interface TimeBasedProject {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  hoursPerDay: number;
  hourlyRate: number;
  workingDays: string[];
  timeSlots?: { start: string; end: string }[];
  totalHours: number;
  totalAmount: number;
}

export default function TimeBasedQuoteForm({
  onSubmit,
  onCancel,
  loading = false,
}: TimeBasedQuoteFormProps) {
  const [formData, setFormData] = useState<TimeBasedQuoteData>({
    message: '',
    timeBasedProjects: [
      {
        id: '1',
        title: '',
        description: '',
        startDate: '',
        endDate: '',
        hoursPerDay: 8,
        hourlyRate: 0,
        workingDays: ['Mo', 'Di', 'Mi', 'Do', 'Fr'],
        totalHours: 0,
        totalAmount: 0,
      },
    ],
    additionalNotes: '',
    timeline: '',
    terms: '',
    validUntil: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Hilfsfunktionen für zeitbasierte Berechnungen
  const calculateWorkingDays = (
    startDate: string,
    endDate: string,
    workingDays: string[]
  ): number => {
    if (!startDate || !endDate || !workingDays.length) return 0;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

    let count = 0;
    const current = new Date(start);

    while (current <= end) {
      const dayName = dayNames[current.getDay()];
      if (workingDays.includes(dayName)) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }

    return count;
  };

  const calculateProjectTotals = (
    project: TimeBasedProject
  ): { totalHours: number; totalAmount: number } => {
    if (!project.startDate || !project.endDate || !project.workingDays.length) {
      return { totalHours: 0, totalAmount: 0 };
    }

    const workingDays = calculateWorkingDays(
      project.startDate,
      project.endDate,
      project.workingDays
    );
    const totalHours = workingDays * project.hoursPerDay;
    const totalAmount = totalHours * project.hourlyRate;

    return { totalHours, totalAmount };
  };

  // Projekt hinzufügen
  const addProject = () => {
    const newProject: TimeBasedProject = {
      id: Date.now().toString(),
      title: '',
      description: '',
      startDate: '',
      endDate: '',
      hoursPerDay: 8,
      hourlyRate: 0,
      workingDays: ['Mo', 'Di', 'Mi', 'Do', 'Fr'],
      totalHours: 0,
      totalAmount: 0,
    };

    setFormData(prev => ({
      ...prev,
      timeBasedProjects: [...prev.timeBasedProjects, newProject],
    }));
  };

  // Projekt entfernen
  const removeProject = (id: string) => {
    setFormData(prev => ({
      ...prev,
      timeBasedProjects: prev.timeBasedProjects.filter(project => project.id !== id),
    }));
  };

  // Projekt aktualisieren
  const updateProject = (id: string, field: keyof TimeBasedProject, value: any) => {
    setFormData(prev => ({
      ...prev,
      timeBasedProjects: prev.timeBasedProjects.map(project => {
        if (project.id === id) {
          const updatedProject = { ...project, [field]: value };

          // Automatische Berechnung wenn relevante Felder geändert werden
          if (
            ['startDate', 'endDate', 'hoursPerDay', 'hourlyRate', 'workingDays'].includes(field)
          ) {
            const totals = calculateProjectTotals(updatedProject);
            updatedProject.totalHours = totals.totalHours;
            updatedProject.totalAmount = totals.totalAmount;
          }

          return updatedProject;
        }
        return project;
      }),
    }));

    // Clear error when user starts typing
    if (errors[`${id}_${field}`]) {
      setErrors(prev => ({
        ...prev,
        [`${id}_${field}`]: '',
      }));
    }
  };

  // Input Change Handler
  const handleInputChange = (field: keyof TimeBasedQuoteData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  // Gesamtsumme berechnen
  const calculateTotalAmount = () => {
    return formData.timeBasedProjects.reduce((total, project) => total + project.totalAmount, 0);
  };

  // Formular validieren
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.message.trim()) {
      newErrors.message = 'Nachricht ist erforderlich';
    }

    formData.timeBasedProjects.forEach((project, index) => {
      if (!project.title.trim()) {
        newErrors[`${project.id}_title`] = 'Titel ist erforderlich';
      }
      if (!project.startDate) {
        newErrors[`${project.id}_startDate`] = 'Startdatum ist erforderlich';
      }
      if (!project.endDate) {
        newErrors[`${project.id}_endDate`] = 'Enddatum ist erforderlich';
      }
      if (project.hourlyRate <= 0) {
        newErrors[`${project.id}_hourlyRate`] = 'Stundensatz muss größer als 0 sein';
      }
      if (!project.workingDays.length) {
        newErrors[`${project.id}_workingDays`] = 'Mindestens ein Arbeitstag muss ausgewählt werden';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Formular absenden
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {

    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Zeitbasiertes Projekt-Angebot erstellen</h2>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <FiX className="h-6 w-6" />
        </button>
      </div>

      {/* Info-Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <FiClock className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Zeitbasierte Projekte</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                Ideal für längere Projekte wie Mietkoch, Betreuung, oder kontinuierliche
                Dienstleistungen. Definieren Sie Zeiträume, Arbeitszeiten und Stundensätze für
                präzise Kostenkalkulationen.
              </p>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Hauptnachricht */}
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
            Nachricht *
          </label>
          <textarea
            id="message"
            rows={4}
            value={formData.message}
            onChange={e => handleInputChange('message', e.target.value)}
            className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#14ad9f] focus:border-[#14ad9f] sm:text-sm ${
              errors.message ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Beschreiben Sie Ihr zeitbasiertes Projekt-Angebot..."
            required
          />
          {errors.message && <p className="mt-1 text-sm text-red-600">{errors.message}</p>}
        </div>

        {/* Zeitbasierte Projekte */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <label className="block text-sm font-medium text-gray-700">Zeitbasierte Projekte</label>
            <button
              type="button"
              onClick={addProject}
              className="inline-flex items-center px-3 py-1 border border-[#14ad9f] text-sm font-medium rounded-md text-[#14ad9f] bg-white hover:bg-[#14ad9f] hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f] transition-colors"
            >
              <FiPlus className="mr-1 h-4 w-4" />
              Projekt hinzufügen
            </button>
          </div>

          <div className="space-y-6">
            {formData.timeBasedProjects.map((project, index) => (
              <div key={project.id} className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-900">Projekt {index + 1}</h4>
                  {formData.timeBasedProjects.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeProject(project.id)}
                      className="text-red-400 hover:text-red-600 transition-colors"
                    >
                      <FiX className="h-5 w-5" />
                    </button>
                  )}
                </div>

                {/* Projekt-Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Titel */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Projekt-Titel *
                    </label>
                    <input
                      type="text"
                      value={project.title}
                      onChange={e => updateProject(project.id, 'title', e.target.value)}
                      className={`block w-full border rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-[#14ad9f] focus:border-[#14ad9f] ${
                        errors[`${project.id}_title`] ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="z.B. Mietkoch für Event-Woche"
                      required
                    />
                    {errors[`${project.id}_title`] && (
                      <p className="mt-1 text-sm text-red-600">{errors[`${project.id}_title`]}</p>
                    )}
                  </div>

                  {/* Zeitraum */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Startdatum *
                    </label>
                    <input
                      type="date"
                      value={project.startDate}
                      onChange={e => updateProject(project.id, 'startDate', e.target.value)}
                      className={`block w-full border rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-[#14ad9f] focus:border-[#14ad9f] ${
                        errors[`${project.id}_startDate`] ? 'border-red-300' : 'border-gray-300'
                      }`}
                      required
                    />
                    {errors[`${project.id}_startDate`] && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors[`${project.id}_startDate`]}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Enddatum *
                    </label>
                    <input
                      type="date"
                      value={project.endDate}
                      onChange={e => updateProject(project.id, 'endDate', e.target.value)}
                      className={`block w-full border rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-[#14ad9f] focus:border-[#14ad9f] ${
                        errors[`${project.id}_endDate`] ? 'border-red-300' : 'border-gray-300'
                      }`}
                      required
                    />
                    {errors[`${project.id}_endDate`] && (
                      <p className="mt-1 text-sm text-red-600">{errors[`${project.id}_endDate`]}</p>
                    )}
                  </div>

                  {/* Arbeitszeiten */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Stunden pro Tag *
                    </label>
                    <input
                      type="number"
                      min="0.5"
                      max="24"
                      step="0.5"
                      value={project.hoursPerDay}
                      onChange={e =>
                        updateProject(project.id, 'hoursPerDay', parseFloat(e.target.value) || 0)
                      }
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Stundensatz (€) *
                    </label>
                    <div className="relative">
                      <FiEuro className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={project.hourlyRate}
                        onChange={e =>
                          updateProject(project.id, 'hourlyRate', parseFloat(e.target.value) || 0)
                        }
                        className={`block w-full pl-10 border rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-[#14ad9f] focus:border-[#14ad9f] ${
                          errors[`${project.id}_hourlyRate`] ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="35.00"
                        required
                      />
                    </div>
                    {errors[`${project.id}_hourlyRate`] && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors[`${project.id}_hourlyRate`]}
                      </p>
                    )}
                  </div>
                </div>

                {/* Beschreibung */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Projekt-Beschreibung
                  </label>
                  <textarea
                    rows={3}
                    value={project.description}
                    onChange={e => updateProject(project.id, 'description', e.target.value)}
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                    placeholder="Detaillierte Beschreibung des Projekts..."
                  />
                </div>

                {/* Arbeitstage */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Arbeitstage *
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(day => (
                      <label key={day} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={project.workingDays.includes(day)}
                          onChange={e => {
                            const newDays = e.target.checked
                              ? [...project.workingDays, day]
                              : project.workingDays.filter(d => d !== day);
                            updateProject(project.id, 'workingDays', newDays);
                          }}
                          className="h-4 w-4 text-[#14ad9f] focus:ring-[#14ad9f] border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">{day}</span>
                      </label>
                    ))}
                  </div>
                  {errors[`${project.id}_workingDays`] && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors[`${project.id}_workingDays`]}
                    </p>
                  )}
                </div>

                {/* Berechnung anzeigen */}
                {project.startDate && project.endDate && project.workingDays.length && (
                  <div className="p-4 bg-white border border-[#14ad9f] rounded-lg">
                    <h5 className="text-sm font-semibold text-[#14ad9f] mb-2">Kalkulation</h5>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Zeitraum:</span>
                        <p className="font-medium">
                          {new Date(project.startDate).toLocaleDateString('de-DE')} -{' '}
                          {new Date(project.endDate).toLocaleDateString('de-DE')}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">Arbeitstage:</span>
                        <p className="font-medium">
                          {calculateWorkingDays(
                            project.startDate,
                            project.endDate,
                            project.workingDays
                          )}{' '}
                          Tage
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">Gesamtstunden:</span>
                        <p className="font-medium">{project.totalHours} Stunden</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Projektsumme:</span>
                        <p className="font-bold text-[#14ad9f]">
                          {project.totalAmount.toLocaleString('de-DE', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{' '}
                          €
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Gesamtsumme */}
          {formData.timeBasedProjects.length > 0 && (
            <div className="mt-6 p-4 bg-[#14ad9f] rounded-lg">
              <div className="flex justify-between items-center text-white">
                <span className="text-lg font-medium">Gesamtsumme aller Projekte:</span>
                <span className="text-2xl font-bold">
                  {calculateTotalAmount().toLocaleString('de-DE', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  €
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Weitere Angaben */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Zeitrahmen</label>
            <input
              type="text"
              value={formData.timeline}
              onChange={e => handleInputChange('timeline', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
              placeholder="z.B. 2-3 Wochen"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gültig bis</label>
            <input
              type="date"
              value={formData.validUntil}
              onChange={e => handleInputChange('validUntil', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bedingungen</label>
          <textarea
            value={formData.terms}
            onChange={e => handleInputChange('terms', e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
            placeholder="Zahlungsbedingungen, Garantien, etc."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Zusätzliche Notizen
          </label>
          <textarea
            value={formData.additionalNotes}
            onChange={e => handleInputChange('additionalNotes', e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
            placeholder="Weitere Informationen für den Kunden"
          />
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-end pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
          >
            Abbrechen
          </button>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-6 py-2 border border-transparent rounded-md shadow-sm text-white bg-[#14ad9f] hover:bg-[#129488] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <FiLoader className="animate-spin -ml-1 mr-2 h-4 w-4" />
            ) : (
              <FiSend className="-ml-1 mr-2 h-4 w-4" />
            )}
            Angebot senden
          </button>
        </div>
      </form>
    </div>
  );
}
