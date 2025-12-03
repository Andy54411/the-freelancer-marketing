'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, storage } from '@/firebase/clients';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAlert } from '@/components/ui/AlertProvider';
import { Loader2, Upload, Save } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const profileSchema = z.object({
  companyName: z.string().min(2, 'Firmenname muss mindestens 2 Zeichen lang sein'),
  description: z.string().optional(),
  website: z.string().url('Ungültige URL').optional().or(z.literal('')),
  email: z.string().email('Ungültige E-Mail-Adresse').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
  employeeCount: z.string().optional(),
  foundedYear: z.string().optional(),
  industry: z.string().optional(),
  linkedin: z.string().optional(),
  facebook: z.string().optional(),
  instagram: z.string().optional(),
  twitter: z.string().optional(),
  applicationMethod: z.enum(['taskilo', 'external']).default('taskilo'),
  externalApplicationUrl: z.string().url('Ungültige URL').optional().or(z.literal('')),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function CompanyProfileSettingsPage() {
  const params = useParams();
  const uid = params.uid as string;
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [headerFile, setHeaderFile] = useState<File | null>(null);
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(null);
  const [currentHeaderUrl, setCurrentHeaderUrl] = useState<string | null>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      companyName: '',
      description: '',
      website: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      zip: '',
      country: '',
      employeeCount: '',
      foundedYear: '',
      industry: '',
      linkedin: '',
      facebook: '',
      instagram: '',
      twitter: '',
      applicationMethod: 'taskilo',
      externalApplicationUrl: '',
    },
  });

  useEffect(() => {
    const fetchCompanyData = async () => {
      if (!uid) return;

      try {
        const docRef = doc(db, 'companies', uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          form.reset({
            companyName: data.companyName || data.firmenname || '',
            description: data.description || '',
            website: data.website || '',
            email: data.email || '',
            phone: data.phone || '',
            address: data.address || '',
            city: data.city || '',
            zip: data.postalCode || data.zip || '',
            country: data.country || '',
            employeeCount: data.employeeCount || '',
            foundedYear: data.foundedYear || '',
            industry: data.industry || '',
            linkedin: data.socialMedia?.linkedin || '',
            facebook: data.socialMedia?.facebook || '',
            instagram: data.socialMedia?.instagram || '',
            twitter: data.socialMedia?.twitter || '',
            applicationMethod: data.applicationMethod || 'taskilo',
            externalApplicationUrl: data.externalApplicationUrl || '',
          });

          setCurrentLogoUrl(
            data.logoUrl ||
              data.profilePictureURL ||
              data.profilbildUrl ||
              data.companyLogo ||
              data.photoURL ||
              data.step3?.profilePictureURL ||
              null
          );
          setCurrentHeaderUrl(
            data.headerImageUrl ||
              data.profileBannerImage ||
              data.step3?.profileBannerImage ||
              data.bannerUrl ||
              data.coverUrl ||
              null
          );
        }
      } catch (error) {
        console.error('Error fetching company data:', error);
        showAlert({
          type: 'error',
          title: 'Fehler',
          message: 'Daten konnten nicht geladen werden.',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyData();
  }, [uid, form, showAlert]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLogoFile(e.target.files[0]);
      // Preview
      const reader = new FileReader();
      reader.onload = event => {
        setCurrentLogoUrl(event.target?.result as string);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleHeaderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setHeaderFile(e.target.files[0]);
      // Preview
      const reader = new FileReader();
      reader.onload = event => {
        setCurrentHeaderUrl(event.target?.result as string);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const onSubmit = async (values: ProfileFormValues) => {
    setSaving(true);
    try {
      let logoUrl = currentLogoUrl;
      let headerImageUrl = currentHeaderUrl;

      // Upload Logo if changed
      if (logoFile) {
        const logoRef = ref(storage, `companies/${uid}/logo_${Date.now()}`);
        await uploadBytes(logoRef, logoFile);
        logoUrl = await getDownloadURL(logoRef);
      }

      // Upload Header Image if changed
      if (headerFile) {
        const headerRef = ref(storage, `companies/${uid}/header_${Date.now()}`);
        await uploadBytes(headerRef, headerFile);
        headerImageUrl = await getDownloadURL(headerRef);
      }

      const updateData = {
        companyName: values.companyName,
        description: values.description,
        website: values.website,
        email: values.email,
        phone: values.phone,
        address: values.address,
        city: values.city,
        zip: values.zip,
        country: values.country,
        employeeCount: values.employeeCount,
        foundedYear: values.foundedYear,
        industry: values.industry,
        logoUrl: logoUrl,
        headerImageUrl: headerImageUrl,
        socialMedia: {
          linkedin: values.linkedin,
          facebook: values.facebook,
          instagram: values.instagram,
          twitter: values.twitter,
        },
        applicationMethod: values.applicationMethod,
        externalApplicationUrl: values.externalApplicationUrl,
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(doc(db, 'companies', uid), updateData);

      showAlert({
        type: 'success',
        title: 'Gespeichert',
        message: 'Unternehmensprofil wurde erfolgreich aktualisiert.',
      });

      router.refresh();
    } catch (error) {
      console.error('Error updating profile:', error);
      showAlert({
        type: 'error',
        title: 'Fehler',
        message: 'Speichern fehlgeschlagen.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 pb-16">
      <div className="space-y-0.5">
        <h2 className="text-2xl font-bold tracking-tight">Unternehmensprofil</h2>
        <p className="text-muted-foreground">
          Verwalten Sie hier Ihre öffentlichen Unternehmensinformationen.
        </p>
      </div>
      <div className="flex justify-end">
        <Button
          variant="outline"
          className="border-teal-600 text-teal-600 hover:bg-teal-50 hover:text-teal-700"
          onClick={() => window.open(`/companies/${uid}`, '_blank')}
        >
          Öffentliches Profil ansehen
        </Button>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Basisinformationen</CardTitle>
                <CardDescription>Grundlegende Informationen über Ihr Unternehmen.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Firmenname</FormLabel>
                        <FormControl>
                          <Input placeholder="Ihr Firmenname" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="industry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Branche</FormLabel>
                        <FormControl>
                          <Input placeholder="z.B. IT-Dienstleistungen" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Beschreibung</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Beschreiben Sie Ihr Unternehmen..."
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card className="lg:col-span-1 h-full">
              <CardHeader>
                <CardTitle>Firmenlogo</CardTitle>
                <CardDescription>Laden Sie hier Ihr Firmenlogo hoch.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4 h-full">
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 flex flex-col items-center justify-center h-[200px] relative bg-gray-50 hover:bg-gray-100 transition-colors">
                    {currentLogoUrl ? (
                      <img
                        src={currentLogoUrl}
                        alt="Logo Preview"
                        className="max-h-32 object-contain mb-2"
                      />
                    ) : (
                      <div className="text-gray-400 mb-2 text-sm">Kein Logo</div>
                    )}
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2 pointer-events-none border-teal-200 text-teal-700 bg-teal-50"
                    >
                      <Upload className="w-4 h-4 mr-2" /> Hochladen
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Kontakt & Standort</CardTitle>
              <CardDescription>Wie können Kunden Sie erreichen?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-Mail</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="kontakt@firma.de" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefon</FormLabel>
                      <FormControl>
                        <Input placeholder="+49 123 456789" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Webseite</FormLabel>
                      <FormControl>
                        <Input placeholder="https://www.firma.de" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Straße & Hausnummer</FormLabel>
                      <FormControl>
                        <Input placeholder="Musterstraße 1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="zip"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>PLZ</FormLabel>
                      <FormControl>
                        <Input placeholder="12345" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stadt</FormLabel>
                      <FormControl>
                        <Input placeholder="Musterstadt" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Land</FormLabel>
                      <FormControl>
                        <Input placeholder="Deutschland" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Details & Social Media</CardTitle>
              <CardDescription>Weitere Informationen und soziale Netzwerke.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="employeeCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mitarbeiteranzahl</FormLabel>
                      <FormControl>
                        <Input placeholder="z.B. 10-50" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="foundedYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gründungsjahr</FormLabel>
                      <FormControl>
                        <Input placeholder="z.B. 2020" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                <FormField
                  control={form.control}
                  name="linkedin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>LinkedIn</FormLabel>
                      <FormControl>
                        <Input placeholder="LinkedIn URL" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="facebook"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Facebook</FormLabel>
                      <FormControl>
                        <Input placeholder="Facebook URL" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="instagram"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Instagram</FormLabel>
                      <FormControl>
                        <Input placeholder="Instagram URL" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="twitter"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Twitter / X</FormLabel>
                      <FormControl>
                        <Input placeholder="Twitter URL" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bewerbungsmethode</CardTitle>
              <CardDescription>
                Legen Sie fest, wie Bewerber sich bei Ihnen bewerben sollen.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="applicationMethod"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Methode auswählen</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="taskilo" />
                          </FormControl>
                          <FormLabel className="font-normal">Über Taskilo (Empfohlen)</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="external" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Externes HR-System / Karriere-Seite
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch('applicationMethod') === 'external' && (
                <FormField
                  control={form.control}
                  name="externalApplicationUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Link zum Bewerbungsformular</FormLabel>
                      <FormControl>
                        <Input placeholder="https://ihre-firma.de/jobs/bewerben" {...field} />
                      </FormControl>
                      <FormDescription>
                        Bewerber werden direkt zu dieser URL weitergeleitet.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={saving}
              className="w-full md:w-auto bg-[#14ad9f] hover:bg-[#119c8d] text-white"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Speichern
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
