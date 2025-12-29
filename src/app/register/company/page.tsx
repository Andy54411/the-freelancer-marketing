'use client';

import { useRouter } from 'next/navigation';
import ProgressBar from '@/components/ProgressBar';
import { useState } from 'react';
import { useRegistration } from '@/contexts/Registration-Context';
import { useAnalytics } from '@/hooks/useAnalytics';
import { Eye, EyeOff, X, Info, Check, Shield, Clock, Users, ArrowLeft, Calculator, Briefcase, TrendingUp, Calendar, Mail, Banknote } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

const steps = [
  'Über Sie',
  'Identitätsnachweis',
  'Qualifikationen',
  'Profil anlegen',
  'Bezahlmethode',
];

const benefits = [
  { icon: Calculator, text: 'Buchhaltung & Rechnungen' },
  { icon: Briefcase, text: 'Recruiting & Personal' },
  { icon: TrendingUp, text: 'Taskilo Advertising' },
  { icon: Banknote, text: 'Banking & Finanzen' },
  { icon: Calendar, text: 'Kalender & Workspace' },
  { icon: Mail, text: 'E-Mail & WhatsApp' },
];

export default function Step1() {
  const {
    setFirstName,
    setLastName,
    setEmail,
    setPassword,
    setDateOfBirth,
    setPhoneNumber,
    setIsManagingDirectorOwner,
  } = useRegistration();

  const [localFirstName, setLocalFirstName] = useState('');
  const [localLastName, setLocalLastName] = useState('');
  const [localEmail, setLocalEmail] = useState('');
  const [localPassword, setLocalPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localDateOfBirth, setLocalDateOfBirth] = useState('');
  const [localPhoneCountryCode, setLocalPhoneCountryCode] = useState('+49');
  const [localPhoneNumber, setLocalPhoneNumber] = useState('');
  const [localIsSoleOwner, setLocalIsSoleOwner] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const router = useRouter();
  const { trackEvent, trackNavigation } = useAnalytics();

  const handleNext = () => {
    if (localPassword !== confirmPassword) {
      alert('Passwörter stimmen nicht überein!');
      return;
    }

    trackEvent('registration_step_completed', 'registration', 'company_step_1');

    setFirstName(localFirstName);
    setLastName(localLastName);
    setEmail(localEmail);
    setPassword(localPassword);
    setDateOfBirth(localDateOfBirth);
    setPhoneNumber(localPhoneCountryCode + ' ' + localPhoneNumber);
    setIsManagingDirectorOwner(localIsSoleOwner);

    trackNavigation('company_step_2', 'company_step_1');

    router.push('/register/company/step2');
  };

  const isFormValid = () => {
    return (
      localFirstName.trim() !== '' &&
      localLastName.trim() !== '' &&
      localEmail.trim() !== '' &&
      localPassword.trim() !== '' &&
      confirmPassword.trim() !== '' &&
      localDateOfBirth.trim() !== '' &&
      localPhoneNumber.trim() !== '' &&
      agreeTerms &&
      localIsSoleOwner
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* Hero Section mit Gradient */}
      <section className="relative bg-linear-to-br from-[#14ad9f] via-teal-600 to-teal-800 pt-12 pb-32">
        {/* Background Image with Teal Gradient Overlay */}
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1497366216548-37526070297c?w=1920&h=1080&fit=crop"
            alt="Background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-linear-to-br from-[#14ad9f]/95 via-teal-700/90 to-teal-900/95" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <Link 
              href="/"
              className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Zurück zur Startseite
            </Link>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
              Starten Sie mit Taskilo
            </h1>
            <p className="text-lg text-white/90 max-w-2xl mx-auto">
              Die All-in-One Plattform für Ihr Unternehmen - kostenlos registrieren
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 pb-16 relative z-20">
        <div className="grid lg:grid-cols-5 gap-8">
          
          {/* Left Side - Benefits */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-2 hidden lg:block"
          >
            <div className="bg-white rounded-2xl shadow-xl p-8 sticky top-24">
              <h3 className="text-xl font-bold text-gray-900 mb-6">
                Alles in einer Plattform
              </h3>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#14ad9f]/10 flex items-center justify-center">
                      <benefit.icon className="h-5 w-5 text-[#14ad9f]" />
                    </div>
                    <span className="text-gray-700">{benefit.text}</span>
                  </div>
                ))}
              </div>
              
              <div className="mt-8 pt-8 border-t border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="text-sm text-[#14ad9f] hover:text-teal-700 flex items-center gap-2"
                  >
                    <Info className="h-4 w-4" />
                    Registrierungsschritte anzeigen
                  </button>
                </div>
                <ProgressBar currentStep={1} totalSteps={5} />
                <p className="text-sm text-gray-500 mt-2">Schritt 1 von 5</p>
              </div>
            </div>
          </motion.div>

          {/* Right Side - Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-3"
          >
            <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
              {/* Mobile Progress */}
              <div className="lg:hidden mb-6">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-sm font-medium text-[#14ad9f]">Schritt 1 von 5</p>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="text-sm text-gray-500 hover:text-[#14ad9f] flex items-center gap-1"
                  >
                    <Info className="h-4 w-4" />
                  </button>
                </div>
                <ProgressBar currentStep={1} totalSteps={5} />
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Erzählen Sie uns von sich
              </h2>
              <p className="text-gray-600 mb-8">
                Bitte füllen Sie die folgenden Felder aus, um Ihr Konto zu erstellen.
              </p>

              <form onSubmit={e => { e.preventDefault(); handleNext(); }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Vorname */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="firstName">
                      Vorname
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      value={localFirstName}
                      onChange={e => setLocalFirstName(e.target.value)}
                      required
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent text-gray-900 bg-gray-50 transition-all"
                      placeholder="Max"
                    />
                  </div>

                  {/* Nachname */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="lastName">
                      Nachname
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      value={localLastName}
                      onChange={e => setLocalLastName(e.target.value)}
                      required
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent text-gray-900 bg-gray-50 transition-all"
                      placeholder="Mustermann"
                    />
                  </div>

                  {/* Geburtsdatum */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="dateOfBirth">
                      Geburtsdatum
                    </label>
                    <input
                      type="date"
                      id="dateOfBirth"
                      value={localDateOfBirth}
                      onChange={e => setLocalDateOfBirth(e.target.value)}
                      required
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent text-gray-900 bg-gray-50 transition-all"
                    />
                  </div>

                  {/* Telefonnummer */}
                  <div className="min-w-0">
                    <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="phoneNumber">
                      Telefonnummer
                    </label>
                    <div className="flex gap-2">
                      <select
                        className="w-20 shrink-0 px-2 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent text-gray-900 bg-gray-50 text-sm transition-all"
                        value={localPhoneCountryCode}
                        onChange={e => setLocalPhoneCountryCode(e.target.value)}
                      >
                        <option value="+49">+49</option>
                        <option value="+41">+41</option>
                        <option value="+43">+43</option>
                      </select>
                      <input
                        type="tel"
                        id="phoneNumber"
                        value={localPhoneNumber}
                        onChange={e => setLocalPhoneNumber(e.target.value)}
                        required
                        placeholder="123 456789"
                        className="flex-1 min-w-0 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent text-gray-900 bg-gray-50 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* E-Mail */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="email">
                    E-Mail-Adresse
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={localEmail}
                    onChange={e => setLocalEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent text-gray-900 bg-gray-50 transition-all"
                    placeholder="max@beispiel.de"
                  />
                </div>

                {/* Passwort */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="password">
                    Passwort
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      value={localPassword}
                      onChange={e => setLocalPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent text-gray-900 bg-gray-50 transition-all"
                      placeholder="Mindestens 8 Zeichen"
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

                {/* Passwort bestätigen */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="confirmPassword">
                    Passwort bestätigen
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      id="confirmPassword"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent text-gray-900 bg-gray-50 transition-all"
                      placeholder="Passwort wiederholen"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {/* Checkboxen */}
                <div className="mt-6 space-y-4">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="relative mt-0.5">
                      <input
                        type="checkbox"
                        checked={agreeTerms}
                        onChange={e => setAgreeTerms(e.target.checked)}
                        className="peer sr-only"
                      />
                      <div className="w-5 h-5 border-2 border-gray-300 rounded-md peer-checked:border-[#14ad9f] peer-checked:bg-[#14ad9f] transition-all flex items-center justify-center">
                        {agreeTerms && <Check className="h-3 w-3 text-white" />}
                      </div>
                    </div>
                    <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                      Ich stimme den{' '}
                      <Link href="/terms" className="text-[#14ad9f] hover:underline">
                        Allgemeinen Geschäftsbedingungen
                      </Link>{' '}
                      und der{' '}
                      <Link href="/privacy" className="text-[#14ad9f] hover:underline">
                        Datenschutzerklärung
                      </Link>{' '}
                      zu.
                    </span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="relative mt-0.5">
                      <input
                        type="checkbox"
                        checked={localIsSoleOwner}
                        onChange={e => setLocalIsSoleOwner(e.target.checked)}
                        className="peer sr-only"
                      />
                      <div className="w-5 h-5 border-2 border-gray-300 rounded-md peer-checked:border-[#14ad9f] peer-checked:bg-[#14ad9f] transition-all flex items-center justify-center">
                        {localIsSoleOwner && <Check className="h-3 w-3 text-white" />}
                      </div>
                    </div>
                    <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                      Ich bin alleiniger Inhaber und vertretungsberechtigt.
                    </span>
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={!isFormValid()}
                  className="w-full mt-8 px-6 py-4 bg-[#14ad9f] text-white font-semibold rounded-xl hover:bg-teal-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:ring-offset-2"
                >
                  Weiter zu Schritt 2
                </button>

                {/* Login Link */}
                <p className="mt-6 text-center text-sm text-gray-600">
                  Bereits registriert?{' '}
                  <Link href="/login" className="text-[#14ad9f] hover:underline font-medium">
                    Jetzt anmelden
                  </Link>
                </p>
              </form>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Modal für Schritte */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-6 sm:p-8 rounded-2xl shadow-2xl w-full max-w-md"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                Registrierungsschritte
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4">
              {steps.map((step, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    index === 0 
                      ? 'bg-[#14ad9f] text-white' 
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                    {index < 1 ? <Check className="h-4 w-4" /> : index + 1}
                  </div>
                  <p className={`text-base ${index === 0 ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                    {step}
                  </p>
                </div>
              ))}
            </div>
            <button
              onClick={() => setIsModalOpen(false)}
              className="w-full mt-8 py-3 bg-[#14ad9f] text-white rounded-xl hover:bg-teal-600 transition-colors font-semibold"
            >
              Verstanden
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
