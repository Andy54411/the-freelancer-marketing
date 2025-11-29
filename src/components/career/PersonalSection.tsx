'use client';

import { useState, useEffect, useRef } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { ApplicantProfile } from '@/types/career';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pencil, User, Upload, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { storage } from '@/firebase/clients';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { toast } from 'sonner';

// Common countries list
const COUNTRIES = [
  'Deutschland',
  'Österreich',
  'Schweiz',
  // ... (rest of the countries can be imported or kept short for now, or passed as props if needed, but for now I'll include the main ones and maybe a full list if I can find where it is defined or just copy it)
  'Afghanistan', 'Ägypten', 'Albanien', 'Algerien', 'Andorra', 'Angola', 'Antigua und Barbuda', 'Äquatorialguinea', 'Argentinien', 'Armenien', 'Aserbaidschan', 'Äthiopien', 'Australien', 'Bahamas', 'Bahrain', 'Bangladesch', 'Barbados', 'Belgien', 'Belize', 'Benin', 'Bhutan', 'Bolivien', 'Bosnien und Herzegowina', 'Botswana', 'Brasilien', 'Brunei', 'Bulgarien', 'Burkina Faso', 'Burundi', 'Chile', 'China', 'Costa Rica', 'Dänemark', 'Dominica', 'Dominikanische Republik', 'Dschibuti', 'Ecuador', 'El Salvador', 'Elfenbeinküste', 'Eritrea', 'Estland', 'Eswatini', 'Fidschi', 'Finnland', 'Frankreich', 'Gabun', 'Gambia', 'Georgien', 'Ghana', 'Grenada', 'Griechenland', 'Großbritannien', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana', 'Haiti', 'Honduras', 'Indien', 'Indonesien', 'Irak', 'Iran', 'Irland', 'Island', 'Israel', 'Italien', 'Jamaika', 'Japan', 'Jemen', 'Jordanien', 'Kambodscha', 'Kamerun', 'Kanada', 'Kap Verde', 'Kasachstan', 'Katar', 'Kenia', 'Kirgisistan', 'Kiribati', 'Kolumbien', 'Komoren', 'Kongo (Demokratische Republik)', 'Kongo (Republik)', 'Korea (Nord)', 'Korea (Süd)', 'Kosovo', 'Kroatien', 'Kuba', 'Kuwait', 'Laos', 'Lesotho', 'Lettland', 'Libanon', 'Liberia', 'Libyen', 'Liechtenstein', 'Litauen', 'Luxemburg', 'Madagaskar', 'Malawi', 'Malaysia', 'Malediven', 'Mali', 'Malta', 'Marokko', 'Marshallinseln', 'Mauretanien', 'Mauritius', 'Mexiko', 'Mikronesien', 'Moldawien', 'Monaco', 'Mongolei', 'Montenegro', 'Mosambik', 'Myanmar', 'Namibia', 'Nauru', 'Nepal', 'Neuseeland', 'Nicaragua', 'Niederlande', 'Niger', 'Nigeria', 'Nordmazedonien', 'Norwegen', 'Oman', 'Pakistan', 'Palau', 'Panama', 'Papua-Neuguinea', 'Paraguay', 'Peru', 'Philippinen', 'Polen', 'Portugal', 'Ruanda', 'Rumänien', 'Russland', 'Salomonen', 'Sambia', 'Samoa', 'San Marino', 'São Tomé und Príncipe', 'Saudi-Arabien', 'Schweden', 'Senegal', 'Serbien', 'Seychellen', 'Sierra Leone', 'Simbabwe', 'Singapur', 'Slowakei', 'Slowenien', 'Somalia', 'Spanien', 'Sri Lanka', 'St. Kitts und Nevis', 'St. Lucia', 'St. Vincent und die Grenadinen', 'Südafrika', 'Sudan', 'Südsudan', 'Suriname', 'Syrien', 'Tadschikistan', 'Tansania', 'Thailand', 'Timor-Leste', 'Togo', 'Tonga', 'Trinidad und Tobago', 'Tschad', 'Tschechien', 'Tunesien', 'Türkei', 'Turkmenistan', 'Tuvalu', 'Uganda', 'Ukraine', 'Ungarn', 'Uruguay', 'USA', 'Usbekistan', 'Vanuatu', 'Vatikanstadt', 'Venezuela', 'Vereinigte Arabische Emirate', 'Vietnam', 'Weißrussland', 'Zentralafrikanische Republik', 'Zypern'
];

interface PersonalSectionProps {
  form: UseFormReturn<ApplicantProfile>;
  onSave: () => void;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isSubmitting?: boolean;
}

export function PersonalSection({ form, onSave, isSubmitting }: PersonalSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Date parts state
  const [birthDay, setBirthDay] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthYear, setBirthYear] = useState('');

  const birthDate = form.watch('birthDate');
  const userId = form.watch('userId');

  // Initialize date parts from form value
  useEffect(() => {
    if (birthDate) {
      const date = new Date(birthDate);
      if (!isNaN(date.getTime())) {
        setBirthDay(date.getDate().toString());
        setBirthMonth((date.getMonth() + 1).toString());
        setBirthYear(date.getFullYear().toString());
      }
    }
  }, [birthDate]);

  // Update form value when parts change
  useEffect(() => {
    if (birthDay && birthMonth && birthYear) {
      const d = birthDay.padStart(2, '0');
      const m = birthMonth.padStart(2, '0');
      const y = birthYear;
      const newDate = `${y}-${m}-${d}`;
      if (newDate !== birthDate) {
        form.setValue('birthDate', newDate, { shouldDirty: true });
      }
    }
  }, [birthDay, birthMonth, birthYear, form, birthDate]);

  const toggleEdit = () => {
    if (isEditing) {
      onSave();
    }
    setIsEditing(!isEditing);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validation
    const validTypes = ['image/jpeg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      toast.error('Nur JPG und PNG Dateien sind erlaubt.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB
      toast.error('Die Datei darf maximal 5MB groß sein.');
      return;
    }

    setIsUploading(true);
    try {
      const storageRef = ref(storage, `users/${userId}/profile_picture/${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      form.setValue('profilePictureUrl', downloadURL, { shouldDirty: true });
      toast.success('Profilbild erfolgreich hochgeladen');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Fehler beim Hochladen des Profilbilds');
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const firstName = form.watch('firstName');
  const lastName = form.watch('lastName');
  const street = form.watch('street');
  const zip = form.watch('zip');
  const city = form.watch('city');
  const email = form.watch('email');
  const profilePictureUrl = form.watch('profilePictureUrl');

  return (
    <Card className="mb-8">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl font-semibold">Persönliche Daten</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleEdit}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {!isEditing ? (
          // VIEW MODE
          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Left: Photo */}
            <div className="w-32 h-32 shrink-0 relative bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
              {profilePictureUrl ? (
                <Image
                  src={profilePictureUrl}
                  alt="Profile"
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <User className="w-12 h-12" />
                </div>
              )}
            </div>

            {/* Right: Details Grid */}
            <div className="flex-1 grid grid-cols-1 gap-y-4">
              {/* Anrede */}
              <div>
                <div className="text-sm text-muted-foreground mb-1">Anrede</div>
                <div className="font-medium">{form.watch('salutation')}</div>
              </div>

              {/* Vorname / Name */}
              <div>
                <div className="text-sm text-muted-foreground mb-1">Vorname* / Name*</div>
                <div className="font-medium">
                  {firstName} {lastName}
                </div>
              </div>

              {/* Geburtsdatum */}
              <div>
                <div className="text-sm text-muted-foreground mb-1">Geburtsdatum</div>
                <div className="flex gap-2 font-medium">
                  <div className="bg-gray-50 border rounded px-3 py-1 min-w-12 text-center">
                    {birthDay || '--'}
                  </div>
                  <div className="bg-gray-50 border rounded px-3 py-1 min-w-12 text-center">
                    {birthMonth || '--'}
                  </div>
                  <div className="bg-gray-50 border rounded px-3 py-1 min-w-16 text-center">
                    {birthYear || '----'}
                  </div>
                </div>
              </div>

              {/* Straße / Nr. */}
              <div>
                <div className="text-sm text-muted-foreground mb-1">Straße / Nr.</div>
                <div className="font-medium">{street}</div>
              </div>

              {/* PLZ / Ort */}
              <div>
                <div className="text-sm text-muted-foreground mb-1">PLZ / Ort*</div>
                <div className="font-medium">
                  {zip} {city}
                </div>
              </div>

              {/* Land */}
              <div>
                <div className="text-sm text-muted-foreground mb-1">Land*</div>
                <div className="font-medium">{form.watch('country')}</div>
              </div>

              {/* E-Mail */}
              <div>
                <div className="text-sm text-muted-foreground mb-1">E-Mail*</div>
                <div className="font-medium">{email}</div>
              </div>

              {/* Telefon */}
              <div>
                <div className="text-sm text-muted-foreground mb-1">Telefon</div>
                <div className="font-medium">{form.watch('phone')}</div>
              </div>
            </div>
          </div>
        ) : (
          // EDIT MODE
          <div className="flex flex-col md:flex-row gap-8">
            {/* Left Column: Profile Picture */}
            <div className="w-full md:w-1/4 flex flex-col items-center space-y-4">
              <div className="relative w-48 h-48 bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200 flex items-center justify-center">
                {isUploading ? (
                  <Loader2 className="w-10 h-10 animate-spin text-teal-600" />
                ) : profilePictureUrl ? (
                  <Image
                    src={profilePictureUrl}
                    alt="Profile"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <User className="w-20 h-20 text-gray-400" />
                )}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/jpeg,image/png"
                onChange={handleFileChange}
              />
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full max-w-48" 
                type="button"
                onClick={handleUploadClick}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                {isUploading ? 'Wird hochgeladen...' : 'Foto hochladen'}
              </Button>
              <p className="text-xs text-muted-foreground text-center max-w-48">
                Erlaubte Formate: JPG, PNG. Max. 5MB.
              </p>
            </div>

            {/* Right Column: Form Fields */}
            <div className="w-full md:w-3/4 space-y-4">
              {/* Anrede */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                <FormLabel className="md:text-right">Anrede</FormLabel>
                <div className="md:col-span-3">
                  <FormField
                    control={form.control}
                    name="salutation"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Bitte wählen" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Herr">Herr</SelectItem>
                          <SelectItem value="Frau">Frau</SelectItem>
                          <SelectItem value="Divers">Divers</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              {/* Vorname / Nachname */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                <FormLabel className="md:text-right">Vorname / Nachname</FormLabel>
                <div className="md:col-span-3 flex gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input placeholder="Vorname" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input placeholder="Nachname" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Geburtsdatum */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                <FormLabel className="md:text-right">Geburtsdatum</FormLabel>
                <div className="md:col-span-3 flex gap-2 items-center">
                  <Input
                    className="w-16 text-center"
                    placeholder="TT"
                    value={birthDay}
                    onChange={e => setBirthDay(e.target.value)}
                    maxLength={2}
                  />
                  <span className="text-gray-400">.</span>
                  <Input
                    className="w-16 text-center"
                    placeholder="MM"
                    value={birthMonth}
                    onChange={e => setBirthMonth(e.target.value)}
                    maxLength={2}
                  />
                  <span className="text-gray-400">.</span>
                  <Input
                    className="w-24 text-center"
                    placeholder="JJJJ"
                    value={birthYear}
                    onChange={e => setBirthYear(e.target.value)}
                    maxLength={4}
                  />
                  <span className="text-xs text-muted-foreground ml-2">(Tag.Monat.Jahr)</span>
                </div>
              </div>

              {/* Straße / Nr */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                <FormLabel className="md:text-right">Straße / Nr.</FormLabel>
                <div className="md:col-span-3">
                  <FormField
                    control={form.control}
                    name="street"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="Straße und Hausnummer" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* PLZ / Ort */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                <FormLabel className="md:text-right">PLZ / Ort</FormLabel>
                <div className="md:col-span-3 flex gap-4">
                  <FormField
                    control={form.control}
                    name="zip"
                    render={({ field }) => (
                      <FormItem className="w-24">
                        <FormControl>
                          <Input placeholder="PLZ" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input placeholder="Ort" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Land */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                <FormLabel className="md:text-right">Land</FormLabel>
                <div className="md:col-span-3">
                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Land wählen" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-[300px]">
                          {COUNTRIES.map(country => (
                            <SelectItem key={country} value={country}>
                              {country}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              {/* Email */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                <FormLabel className="md:text-right">E-Mail</FormLabel>
                <div className="md:col-span-3">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Telefon */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                <FormLabel className="md:text-right">Telefon</FormLabel>
                <div className="md:col-span-3">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input type="tel" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-start-2 md:col-span-3">
                  <p className="text-sm text-muted-foreground bg-blue-50 p-3 rounded border border-blue-100">
                    <span className="font-semibold">Hinweis:</span> Ihre Kontaktdaten sind für
                    Unternehmen erst sichtbar, wenn Sie sich aktiv auf eine Stelle bewerben oder
                    eine Kontaktanfrage akzeptieren.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
