// page.tsx
'use client';
import { Suspense, useState, FormEvent, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth, db } from '@/firebase/clients';
import { createUserWithEmailAndPassword, User as FirebaseUser, AuthError } from 'firebase/auth';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Flag from 'react-world-flags';
import LoginPopup from '@/components/LoginPopup';
import { useGoogleMaps } from '@/contexts/GoogleMapsLoaderContext'; // NEU: Google Maps Context importieren
import { useRegistration } from '@/contexts/Registration-Context'; // NEU: Registration-Context importieren

const PAGE_LOG = 'UserRegisterPage:';
const PAGE_ERROR = 'UserRegisterPage ERROR:';
const PAGE_WARN = 'UserRegisterPage WARN:';

async function linkJobToUser(
  jobId: string | null,
  userId: string,
  actionType: 'login' | 'register'
) {
  const LOG_CONTEXT = `${PAGE_LOG} linkJobToUser (${actionType}):`;
  const WARN_CONTEXT = `${PAGE_WARN} linkJobToUser (${actionType}):`;
  const ERROR_CONTEXT = `${PAGE_ERROR} linkJobToUser (${actionType}):`;

  if (!jobId || !userId) {
    console.warn(WARN_CONTEXT, 'jobId oder userId fehlt, keine Verknüpfung möglich.');
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
    console.log(LOG_CONTEXT, `Job ${jobId} erfolgreich mit User ${userId} verknüpft.`);
  } catch (error: unknown) {
    console.error(
      ERROR_CONTEXT,
      `Fehler beim Verknüpfen von Job ${jobId} mit User ${userId}:`,
      error
    );
  }
}

// Diese Komponente enthält die eigentliche Logik und verwendet Client-Hooks
function UserRegisterFormContent() {
  'use client'; // Wichtig: Diese Komponente ist eine Client-Komponente

  const router = useRouter();
  const searchParams = useSearchParams(); // useSearchParams wird hier verwendet
  const { isLoaded: isGoogleMapsLoaded, google } = useGoogleMaps(); // NEU: Google Maps Context verwenden
  const registration = useRegistration(); // NEU: Registration-Context verwenden
  const streetInputRef = useRef<HTMLInputElement>(null); // Geändert: Ref für das Straßen-Inputfeld

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
          console.warn(PAGE_WARN, 'Keine Adresskomponenten im ausgewählten Ort gefunden.');
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
  // Dies entkoppelt die Weiterleitung von der Registrierungslogik und macht den Prozess robuster.
  useEffect(() => {
    if (registrationSuccess) {
      const finalRedirectUrl = redirectToFromParams || `/auftrag/get-started`;

      // DEBUG: Detaillierte Logging für URL-Parameter-Debugging
      console.log(PAGE_LOG, `=== URL-Parameter-Debugging beim Registrierung-Redirect ===`);
      console.log(PAGE_LOG, `redirectToFromParams RAW:`, redirectToFromParams);
      console.log(PAGE_LOG, `finalRedirectUrl:`, finalRedirectUrl);

      if (redirectToFromParams) {
        try {
          // Teste, ob die URL bereits alle Parameter enthält
          const testUrl = new URL(redirectToFromParams, window.location.origin);
          console.log(
            PAGE_LOG,
            `URL-Test erfolgreich. Pfad: ${testUrl.pathname}, Query: ${testUrl.search}`
          );
          console.log(
            PAGE_LOG,
            `Alle URL-Parameter:`,
            Object.fromEntries(testUrl.searchParams.entries())
          );
        } catch (urlError) {
          console.error(PAGE_ERROR, `URL-Test fehlgeschlagen:`, urlError);
          console.log(PAGE_LOG, `Fallback: Verwende redirectTo-Parameter als String`);
        }
      }

      console.log(
        PAGE_LOG,
        `Weiterleitung nach erfolgreicher Registrierung in 2 Sekunden zu: ${finalRedirectUrl}`
      );

      // KORREKTUR: Speichere die Ziel-URL im sessionStorage für den AuthContext
      if (redirectToFromParams) {
        sessionStorage.setItem('registrationRedirectTo', redirectToFromParams);
        console.log(PAGE_LOG, `Ziel-URL für AuthContext gespeichert: ${redirectToFromParams}`);
      }

      // KORREKTUR: Längere Wartezeit für bessere Debugging-Sichtbarkeit
      const timer = setTimeout(() => {
        console.log(PAGE_LOG, `AUSFÜHRUNG: Führe Weiterleitung aus zu: ${finalRedirectUrl}`);

        // Zusätzliches Logging für Debugging
        console.log(PAGE_LOG, `window.location.href VOR Weiterleitung: ${window.location.href}`);

        try {
          window.location.assign(finalRedirectUrl);
          console.log(PAGE_LOG, `window.location.assign() aufgerufen`);
        } catch (redirectError) {
          console.error(PAGE_ERROR, `Fehler bei window.location.assign():`, redirectError);
          // Fallback mit router.push
          try {
            router.push(finalRedirectUrl);
            console.log(PAGE_LOG, `Fallback: router.push() verwendet`);
          } catch (routerError) {
            console.error(PAGE_ERROR, `Fehler bei router.push():`, routerError);
          }
        }
      }, 2000); // 2 Sekunden Verzögerung für bessere Debug-Sichtbarkeit

      return () => clearTimeout(timer); // Cleanup-Funktion für den Timer
    }
  }, [registrationSuccess, redirectToFromParams]);

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
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
      console.log(PAGE_LOG, 'Benutzer registriert:', user.uid);

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
      console.log(PAGE_LOG, 'Benutzerdaten in Firestore geschrieben.');

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

      console.log(
        PAGE_LOG,
        'Persönliche Adress- und Kontaktdaten in Registration-Context geschrieben.'
      );

      // Setze den Erfolgszustand, anstatt direkt weiterzuleiten.
      setRegistrationSuccess(true);
    } catch (err: unknown) {
      console.error(PAGE_ERROR, 'Registrierungsfehler:', err);
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
    console.log(PAGE_LOG, 'Login via Popup erfolgreich für User:', loggedInUser.uid);

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
        console.error(
          PAGE_ERROR,
          'Fehler beim Parsen der redirectTo URL nach Popup-Login:',
          urlParseError
        );
        finalRedirectUrl = `/auftrag/get-started`; // Fallback
      }
    } else {
      finalRedirectUrl = `/auftrag/get-started`;
    }

    console.log(PAGE_LOG, `Weiterleitung nach Popup-Login zu: ${finalRedirectUrl}`);
    // Die Verwendung von router.push() kann zu Race-Conditions führen, bei denen die Zielseite
    // die Authentifizierung prüft, bevor der globale Auth-Status aktualisiert wurde.
    // Ein vollständiger Reload stellt sicher, dass der Status beim Laden der neuen Seite korrekt ist.
    window.location.assign(finalRedirectUrl);
  };

  return (
    <>
      <main className="bg-gradient-to-r from-blue-100 to-teal-200 grid place-items-center min-h-screen mx-auto p-6 md:p-12">
        <Card className="w-full max-w-md shadow-lg rounded-lg bg-white">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-semibold text-[#14ad9f]">
              Benutzer Registrierung
            </CardTitle>
            <CardDescription className="text-sm text-[#14ad9f]">
              Erstelle dein Benutzerkonto
            </CardDescription>
          </CardHeader>
          {registrationSuccess && (
            <CardContent className="text-center p-6">
              <div className="text-green-600 font-semibold text-lg">
                ✅ Registrierung erfolgreich!
              </div>
              <p className="text-sm text-gray-600 mt-2">Ihr Konto wurde erstellt.</p>
              <p className="text-sm text-gray-600 mt-1">
                Sie werden in 2 Sekunden zur Bestellung weitergeleitet...
              </p>
              {/* Debug-Information für den Benutzer */}
              {redirectToFromParams && (
                <p className="text-xs text-gray-400 mt-2">
                  Weiterleitung zu: {redirectToFromParams.substring(0, 50)}...
                </p>
              )}
              {/* Lade-Spinner */}
              <div className="mt-4">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-[#14ad9f]"></div>
              </div>
            </CardContent>
          )}
          {!registrationSuccess && (
            <CardContent>
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="emailReg" className="text-[#14ad9f] font-medium">
                    E-Mail
                  </Label>
                  <Input
                    type="email"
                    id="emailReg"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="px-3 py-2 border rounded-md focus:ring-2 focus:ring-[#14ad9f] w-full h-10 text-sm"
                    autoComplete="email" // Hinzugefügt für Browser-Hinweis
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="passwordReg" className="text-[#14ad9f] font-medium">
                    Passwort
                  </Label>
                  <Input
                    type="password"
                    id="passwordReg"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className="px-3 py-2 border rounded-md focus:ring-2 focus:ring-[#14ad9f] w-full h-10 text-sm"
                    autoComplete="new-password" // Hinzugefügt für Browser-Hinweis
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-1.5">
                    <Label htmlFor="firstnameReg" className="text-[#14ad9f] font-medium">
                      Vorname
                    </Label>
                    <Input
                      type="text"
                      id="firstnameReg"
                      value={firstname}
                      onChange={e => setFirstname(e.target.value)}
                      required
                      className="px-3 py-2 border rounded-md focus:ring-2 focus:ring-[#14ad9f] w-full h-10 text-sm"
                      autoComplete="given-name" // Hinzugefügt für Browser-Hinweis
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="lastnameReg" className="text-[#14ad9f] font-medium">
                      Nachname
                    </Label>
                    <Input
                      type="text"
                      id="lastnameReg"
                      value={lastname}
                      onChange={e => setLastname(e.target.value)}
                      required
                      className="px-3 py-2 border rounded-md focus:ring-2 focus:ring-[#14ad9f] w-full h-10 text-sm"
                      autoComplete="family-name" // Hinzugefügt für Browser-Hinweis
                    />
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="streetReg" className="text-[#14ad9f] font-medium">
                    Straße & Hausnummer
                  </Label>
                  <Input
                    ref={streetInputRef} // Ref hier an das Straßenfeld binden
                    type="text"
                    id="streetReg"
                    value={street}
                    onChange={e => setStreet(e.target.value)}
                    required
                    className="px-3 py-2 border rounded-md focus:ring-2 focus:ring-[#14ad9f] w-full h-10 text-sm"
                    // autoComplete="off" // Deaktivieren, wenn Google Places aktiv ist, oder "street-address" für Fallback
                    autoComplete="street-address"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-1.5">
                    <Label htmlFor="cityReg" className="text-[#14ad9f] font-medium">
                      Stadt
                    </Label>
                    <Input
                      type="text"
                      id="cityReg"
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      required
                      className="px-3 py-2 border rounded-md focus:ring-2 focus:ring-[#14ad9f] w-full h-10 text-sm"
                      autoComplete="address-level2" // Bleibt für manuelle Eingabe/Korrektur
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="postalCodeReg" className="text-[#14ad9f] font-medium">
                      Postleitzahl
                    </Label>
                    <Input
                      type="text"
                      id="postalCodeReg"
                      value={postalCode}
                      onChange={e => setPostalCode(e.target.value)}
                      required
                      className="px-3 py-2 border rounded-md focus:ring-2 focus:ring-[#14ad9f] w-full h-10 text-sm"
                      autoComplete="postal-code" // Bleibt für manuelle Eingabe/Korrektur
                    />
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="countryReg" className="text-[#14ad9f] font-medium">
                    Land
                  </Label>
                  <Input
                    type="text"
                    id="countryReg"
                    value={country}
                    onChange={e => setCountry(e.target.value)}
                    required
                    placeholder="z.B. DE oder Deutschland"
                    className="px-3 py-2 border rounded-md focus:ring-2 focus:ring-[#14ad9f] w-full h-10 text-sm"
                    autoComplete="country-name"
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="phoneReg" className="text-[#14ad9f] font-medium">
                    Telefonnummer
                  </Label>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <button
                        type="button"
                        className="px-3 py-2 border rounded-l-md focus:ring-2 focus:ring-[#14ad9f] flex items-center h-10 text-sm bg-gray-50 hover:bg-gray-100"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        aria-haspopup="true"
                        aria-expanded={isDropdownOpen}
                      >
                        <Flag
                          code={
                            europeanCountryCodes.find(
                              country => country.dialCode === selectedCountryCode
                            )?.flag
                          }
                          className="w-5 h-auto mr-1.5"
                        />
                        {selectedCountryCode}
                        <svg
                          className={`w-4 h-4 ml-1 transition-transform duration-200 ${isDropdownOpen ? 'transform rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M19 9l-7 7-7-7"
                          ></path>
                        </svg>
                      </button>
                      {isDropdownOpen && (
                        <div className="absolute z-20 mt-1 w-52 bg-white shadow-lg rounded-md max-h-48 overflow-y-auto border border-gray-200">
                          {europeanCountryCodes.map(country => (
                            <div
                              key={country.dialCode}
                              className="flex items-center p-2 cursor-pointer hover:bg-gray-100 text-sm"
                              onClick={() => {
                                setSelectedCountryCode(country.dialCode);
                                setIsDropdownOpen(false);
                              }}
                            >
                              <Flag code={country.flag} className="w-5 h-auto mr-2" />
                              <span className="mr-2">{country.country}</span> ({country.dialCode})
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
                      className="px-3 py-2 border rounded-r-md focus:ring-2 focus:ring-[#14ad9f] flex-1 h-10 text-sm"
                      autoComplete="tel-national"
                    />
                  </div>
                </div>

                {/* NEU: Newsletter-Checkbox */}
                <div className="flex items-center pt-2">
                  <input
                    type="checkbox"
                    id="newsletter"
                    checked={agreesToNewsletter}
                    onChange={e => setAgreesToNewsletter(e.target.checked)}
                    className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded cursor-pointer"
                  />
                  <label htmlFor="newsletter" className="ml-2 text-gray-600 text-sm cursor-pointer">
                    Ich möchte den Newsletter abonnieren und über Neuigkeiten informiert werden.
                  </label>
                </div>
                {error && (
                  <p className="text-red-500 text-xs text-center p-2 bg-red-50 rounded-md">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full bg-[#14ad9f] text-white hover:bg-teal-600 transition-colors duration-300 py-2.5 text-sm font-semibold"
                  disabled={loading}
                >
                  {loading ? 'Konto wird erstellt...' : 'Konto erstellen'}
                </Button>

                <p className="text-center text-xs text-gray-600">
                  Du hast bereits ein Konto?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setIsLoginPopupOpen(true);
                    }}
                    className="text-[#14ad9f] hover:underline font-medium"
                  >
                    Hier einloggen
                  </button>
                </p>
              </form>
            </CardContent>
          )}
        </Card>
      </main>

      <LoginPopup
        isOpen={isLoginPopupOpen}
        onClose={() => setIsLoginPopupOpen(false)}
        onLoginSuccess={handleLoginSuccessFromPopup}
        initialEmail={email}
      />
    </>
  );
}

// Die Standard-Export-Komponente für die Seite
export default function UserRegisterPage() {
  // Diese Komponente ist verantwortlich für das Setzen der Suspense-Boundary.
  // Sie kann eine Server-Komponente sein oder eine einfache Client-Komponente ohne problematische Hooks.
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-screen bg-gradient-to-r from-blue-100 to-teal-200 text-[#14ad9f] font-semibold">
          Lade Registrierungsseite...
        </div>
      }
    >
      <UserRegisterFormContent />
    </Suspense>
  );
}
