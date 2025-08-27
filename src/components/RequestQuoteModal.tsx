/**
 * RequestQuoteModal - Angebot anfragen Komponente für Taskilo
 * Eigenständige Komponente für Angebots-Anfragen
 */
'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  FileText,
  Calendar,
  MapPin,
  Clock,
  Euro,
  User,
  Phone,
  Mail,
  MessageSquare,
  CheckCircle,
  Loader2,
  AlertCircle,
  Send,
  Building,
} from 'lucide-react';
import Image from 'next/image';

export interface CompanyProfile {
  id: string;
  companyName: string;
  displayName?: string;
  selectedCategory?: string;
  selectedSubcategory?: string;
  hourlyRate?: number;
  profilePictureFirebaseUrl?: string;
  profilePictureURL?: string;
  photoURL?: string;
  description?: string;
  location?: string;
  completedJobs?: number;
  rating?: number;
  responseTime?: number;
  radiusKm?: number;
}

export interface RequestQuoteData {
  projectTitle: string;
  projectDescription: string;
  projectCategory: string;
  projectSubcategory: string;
  location: string;
  postalCode: string;
  preferredStartDate: string;
  estimatedDuration: string;
  budgetRange: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  additionalNotes: string;
  urgency: 'niedrig' | 'normal' | 'hoch' | 'sofort';
}

interface RequestQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  provider: CompanyProfile;
  preselectedCategory?: string;
  preselectedSubcategory?: string;
  customerInfo?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  onSubmit?: (quoteData: RequestQuoteData) => Promise<void>;
}

const BUDGET_RANGES = [
  'Unter 500€',
  '500€ - 1.000€',
  '1.000€ - 2.500€',
  '2.500€ - 5.000€',
  '5.000€ - 10.000€',
  'Über 10.000€',
  'Budget flexibel',
];

const DURATION_OPTIONS = [
  'Wenige Stunden',
  '1 Tag',
  '2-3 Tage',
  '1 Woche',
  '2-4 Wochen',
  '1-3 Monate',
  'Längerfristig',
];

const URGENCY_OPTIONS = [
  { value: 'niedrig', label: 'Niedrig', description: 'Keine Eile, flexible Terminplanung' },
  { value: 'normal', label: 'Normal', description: 'Standardbearbeitung innerhalb 1-2 Wochen' },
  { value: 'hoch', label: 'Hoch', description: 'Schnelle Bearbeitung gewünscht' },
  { value: 'sofort', label: 'Sofort', description: 'Dringend, schnellstmöglich' },
] as const;

export default function RequestQuoteModal({
  isOpen,
  onClose,
  provider,
  preselectedCategory,
  preselectedSubcategory,
  customerInfo,
  onSubmit,
}: RequestQuoteModalProps) {
  const { firebaseUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'details' | 'contact' | 'review' | 'success'>('details');

  const [formData, setFormData] = useState<RequestQuoteData>({
    projectTitle: '',
    projectDescription: '',
    projectCategory: preselectedCategory || provider.selectedCategory || '',
    projectSubcategory: preselectedSubcategory || provider.selectedSubcategory || '',
    location: '',
    postalCode: '',
    preferredStartDate: '',
    estimatedDuration: '',
    budgetRange: '',
    customerName: customerInfo?.name || '',
    customerEmail: customerInfo?.email || '',
    customerPhone: customerInfo?.phone || '',
    additionalNotes: '',
    urgency: 'normal',
  });

  const [errors, setErrors] = useState<Partial<RequestQuoteData>>({});

  const validateStep = (currentStep: string): boolean => {
    const newErrors: Partial<RequestQuoteData> = {};

    if (currentStep === 'details') {
      if (!formData.projectTitle.trim()) newErrors.projectTitle = 'Projekttitel ist erforderlich';
      if (!formData.projectDescription.trim())
        newErrors.projectDescription = 'Projektbeschreibung ist erforderlich';
      if (!formData.location.trim()) newErrors.location = 'Standort ist erforderlich';
      if (!formData.postalCode.trim()) newErrors.postalCode = 'Postleitzahl ist erforderlich';
      if (!formData.budgetRange) newErrors.budgetRange = 'Budgetrahmen ist erforderlich';
    }

    if (currentStep === 'contact') {
      if (!formData.customerName.trim()) newErrors.customerName = 'Name ist erforderlich';
      if (!formData.customerEmail.trim()) newErrors.customerEmail = 'E-Mail ist erforderlich';
      else if (!/\S+@\S+\.\S+/.test(formData.customerEmail))
        newErrors.customerEmail = 'Ungültige E-Mail-Adresse';
      if (!formData.customerPhone.trim())
        newErrors.customerPhone = 'Telefonnummer ist erforderlich';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      if (step === 'details') setStep('contact');
      else if (step === 'contact') setStep('review');
    }
  };

  const handleBack = () => {
    if (step === 'contact') setStep('details');
    else if (step === 'review') setStep('contact');
  };

  const handleSubmit = async () => {
    if (!validateStep('contact')) return;

    setLoading(true);
    try {
      if (onSubmit) {
        await onSubmit(formData);
      } else {
        // Fallback: Standard-Anfrage über API with Auth token
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };

        // Add auth token if user is logged in
        if (firebaseUser) {
          try {
            const token = await firebaseUser.getIdToken();
            headers['Authorization'] = `Bearer ${token}`;
            console.log('🔐 Sending quote request with auth token for user:', firebaseUser.uid);
          } catch (error) {
            console.error('Error getting auth token:', error);
          }
        } else {
          console.log('📝 Sending quote request without auth (anonymous)');
        }

        const response = await fetch('/api/quotes/create', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            providerId: provider.id,
            quoteData: formData,
          }),
        });

        if (!response.ok) throw new Error('Fehler beim Senden der Anfrage');
      }

      setStep('success');
      toast.success('Angebot erfolgreich angefragt!');
    } catch (error) {
      console.error('Error submitting quote request:', error);
      toast.error('Fehler beim Senden der Anfrage. Bitte versuchen Sie es erneut.');
    } finally {
      setLoading(false);
    }
  };

  const getProviderImage = () => {
    return (
      provider.profilePictureFirebaseUrl ||
      provider.profilePictureURL ||
      provider.photoURL ||
      '/images/default-avatar.jpg'
    );
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'niedrig':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'normal':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'hoch':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'sofort':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl sm:max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-[#14ad9f]" />
            Angebot anfordern
          </DialogTitle>
        </DialogHeader>

        {/* Provider Info Header */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16">
                <Image
                  src={getProviderImage()}
                  alt={provider.companyName}
                  fill
                  className="rounded-full object-cover"
                />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">{provider.companyName}</h3>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  {provider.selectedSubcategory && (
                    <span className="flex items-center gap-1">
                      <Building className="w-4 h-4" />
                      {provider.selectedSubcategory}
                    </span>
                  )}
                  {provider.hourlyRate && (
                    <span className="flex items-center gap-1">
                      <Euro className="w-4 h-4" />
                      Ab {provider.hourlyRate}€/Std
                    </span>
                  )}
                  {provider.responseTime && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />~{provider.responseTime}h Antwortzeit
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step Indicator */}
        <div className="flex items-center justify-center mb-6">
          <div className="flex items-center space-x-4">
            {['details', 'contact', 'review'].map((s, index) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === s
                      ? 'bg-[#14ad9f] text-white'
                      : ['details', 'contact', 'review'].indexOf(step) > index
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {['details', 'contact', 'review'].indexOf(step) > index ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                {index < 2 && (
                  <div
                    className={`w-12 h-0.5 ${
                      ['details', 'contact', 'review'].indexOf(step) > index
                        ? 'bg-green-500'
                        : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        {step === 'details' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <Label htmlFor="projectTitle">Projekttitel *</Label>
                <Input
                  id="projectTitle"
                  value={formData.projectTitle}
                  onChange={e => setFormData({ ...formData, projectTitle: e.target.value })}
                  placeholder="z.B. Badezimmer renovieren"
                  className={errors.projectTitle ? 'border-red-500' : ''}
                />
                {errors.projectTitle && (
                  <p className="text-red-500 text-sm mt-1">{errors.projectTitle}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="projectDescription">Projektbeschreibung *</Label>
                <Textarea
                  id="projectDescription"
                  value={formData.projectDescription}
                  onChange={e => setFormData({ ...formData, projectDescription: e.target.value })}
                  placeholder="Beschreiben Sie Ihr Projekt detailliert..."
                  rows={4}
                  className={errors.projectDescription ? 'border-red-500' : ''}
                />
                {errors.projectDescription && (
                  <p className="text-red-500 text-sm mt-1">{errors.projectDescription}</p>
                )}
              </div>

              <div>
                <Label htmlFor="location">Standort *</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={e => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Stadt oder Adresse"
                  className={errors.location ? 'border-red-500' : ''}
                />
                {errors.location && <p className="text-red-500 text-sm mt-1">{errors.location}</p>}
              </div>

              <div>
                <Label htmlFor="postalCode">Postleitzahl *</Label>
                <Input
                  id="postalCode"
                  value={formData.postalCode}
                  onChange={e => setFormData({ ...formData, postalCode: e.target.value })}
                  placeholder="12345"
                  className={errors.postalCode ? 'border-red-500' : ''}
                />
                {errors.postalCode && (
                  <p className="text-red-500 text-sm mt-1">{errors.postalCode}</p>
                )}
              </div>

              <div>
                <Label htmlFor="preferredStartDate">Gewünschter Starttermin</Label>
                <Input
                  id="preferredStartDate"
                  type="date"
                  value={formData.preferredStartDate}
                  onChange={e => setFormData({ ...formData, preferredStartDate: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="estimatedDuration">Geschätzte Projektdauer</Label>
                <select
                  id="estimatedDuration"
                  value={formData.estimatedDuration}
                  onChange={e => setFormData({ ...formData, estimatedDuration: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent"
                >
                  <option value="">Bitte wählen</option>
                  {DURATION_OPTIONS.map(duration => (
                    <option key={duration} value={duration}>
                      {duration}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="budgetRange">Budgetrahmen *</Label>
                <select
                  id="budgetRange"
                  value={formData.budgetRange}
                  onChange={e => setFormData({ ...formData, budgetRange: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent ${
                    errors.budgetRange ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Bitte wählen</option>
                  {BUDGET_RANGES.map(range => (
                    <option key={range} value={range}>
                      {range}
                    </option>
                  ))}
                </select>
                {errors.budgetRange && (
                  <p className="text-red-500 text-sm mt-1">{errors.budgetRange}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <Label>Dringlichkeit</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                  {URGENCY_OPTIONS.map(({ value, label, description }) => (
                    <div
                      key={value}
                      onClick={() => setFormData({ ...formData, urgency: value })}
                      className={`p-3 border rounded-lg cursor-pointer transition-all ${
                        formData.urgency === value
                          ? 'border-[#14ad9f] bg-[#14ad9f]/10'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="font-medium text-sm">{label}</div>
                      <div className="text-xs text-gray-600 mt-1">{description}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'contact' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="customerName">Vollständiger Name *</Label>
                <Input
                  id="customerName"
                  value={formData.customerName}
                  onChange={e => setFormData({ ...formData, customerName: e.target.value })}
                  placeholder="Vor- und Nachname"
                  className={errors.customerName ? 'border-red-500' : ''}
                />
                {errors.customerName && (
                  <p className="text-red-500 text-sm mt-1">{errors.customerName}</p>
                )}
              </div>

              <div>
                <Label htmlFor="customerEmail">E-Mail-Adresse *</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={formData.customerEmail}
                  onChange={e => setFormData({ ...formData, customerEmail: e.target.value })}
                  placeholder="ihre@email.de"
                  className={errors.customerEmail ? 'border-red-500' : ''}
                />
                {errors.customerEmail && (
                  <p className="text-red-500 text-sm mt-1">{errors.customerEmail}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="customerPhone">Telefonnummer *</Label>
                <Input
                  id="customerPhone"
                  type="tel"
                  value={formData.customerPhone}
                  onChange={e => setFormData({ ...formData, customerPhone: e.target.value })}
                  placeholder="+49 123 456 789"
                  className={errors.customerPhone ? 'border-red-500' : ''}
                />
                {errors.customerPhone && (
                  <p className="text-red-500 text-sm mt-1">{errors.customerPhone}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="additionalNotes">Zusätzliche Anmerkungen</Label>
                <Textarea
                  id="additionalNotes"
                  value={formData.additionalNotes}
                  onChange={e => setFormData({ ...formData, additionalNotes: e.target.value })}
                  placeholder="Weitere wichtige Informationen..."
                  rows={3}
                />
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Datenschutzhinweis</p>
                  <p>
                    Ihre Daten werden nur zur Bearbeitung Ihrer Angebots-Anfrage verwendet und an
                    den ausgewählten Anbieter weitergeleitet.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Zusammenfassung Ihrer Anfrage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Projektdetails</h4>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <div>
                      <span className="font-medium">Titel:</span> {formData.projectTitle}
                    </div>
                    <div>
                      <span className="font-medium">Beschreibung:</span>{' '}
                      {formData.projectDescription}
                    </div>
                    <div>
                      <span className="font-medium">Standort:</span> {formData.location},{' '}
                      {formData.postalCode}
                    </div>
                    {formData.preferredStartDate && (
                      <div>
                        <span className="font-medium">Starttermin:</span>{' '}
                        {new Date(formData.preferredStartDate).toLocaleDateString('de-DE')}
                      </div>
                    )}
                    {formData.estimatedDuration && (
                      <div>
                        <span className="font-medium">Dauer:</span> {formData.estimatedDuration}
                      </div>
                    )}
                    <div>
                      <span className="font-medium">Budget:</span> {formData.budgetRange}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Dringlichkeit:</span>
                      <Badge className={getUrgencyColor(formData.urgency)}>
                        {URGENCY_OPTIONS.find(opt => opt.value === formData.urgency)?.label}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Kontaktdaten</h4>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <div>
                      <span className="font-medium">Name:</span> {formData.customerName}
                    </div>
                    <div>
                      <span className="font-medium">E-Mail:</span> {formData.customerEmail}
                    </div>
                    <div>
                      <span className="font-medium">Telefon:</span> {formData.customerPhone}
                    </div>
                    {formData.additionalNotes && (
                      <div>
                        <span className="font-medium">Anmerkungen:</span> {formData.additionalNotes}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Angebot erfolgreich angefragt!
            </h3>
            <p className="text-gray-600 mb-6">
              Ihre Anfrage wurde an {provider.companyName} gesendet. Sie erhalten innerhalb von{' '}
              {provider.responseTime || 24} Stunden eine Antwort.
            </p>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h4 className="font-medium text-green-800 mb-2">Was passiert als nächstes?</h4>
              <ul className="text-sm text-green-700 space-y-1 text-left">
                <li>• Der Anbieter prüft Ihre Anfrage</li>
                <li>• Sie erhalten ein detailliertes Angebot per E-Mail</li>
                <li>• Bei Fragen können Sie direkt über Taskilo antworten</li>
                <li>• Nach Zusage wird der Auftrag über Taskilo abgewickelt</li>
              </ul>
            </div>
          </div>
        )}

        {/* Navigation */}
        {step !== 'success' && (
          <div className="flex justify-between pt-6 border-t">
            <Button
              variant="outline"
              onClick={step === 'details' ? onClose : handleBack}
              disabled={loading}
            >
              {step === 'details' ? 'Abbrechen' : 'Zurück'}
            </Button>

            <Button
              onClick={step === 'review' ? handleSubmit : handleNext}
              disabled={loading}
              className="bg-[#14ad9f] hover:bg-[#129488] text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Wird gesendet...
                </>
              ) : step === 'review' ? (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Angebot anfordern
                </>
              ) : (
                'Weiter'
              )}
            </Button>
          </div>
        )}

        {step === 'success' && (
          <div className="flex justify-center pt-6 border-t">
            <Button onClick={onClose} className="bg-[#14ad9f] hover:bg-[#129488] text-white">
              Schließen
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
