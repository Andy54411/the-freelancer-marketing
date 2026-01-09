'use client';

import { MultiSelect } from '@/components/ui/multi-select';
import { TagInput } from '@/components/ui/tag-input';
import { ExperienceSection } from './ExperienceSection';
import { EducationSection } from './EducationSection';
import { LanguageSection } from './LanguageSection';
import { QualificationSection } from './QualificationSection';
import { PersonalSection } from './PersonalSection';
import { DocumentsSection } from './DocumentsSection';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ApplicantProfileSchema, ApplicantProfile } from '@/types/career';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Pencil, Target } from 'lucide-react';
import { toast } from 'sonner';

const JOB_CATEGORIES = [
  'Ausbildung',
  'Bar / Theke',
  'Einkauf / Lager',
  'Empfang / Reservierung',
  'Finanzen / Personal / Verwaltung',
  'Fleischerei',
  'Geschäftsführung / Management',
  'Handwerk / Technik',
  'Housekeeping / Reinigung / Hauswirtschaft',
  'Konditorei / Bäckerei',
  'Küche',
  'Logistik / Fahrer',
  'Marketing',
  'Praktikum / Trainee',
  'Reiseverkehr / Touristik',
  'Restaurant / Service',
  'Stewarding / Spülküche',
  'Veranstaltung / Bankett',
  'Vertrieb / Verkauf',
  'Wellness / Gesundheit / Unterhaltung',
];

const ACTIVITY_FIELDS = [
  'Ausbildung / Praktikum (Küche)',
  'Chef de Partie / Supervisor',
  'Commis / Demi / Jungkoch',
  'Küchenhilfe',
  'Küchenleitung',
  'Spezialitätenköche',
  'weitere: Küche',
];

const INDUSTRIES = [
  'Autovermietung',
  'Banken / Versicherungen / Immobilien',
  'Bars / Bäckerei / Café / Bistro / Disko / Kneipe',
  'Catering / Großverpflegung',
  'Catering Event / Partyservice',
  'Day Spa / Fitness / Freizeitbad',
  'Dienstleistung',
  'Ferien- / Freizeitparks',
  'Ferienclubs',
  'Ferienhof / Gasthof / Pension',
  'Gastronomie',
  'Hotellerie',
  'Industrie / Dienstleistung',
  'Internet / IT / Telekommunikation',
  'Jugendherberge / Hostel / Camping',
  'Kanzlei / Beratung / Agentur',
  'Kliniken / Praxen / Seniorenheime',
  'Kochschulen',
  'Kreuzfahrtschiffe / Schifffahrt / Reedereien',
  'Messe / Konferenz / Seminarveranstalter',
  'Personaldienstleister / Personalvermittler',
  'Privathaushalt / Botschaft / Konsulat',
  'Restaurants',
  'Schulen (Berufs-, Hoch- und Fachschulen) / Institute',
  'Soziale Einrichtungen',
  'Stadthallen / Theater / Kultureinrichtungen',
  'Systemgastronomie',
  'Touristik',
  'Zulieferer / Handel',
];

const EMPLOYMENT_TYPES = [
  'Vollzeit',
  'Teilzeit',
  'Freelance',
  'Praktikum',
  'Werkstudent',
  'Ausbildung',
];

const CAREER_LEVELS = [
  'Student/Praktikant',
  'Berufseinsteiger',
  'Professional',
  'Senior Professional',
  'Führungskraft',
  'Executive',
];

interface CandidateProfileFormProps {
  userId: string;
  initialData?: Partial<ApplicantProfile>;
}

export function CandidateProfileForm({ userId, initialData }: CandidateProfileFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditingPreferences, setIsEditingPreferences] = useState(false);

  const form = useForm<ApplicantProfile>({
    resolver: zodResolver(ApplicantProfileSchema),
    defaultValues: {
      userId,
      salutation: initialData?.salutation || 'Herr',
      firstName: initialData?.firstName || '',
      lastName: initialData?.lastName || '',
      email: initialData?.email || '',
      phone: initialData?.phone || '',
      birthDate: initialData?.birthDate || '',
      street: initialData?.street || '',
      zip: initialData?.zip || '',
      city: initialData?.city || '',
      country: initialData?.country || 'Deutschland',
      location: initialData?.location || '',
      bio: initialData?.bio || '',
      skills: initialData?.skills || [],
      experience: initialData?.experience || [],
      education: initialData?.education || [],
      linkedinUrl: initialData?.linkedinUrl || '',
      portfolioUrl: initialData?.portfolioUrl || '',
      profilePictureUrl: initialData?.profilePictureUrl || '',

      // Documents
      cvUrl: initialData?.cvUrl || '',
      cvName: initialData?.cvName || '',
      coverLetterUrl: initialData?.coverLetterUrl || '',
      coverLetterName: initialData?.coverLetterName || '',

      // Preferences
      desiredPosition: initialData?.desiredPosition || '',
      jobField: initialData?.jobField || '',
      activityField: initialData?.activityField || [],
      industries: initialData?.industries || [],

      leadershipRating: initialData?.leadershipRating || undefined,
      teamRating: initialData?.teamRating || undefined,
      communicationRating: initialData?.communicationRating || undefined,

      employmentTypes: initialData?.employmentTypes || [],
      preferredLocations: initialData?.preferredLocations || [],
      careerLevel: initialData?.careerLevel || [],
      relocationWillingness: initialData?.relocationWillingness || '',

      noticePeriod: initialData?.noticePeriod || { duration: '', timing: '' },
      salaryExpectation: initialData?.salaryExpectation || {
        amount: undefined,
        currency: 'EUR',
        period: '',
      },

      hotelStars: initialData?.hotelStars || { min: '0', max: '0' },
      gaultMillauPoints: initialData?.gaultMillauPoints || { min: '0', max: '0' },
      michelinStars: initialData?.michelinStars || { min: '0', max: '0' },

      languages: initialData?.languages || [],
      qualifications: initialData?.qualifications || [],

      updatedAt: new Date().toISOString(),
    },
  });

  // Save individual sections
  async function savePersonalData() {
    setIsSubmitting(true);
    try {
      const data = form.getValues();
      const response = await fetch('/api/career/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: data.userId,
          salutation: data.salutation,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          birthDate: data.birthDate,
          street: data.street,
          zip: data.zip,
          city: data.city,
          country: data.country,
          profilePictureUrl: data.profilePictureUrl,
          updatedAt: new Date().toISOString(),
        }),
      });
      if (!response.ok) throw new Error('Fehler beim Speichern');
      toast.success('Persönliche Daten gespeichert');
      router.refresh();
    } catch {
      toast.error('Fehler beim Speichern');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function saveDocuments() {
    setIsSubmitting(true);
    try {
      const data = form.getValues();
      const response = await fetch('/api/career/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: data.userId,
          cvUrl: data.cvUrl,
          cvName: data.cvName,
          coverLetterUrl: data.coverLetterUrl,
          coverLetterName: data.coverLetterName,
          updatedAt: new Date().toISOString(),
        }),
      });
      if (!response.ok) throw new Error('Fehler beim Speichern');
      toast.success('Dokumente gespeichert');
      router.refresh();
    } catch {
      toast.error('Fehler beim Speichern');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function savePreferences() {
    setIsSubmitting(true);
    try {
      const data = form.getValues();
      const response = await fetch('/api/career/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: data.userId,
          desiredPosition: data.desiredPosition,
          jobField: data.jobField,
          activityField: data.activityField,
          industries: data.industries,
          hotelStars: data.hotelStars,
          gaultMillauPoints: data.gaultMillauPoints,
          michelinStars: data.michelinStars,
          employmentTypes: data.employmentTypes,
          preferredLocations: data.preferredLocations,
          careerLevel: data.careerLevel,
          relocationWillingness: data.relocationWillingness,
          noticePeriod: data.noticePeriod,
          salaryExpectation: data.salaryExpectation,
          updatedAt: new Date().toISOString(),
        }),
      });
      if (!response.ok) throw new Error('Fehler beim Speichern');
      toast.success('Berufliche Wünsche gespeichert');
      setIsEditingPreferences(false);
      router.refresh();
    } catch {
      toast.error('Fehler beim Speichern');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function saveExperience() {
    setIsSubmitting(true);
    try {
      const data = form.getValues();
      const response = await fetch('/api/career/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: data.userId,
          experience: data.experience,
          updatedAt: new Date().toISOString(),
        }),
      });
      if (!response.ok) throw new Error('Fehler beim Speichern');
      toast.success('Berufserfahrung gespeichert');
      router.refresh();
    } catch {
      toast.error('Fehler beim Speichern');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function saveEducation() {
    setIsSubmitting(true);
    try {
      const data = form.getValues();
      const response = await fetch('/api/career/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: data.userId,
          education: data.education,
          updatedAt: new Date().toISOString(),
        }),
      });
      if (!response.ok) throw new Error('Fehler beim Speichern');
      toast.success('Bildungsweg gespeichert');
      router.refresh();
    } catch {
      toast.error('Fehler beim Speichern');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function saveLanguages() {
    setIsSubmitting(true);
    try {
      const data = form.getValues();
      const response = await fetch('/api/career/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: data.userId,
          languages: data.languages,
          updatedAt: new Date().toISOString(),
        }),
      });
      if (!response.ok) throw new Error('Fehler beim Speichern');
      toast.success('Sprachkenntnisse gespeichert');
      router.refresh();
    } catch {
      toast.error('Fehler beim Speichern');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function saveQualifications() {
    setIsSubmitting(true);
    try {
      const data = form.getValues();
      const response = await fetch('/api/career/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: data.userId,
          qualifications: data.qualifications,
          updatedAt: new Date().toISOString(),
        }),
      });
      if (!response.ok) throw new Error('Fehler beim Speichern');
      toast.success('Fachkenntnisse gespeichert');
      router.refresh();
    } catch {
      toast.error('Fehler beim Speichern');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function _onSubmit(data: ApplicantProfile) {
    setIsSubmitting(true);
    try {
      const profileData = {
        ...data,
        updatedAt: new Date().toISOString(),
      };

      const response = await fetch('/api/career/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      });

      if (!response.ok) {
        throw new Error('Fehler beim Speichern des Profils');
      }

      toast.success('Profil erfolgreich gespeichert');
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error('Fehler beim Speichern. Bitte versuchen Sie es erneut.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <div className="space-y-8">
        {/* Contact Data - Custom Layout matching requirements */}
        <PersonalSection form={form} onSave={savePersonalData} isSubmitting={isSubmitting} />

        {/* Berufliche Wünsche */}
        <Card className="mb-8">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-teal-600" />
              <CardTitle className="text-xl font-semibold">Berufliche Wünsche</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsEditingPreferences(!isEditingPreferences)}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {!isEditingPreferences ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-1 text-gray-600">Position</div>
                  <div className="md:col-span-3 text-gray-900">
                    {form.getValues('desiredPosition') || '-'}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-1 text-gray-600">Berufsgruppe</div>
                  <div className="md:col-span-3 text-gray-900">
                    {form.getValues('jobField') || '-'}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-1 text-gray-600">Arbeitsort</div>
                  <div className="md:col-span-3 text-gray-900">
                    {(form.getValues('preferredLocations') || []).join(', ') || '-'}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-1 text-gray-600">Anstellung</div>
                  <div className="md:col-span-3 text-gray-900">
                    {(form.getValues('employmentTypes') || []).join(', ') || '-'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Position */}
                <div className="md:col-span-2">
                  <FormField
                    control={form.control}
                    name="desiredPosition"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Position*</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Berufsgruppe */}
                <FormField
                  control={form.control}
                  name="jobField"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Berufsgruppe*</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="--- bitte auswählen ---" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {JOB_CATEGORIES.map(cat => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Tätigkeitsfeld */}
                <FormField
                  control={form.control}
                  name="activityField"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tätigkeitsfeld</FormLabel>
                      <FormControl>
                        <MultiSelect
                          options={ACTIVITY_FIELDS.map(f => ({ label: f, value: f }))}
                          selected={field.value || []}
                          onChange={field.onChange}
                          placeholder="Bitte wählen"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Branche */}
                <div className="md:col-span-2">
                  <FormField
                    control={form.control}
                    name="industries"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Branche*</FormLabel>
                        <FormControl>
                          <MultiSelect
                            options={INDUSTRIES.map(i => ({ label: i, value: i }))}
                            selected={field.value || []}
                            onChange={field.onChange}
                            placeholder="Branchen wählen"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Hotelsterne */}
                <div>
                  <FormLabel className="block mb-2">
                    Hotelsterne <span className="text-gray-500 text-sm">(Richtwert)</span>
                  </FormLabel>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="hotelStars.min"
                      render={({ field }) => (
                        <FormItem>
                          <Select onValueChange={field.onChange} value={field.value as string}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Min" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {[0, 1, 2, 3, 4, 5].map(num => (
                                <SelectItem key={num} value={num.toString()}>
                                  {num}*
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="hotelStars.max"
                      render={({ field }) => (
                        <FormItem>
                          <Select onValueChange={field.onChange} value={field.value as string}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Max" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {[0, 1, 2, 3, 4, 5].map(num => (
                                <SelectItem key={num} value={num.toString()}>
                                  {num}*
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Gault Millau */}
                <div>
                  <FormLabel className="block mb-2">Gault Millau-Punkte</FormLabel>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="gaultMillauPoints.min"
                      render={({ field }) => (
                        <FormItem>
                          <Select onValueChange={field.onChange} value={field.value as string}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Min" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="0">0</SelectItem>
                              {Array.from({ length: 12 }, (_, i) => 15 + i * 0.5).map(num => (
                                <SelectItem key={num} value={num.toString()}>
                                  {num}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="gaultMillauPoints.max"
                      render={({ field }) => (
                        <FormItem>
                          <Select onValueChange={field.onChange} value={field.value as string}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Max" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="0">0</SelectItem>
                              {Array.from({ length: 12 }, (_, i) => 15 + i * 0.5).map(num => (
                                <SelectItem key={num} value={num.toString()}>
                                  {num}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Michelin */}
                <div>
                  <FormLabel className="block mb-2">Michelin-Sterne</FormLabel>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="michelinStars.min"
                      render={({ field }) => (
                        <FormItem>
                          <Select onValueChange={field.onChange} value={field.value as string}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Min" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {[0, 1, 2, 3].map(num => (
                                <SelectItem key={num} value={num.toString()}>
                                  {num}*
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="michelinStars.max"
                      render={({ field }) => (
                        <FormItem>
                          <Select onValueChange={field.onChange} value={field.value as string}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Max" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {[0, 1, 2, 3].map(num => (
                                <SelectItem key={num} value={num.toString()}>
                                  {num}*
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Anstellung */}
                <div>
                  <FormField
                    control={form.control}
                    name="employmentTypes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Anstellung*</FormLabel>
                        <FormControl>
                          <MultiSelect
                            options={EMPLOYMENT_TYPES.map(t => ({ label: t, value: t }))}
                            selected={field.value || []}
                            onChange={field.onChange}
                            placeholder="Anstellungsarten wählen"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Arbeitsort */}
                <div className="md:col-span-2">
                  <FormField
                    control={form.control}
                    name="preferredLocations"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Arbeitsort*</FormLabel>
                        <FormControl>
                          <TagInput
                            placeholder="Ort eingeben und aus der Liste auswählen"
                            tags={field.value || []}
                            setTags={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Rang */}
                <div>
                  <FormField
                    control={form.control}
                    name="careerLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rang*</FormLabel>
                        <FormControl>
                          <MultiSelect
                            options={CAREER_LEVELS.map(l => ({ label: l, value: l }))}
                            selected={field.value || []}
                            onChange={field.onChange}
                            placeholder="Karrierelevel wählen"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Umzugsbereitschaft */}
                <div>
                  <FormField
                    control={form.control}
                    name="relocationWillingness"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Umzugsbereitschaft</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex gap-4 pt-2"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="yes" id="relocation-yes" />
                              <label htmlFor="relocation-yes">vorhanden</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="no" id="relocation-no" />
                              <label htmlFor="relocation-no">nicht vorhanden</label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Kündigungsfrist */}
                <div className="md:col-span-2">
                  <FormLabel className="block mb-2">Kündigungsfrist</FormLabel>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="noticePeriod.duration"
                        render={({ field }) => (
                          <FormItem>
                            <Select onValueChange={field.onChange} value={field.value as string}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Dauer" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="0">--- bitte auswählen ---</SelectItem>
                                <SelectItem value="keine">keine</SelectItem>
                                <SelectItem value="7 Tage">7 Tage</SelectItem>
                                <SelectItem value="14 Tage">14 Tage</SelectItem>
                                <SelectItem value="1 Monat">1 Monat</SelectItem>
                                <SelectItem value="2 Monate">2 Monate</SelectItem>
                                <SelectItem value="3 Monate">3 Monate</SelectItem>
                                <SelectItem value="4 Monate">4 Monate</SelectItem>
                                <SelectItem value="6 Monate">6 Monate</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="noticePeriod.timing"
                        render={({ field }) => (
                          <FormItem>
                            <Select onValueChange={field.onChange} value={field.value as string}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Zeitpunkt" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="0">--- bitte auswählen ---</SelectItem>
                                <SelectItem value="keine">keine</SelectItem>
                                <SelectItem value="zur Monatsmitte">zur Monatsmitte</SelectItem>
                                <SelectItem value="zum Monatsende">zum Monatsende</SelectItem>
                                <SelectItem value="zum Quartal">zum Quartal</SelectItem>
                                <SelectItem value="zum Jahresende">zum Jahresende</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* Gehaltswunsch */}
                <div className="md:col-span-2">
                  <FormLabel className="block mb-2">Gehaltswunsch</FormLabel>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="salaryExpectation.amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="Betrag"
                                {...field}
                                value={(field.value as number) || ''}
                                onChange={e =>
                                  field.onChange(
                                    e.target.value ? parseInt(e.target.value) : undefined
                                  )
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="salaryExpectation.currency"
                        render={({ field }) => (
                          <FormItem>
                            <Select onValueChange={field.onChange} value={field.value as string}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Währung" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="---">---</SelectItem>
                                <SelectItem value="CHF">CHF</SelectItem>
                                <SelectItem value="EUR">EUR</SelectItem>
                                <SelectItem value="GBP">GBP</SelectItem>
                                <SelectItem value="PLN">PLN</SelectItem>
                                <SelectItem value="USD">USD</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="salaryExpectation.period"
                        render={({ field }) => (
                          <FormItem>
                            <Select onValueChange={field.onChange} value={field.value as string}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Zeitraum" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="0">--- bitte auswählen ---</SelectItem>
                                <SelectItem value="Jahresgehalt - netto">
                                  Jahresgehalt - netto
                                </SelectItem>
                                <SelectItem value="Jahresgehalt - brutto">
                                  Jahresgehalt - brutto
                                </SelectItem>
                                <SelectItem value="Monatsgehalt - netto">
                                  Monatsgehalt - netto
                                </SelectItem>
                                <SelectItem value="Monatsgehalt - brutto">
                                  Monatsgehalt - brutto
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
            {isEditingPreferences && (
              <div className="flex justify-end gap-4 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditingPreferences(false)}
                  disabled={isSubmitting}
                >
                  Abbrechen
                </Button>
                <Button
                  type="button"
                  onClick={savePreferences}
                  disabled={isSubmitting}
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Speichern
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dokumente */}
        <DocumentsSection form={form} onSave={saveDocuments} isSubmitting={isSubmitting} />

        {/* Lebenslauf (Experience, Education, Languages, Qualifications) */}
        <Card>
          <CardHeader>
            <CardTitle>Lebenslauf</CardTitle>
          </CardHeader>
          <CardContent className="space-y-10">
            {/* Berufserfahrung */}
            <ExperienceSection form={form} onSave={saveExperience} isSubmitting={isSubmitting} />

            {/* Bildungsweg */}
            <EducationSection form={form} onSave={saveEducation} isSubmitting={isSubmitting} />

            {/* Sprachkenntnisse */}
            <LanguageSection form={form} onSave={saveLanguages} isSubmitting={isSubmitting} />

            {/* Fachkenntnisse */}
            <QualificationSection
              form={form}
              onSave={saveQualifications}
              isSubmitting={isSubmitting}
            />
          </CardContent>
        </Card>
      </div>
    </Form>
  );
}
