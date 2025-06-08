// page.tsx
"use client";
import { Suspense, useState, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth, db } from '../../../firebase/clients';
import { createUserWithEmailAndPassword, User as FirebaseUser, AuthError } from 'firebase/auth';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Flag from 'react-world-flags';
import LoginPopup from '@/components/LoginPopup';

const PAGE_LOG = "UserRegisterPage:";
const PAGE_ERROR = "UserRegisterPage ERROR:";
const PAGE_WARN = "UserRegisterPage WARN:";

async function linkJobToUser(jobId: string | null, userId: string, actionType: "login" | "register") {
  const LOG_CONTEXT = `${PAGE_LOG} linkJobToUser (${actionType}):`;
  const WARN_CONTEXT = `${PAGE_WARN} linkJobToUser (${actionType}):`;
  const ERROR_CONTEXT = `${PAGE_ERROR} linkJobToUser (${actionType}):`;

  if (!jobId || !userId) {
    console.warn(WARN_CONTEXT, "jobId oder userId fehlt, keine Verknüpfung möglich.");
    return;
  }
  try {
    // Stellen Sie sicher, dass 'jobPostings' der korrekte Sammlungsname ist.
    // In Ihren Cloud Functions verwenden Sie 'auftraege'. Passen Sie dies ggf. an.
    const jobRef = doc(db, 'jobPostings', jobId);
    await updateDoc(jobRef, {
      kundeId: userId,
      status: 'draft_authenticated_user'
    });
    console.log(LOG_CONTEXT, `Job ${jobId} erfolgreich mit User ${userId} verknüpft.`);
  } catch (error: unknown) {
    console.error(ERROR_CONTEXT, `Fehler beim Verknüpfen von Job ${jobId} mit User ${userId}:`, error);
  }
}

// Diese Komponente enthält die eigentliche Logik und verwendet Client-Hooks
function UserRegisterFormContent() {
  "use client"; // Wichtig: Diese Komponente ist eine Client-Komponente

  const router = useRouter();
  const searchParams = useSearchParams(); // useSearchParams wird hier verwendet

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [phone, setPhone] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCountryCode, setSelectedCountryCode] = useState('+49');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoginPopupOpen, setIsLoginPopupOpen] = useState(false);

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

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Das Passwort muss mindestens 6 Zeichen lang sein.");
      return;
    }
    if (!firstname.trim() || !lastname.trim() || !phone.trim() || !postalCode.trim() || !email.trim()) {
      setError("Bitte füllen Sie alle Felder aus.");
      return;
    }
    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log(PAGE_LOG, 'Benutzer registriert:', user.uid);

      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        user_type: 'kunde',
        email: user.email,
        firstName: firstname,
        lastName: lastname,
        phoneNumber: `${selectedCountryCode}${phone.replace(/\D/g, '')}`,
        postalCode: postalCode,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      console.log(PAGE_LOG, 'Benutzerdaten in Firestore geschrieben.');

      let extractedJobId: string | null = null;
      if (redirectToFromParams) {
        try {
          const redirectUrlObj = new URL(redirectToFromParams, window.location.origin);
          extractedJobId = redirectUrlObj.searchParams.get('jobId');
        } catch (urlParseError) {
          console.error(PAGE_ERROR, "Fehler beim Parsen der redirectTo URL für jobId (Registrierung):", urlParseError);
        }
      }

      if (extractedJobId) {
        await linkJobToUser(extractedJobId, user.uid, "register");
      }

      if (redirectToFromParams) {
        console.log(PAGE_LOG, `Weiterleitung nach Registrierung zu: ${redirectToFromParams}`);
        router.push(redirectToFromParams);
      } else {
        console.log(PAGE_LOG, `Weiterleitung nach Registrierung zum Dashboard für User: ${user.uid}`);
        router.push(`/dashboard/user/${user.uid}`);
      }

    } catch (err: unknown) {
      console.error(PAGE_ERROR, "Registrierungsfehler:", err);
      if (typeof err === 'object' && err !== null && 'code' in err) {
        const firebaseError = err as AuthError;
        if (firebaseError.code === 'auth/email-already-in-use') {
          setError('Diese E-Mail-Adresse wird bereits verwendet. Versuchen Sie sich einzuloggen.');
        } else if (firebaseError.code === 'auth/weak-password') {
          setError('Das Passwort ist zu schwach. Es muss mindestens 6 Zeichen lang sein.');
        } else {
          setError(firebaseError.message || 'Registrierung fehlgeschlagen. Bitte versuchen Sie es später erneut.');
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

  const handleLoginSuccessFromPopup = async (loggedInUser: FirebaseUser, redirectToUrl?: string | null) => {
    setIsLoginPopupOpen(false);
    console.log(PAGE_LOG, 'Login via Popup erfolgreich für User:', loggedInUser.uid);

    let extractedJobId: string | null = null;
    if (redirectToUrl) {
      try {
        const urlObj = new URL(redirectToUrl, window.location.origin);
        extractedJobId = urlObj.searchParams.get('jobId');
      } catch (urlParseError) {
        console.error(PAGE_ERROR, "Fehler beim Parsen der redirectTo URL nach Popup-Login:", urlParseError);
      }
    }

    if (extractedJobId) {
      await linkJobToUser(extractedJobId, loggedInUser.uid, "login");
    }

    if (redirectToUrl) {
      console.log(PAGE_LOG, `Weiterleitung nach Popup-Login zu: ${redirectToUrl}`);
      router.push(redirectToUrl);
    } else {
      console.log(PAGE_LOG, `Weiterleitung nach Popup-Login zum Dashboard für User: ${loggedInUser.uid}`);
      router.push(`/dashboard/user/${loggedInUser.uid}`);
    }
  };

  return (
    <>
      <main className="bg-gradient-to-r from-blue-100 to-teal-200 grid place-items-center min-h-screen mx-auto p-6 md:p-12">
        <Card className="w-full max-w-md shadow-lg rounded-lg bg-white">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-semibold text-[#14ad9f]">Benutzer Registrierung</CardTitle>
            <CardDescription className="text-sm text-[#14ad9f]">Erstelle dein Benutzerkonto</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid gap-1.5">
                <Label htmlFor="emailReg" className="text-[#14ad9f] font-medium">E-Mail</Label>
                <Input
                  type="email"
                  id="emailReg"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="px-3 py-2 border rounded-md focus:ring-2 focus:ring-[#14ad9f] w-full h-10 text-sm"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="passwordReg" className="text-[#14ad9f] font-medium">Passwort</Label>
                <Input
                  type="password"
                  id="passwordReg"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="px-3 py-2 border rounded-md focus:ring-2 focus:ring-[#14ad9f] w-full h-10 text-sm"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="firstnameReg" className="text-[#14ad9f] font-medium">Vorname</Label>
                  <Input
                    type="text"
                    id="firstnameReg"
                    value={firstname}
                    onChange={(e) => setFirstname(e.target.value)}
                    required
                    className="px-3 py-2 border rounded-md focus:ring-2 focus:ring-[#14ad9f] w-full h-10 text-sm"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="lastnameReg" className="text-[#14ad9f] font-medium">Nachname</Label>
                  <Input
                    type="text"
                    id="lastnameReg"
                    value={lastname}
                    onChange={(e) => setLastname(e.target.value)}
                    required
                    className="px-3 py-2 border rounded-md focus:ring-2 focus:ring-[#14ad9f] w-full h-10 text-sm"
                  />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="phoneReg" className="text-[#14ad9f] font-medium">Telefonnummer</Label>
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
                        code={europeanCountryCodes.find(country => country.dialCode === selectedCountryCode)?.flag}
                        className="w-5 h-auto mr-1.5"
                      />
                      {selectedCountryCode}
                      <svg className={`w-4 h-4 ml-1 transition-transform duration-200 ${isDropdownOpen ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </button>
                    {isDropdownOpen && (
                      <div className="absolute z-20 mt-1 w-52 bg-white shadow-lg rounded-md max-h-48 overflow-y-auto border border-gray-200">
                        {europeanCountryCodes.map((country) => (
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
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    required
                    placeholder="123456789"
                    className="px-3 py-2 border rounded-r-md focus:ring-2 focus:ring-[#14ad9f] flex-1 h-10 text-sm"
                  />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="postalCodeReg" className="text-[#14ad9f] font-medium">Postleitzahl</Label>
                <Input
                  type="text"
                  id="postalCodeReg"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  required
                  className="px-3 py-2 border rounded-md focus:ring-2 focus:ring-[#14ad9f] w-full h-10 text-sm"
                />
              </div>

              {error && <p className="text-red-500 text-xs text-center p-2 bg-red-50 rounded-md">{error}</p>}

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
        </Card>
      </main>

      <LoginPopup
        isOpen={isLoginPopupOpen}
        onClose={() => setIsLoginPopupOpen(false)}
        onLoginSuccess={handleLoginSuccessFromPopup}
        redirectTo={redirectToFromParams}
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
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-r from-blue-100 to-teal-200 text-[#14ad9f] font-semibold">
        Lade Registrierungsseite...
      </div>
    }>
      <UserRegisterFormContent />
    </Suspense>
  );
}
