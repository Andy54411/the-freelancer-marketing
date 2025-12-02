'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormDescription,
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Upload, X, Image as ImageIcon, MoveVertical, Eye, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { storage, db } from '@/firebase/clients';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, getDoc } from 'firebase/firestore';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { Slider } from '@/components/ui/slider';
import { JobPreviewDialog } from './JobPreviewDialog';

// Schema based on JobPostingSchema but for creation (no ID, dates, etc.)
const JobCreationSchema = z.object({
  title: z.string().min(3, 'Titel muss mindestens 3 Zeichen lang sein'),
  description: z.string().min(50, 'Beschreibung muss mindestens 50 Zeichen lang sein'),
  tasks: z.string().optional(),
  location: z.string().min(2, 'Standort ist erforderlich'),
  type: z.enum(['full-time', 'part-time', 'contract', 'freelance', 'internship']),
  salaryMin: z.string().optional(), // Input as string, convert to number
  salaryMax: z.string().optional(),
  requirements: z.string(), // Textarea, split by newline
  benefits: z.string().optional(),
  contactInfo: z.string().optional(),
  headerImageUrl: z.string().optional(),
  headerImagePositionY: z.number().min(0).max(100),
  logoUrl: z.string().optional(),
  galleryImages: z.array(z.string()).optional(),
});

type JobCreationValues = z.infer<typeof JobCreationSchema>;

interface JobCreationFormProps {
  companyId: string;
  companyName: string; // Passed from server to avoid extra fetch
}

export function JobCreationForm({ companyId, companyName }: JobCreationFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLogoUploading, setIsLogoUploading] = useState(false);
  const [isGalleryUploading, setIsGalleryUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>(null);

  const form = useForm<JobCreationValues>({
    resolver: zodResolver(JobCreationSchema),
    defaultValues: {
      title: '',
      description: '',
      tasks: '',
      location: '',
      type: 'full-time',
      salaryMin: '',
      salaryMax: '',
      requirements: '',
      benefits: '',
      contactInfo: '',
      headerImageUrl: '',
      headerImagePositionY: 50,
      logoUrl: '',
      galleryImages: [],
    },
  });

  useEffect(() => {
    const fetchCompanyLogo = async () => {
      if (!companyId) return;
      try {
        const companyDocRef = doc(db, 'companies', companyId);
        const companyDoc = await getDoc(companyDocRef);

        if (companyDoc.exists()) {
          const data = companyDoc.data();
          const logoUrl =
            data.step3?.profilePictureURL ||
            data.profilePictureURL ||
            data.companyLogo ||
            data.photoURL;
          if (logoUrl) {
            setCompanyLogoUrl(logoUrl);
            form.setValue('logoUrl', logoUrl);
          }
        }
      } catch (error) {
        console.error('Error fetching company logo:', error);
      }
    };
    fetchCompanyLogo();
  }, [companyId, form]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Bitte laden Sie nur Bilddateien hoch (JPG, PNG, WEBP)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Das Bild darf maximal 5MB groß sein');
      return;
    }

    setIsUploading(true);
    try {
      const storageRef = ref(
        storage,
        `companies/${companyId}/jobs/headers/${Date.now()}_${file.name}`
      );
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      form.setValue('headerImageUrl', downloadURL);
      toast.success('Bild erfolgreich hochgeladen');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Fehler beim Hochladen des Bildes');
    } finally {
      setIsUploading(false);
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsGalleryUploading(true);
    const newUrls: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast.error(`Datei ${file.name} ist kein Bild und wurde übersprungen.`);
          continue;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`Bild ${file.name} ist zu groß (max 5MB) und wurde übersprungen.`);
          continue;
        }

        const storageRef = ref(
          storage,
          `companies/${companyId}/jobs/gallery/${Date.now()}_${file.name}`
        );
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        newUrls.push(downloadURL);
      }

      if (newUrls.length > 0) {
        const currentImages = form.getValues('galleryImages') || [];
        form.setValue('galleryImages', [...currentImages, ...newUrls]);
        toast.success(`${newUrls.length} Bild(er) zur Galerie hinzugefügt`);
      }
    } catch (error) {
      console.error('Gallery upload error:', error);
      toast.error('Fehler beim Hochladen der Galeriebilder');
    } finally {
      setIsGalleryUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  const removeGalleryImage = (indexToRemove: number) => {
    const currentImages = form.getValues('galleryImages') || [];
    const newImages = currentImages.filter((_, index) => index !== indexToRemove);
    form.setValue('galleryImages', newImages);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Bitte laden Sie nur Bilddateien hoch');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Das Logo darf maximal 2MB groß sein');
      return;
    }

    setIsLogoUploading(true);
    try {
      const storageRef = ref(
        storage,
        `companies/${companyId}/jobs/logos/${Date.now()}_${file.name}`
      );
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      form.setValue('logoUrl', downloadURL);
      toast.success('Logo erfolgreich hochgeladen');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Fehler beim Hochladen des Logos');
    } finally {
      setIsLogoUploading(false);
    }
  };

  async function onSubmit(data: JobCreationValues) {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/recruiting/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          companyId,
          companyName,
          // Convert salary strings to numbers if present
          salaryRange: {
            min: data.salaryMin ? parseInt(data.salaryMin) : undefined,
            max: data.salaryMax ? parseInt(data.salaryMax) : undefined,
            currency: 'EUR',
          },
          // Split requirements by newline and filter empty
          // requirements: data.requirements.split('\n').filter(line => line.trim().length > 0),
          requirements: data.requirements,
        }),
      });
      if (!response.ok) {
        throw new Error('Fehler beim Erstellen der Stellenanzeige');
      }

      const result = await response.json();
      toast.success('Stellenanzeige erfolgreich erstellt');
      router.push(`/dashboard/company/${companyId}/recruiting`);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error('Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Header Data Section */}
        <Card className="border-l-4 border-l-teal-600 shadow-md">
          <CardHeader>
            <CardTitle>Kopfbereich der Stellenanzeige</CardTitle>
            <CardDescription>
              Diese Daten erscheinen im oberen Bereich (Header Wrapper) und in den Suchergebnissen.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="headerImageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Header Bild (Optional)</FormLabel>
                  <FormControl>
                    <div className="space-y-4">
                      {field.value ? (
                        <div className="space-y-4">
                          <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden group">
                            <img
                              src={field.value}
                              alt="Header Preview"
                              className="w-full h-full object-cover transition-all duration-200"
                              style={{
                                objectPosition: `center ${form.watch('headerImagePositionY')}%`,
                              }}
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  field.onChange('');
                                  form.setValue('headerImagePositionY', 50);
                                }}
                              >
                                <X className="w-4 h-4 mr-2" />
                                Bild entfernen
                              </Button>
                            </div>
                          </div>

                          <div className="bg-gray-50 p-4 rounded-lg border">
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-sm font-medium flex items-center gap-2">
                                <MoveVertical className="w-4 h-4" />
                                Bildposition anpassen
                              </label>
                              <span className="text-xs text-gray-500">
                                {form.watch('headerImagePositionY')}%
                              </span>
                            </div>
                            <Slider
                              defaultValue={[50]}
                              value={[form.watch('headerImagePositionY') || 50]}
                              max={100}
                              step={1}
                              onValueChange={vals => form.setValue('headerImagePositionY', vals[0])}
                              className="cursor-pointer"
                            />
                            <p className="text-xs text-gray-500 mt-2">
                              Verschieben Sie den Regler, um den sichtbaren Ausschnitt des Bildes
                              vertikal anzupassen.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:bg-gray-50 transition-colors text-center cursor-pointer relative">
                          <input
                            type="file"
                            accept="image/*"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={handleImageUpload}
                            disabled={isUploading}
                          />
                          <div className="flex flex-col items-center gap-2 text-gray-500">
                            {isUploading ? (
                              <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
                            ) : (
                              <ImageIcon className="w-8 h-8 text-gray-400" />
                            )}
                            <span className="font-medium">
                              {isUploading
                                ? 'Wird hochgeladen...'
                                : 'Bild hochladen oder hierher ziehen'}
                            </span>
                            <span className="text-xs text-gray-400">
                              JPG, PNG oder WEBP (max. 5MB)
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormDescription>
                    Ein ansprechendes Bild für den Kopfbereich der Stellenanzeige.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="galleryImages"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Galeriebilder (Optional)</FormLabel>
                  <FormDescription>
                    Laden Sie Bilder Ihrer Arbeitsumgebung, des Teams oder der Räumlichkeiten hoch.
                  </FormDescription>
                  <FormControl>
                    <div className="space-y-4">
                      {/* Gallery Grid */}
                      {field.value && field.value.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          {field.value.map((url, index) => (
                            <div
                              key={index}
                              className="relative aspect-video rounded-lg overflow-hidden border border-gray-200 group"
                            >
                              <img
                                src={url}
                                alt={`Galeriebild ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => removeGalleryImage(index)}
                                className="absolute top-2 right-2 p-1 bg-white/80 rounded-full hover:bg-red-100 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-4">
                        <Button
                          type="button"
                          variant="outline"
                          className="relative"
                          disabled={isGalleryUploading}
                        >
                          {isGalleryUploading ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Upload className="w-4 h-4 mr-2" />
                          )}
                          Bilder hinzufügen
                          <input
                            type="file"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            accept="image/*"
                            multiple
                            onChange={handleGalleryUpload}
                            disabled={isGalleryUploading}
                          />
                        </Button>
                        <p className="text-sm text-gray-500">
                          Mehrere Bilder möglich. Max 5MB pro Bild.
                        </p>
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="logoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Firmenlogo</FormLabel>
                  <FormControl>
                    <div className="space-y-3">
                      {/* Logo Preview Section */}
                      <div
                        className={`flex items-center gap-4 p-4 border-2 rounded-lg transition-colors ${
                          field.value ? 'border-teal-200 bg-teal-50' : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="w-20 h-20 border-2 border-white rounded-lg flex items-center justify-center bg-white shrink-0 overflow-hidden relative group shadow-sm">
                          {field.value ? (
                            <>
                              <img
                                src={field.value}
                                alt="Logo"
                                className="w-full h-full object-contain p-2"
                              />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => {
                                    field.onChange('');
                                  }}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </>
                          ) : (
                            <Building2 className="w-10 h-10 text-gray-300" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p
                            className={`text-sm font-medium ${field.value ? 'text-teal-900' : 'text-gray-900'}`}
                          >
                            {field.value ? '✓ Logo ausgewählt' : 'Kein Logo ausgewählt'}
                          </p>
                          <p className="text-xs text-gray-600 mt-0.5">
                            {field.value
                              ? 'Dieses Logo wird in der Stellenanzeige angezeigt'
                              : 'Wählen Sie Ihr Firmenlogo oder laden Sie ein neues hoch'}
                          </p>
                        </div>
                      </div>

                      {/* Options */}
                      <div className="space-y-2">
                        {/* Option 1: Use Company Logo */}
                        {companyLogoUrl && (
                          <div
                            className={`border-2 rounded-lg overflow-hidden transition-all ${
                              field.value === companyLogoUrl
                                ? 'border-teal-500 bg-teal-50'
                                : 'border-gray-200 hover:border-teal-200'
                            }`}
                          >
                            <button
                              type="button"
                              className="w-full p-3 flex items-center gap-3 text-left"
                              onClick={() => field.onChange(companyLogoUrl)}
                            >
                              <div className="w-12 h-12 bg-white rounded border-2 border-gray-100 flex items-center justify-center shrink-0 shadow-sm">
                                <img
                                  src={companyLogoUrl}
                                  alt="Company Logo"
                                  className="w-full h-full object-contain p-1.5"
                                />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                                  Standard Firmenlogo verwenden
                                  {field.value === companyLogoUrl && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-teal-100 text-teal-800">
                                      Aktiv
                                    </span>
                                  )}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  Aus Ihrem Unternehmensprofil
                                </p>
                              </div>
                              {field.value === companyLogoUrl && (
                                <div className="w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center shrink-0">
                                  <svg
                                    className="w-3 h-3 text-white"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={3}
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                </div>
                              )}
                            </button>
                          </div>
                        )}

                        {/* Option 2: Upload New */}
                        <div
                          className={`border-2 rounded-lg overflow-hidden transition-all ${
                            field.value && field.value !== companyLogoUrl
                              ? 'border-teal-500 bg-teal-50'
                              : 'border-gray-200 hover:border-teal-200'
                          }`}
                        >
                          <div className="relative">
                            <input
                              type="file"
                              accept="image/*"
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                              onChange={handleLogoUpload}
                              disabled={isLogoUploading}
                            />
                            <button
                              type="button"
                              className="w-full p-3 flex items-center gap-3 text-left"
                              disabled={isLogoUploading}
                            >
                              <div className="w-12 h-12 bg-teal-50 rounded flex items-center justify-center shrink-0">
                                {isLogoUploading ? (
                                  <Loader2 className="w-6 h-6 text-teal-600 animate-spin" />
                                ) : (
                                  <Upload className="w-6 h-6 text-teal-600" />
                                )}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                                  {isLogoUploading
                                    ? 'Logo wird hochgeladen...'
                                    : 'Neues Logo hochladen'}
                                  {field.value && field.value !== companyLogoUrl && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-teal-100 text-teal-800">
                                      Aktiv
                                    </span>
                                  )}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  PNG, JPG oder WEBP (max. 2MB)
                                </p>
                              </div>
                              {field.value && field.value !== companyLogoUrl && (
                                <div className="w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center shrink-0">
                                  <svg
                                    className="w-3 h-3 text-white"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={3}
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                </div>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </FormControl>
                  <FormDescription>
                    Das Logo wird im Kopfbereich der Stellenanzeige angezeigt. Ohne Logo wird der
                    Anfangsbuchstabe Ihres Firmennamens angezeigt.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stellentitel</FormLabel>
                  <FormControl>
                    <Input placeholder="z.B. Commis de Cuisine 100%" {...field} />
                  </FormControl>
                  <FormDescription>
                    Der Titel, wie er in der Liste und ganz oben auf der Detailseite erscheint.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Arbeitsort</FormLabel>
                    <FormControl>
                      <Input placeholder="z.B. Zürich" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Anstellungsart</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Wählen Sie eine Art" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="full-time">Vollzeit / 100%</SelectItem>
                        <SelectItem value="part-time">Teilzeit</SelectItem>
                        <SelectItem value="contract">Befristet / Saison</SelectItem>
                        <SelectItem value="freelance">Freelance</SelectItem>
                        <SelectItem value="internship">Praktikum / Ausbildung</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Details Section */}
        <Card>
          <CardHeader>
            <CardTitle>Stellenbeschreibung & Details</CardTitle>
            <CardDescription>
              Detaillierte Informationen zur Position, Anforderungen und Angebot.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Einleitung / Über uns</FormLabel>
                  <FormControl>
                    <RichTextEditor
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Beschreiben Sie das Unternehmen..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tasks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deine Aufgaben</FormLabel>
                  <FormControl>
                    <RichTextEditor
                      value={field.value || ''}
                      onChange={field.onChange}
                      placeholder="Beschreiben Sie die Aufgaben..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="requirements"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Anforderungen (Profil)</FormLabel>
                  <FormControl>
                    <RichTextEditor
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Beschreiben Sie die Anforderungen..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="benefits"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Wir bieten dir (Benefits)</FormLabel>
                  <FormControl>
                    <RichTextEditor
                      value={field.value || ''}
                      onChange={field.onChange}
                      placeholder="Beschreiben Sie die Benefits..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contactInfo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kontaktinformationen</FormLabel>
                  <FormControl>
                    <RichTextEditor
                      value={field.value || ''}
                      onChange={field.onChange}
                      placeholder="Adresse, Ansprechpartner, etc..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
              <FormField
                control={form.control}
                name="salaryMin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gehalt Min (Jährlich €)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="z.B. 50000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="salaryMax"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gehalt Max (Jährlich €)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="z.B. 70000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Abbrechen
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setShowPreview(true)}
            disabled={isSubmitting}
          >
            <Eye className="mr-2 h-4 w-4" />
            Vorschau
          </Button>
          <Button type="submit" disabled={isSubmitting} className="bg-teal-600 hover:bg-teal-700">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Stelle veröffentlichen
          </Button>
        </div>
      </form>

      <JobPreviewDialog
        open={showPreview}
        onOpenChange={setShowPreview}
        data={form.watch()}
        companyName={companyName}
        companyId={companyId}
      />
    </Form>
  );
}
