'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { 
  ArrowRight, 
  CheckCircle,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff
} from 'lucide-react';

// API Base URL für Hetzner Webmail-Proxy
const WEBMAIL_API_URL = process.env.NEXT_PUBLIC_WEBMAIL_API_URL || 'https://mail.taskilo.de';

interface RegistrationState {
  sessionId: string | null;
  step: number;
  firstName: string;
  lastName: string;
  emailPrefix: string;
  suggestedEmail: string;
  birthDay: string;
  birthMonth: string;
  birthYear: string;
  gender: string;
  password: string;
  confirmPassword: string;
  phone: string;
  verificationCode: string;
  termsAccepted: boolean;
  privacyAccepted: boolean;
}

// Innere Komponente die useSearchParams nutzt
function TaskiloEmailRegistrationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Onboarding-Flow Parameter
  const returnUrl = searchParams.get('returnUrl');
  const companyId = searchParams.get('companyId');
  const isOnboardingFlow = !!returnUrl && !!companyId;
  
  const [state, setState] = useState<RegistrationState>({
    sessionId: null,
    step: 0,
    firstName: '',
    lastName: '',
    emailPrefix: '',
    suggestedEmail: '',
    birthDay: '',
    birthMonth: '',
    birthYear: '',
    gender: '',
    password: '',
    confirmPassword: '',
    phone: '',
    verificationCode: '',
    termsAccepted: false,
    privacyAccepted: false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [displayedCode, setDisplayedCode] = useState<string | null>(null);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [finalEmail, setFinalEmail] = useState('');
  const [showBirthdayModal, setShowBirthdayModal] = useState(false);
  const [emailSuggestions, setEmailSuggestions] = useState<{email: string; available: boolean}[]>([]);
  const [selectedEmailOption, setSelectedEmailOption] = useState<'suggestion1' | 'suggestion2' | 'custom'>('suggestion1');
  const [customEmailPrefix, setCustomEmailPrefix] = useState('');
  const [isCheckingEmails, setIsCheckingEmails] = useState(false);

  useEffect(() => {
    startSession();
  }, []);

  const startSession = async () => {
    try {
      const response = await fetch(`${WEBMAIL_API_URL}/api/registration/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (data.success) {
        setState(prev => ({ ...prev, sessionId: data.sessionId, step: 1 }));
      } else {
        setError('Fehler beim Starten der Registrierung');
      }
    } catch {
      setError('Verbindung zum Server fehlgeschlagen');
    }
  };

  const handleStep1 = async () => {
    if (!state.firstName.trim()) { setError('Bitte geben Sie Ihren Vornamen ein'); return; }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${WEBMAIL_API_URL}/api/registration/step1`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: state.sessionId, firstName: state.firstName, lastName: state.lastName }),
      });
      const data = await response.json();
      if (data.success) {
        setState(prev => ({ ...prev, step: 2, suggestedEmail: data.suggestedEmail, emailPrefix: data.suggestedEmail }));
      } else { setError(data.error); }
    } catch { setError('Verbindungsfehler'); }
    finally { setIsLoading(false); }
  };

  // E-Mail-Vorschläge generieren und Verfügbarkeit prüfen
  const generateEmailSuggestions = async () => {
    const firstName = state.firstName.toLowerCase().replace(/[^a-z]/g, '');
    const lastName = state.lastName ? state.lastName.toLowerCase().replace(/[^a-z]/g, '') : '';
    
    // Verschiedene E-Mail-Varianten generieren
    const suggestions: string[] = [];
    
    if (lastName) {
      suggestions.push(`${firstName}.${lastName}`);
      suggestions.push(`${firstName}${lastName}`);
      suggestions.push(`${firstName}.${lastName}${Math.floor(Math.random() * 99) + 1}`);
      suggestions.push(`${lastName}.${firstName}`);
      suggestions.push(`${firstName[0]}${lastName}`);
    } else {
      suggestions.push(firstName);
      suggestions.push(`${firstName}${Math.floor(Math.random() * 999) + 1}`);
      suggestions.push(`${firstName}.mail`);
    }
    
    // Auf 30 Zeichen beschränken
    const cleanSuggestions = suggestions.map(s => s.substring(0, 30));
    
    setIsCheckingEmails(true);
    
    // Verfügbarkeit für jeden Vorschlag gegen die echte API prüfen
    const results: {email: string; available: boolean}[] = [];
    
    for (const suggestion of cleanSuggestions) {
      try {
        const response = await fetch(`${WEBMAIL_API_URL}/api/registration/check-email/${encodeURIComponent(suggestion)}`);
        const data = await response.json();
        if (data.available) {
          results.push({ email: suggestion, available: true });
          if (results.length >= 2) break; // Max 2 verfügbare Vorschläge
        }
      } catch {
        // Fehler ignorieren, nächsten Vorschlag probieren
      }
    }
    
    setEmailSuggestions(results);
    if (results.length > 0) {
      setSelectedEmailOption('suggestion1');
      setState(prev => ({ ...prev, emailPrefix: results[0].email }));
    } else {
      setSelectedEmailOption('custom');
    }
    setIsCheckingEmails(false);
  };

  // Schritt 2: Geburtsdatum & Geschlecht (optional)
  const handleStep2 = async () => {
    setIsLoading(true);
    setError(null);
    
    // E-Mail-Vorschläge generieren
    await generateEmailSuggestions();
    
    const birthDate = state.birthYear && state.birthMonth && state.birthDay
      ? `${state.birthYear}-${state.birthMonth.padStart(2, '0')}-${state.birthDay.padStart(2, '0')}` : undefined;
    try {
      const response = await fetch(`${WEBMAIL_API_URL}/api/registration/step2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: state.sessionId, birthDate, gender: state.gender || undefined }),
      });
      const data = await response.json();
      if (data.success) { 
        setState(prev => ({ ...prev, step: 3 })); 
      }
      else { setError(data.error); }
    } catch { setError('Verbindungsfehler'); }
    finally { setIsLoading(false); }
  };

  const checkEmailAvailability = async (prefix: string) => {
    if (prefix.length < 3) { setEmailAvailable(null); return; }
    try {
      const response = await fetch(`${WEBMAIL_API_URL}/api/registration/check-email/${encodeURIComponent(prefix)}`);
      const data = await response.json();
      setEmailAvailable(data.available);
    } catch { setEmailAvailable(null); }
  };

  // Schritt 3: E-Mail wählen
  const handleStep3 = async () => {
    // Gewählte E-Mail bestimmen
    let chosenEmail = '';
    if (selectedEmailOption === 'suggestion1' && emailSuggestions[0]) {
      chosenEmail = emailSuggestions[0].email;
    } else if (selectedEmailOption === 'suggestion2' && emailSuggestions[1]) {
      chosenEmail = emailSuggestions[1].email;
    } else if (selectedEmailOption === 'custom') {
      chosenEmail = customEmailPrefix;
    }
    
    if (!chosenEmail.trim() || chosenEmail.length < 3) {
      setError('Die E-Mail-Adresse muss mindestens 3 Zeichen haben'); return;
    }
    
    // Bei custom-Option: Verfügbarkeit prüfen
    if (selectedEmailOption === 'custom' && emailAvailable === false) { 
      setError('Diese E-Mail-Adresse ist bereits vergeben'); return; 
    }
    
    setState(prev => ({ ...prev, emailPrefix: chosenEmail }));
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${WEBMAIL_API_URL}/api/registration/step3`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: state.sessionId, emailPrefix: state.emailPrefix }),
      });
      const data = await response.json();
      if (data.success) { setState(prev => ({ ...prev, step: 4 })); }
      else { setError(data.error); }
    } catch { setError('Verbindungsfehler'); }
    finally { setIsLoading(false); }
  };

  const handleStep4 = async () => {
    if (state.password.length < 8) { setError('Das Passwort muss mindestens 8 Zeichen haben'); return; }
    if (state.password !== state.confirmPassword) { setError('Die Passwörter stimmen nicht überein'); return; }
    const hasUpperCase = /[A-Z]/.test(state.password);
    const hasLowerCase = /[a-z]/.test(state.password);
    const hasNumbers = /\d/.test(state.password);
    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      setError('Das Passwort muss Groß- und Kleinbuchstaben sowie Zahlen enthalten'); return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${WEBMAIL_API_URL}/api/registration/step4`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: state.sessionId, password: state.password, confirmPassword: state.confirmPassword }),
      });
      const data = await response.json();
      if (data.success) { setState(prev => ({ ...prev, step: 5 })); }
      else { setError(data.error); }
    } catch { setError('Verbindungsfehler'); }
    finally { setIsLoading(false); }
  };

  const handleSendCode = async () => {
    if (!state.phone.trim()) { setError('Bitte geben Sie Ihre Telefonnummer ein'); return; }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${WEBMAIL_API_URL}/api/registration/step5/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: state.sessionId, phone: state.phone }),
      });
      const data = await response.json();
      if (data.success) { 
        setCodeSent(true);
        // Wenn der Code in der Response ist (Twilio nicht konfiguriert), zeige ihn an
        if (data.verificationCode) {
          setDisplayedCode(data.verificationCode);
        }
      }
      else { setError(data.error); }
    } catch { setError('Verbindungsfehler'); }
    finally { setIsLoading(false); }
  };

  const handleVerifyCode = async () => {
    if (state.verificationCode.length !== 6) { setError('Bitte geben Sie den 6-stelligen Code ein'); return; }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${WEBMAIL_API_URL}/api/registration/step5/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: state.sessionId, code: state.verificationCode }),
      });
      const data = await response.json();
      if (data.success) { setState(prev => ({ ...prev, step: 6 })); }
      else { setError(data.error); }
    } catch { setError('Verbindungsfehler'); }
    finally { setIsLoading(false); }
  };

  const handleStep6 = async () => {
    if (!state.termsAccepted || !state.privacyAccepted) {
      setError('Bitte akzeptieren Sie die Nutzungsbedingungen und Datenschutzrichtlinien'); return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${WEBMAIL_API_URL}/api/registration/step6`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: state.sessionId, termsAccepted: state.termsAccepted, privacyAccepted: state.privacyAccepted }),
      });
      const data = await response.json();
      if (data.success) { setFinalEmail(data.email); setRegistrationComplete(true); }
      else { setError(data.error); }
    } catch { setError('Verbindungsfehler'); }
    finally { setIsLoading(false); }
  };

  // Handler für Rückkehr zum Onboarding
  const handleReturnToOnboarding = () => {
    if (returnUrl) {
      // URL mit Email-Parameter zurück zum Onboarding
      const decodedUrl = decodeURIComponent(returnUrl);
      const separator = decodedUrl.includes('?') ? '&' : '?';
      const returnWithEmail = `${decodedUrl}${separator}taskiloEmail=${encodeURIComponent(finalEmail)}&emailConnected=true`;
      window.location.href = returnWithEmail;
    }
  };

  if (registrationComplete) {
    // Onboarding-Flow: Andere Success-Nachricht und Rückleitung
    if (isOnboardingFlow) {
      return (
        <div className="min-h-screen bg-[#f0f4f9] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-md p-12 max-w-lg w-full text-center">
            <div className="w-20 h-20 bg-[#14ad9f]/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-[#14ad9f]" />
            </div>
            <h1 className="text-2xl font-normal text-gray-900 mb-2">E-Mail-Adresse erstellt!</h1>
            <p className="text-gray-600 mb-6">Ihre Taskilo E-Mail wurde erfolgreich erstellt und mit Ihrem Unternehmen verbunden.</p>
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-gray-500 mb-1">Ihre neue E-Mail-Adresse</p>
              <p className="text-xl font-medium text-[#14ad9f]">{finalEmail}</p>
            </div>
            <button
              onClick={handleReturnToOnboarding}
              className="px-8 py-3 bg-[#14ad9f] text-white rounded-full font-medium hover:bg-teal-600 transition-colors"
            >
              Zurück zum Onboarding
            </button>
          </div>
        </div>
      );
    }

    // Standard-Flow: Normaler Success-Screen
    return (
      <div className="min-h-screen bg-[#f0f4f9] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-md p-12 max-w-lg w-full text-center">
          <div className="w-20 h-20 bg-[#14ad9f]/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-[#14ad9f]" />
          </div>
          <h1 className="text-2xl font-normal text-gray-900 mb-2">Willkommen bei Taskilo!</h1>
          <p className="text-gray-600 mb-6">Ihr E-Mail-Account wurde erfolgreich erstellt.</p>
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <p className="text-sm text-gray-500 mb-1">Ihre E-Mail-Adresse</p>
            <p className="text-xl font-medium text-[#14ad9f]">{finalEmail}</p>
          </div>
          <button
            onClick={() => router.push('/webmail')}
            className="px-8 py-3 bg-[#14ad9f] text-white rounded-full font-medium hover:bg-teal-600 transition-colors"
          >
            Zum Webmail
          </button>
        </div>
      </div>
    );
  }

  const renderStepContent = () => {
    switch (state.step) {
      case 1:
        return (
          <>
            <div className="flex-1">
              <div className="mb-8">
                <Image src="/images/taskilo-logo-transparent.png" alt="Taskilo" width={100} height={32} />
              </div>
              <h1 className="text-2xl font-normal text-gray-900 mb-2">Taskilo-Konto erstellen</h1>
              <p className="text-gray-600">Bitte den Namen eingeben</p>
            </div>
            <div className="flex-1 space-y-4">
              <div className="relative">
                <input
                  type="text"
                  id="firstName"
                  value={state.firstName}
                  onChange={(e) => setState(prev => ({ ...prev, firstName: e.target.value }))}
                  className={`peer w-full px-4 pt-5 pb-2 border-2 rounded-md outline-none transition-colors ${
                    state.firstName ? 'border-[#14ad9f]' : 'border-gray-300'
                  } focus:border-[#14ad9f]`}
                  placeholder=" "
                />
                <label htmlFor="firstName" className={`absolute left-4 transition-all pointer-events-none ${
                  state.firstName ? 'top-1 text-xs text-[#14ad9f]' : 'top-4 text-base text-gray-500 peer-focus:top-1 peer-focus:text-xs peer-focus:text-[#14ad9f]'
                }`}>Vorname</label>
              </div>
              <div className="relative">
                <input
                  type="text"
                  id="lastName"
                  value={state.lastName}
                  onChange={(e) => setState(prev => ({ ...prev, lastName: e.target.value }))}
                  className={`peer w-full px-4 pt-5 pb-2 border-2 rounded-md outline-none transition-colors ${
                    state.lastName ? 'border-[#14ad9f]' : 'border-gray-300'
                  } focus:border-[#14ad9f]`}
                  placeholder=" "
                />
                <label htmlFor="lastName" className={`absolute left-4 transition-all pointer-events-none ${
                  state.lastName ? 'top-1 text-xs text-[#14ad9f]' : 'top-4 text-base text-gray-500 peer-focus:top-1 peer-focus:text-xs peer-focus:text-[#14ad9f]'
                }`}>Nachname (optional)</label>
              </div>
            </div>
          </>
        );
      case 2:
        return (
          <>
            <div className="flex-1">
              <div className="mb-8"><Image src="/images/taskilo-logo-transparent.png" alt="Taskilo" width={100} height={32} /></div>
              <h1 className="text-2xl font-normal text-gray-900 mb-2">Allgemeine Informationen</h1>
              <p className="text-gray-600">Geben Sie Ihr Geburtsdatum und Ihr Geschlecht ein</p>
            </div>
            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {/* Tag */}
                <div className="relative">
                  <input 
                    type="text" 
                    inputMode="numeric"
                    value={state.birthDay} 
                    onChange={(e) => setState(prev => ({ ...prev, birthDay: e.target.value.replace(/\D/g, '').slice(0, 2) }))}
                    className={`peer w-full h-14 px-4 pt-4 pb-1 bg-white border rounded-lg outline-none transition-colors text-base ${
                      state.birthDay ? 'border-[#14ad9f]' : 'border-gray-300 hover:border-gray-400'
                    } focus:border-[#14ad9f] focus:border-2`}
                    placeholder=" "
                  />
                  <label className={`absolute left-4 transition-all pointer-events-none ${
                    state.birthDay 
                      ? 'top-1 text-xs text-[#14ad9f]' 
                      : 'top-4 text-base text-gray-500 peer-focus:top-1 peer-focus:text-xs peer-focus:text-[#14ad9f]'
                  }`}>Tag</label>
                </div>
                {/* Monat */}
                <div className="relative">
                  <select 
                    value={state.birthMonth} 
                    onChange={(e) => setState(prev => ({ ...prev, birthMonth: e.target.value }))}
                    className={`w-full h-14 px-4 pt-4 pb-1 bg-white border rounded-lg outline-none transition-colors text-base appearance-none cursor-pointer ${
                      state.birthMonth ? 'border-[#14ad9f]' : 'border-gray-300 hover:border-gray-400'
                    } focus:border-[#14ad9f] focus:border-2`}
                  >
                    <option value="" disabled hidden></option>
                    {['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'].map((m, i) => (
                      <option key={m} value={String(i + 1)}>{m}</option>
                    ))}
                  </select>
                  <label className={`absolute left-4 pointer-events-none ${
                    state.birthMonth ? 'top-1 text-xs text-[#14ad9f]' : 'top-4 text-base text-gray-500'
                  }`}>Monat</label>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                {/* Jahr */}
                <div className="relative">
                  <input 
                    type="text" 
                    inputMode="numeric"
                    value={state.birthYear} 
                    onChange={(e) => setState(prev => ({ ...prev, birthYear: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                    className={`peer w-full h-14 px-4 pt-4 pb-1 bg-white border rounded-lgtline-none transition-colors text-base ${
                      state.birthYear ? 'border-[#14ad9f]' : 'border-gray-300 hover:border-gray-400'
                    } focus:border-[#14ad9f] focus:border-2`}
                    placeholder=" "
                  />
                  <label className={`absolute left-4 transition-all pointer-events-none ${
                    state.birthYear 
                      ? 'top-1 text-xs text-[#14ad9f]' 
                      : 'top-4 text-base text-gray-500 peer-focus:top-1 peer-focus:text-xs peer-focus:text-[#14ad9f]'
                  }`}>Jahr</label>
                </div>
              </div>
              {/* Geschlecht */}
              <div className="relative">
                <select 
                  value={state.gender} 
                  onChange={(e) => setState(prev => ({ ...prev, gender: e.target.value }))}
                  className={`w-full h-14 px-4 pt-4 pb-1 bg-white border rounded-lg outline-none transition-colors text-base appearance-none cursor-pointer ${
                    state.gender ? 'border-[#14ad9f]' : 'border-gray-300 hover:border-gray-400'
                  } focus:border-[#14ad9f] focus:border-2`}
                >
                  <option value="" disabled hidden></option>
                  <option value="male">Männlich</option>
                  <option value="female">Weiblich</option>
                  <option value="other">Divers</option>
                  <option value="prefer_not_to_say">Keine Angabe</option>
                </select>
                <label className={`absolute left-4 pointer-events-none ${
                  state.gender ? 'top-1 text-xs text-[#14ad9f]' : 'top-4 text-base text-gray-500'
                }`}>Geschlecht</label>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowBirthdayModal(true)}
                className="text-[#14ad9f] text-sm hover:underline text-left"
              >
                Warum wir nach Geburtsdatum und Geschlecht fragen
              </button>
            </div>
          </>
        );
      case 3:
        return (
          <>
            <div className="flex-1">
              <div className="mb-8"><Image src="/images/taskilo-logo-transparent.png" alt="Taskilo" width={100} height={32} /></div>
              <h1 className="text-2xl font-normal text-gray-900 mb-2">E-Mail-Adresse erstellen</h1>
              <p className="text-gray-600">Erstellen Sie eine Taskilo-Adresse, um sich in Ihrem Konto anzumelden</p>
            </div>
            <div className="flex-1 space-y-1">
              {isCheckingEmails ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-[#14ad9f]" />
                  <span className="ml-2 text-gray-500">E-Mail-Adressen werden geprüft...</span>
                </div>
              ) : (
                <>
                  {/* Vorschlag 1 */}
                  {emailSuggestions[0] && (
                    <label className="flex items-center py-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                      <input
                        type="radio"
                        name="emailOption"
                        checked={selectedEmailOption === 'suggestion1'}
                        onChange={() => {
                          setSelectedEmailOption('suggestion1');
                          setState(prev => ({ ...prev, emailPrefix: emailSuggestions[0].email }));
                        }}
                        className="w-5 h-5 text-[#14ad9f] border-2 border-gray-400 focus:ring-[#14ad9f]"
                      />
                      <span className="ml-4 text-base text-gray-800">{emailSuggestions[0].email}@taskilo.de</span>
                    </label>
                  )}
                  
                  {/* Vorschlag 2 */}
                  {emailSuggestions[1] && (
                    <label className="flex items-center py-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                      <input
                        type="radio"
                        name="emailOption"
                        checked={selectedEmailOption === 'suggestion2'}
                        onChange={() => {
                          setSelectedEmailOption('suggestion2');
                          setState(prev => ({ ...prev, emailPrefix: emailSuggestions[1].email }));
                        }}
                        className="w-5 h-5 text-[#14ad9f] border-2 border-gray-400 focus:ring-[#14ad9f]"
                      />
                      <span className="ml-4 text-base text-gray-800">{emailSuggestions[1].email}@taskilo.de</span>
                    </label>
                  )}
                  
                  {/* Eigene E-Mail-Adresse erstellen */}
                  <label className="flex items-center py-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="emailOption"
                      checked={selectedEmailOption === 'custom'}
                      onChange={() => setSelectedEmailOption('custom')}
                      className="w-5 h-5 text-[#14ad9f] border-2 border-gray-400 focus:ring-[#14ad9f]"
                    />
                    <span className="ml-4 text-base text-gray-800">Eigene Taskilo-Adresse erstellen</span>
                  </label>
                  
                  {/* Custom Input - nur anzeigen wenn "custom" gewählt */}
                  {selectedEmailOption === 'custom' && (
                    <div className="pt-4 space-y-3">
                      <div className="relative">
                        <input
                          type="text"
                          id="customEmail"
                          value={customEmailPrefix}
                          onChange={(e) => {
                            const value = e.target.value.toLowerCase().replace(/[^a-z0-9.]/g, '');
                            setCustomEmailPrefix(value);
                            checkEmailAvailability(value);
                          }}
                          className={`peer w-full h-14 px-4 pt-4 pb-1 pr-28 bg-white border rounded-lg outline-none transition-colors text-base ${
                            emailAvailable === false ? 'border-red-500 border-2' : customEmailPrefix ? 'border-[#14ad9f] border-2' : 'border-gray-300 hover:border-gray-400'
                          } focus:border-[#14ad9f] focus:border-2`}
                          placeholder=" "
                        />
                        <label htmlFor="customEmail" className={`absolute left-4 transition-all pointer-events-none ${
                          customEmailPrefix ? 'top-1 text-xs text-[#14ad9f]' : 'top-4 text-base text-gray-500 peer-focus:top-1 peer-focus:text-xs peer-focus:text-[#14ad9f]'
                        }`}>Nutzername</label>
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">@taskilo.de</span>
                      </div>
                      {customEmailPrefix.length >= 3 && emailAvailable !== null && (
                        <div className={`flex items-center gap-2 text-sm ${emailAvailable ? 'text-green-600' : 'text-red-600'}`}>
                          {emailAvailable ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                          {emailAvailable ? 'Verfügbar' : 'Diese E-Mail-Adresse ist bereits vergeben. Bitte wählen Sie eine andere.'}
                        </div>
                      )}
                      <p className="text-sm text-gray-500">Es können Buchstaben, Ziffern und Punkte verwendet werden</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        );
      case 4:
        return (
          <>
            <div className="flex-1">
              <div className="mb-8"><Image src="/images/taskilo-logo-transparent.png" alt="Taskilo" width={100} height={32} /></div>
              <h1 className="text-2xl font-normal text-gray-900 mb-2">Starkes Passwort erstellen</h1>
              <p className="text-gray-600">Bitte ein starkes Passwort aus Buchstaben, Zahlen und Sonderzeichen erstellen</p>
            </div>
            <div className="flex-1 space-y-4">
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} id="password" value={state.password}
                  onChange={(e) => setState(prev => ({ ...prev, password: e.target.value }))}
                  className={`peer w-full px-4 pt-5 pb-2 pr-12 border-2 rounded-md outline-none transition-colors ${state.password ? 'border-[#14ad9f]' : 'border-gray-300'} focus:border-[#14ad9f]`} placeholder=" " />
                <label htmlFor="password" className={`absolute left-4 transition-all pointer-events-none ${state.password ? 'top-1 text-xs text-[#14ad9f]' : 'top-4 text-base text-gray-500 peer-focus:top-1 peer-focus:text-xs peer-focus:text-[#14ad9f]'}`}>Passwort</label>
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} id="confirmPassword" value={state.confirmPassword}
                  onChange={(e) => setState(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className={`peer w-full px-4 pt-5 pb-2 border-2 rounded-md outline-none transition-colors ${state.confirmPassword ? 'border-[#14ad9f]' : 'border-gray-300'} focus:border-[#14ad9f]`} placeholder=" " />
                <label htmlFor="confirmPassword" className={`absolute left-4 transition-all pointer-events-none ${state.confirmPassword ? 'top-1 text-xs text-[#14ad9f]' : 'top-4 text-base text-gray-500 peer-focus:top-1 peer-focus:text-xs peer-focus:text-[#14ad9f]'}`}>Bestätigen</label>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input type="checkbox" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-[#14ad9f] focus:ring-[#14ad9f]" />
                Passwort anzeigen
              </label>
            </div>
          </>
        );
      case 5:
        return (
          <>
            <div className="flex-1">
              <div className="mb-8"><Image src="/images/taskilo-logo-transparent.png" alt="Taskilo" width={100} height={32} /></div>
              <h1 className="text-2xl font-normal text-gray-900 mb-2">Telefonnummer bestätigen</h1>
              <p className="text-gray-600">{codeSent ? 'Geben Sie den 6-stelligen Code ein' : 'Taskilo sendet Ihnen eine SMS mit einem Bestätigungscode'}</p>
            </div>
            <div className="flex-1 space-y-4">
              {!codeSent ? (
                <div className="relative">
                  <input type="tel" id="phone" value={state.phone} onChange={(e) => setState(prev => ({ ...prev, phone: e.target.value }))}
                    className={`peer w-full px-4 pt-5 pb-2 border-2 rounded-md outline-none transition-colors ${state.phone ? 'border-[#14ad9f]' : 'border-gray-300'} focus:border-[#14ad9f]`} placeholder=" " />
                  <label htmlFor="phone" className={`absolute left-4 transition-all pointer-events-none ${state.phone ? 'top-1 text-xs text-[#14ad9f]' : 'top-4 text-base text-gray-500 peer-focus:top-1 peer-focus:text-xs peer-focus:text-[#14ad9f]'}`}>Telefonnummer</label>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <input type="text" id="code" value={state.verificationCode}
                      onChange={(e) => setState(prev => ({ ...prev, verificationCode: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                      className="w-full px-4 pt-5 pb-2 border-2 rounded-md outline-none border-gray-300 focus:border-[#14ad9f] text-center text-2xl tracking-widest" placeholder="------" maxLength={6} />
                    <label className="absolute left-4 top-1 text-xs text-gray-500">Bestätigungscode</label>
                  </div>
                  {displayedCode && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <p className="text-sm text-amber-800 mb-2">SMS-Dienst noch nicht konfiguriert. Ihr Verifizierungscode:</p>
                      <p className="text-2xl font-mono font-bold text-center text-amber-900 tracking-widest">{displayedCode}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        );
      case 6:
        return (
          <>
            <div className="flex-1">
              <div className="mb-8"><Image src="/images/taskilo-logo-transparent.png" alt="Taskilo" width={100} height={32} /></div>
              <h1 className="text-2xl font-normal text-gray-900 mb-2">Datenschutz und Nutzungsbedingungen</h1>
              <p className="text-gray-600">Um ein Taskilo-Konto zu erstellen, müssen Sie den Nutzungsbedingungen zustimmen</p>
            </div>
            <div className="flex-1 space-y-4">
              <label className="flex items-start gap-3 cursor-pointer p-4 border-2 rounded-md border-gray-300 hover:border-[#14ad9f] transition-colors">
                <input type="checkbox" checked={state.termsAccepted} onChange={(e) => setState(prev => ({ ...prev, termsAccepted: e.target.checked }))}
                  className="mt-1 w-5 h-5 rounded border-gray-300 text-[#14ad9f] focus:ring-[#14ad9f]" />
                <span className="text-sm text-gray-700">Ich akzeptiere die <Link href="/legal/terms" target="_blank" rel="noopener noreferrer" className="text-[#14ad9f] hover:underline">Nutzungsbedingungen</Link> von Taskilo</span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer p-4 border-2 rounded-md border-gray-300 hover:border-[#14ad9f] transition-colors">
                <input type="checkbox" checked={state.privacyAccepted} onChange={(e) => setState(prev => ({ ...prev, privacyAccepted: e.target.checked }))}
                  className="mt-1 w-5 h-5 rounded border-gray-300 text-[#14ad9f] focus:ring-[#14ad9f]" />
                <span className="text-sm text-gray-700">Ich habe die <Link href="/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-[#14ad9f] hover:underline">Datenschutzrichtlinien</Link> gelesen und stimme der Verarbeitung meiner Daten zu</span>
              </label>
            </div>
          </>
        );
      default:
        return <div className="flex items-center justify-center w-full"><Loader2 className="w-8 h-8 animate-spin text-[#14ad9f]" /></div>;
    }
  };

  const handleNext = () => {
    switch (state.step) {
      case 1: handleStep1(); break;
      case 2: handleStep2(); break;
      case 3: handleStep3(); break;
      case 4: handleStep4(); break;
      case 5: if (codeSent) { handleVerifyCode(); } else { handleSendCode(); } break;
      case 6: handleStep6(); break;
    }
  };

  const getButtonText = () => {
    if (isLoading) return <Loader2 className="w-5 h-5 animate-spin" />;
    if (state.step === 5 && !codeSent) return 'SMS senden';
    if (state.step === 6) return 'Konto erstellen';
    return 'Weiter';
  };

  return (
    <div className="min-h-screen bg-[#f0f4f9] flex flex-col">
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[900px]">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          <div className="bg-white rounded-3xl shadow-md p-12">
            <div className="flex flex-col md:flex-row gap-12">
              {renderStepContent()}
            </div>
            <div className="flex justify-end mt-8">
              <button
                onClick={handleNext}
                disabled={isLoading || (state.step === 1 && !state.firstName.trim())}
                className="px-8 py-3 bg-[#14ad9f] text-white rounded-full font-medium hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {getButtonText()}
                {!isLoading && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </main>
      <footer className="py-4 px-6 flex justify-between items-center text-sm text-gray-600">
        <div>
          <select className="bg-transparent border-none outline-none cursor-pointer">
            <option>Deutsch</option>
            <option>English</option>
          </select>
        </div>
        <div className="flex gap-6">
          <Link href="/help" className="hover:text-gray-900">Hilfe</Link>
          <Link href="/legal/privacy" className="hover:text-gray-900">Datenschutz</Link>
          <Link href="/legal/terms" className="hover:text-gray-900">Nutzungsbedingungen</Link>
        </div>
      </footer>

      {/* Modal: Warum wir nach Geburtsdatum und Geschlecht fragen */}
      {showBirthdayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowBirthdayModal(false)}
          />
          {/* Modal Content */}
          <div className="relative bg-[#f0f4f9] rounded-2xl max-w-2xl w-full p-8 shadow-2xl">
            <h2 className="text-2xl font-normal text-gray-900 mb-6">
              Warum wir nach Geburtsdatum und Geschlecht fragen
            </h2>
            
            <div className="space-y-4 text-gray-700 text-[15px] leading-relaxed">
              <p>
                Sie müssen Ihr Geburtsdatum angeben. Taskilo verwendet Ihr Geburtsdatum, 
                um zu prüfen, ob Sie die Anforderungen an das Mindestalter für bestimmte 
                Dienste erfüllen, und um Ihnen personalisiertere Inhalte zu präsentieren.
              </p>
              
              <p>
                Sie können Ihr Geschlecht angeben, müssen dies aber nicht. Taskilo verwendet 
                Ihr Geschlecht nur, um Ihnen personalisiertere Inhalte zu bieten.
              </p>
              
              <p>
                <span className="font-medium text-gray-900">Hinweis zum Datenschutz:</span> Standardmäßig werden Ihr Geburtsdatum und Ihr 
                Geschlecht nicht mit anderen Nutzern von Taskilo-Diensten geteilt.
              </p>
              
              <Link 
                href="/legal/privacy" 
                className="text-[#14ad9f] hover:underline inline-block"
              >
                Weitere Informationen zum Teilen Ihres Geburtsdatums und Ihres Geschlechts
              </Link>
            </div>
            
            <div className="flex justify-end mt-8">
              <button
                onClick={() => setShowBirthdayModal(false)}
                className="text-[#14ad9f] font-medium hover:bg-[#14ad9f]/10 px-6 py-2 rounded-full transition-colors"
              >
                Zurück
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Loading Fallback für Suspense
function RegistrationLoadingFallback() {
  return (
    <div className="min-h-screen bg-[#f0f4f9] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-md p-12 max-w-lg w-full text-center">
        <Loader2 className="w-10 h-10 text-[#14ad9f] animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Lade Registrierung...</p>
      </div>
    </div>
  );
}

// Wrapper-Komponente mit Suspense
export default function TaskiloEmailRegistrationPage() {
  return (
    <Suspense fallback={<RegistrationLoadingFallback />}>
      <TaskiloEmailRegistrationContent />
    </Suspense>
  );
}
