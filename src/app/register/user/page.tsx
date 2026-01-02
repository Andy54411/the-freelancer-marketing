// page.tsx
'use client';
import { Suspense, useState, FormEvent, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth, db } from '@/firebase/clients';
import { createUserWithEmailAndPassword, User as FirebaseUser, AuthError } from 'firebase/auth';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Flag from 'react-world-flags';
import LoginPopup from '@/components/LoginPopup';
import { useGoogleMaps } from '@/contexts/GoogleMapsLoaderContext';
import { useRegistration } from '@/contexts/Registration-Context';
import { Eye, EyeOff, Shield, CheckCircle, User, Mail, Lock, MapPin, Phone, Loader2, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Logo } from '@/components/logo';

const _PAGE_LOG = 'UserRegisterPage:';
const _PAGE_ERROR = 'UserRegisterPage ERROR:';
const _PAGE_WARN = 'UserRegisterPage WARN:';

async function linkJobToUser(
  jobId: string | null,
  userId: string,
  _actionType: 'login' | 'register'
) {
  if (!jobId || !userId) {
    return;
  }
  try {
    // Stellen Sie sicher, dass 'jobPostings' der korrekte Sammlungsname ist.
    // In Ihren Cloud Functions verwenden Sie 'auftraege'. Passen Sie dies ggf. an.
    const jobRef = doc(db, 'jobPostings', jobId);
    await updateDoc(jobRef, {
      kundeId: userId,
      status: 'draft_authenticated_user',
    });
  } catch (_error: unknown) {
    // Error handled silently
  }
}

// Diese Komponente enthält die eigentliche Logik und verwendet Client-Hooks
function UserRegisterFormContent() {
  'use client'; // Wichtig: Diese Komponente ist eine Client-Komponente

  const _router = useRouter();
  const searchParams = useSearchParams(); // useSearchParams wird hier verwendet
  const { isLoaded: isGoogleMapsLoaded, google } = useGoogleMaps();
  const registration = useRegistration();
  const streetInputRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [phone, setPhone] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [street, setStreet] = useState(''); // NEU: Straße
  const [city, setCity] = useState(''); // NEU: Stadt
  const [country, setCountry] = useState('DE'); // NEU: Land, Default DE
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCountryCode, setSelectedCountryCode] = useState('+49');
  const [registrationSuccess, setRegistrationSuccess] = useState(false); // NEU: Zustand für Erfolgsmeldung
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoginPopupOpen, setIsLoginPopupOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // NEU: Passwort-Sichtbarkeit

  const [agreesToNewsletter, setAgreesToNewsletter] = useState(false); // NEU: Zustand für Newsletter-Zustimmung
  const redirectToFromParams = searchParams?.get('redirectTo');

  const europeanCountryCodes = [
    { country: 'Deutschland', dialCode: '+49', flag: 'DE' },
    { country: 'Österreich', dialCode: '+43', flag: 'AT' },
    { country: 'Schweiz', dialCode: '+41', flag: 'CHE' },
    { country: 'Frankreich', dialCode: '+33', flag: 'FR' },
    { country: 'Italien', dialCode: '+39', flag: 'IT' },
    { country: 'Spanien', dialCode: '+34', flag: 'ES' },
    { country: 'Vereinigtes Königreich', dialCode: '+44', flag: 'GB' },
    { country: 'Polen', dialCode: '+48', flag: 'PL' },
  ];

  // NEU: useEffect für Google Places Autocomplete Initialisierung
  useEffect(() => {
    if (isGoogleMapsLoaded && google && streetInputRef.current) {
      const autocomplete = new google.maps.places.Autocomplete(
        streetInputRef.current, // Geändert: An das Straßen-Inputfeld binden
        {
          types: ['address'],
          componentRestrictions: { country: europeanCountryCodes.map(c => c.flag) }, // Optional: Auf europäische Länder beschränken
        }
      );
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place.address_components) {
          let streetNumber = '';
          let route = '';
          let currentCity = '';
          let currentPostalCode = '';
          let currentCountry = '';

          place.address_components.forEach(component => {
            const types = component.types;
            if (types.includes('street_number')) {
              streetNumber = component.long_name;
            }
            if (types.includes('route')) {
              route = component.long_name;
            }
            if (types.includes('locality')) {
              currentCity = component.long_name;
            }
            if (types.includes('postal_code')) {
              currentPostalCode = component.long_name;
            }
            if (types.includes('country')) {
              currentCountry = component.short_name; // z.B. 'DE'
            }
          });

          setStreet(streetNumber ? `${route} ${streetNumber}` : route);
          setCity(currentCity);
          setPostalCode(currentPostalCode);
          setCountry(currentCountry); // Setzt den Ländercode (z.B. DE)
        } else {
        }
      });
    }
  }, [
    isGoogleMapsLoaded,
    google,
    europeanCountryCodes,
    setStreet,
    setCity,
    setPostalCode,
    setCountry,
  ]); // States als Abhängigkeiten hinzugefügt

  // NEU: Effekt, der die Weiterleitung nach erfolgreicher Registrierung durchführt.
  // useEffect für direkte Weiterleitung nach erfolgreicher Registrierung
  useEffect(() => {
    if (registrationSuccess) {
      // Extrahiere die Unterkategorie aus den searchParams für den korrekten Pfad
      const redirectTo = searchParams?.get('redirectTo');

      if (redirectTo) {
        // Wenn eine redirectTo URL existiert, verwende diese direkt

        window.location.replace(redirectTo);
      } else {
        // Fallback: Versuche zur Standard-Bestätigungsseite zu navigieren

        window.location.replace('/auftrag/get-started');
      }
    }
  }, [registrationSuccess, searchParams]);
  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Verhindere mehrfache Registrierung
    if (loading || registrationSuccess) {
      return;
    }

    if (password.length < 6) {
      setError('Das Passwort muss mindestens 6 Zeichen lang sein.');
      return;
    }
    // NEU: Zusätzliche Validierung für Adressfelder
    if (
      !firstname.trim() ||
      !lastname.trim() ||
      !phone.trim() ||
      !postalCode.trim() ||
      !email.trim() ||
      !street.trim() ||
      !city.trim() ||
      !country.trim()
    ) {
      setError('Bitte füllen Sie alle Felder aus, einschließlich der vollständigen Adresse.');
      return;
    }
    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // KORREKTUR: Setze das sessionStorage-Flag SOFORT nach der erfolgreichen
      // Authentifizierung, um die Race Condition mit dem AuthContext zu gewinnen.
      sessionStorage.setItem('justRegistered', 'true');

      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        user_type: 'kunde',
        email: user.email,
        firstName: firstname,
        lastName: lastname,
        phoneNumber: `${selectedCountryCode}${phone.replace(/\D/g, '')}`,
        postalCode: postalCode, // PLZ ist bereits vorhanden
        street: street, // NEU: Straße im Profil speichern
        city: city, // NEU: Stadt im Profil speichern
        country: country, // NEU: Land im Profil speichern
        agreesToNewsletter: agreesToNewsletter, // NEU: Newsletter-Zustimmung speichern
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // KORREKTUR: Adressdaten aus dieser Seite in die persönlichen Adressfelder
      // des Registration-Context schreiben, da dies die Rechnungsadresse des Nutzers ist.
      // Die jobStreet etc. sollten bereits von der "adresse" Seite im Context sein.
      registration.setCustomerType('private'); // Set customer type for billing
      registration.setPersonalStreet(street);
      registration.setPersonalCity(city);
      registration.setPersonalPostalCode(postalCode);
      registration.setPersonalCountry(country); // Stellt sicher, dass hier der ISO-Code (z.B. "DE") verwendet wird, falls Autocomplete das liefert.
      // Auch die anderen persönlichen Daten, die hier erfasst werden, in den Context schreiben:
      registration.setFirstName(firstname);
      registration.setLastName(lastname);
      registration.setEmail(email); // E-Mail wird bereits für Auth verwendet, aber auch im Context nützlich
      registration.setPhoneNumber(`${selectedCountryCode}${phone.replace(/\D/g, '')}`);

      // Setze den Erfolgszustand, anstatt direkt weiterzuleiten.
      setRegistrationSuccess(true);
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'code' in err) {
        const firebaseError = err as AuthError;
        if (firebaseError.code === 'auth/email-already-in-use') {
          setError('Diese E-Mail-Adresse wird bereits verwendet. Versuchen Sie sich einzuloggen.');
        } else if (firebaseError.code === 'auth/weak-password') {
          setError('Das Passwort ist zu schwach. Es muss mindestens 6 Zeichen lang sein.');
        } else {
          setError(
            firebaseError.message ||
              'Registrierung fehlgeschlagen. Bitte versuchen Sie es später erneut.'
          );
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ein unbekannter Fehler ist aufgetreten.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccessFromPopup = async (
    loggedInUser: FirebaseUser,
    redirectToUrl?: string | null
  ) => {
    setIsLoginPopupOpen(false);

    let finalRedirectUrl = redirectToUrl;
    if (redirectToUrl) {
      try {
        const urlObj = new URL(redirectToUrl, window.location.origin);
        const extractedJobId = urlObj.searchParams.get('jobId');
        // KORREKTUR: Behalte alle bestehenden Parameter bei der Weiterleitung
        // Dies ist wichtig für die BestätigungsPage, die alle Parameter für die Preisberechnung benötigt

        if (extractedJobId) {
          await linkJobToUser(extractedJobId, loggedInUser.uid, 'login');
        }
        finalRedirectUrl = urlObj.toString(); // Sicherstellen, dass alle bestehenden Parameter erhalten bleiben
      } catch (urlParseError) {
        finalRedirectUrl = `/auftrag/get-started`; // Fallback
      }
    } else {
      finalRedirectUrl = `/auftrag/get-started`;
    }

    // Die Verwendung von router.push() kann zu Race-Conditions führen, bei denen die Zielseite
    // die Authentifizierung prüft, bevor der globale Auth-Status aktualisiert wurde.
    // Ein vollständiger Reload stellt sicher, dass der Status beim Laden der neuen Seite korrekt ist.
    window.location.assign(finalRedirectUrl);
  };

  return (
    <>
      <main className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <div className="relative bg-linear-to-br from-[#14ad9f] via-teal-600 to-teal-700 overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-10"
            style={{ backgroundImage: 'url(/images/hero-pattern.svg)' }}
          />
          <div className="absolute inset-0 bg-black/10" />
          
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
            {/* Navigation */}
            <div className="flex items-center justify-between mb-8">
              <Link 
                href="/auftrag/get-started"
                className="flex items-center gap-2 text-white/90 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium">Zurück</span>
              </Link>
              <Link href="/" className="text-2xl font-bold text-white">
                <Logo variant="white" className="h-8" />
              </Link>
            </div>
            
            {/* Hero Content */}
            <div className="text-center pb-16">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
                  <User className="w-4 h-4 text-white" />
                  <span className="text-white text-sm font-medium">Privatkunden-Registrierung</span>
                </div>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
                  Erstellen Sie Ihr Konto
                </h1>
                <p className="text-lg text-white/90 max-w-2xl mx-auto">
                  Registrieren Sie sich kostenlos und beauftragen Sie Profis für Ihre Projekte
                </p>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Registration Form Card - Overlapping Hero */}
        <div className="relative z-20 max-w-xl mx-auto px-4 sm:px-6 -mt-12 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white rounded-2xl shadow-xl overflow-hidden"
          >
            {registrationSuccess ? (
              /* Success State */
              <div className="p-8 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
                >
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </motion.div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Registrierung erfolgreich!
                </h2>
                <p className="text-gray-600 mb-4">
                  Ihr Konto wurde erstellt. Sie werden weitergeleitet...
                </p>
                <div className="flex items-center justify-center gap-2 text-[#14ad9f]">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Weiterleitung...</span>
                </div>
              </div>
            ) : (
              <>
                {/* Form Header */}
                <div className="bg-gray-50 border-b border-gray-100 px-6 py-5">
                  <h2 className="text-xl font-bold text-gray-900">Konto erstellen</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Bereits registriert?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setIsLoginPopupOpen(true);
                      }}
                      className="text-[#14ad9f] hover:text-teal-700 font-semibold transition-colors"
                    >
                      Hier einloggen
                    </button>
                  </p>
                </div>

                {/* Form Content */}
                <form onSubmit={handleRegister} className="p-6 space-y-5">
                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="emailReg" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-[#14ad9f]" />
                      E-Mail-Adresse
                    </Label>
                    <Input
                      type="email"
                      id="emailReg"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      placeholder="ihre@email.de"
                      className="h-12 rounded-xl border-2 border-gray-200 focus:border-[#14ad9f] focus:ring-2 focus:ring-[#14ad9f]/20 transition-all"
                      autoComplete="email"
                    />
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <Label htmlFor="passwordReg" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Lock className="w-4 h-4 text-[#14ad9f]" />
                      Passwort
                    </Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        id="passwordReg"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        placeholder="Mindestens 6 Zeichen"
                        className="h-12 rounded-xl border-2 border-gray-200 focus:border-[#14ad9f] focus:ring-2 focus:ring-[#14ad9f]/20 pr-12 transition-all"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Name Fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstnameReg" className="text-sm font-semibold text-gray-700">
                        Vorname
                      </Label>
                      <Input
                        type="text"
                        id="firstnameReg"
                        value={firstname}
                        onChange={e => setFirstname(e.target.value)}
                        required
                        placeholder="Max"
                        className="h-12 rounded-xl border-2 border-gray-200 focus:border-[#14ad9f] focus:ring-2 focus:ring-[#14ad9f]/20 transition-all"
                        autoComplete="given-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastnameReg" className="text-sm font-semibold text-gray-700">
                        Nachname
                      </Label>
                      <Input
                        type="text"
                        id="lastnameReg"
                        value={lastname}
                        onChange={e => setLastname(e.target.value)}
                        required
                        placeholder="Mustermann"
                        className="h-12 rounded-xl border-2 border-gray-200 focus:border-[#14ad9f] focus:ring-2 focus:ring-[#14ad9f]/20 transition-all"
                        autoComplete="family-name"
                      />
                    </div>
                  </div>

                  {/* Address Section */}
                  <div className="pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2 mb-4">
                      <MapPin className="w-5 h-5 text-[#14ad9f]" />
                      <span className="text-sm font-semibold text-gray-700">Adresse</span>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="streetReg" className="text-sm font-medium text-gray-600">
                          Strasse & Hausnummer
                        </Label>
                        <Input
                          ref={streetInputRef}
                          type="text"
                          id="streetReg"
                          value={street}
                          onChange={e => setStreet(e.target.value)}
                          required
                          placeholder="Musterstrasse 123"
                          className="h-12 rounded-xl border-2 border-gray-200 focus:border-[#14ad9f] focus:ring-2 focus:ring-[#14ad9f]/20 transition-all"
                          autoComplete="street-address"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="postalCodeReg" className="text-sm font-medium text-gray-600">
                            PLZ
                          </Label>
                          <Input
                            type="text"
                            id="postalCodeReg"
                            value={postalCode}
                            onChange={e => setPostalCode(e.target.value)}
                            required
                            placeholder="12345"
                            className="h-12 rounded-xl border-2 border-gray-200 focus:border-[#14ad9f] focus:ring-2 focus:ring-[#14ad9f]/20 transition-all"
                            autoComplete="postal-code"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cityReg" className="text-sm font-medium text-gray-600">
                            Stadt
                          </Label>
                          <Input
                            type="text"
                            id="cityReg"
                            value={city}
                            onChange={e => setCity(e.target.value)}
                            required
                            placeholder="Berlin"
                            className="h-12 rounded-xl border-2 border-gray-200 focus:border-[#14ad9f] focus:ring-2 focus:ring-[#14ad9f]/20 transition-all"
                            autoComplete="address-level2"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="countryReg" className="text-sm font-medium text-gray-600">
                          Land
                        </Label>
                        <Input
                          type="text"
                          id="countryReg"
                          value={country}
                          onChange={e => setCountry(e.target.value)}
                          required
                          placeholder="DE"
                          className="h-12 rounded-xl border-2 border-gray-200 focus:border-[#14ad9f] focus:ring-2 focus:ring-[#14ad9f]/20 transition-all"
                          autoComplete="country-name"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="space-y-2 pt-4 border-t border-gray-100">
                    <Label htmlFor="phoneReg" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-[#14ad9f]" />
                      Telefonnummer
                    </Label>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <button
                          type="button"
                          className="h-12 px-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#14ad9f]/20 flex items-center text-sm bg-gray-50 hover:bg-gray-100 transition-all"
                          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                          aria-haspopup="true"
                          aria-expanded={isDropdownOpen}
                        >
                          <Flag
                            code={
                              europeanCountryCodes.find(
                                countryItem => countryItem.dialCode === selectedCountryCode
                              )?.flag
                            }
                            className="w-5 h-auto mr-2"
                          />
                          {selectedCountryCode}
                          <svg
                            className={`w-4 h-4 ml-2 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {isDropdownOpen && (
                          <div className="absolute z-30 mt-2 w-56 bg-white shadow-xl rounded-xl max-h-52 overflow-y-auto border border-gray-100">
                            {europeanCountryCodes.map(countryItem => (
                              <div
                                key={countryItem.dialCode}
                                className="flex items-center p-3 cursor-pointer hover:bg-gray-50 text-sm transition-colors"
                                onClick={() => {
                                  setSelectedCountryCode(countryItem.dialCode);
                                  setIsDropdownOpen(false);
                                }}
                              >
                                <Flag code={countryItem.flag} className="w-5 h-auto mr-3" />
                                <span className="font-medium">{countryItem.country}</span>
                                <span className="ml-auto text-gray-500">{countryItem.dialCode}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <Input
                        type="tel"
                        id="phoneReg"
                        value={phone}
                        onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                        required
                        placeholder="123456789"
                        className="h-12 rounded-xl border-2 border-gray-200 focus:border-[#14ad9f] focus:ring-2 focus:ring-[#14ad9f]/20 flex-1 transition-all"
                        autoComplete="tel-national"
                      />
                    </div>
                  </div>

                  {/* Newsletter Checkbox */}
                  <div className="flex items-start gap-3 pt-4">
                    <input
                      type="checkbox"
                      id="newsletter"
                      checked={agreesToNewsletter}
                      onChange={e => setAgreesToNewsletter(e.target.checked)}
                      className="h-5 w-5 mt-0.5 text-[#14ad9f] focus:ring-[#14ad9f] border-gray-300 rounded cursor-pointer"
                    />
                    <label htmlFor="newsletter" className="text-sm text-gray-600 cursor-pointer leading-relaxed">
                      Ich möchte den Newsletter abonnieren und über Neuigkeiten informiert werden.
                    </label>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-red-50 border border-red-200 rounded-xl"
                    >
                      <p className="text-red-600 text-sm text-center">{error}</p>
                    </motion.div>
                  )}

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    className="w-full h-14 bg-[#14ad9f] hover:bg-teal-600 text-white font-semibold text-lg rounded-xl shadow-lg shadow-teal-500/20 transition-all duration-300 hover:shadow-xl hover:shadow-teal-500/30"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Konto wird erstellt...
                      </span>
                    ) : (
                      'Konto erstellen'
                    )}
                  </Button>

                  {/* Trust Indicators */}
                  <div className="flex items-center justify-center gap-6 pt-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-[#14ad9f]" />
                      <span>SSL verschlüsselt</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-[#14ad9f]" />
                      <span>DSGVO-konform</span>
                    </div>
                  </div>
                </form>
              </>
            )}
          </motion.div>
        </div>
      </main>

      <LoginPopup
        isOpen={isLoginPopupOpen}
        onClose={() => setIsLoginPopupOpen(false)}
        onLoginSuccess={handleLoginSuccessFromPopup}
        initialEmail={email}
        redirectTo={redirectToFromParams}
      />
    </>
  );
}

// Die Standard-Export-Komponente für die Seite
export default function UserRegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50">
          <div className="relative bg-linear-to-br from-[#14ad9f] via-teal-600 to-teal-700 py-20">
            <div className="absolute inset-0 bg-black/10" />
            <div className="relative z-10 text-center">
              <div className="inline-flex items-center gap-3 text-white">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="font-semibold text-lg">Lade Registrierungsseite...</span>
              </div>
            </div>
          </div>
        </div>
      }
    >
      <UserRegisterFormContent />
    </Suspense>
  );
}
