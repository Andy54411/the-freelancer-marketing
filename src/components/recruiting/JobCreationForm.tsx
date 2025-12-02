'use client';

import { useState, useEffect, useRef } from 'react';
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
import {
  Loader2,
  Upload,
  X,
  Image as ImageIcon,
  MoveVertical,
  Eye,
  Building2,
  Check,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { storage, db } from '@/firebase/clients';
import { categories } from '@/lib/categories';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, getDoc } from 'firebase/firestore';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { Slider } from '@/components/ui/slider';
import { JobPreviewDialog } from './JobPreviewDialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  JOB_CATEGORIES,
  REGIONS,
  LANGUAGES,
  INDUSTRIES,
  CAREER_LEVELS,
  EMPLOYMENT_TYPES,
} from '@/lib/jobOptions';
import { Checkbox } from '@/components/ui/checkbox';
import { useGoogleMaps } from '@/contexts/GoogleMapsLoaderContext';
import useModernMaps from '@/hooks/useModernMaps';
import { geohashForLocation } from 'geofire-common';

function InfoHint({ content }: { content: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 ml-1 rounded-full hover:bg-teal-50 hover:text-teal-600 -mt-1"
        >
          <Info className="h-4 w-4 text-gray-400" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 text-sm p-4 bg-white shadow-lg border-teal-100">
        <div className="flex gap-3">
          <Info className="h-5 w-5 text-teal-600 shrink-0 mt-0.5" />
          <p className="text-gray-600 leading-relaxed">{content}</p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Schema based on JobPostingSchema but for creation (no ID, dates, etc.)
const JobCreationSchema = z.object({
  title: z.string().min(3, 'Titel muss mindestens 3 Zeichen lang sein'),
  industry: z.string().optional(),
  category: z.string().optional(),
  region: z.string().optional(),
  languages: z.array(z.string()),
  careerLevel: z.string().optional(),
  description: z.string().min(50, 'Beschreibung muss mindestens 50 Zeichen lang sein'),
  tasks: z.string().optional(),
  location: z.string().min(2, 'Standort ist erforderlich'),
  type: z.string(),
  salaryMin: z.string().min(1, 'Mindestgehalt ist erforderlich'), // Input as string, convert to number
  salaryMax: z.string().min(1, 'Maximalgehalt ist erforderlich'),
  requirements: z.string(), // Textarea, split by newline
  benefits: z.string().optional(),
  contactInfo: z.string().optional(),
  headerImageUrl: z.string().optional(),
  headerImagePositionY: z.number().min(0).max(100),
  logoUrl: z.string().optional(),
  galleryImages: z.array(z.string()),
});

type JobCreationValues = z.infer<typeof JobCreationSchema>;

interface JobCreationFormProps {
  companyId: string;
  companyName: string; // Passed from server to avoid extra fetch
}

export function JobCreationForm({ companyId, companyName }: JobCreationFormProps) {
  const { isLoaded, google } = useGoogleMaps();
  const { createAutocomplete } = useModernMaps();
  const router = useRouter();
  const locationInputRef = useRef<HTMLInputElement>(null);
  const [selectedCoordinates, setSelectedCoordinates] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [selectedGeohash, setSelectedGeohash] = useState<string | null>(null);
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
      industry: '',
      category: '',
      region: '',
      languages: [],
      careerLevel: '',
      description: '',
      tasks: '',
      location: '',
      type: 'Vollzeit',
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
    if (locationInputRef.current && createAutocomplete) {
      const cleanup = createAutocomplete(locationInputRef.current, {
        onPlaceSelected: place => {
          if (place.address) {
            form.setValue('location', place.address);
          }
          if (place.latitude && place.longitude) {
            setSelectedCoordinates({ lat: place.latitude, lng: place.longitude });
            setSelectedGeohash(geohashForLocation([place.latitude, place.longitude]));
          }
        },
      });
      return cleanup;
    }
    return undefined;
  }, [createAutocomplete, form]);

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
      let coordinates = selectedCoordinates;
      let geohash = selectedGeohash;

      // Fallback: If no coordinates selected via picker (e.g. manual entry), try to geocode
      if (!coordinates && isLoaded && google && data.location) {
        try {
          const geocoder = new google.maps.Geocoder();
          const result = await geocoder.geocode({ address: data.location });
          if (result.results && result.results[0]) {
            const location = result.results[0].geometry.location;
            const lat = location.lat();
            const lng = location.lng();
            coordinates = { lat, lng };
            geohash = geohashForLocation([lat, lng]);
          }
        } catch (geoError) {
          console.error('Geocoding error:', geoError);
          // Continue without coordinates if geocoding fails
        }
      }

      const response = await fetch('/api/recruiting/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          companyId,
          companyName,
          coordinates,
          geohash,
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
            <CardTitle className="flex items-center">
              Kopfbereich der Stellenanzeige
              <InfoHint content="Diese Daten erscheinen im oberen Bereich (Header Wrapper) und in den Suchergebnissen." />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Images Section */}
            <div className="space-y-8">
              {/* Header Image */}
              <FormField
                control={form.control}
                name="headerImageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold flex items-center">
                      Header Bild
                      <InfoHint content="Ein ansprechendes Bild für den Kopfbereich (16:9 empfohlen)." />
                    </FormLabel>
                    <FormControl>
                      <div className="space-y-4">
                        {field.value ? (
                          <div className="space-y-4">
                            <div className="relative w-full aspect-video bg-gray-100 rounded-lg overflow-hidden group border border-gray-200 shadow-sm">
                              <img
                                src={field.value}
                                alt="Header Preview"
                                className="w-full h-full object-cover transition-all duration-200"
                                style={{
                                  objectPosition: `center ${form.watch('headerImagePositionY')}%`,
                                }}
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
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
                                  Entfernen
                                </Button>
                              </div>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                              <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-medium flex items-center gap-2 text-gray-700">
                                  <MoveVertical className="w-4 h-4" />
                                  Bildposition
                                </label>
                                <span className="text-xs font-mono bg-white px-2 py-1 rounded border">
                                  {form.watch('headerImagePositionY')}%
                                </span>
                              </div>
                              <Slider
                                defaultValue={[50]}
                                value={[form.watch('headerImagePositionY') || 50]}
                                max={100}
                                step={1}
                                onValueChange={vals =>
                                  form.setValue('headerImagePositionY', vals[0])
                                }
                                className="cursor-pointer py-2"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 hover:bg-teal-50 hover:border-teal-300 transition-all text-center cursor-pointer relative group bg-gray-50/50">
                            <input
                              type="file"
                              accept="image/*"
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                              onChange={handleImageUpload}
                              disabled={isUploading}
                            />
                            <div className="flex flex-col items-center gap-3 text-gray-500 group-hover:text-teal-600 transition-colors">
                              <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center border border-gray-100 group-hover:scale-110 transition-transform">
                                {isUploading ? (
                                  <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
                                ) : (
                                  <ImageIcon className="w-6 h-6" />
                                )}
                              </div>
                              <div className="space-y-1">
                                <span className="font-semibold block text-gray-900 group-hover:text-teal-700">
                                  {isUploading ? 'Wird hochgeladen...' : 'Bild hochladen'}
                                </span>
                                <span className="text-xs text-gray-400 block">
                                  JPG, PNG oder WEBP (max. 5MB)
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Gallery Images */}
              <FormField
                control={form.control}
                name="galleryImages"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold flex items-center">
                      Galeriebilder
                      <InfoHint content="Zeigen Sie Ihre Arbeitsumgebung oder das Team." />
                    </FormLabel>
                    <FormControl>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          {field.value &&
                            field.value.map((url, index) => (
                              <div
                                key={index}
                                className="relative aspect-video rounded-lg overflow-hidden border border-gray-200 group shadow-sm"
                              >
                                <img
                                  src={url}
                                  alt={`Galeriebild ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                                <button
                                  type="button"
                                  onClick={() => removeGalleryImage(index)}
                                  className="absolute top-1.5 right-1.5 p-1.5 bg-white/90 rounded-full text-gray-500 hover:text-red-600 hover:bg-white transition-all opacity-0 group-hover:opacity-100 shadow-sm"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}

                          {/* Upload Button Card */}
                          <div className="relative aspect-video rounded-lg border-2 border-dashed border-gray-300 hover:border-teal-300 hover:bg-teal-50 transition-all flex flex-col items-center justify-center cursor-pointer group bg-gray-50/50">
                            <input
                              type="file"
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                              accept="image/*"
                              multiple
                              onChange={handleGalleryUpload}
                              disabled={isGalleryUploading}
                            />
                            {isGalleryUploading ? (
                              <Loader2 className="w-6 h-6 text-teal-600 animate-spin" />
                            ) : (
                              <>
                                <Upload className="w-6 h-6 text-gray-400 group-hover:text-teal-600 mb-2 transition-colors" />
                                <span className="text-xs font-medium text-gray-600 group-hover:text-teal-700">
                                  Bilder hinzufügen
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="h-px bg-gray-100 my-6" />

            {/* Logo Section */}
            <FormField
              control={form.control}
              name="logoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold flex items-center">
                    Firmenlogo
                    <InfoHint content="Wählen Sie das Logo für diese Anzeige." />
                  </FormLabel>
                  <FormControl>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      {/* Option 1: Standard Company Logo */}
                      {companyLogoUrl && (
                        <div
                          className={`relative border-2 rounded-xl p-4 cursor-pointer transition-all hover:shadow-md ${
                            field.value === companyLogoUrl
                              ? 'border-teal-500 bg-teal-50/50 ring-1 ring-teal-500'
                              : 'border-gray-200 hover:border-teal-200 bg-white'
                          }`}
                          onClick={() => field.onChange(companyLogoUrl)}
                        >
                          <div className="flex items-start gap-4">
                            <div className="w-16 h-16 bg-white rounded-lg border border-gray-100 flex items-center justify-center shrink-0 shadow-sm p-2">
                              <img
                                src={companyLogoUrl}
                                alt="Company Logo"
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-900 truncate">Standard Logo</p>
                              <p className="text-sm text-gray-500 mt-1">Aus Ihrem Profil</p>
                            </div>
                            {field.value === companyLogoUrl && (
                              <div className="w-6 h-6 rounded-full bg-teal-500 flex items-center justify-center shrink-0 shadow-sm">
                                <Check className="w-4 h-4 text-white" />
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Option 2: Upload New Logo */}
                      <div
                        className={`relative border-2 rounded-xl p-4 transition-all hover:shadow-md ${
                          field.value && field.value !== companyLogoUrl
                            ? 'border-teal-500 bg-teal-50/50 ring-1 ring-teal-500'
                            : 'border-gray-200 hover:border-teal-200 bg-white'
                        }`}
                      >
                        <input
                          type="file"
                          accept="image/*"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          onChange={handleLogoUpload}
                          disabled={isLogoUploading}
                        />
                        <div className="flex items-start gap-4">
                          <div className="w-16 h-16 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-center shrink-0 shadow-sm">
                            {field.value && field.value !== companyLogoUrl ? (
                              <img
                                src={field.value}
                                alt="New Logo"
                                className="w-full h-full object-contain p-2"
                              />
                            ) : isLogoUploading ? (
                              <Loader2 className="w-6 h-6 text-teal-600 animate-spin" />
                            ) : (
                              <Upload className="w-6 h-6 text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 truncate">
                              {field.value && field.value !== companyLogoUrl
                                ? 'Eigenes Logo'
                                : 'Neues Logo hochladen'}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">PNG, JPG (max. 2MB)</p>
                          </div>
                          {field.value && field.value !== companyLogoUrl && (
                            <div className="w-6 h-6 rounded-full bg-teal-500 flex items-center justify-center shrink-0 shadow-sm">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="h-px bg-gray-100 my-6" />

            {/* Job Details Grid */}
            <div className="grid grid-cols-1 gap-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold flex items-center">
                      Stellentitel
                      <InfoHint content="Der Titel, wie er in der Liste und ganz oben auf der Detailseite erscheint." />
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="z.B. Commis de Cuisine 100%"
                        className="text-lg py-6"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        Berufsgruppe
                        <InfoHint content="Wählen Sie die passende Berufsgruppe für die Stelle." />
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Wählen Sie eine Berufsgruppe" />
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

                <FormField
                  control={form.control}
                  name="industry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        Branche
                        <InfoHint content="Die Branche hilft Bewerbern, Ihre Stelle schneller zu finden." />
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Wählen Sie eine Branche" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {INDUSTRIES.map(ind => (
                            <SelectItem key={ind} value={ind}>
                              {ind}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        Arbeitsort (Stadt/Adresse)
                        <InfoHint content="Geben Sie den genauen Arbeitsort an. Dies hilft Bewerbern, die Entfernung einzuschätzen." />
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            placeholder="z.B. Zürich"
                            {...field}
                            ref={e => {
                              field.ref(e);
                              // @ts-ignore
                              locationInputRef.current = e;
                            }}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="region"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        Region
                        <InfoHint content="Wählen Sie die übergeordnete Region für eine bessere Auffindbarkeit." />
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Wählen Sie eine Region" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {REGIONS.map(reg => (
                            <SelectItem key={reg} value={reg}>
                              {reg}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        Anstellungsart
                        <InfoHint content="Handelt es sich um eine Vollzeit-, Teilzeit- oder Aushilfsstelle?" />
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Wählen Sie eine Art" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {EMPLOYMENT_TYPES.map(type => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="careerLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        Rang / Karrierelevel
                        <InfoHint content="Welche Erfahrung oder Position wird erwartet (z.B. Junior, Senior, Manager)?" />
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Wählen Sie einen Rang" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CAREER_LEVELS.map(level => (
                            <SelectItem key={level} value={level}>
                              {level}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Details Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              Stellenbeschreibung & Details
              <InfoHint content="Detaillierte Informationen zur Position, Anforderungen und Angebot." />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center">
                    Einleitung / Über uns
                    <InfoHint content="Stellen Sie Ihr Unternehmen vor. Was macht Sie besonders? Warum sollte man bei Ihnen arbeiten?" />
                  </FormLabel>
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
                  <FormLabel className="flex items-center">
                    Deine Aufgaben
                    <InfoHint content="Beschreiben Sie die täglichen Aufgaben und Verantwortlichkeiten der Position." />
                  </FormLabel>
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
                  <FormLabel className="flex items-center">
                    Anforderungen (Profil)
                    <InfoHint content="Welche Qualifikationen, Erfahrungen und Soft Skills sollte der Bewerber mitbringen?" />
                  </FormLabel>
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
              name="languages"
              render={() => (
                <FormItem>
                  <FormLabel className="flex items-center">
                    Sprachen
                    <InfoHint content="Welche Sprachkenntnisse sind für diese Position erforderlich?" />
                  </FormLabel>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 border p-4 rounded-md">
                    {LANGUAGES.map(lang => (
                      <FormField
                        key={lang}
                        control={form.control}
                        name="languages"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={lang}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(lang)}
                                  onCheckedChange={checked => {
                                    return checked
                                      ? field.onChange([...field.value, lang])
                                      : field.onChange(
                                          field.value?.filter(value => value !== lang)
                                        );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer">{lang}</FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="benefits"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center">
                    Wir bieten dir (Benefits)
                    <InfoHint content="Was bieten Sie dem Bewerber? (z.B. Weiterbildung, Homeoffice, Verpflegung, Team-Events)" />
                  </FormLabel>
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
                  <FormLabel className="flex items-center">
                    Kontaktinformationen
                    <InfoHint content="Wie können Bewerber Sie erreichen? Geben Sie Ansprechpartner, Telefonnummer oder E-Mail an." />
                  </FormLabel>
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
                    <FormLabel className="flex items-center">
                      Gehalt Min (Jährlich €)
                      <InfoHint content="Das Mindestgehalt für diese Position." />
                    </FormLabel>
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
                    <FormLabel className="flex items-center">
                      Gehalt Max (Jährlich €)
                      <InfoHint content="Das Maximalgehalt für diese Position." />
                    </FormLabel>
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
