'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import Image from 'next/image';
import { z } from 'zod';

// Zod-Validierung
const usernameSchema = z.string()
  .min(3, 'Mindestens 3 Zeichen erforderlich')
  .max(64, 'Maximal 64 Zeichen erlaubt')
  .regex(/^[a-z0-9._-]+$/, 'Nur Kleinbuchstaben, Zahlen, Punkt, Unterstrich und Bindestrich erlaubt');

const passwordSchema = z.string()
  .min(8, 'Mindestens 8 Zeichen verwenden')
  .max(100, 'Maximal 100 Zeichen erlaubt');

function UsernameContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Daten aus vorherigen Schritten
  const company = searchParams.get('company') || '';
  const employees = searchParams.get('employees') || '';
  const region = searchParams.get('region') || 'Deutschland';
  const firstName = searchParams.get('firstName') || '';
  const lastName = searchParams.get('lastName') || '';
  const email = searchParams.get('email') || '';
  const domain = searchParams.get('domain') || '';
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptUpdates, setAcceptUpdates] = useState(false);
  const [acceptTeamEmails, setAcceptTeamEmails] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    username?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const validateForm = () => {
    const newErrors: typeof errors = {};

    // Username validieren
    const usernameValidation = usernameSchema.safeParse(username);
    if (!usernameValidation.success) {
      newErrors.username = usernameValidation.error.errors[0].message;
    }

    // Passwort validieren
    const passwordValidation = passwordSchema.safeParse(password);
    if (!passwordValidation.success) {
      newErrors.password = passwordValidation.error.errors[0].message;
    }

    // Passwort-Bestätigung prüfen
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwörter stimmen nicht überein';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = async () => {
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    // Hier würde die Registrierung stattfinden
    // Für jetzt nur weiterleiten
    const params = new URLSearchParams({
      company,
      employees,
      region,
      firstName,
      lastName,
      email,
      domain,
      username,
    });
    
    try {
      // TODO: API-Call für Registrierung
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simuliert API-Call
      
      router.push(`/webmail/register/business/checkout?${params.toString()}`);
    } catch (error) {
      console.error('Registration error:', error);
      setIsLoading(false);
    }
  };

  const isFormValid = username.trim() && password.trim() && confirmPassword.trim() && !Object.keys(errors).length;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Logo */}
      <div className="flex justify-center pt-12 mb-8">
        <Link href="/">
          <Image 
            src="/images/taskilo-logo-transparent.png" 
            alt="Taskilo" 
            width={140} 
            height={44}
            className="h-12 w-auto"
          />
        </Link>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex items-start justify-center px-6 pt-8">
        <div className="w-full max-w-xl">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="mb-8 p-3 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Zurück"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>

          {/* Title */}
          <h1 className="text-[32px] font-normal text-gray-900 mb-4 leading-tight">
            E-Mail-Adresse erstellen
          </h1>
          
          <p className="text-[15px] text-gray-700 leading-relaxed mb-8">
            Wählen Sie den ersten Teil Ihrer geschäftlichen E-Mail-Adresse bei <span className="font-medium">{domain || 'ihredomain.de'}</span>. Sie können diese E-Mail-Adresse für die Anmeldung und den Empfang von Nachrichten verwenden.
          </p>

          {/* Email/Username Input */}
          <div className="mb-6">
            <label htmlFor="username" className="block text-sm text-[#5f6368] mb-2">
              E-Mail-Adresse
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value.toLowerCase());
                    setErrors({ ...errors, username: undefined });
                  }}
                  onBlur={validateForm}
                  className={cn(
                    "w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] transition-all text-base",
                    errors.username ? "border-red-500" : "border-gray-300"
                  )}
                  placeholder="info"
                  maxLength={64}
                />
              </div>
              <span className="text-base text-gray-700 font-medium whitespace-nowrap">
                @{domain || 'ihredomain.de'}
              </span>
            </div>
            <div className="flex justify-between items-center mt-2">
              {errors.username ? (
                <p className="text-xs text-red-600">{errors.username}</p>
              ) : (
                <p className="text-xs text-[#5f6368]">
                  Nur Kleinbuchstaben, Zahlen, Punkt, Unterstrich und Bindestrich erlaubt
                </p>
              )}
              <p className="text-xs text-[#5f6368] ml-auto">
                {username.length}/64
              </p>
            </div>
          </div>

          {/* Password Input */}
          <div className="mb-6">
            <label htmlFor="password" className="block text-sm text-[#5f6368] mb-2">
              Passwort
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrors({ ...errors, password: undefined });
                }}
                onBlur={validateForm}
                className={cn(
                  "w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] transition-all text-base pr-12",
                  errors.password ? "border-red-500" : "border-gray-300"
                )}
                placeholder="Passwort"
                maxLength={100}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <div className="flex justify-between items-center mt-2">
              <p className="text-xs text-[#5f6368]">
                {errors.password || 'Mindestens 8 Zeichen verwenden'}
              </p>
              <p className="text-xs text-[#5f6368]">
                {password.length}/100
              </p>
            </div>
          </div>

          {/* Confirm Password Input */}
          <div className="mb-8">
            <label htmlFor="confirmPassword" className="block text-sm text-[#5f6368] mb-2">
              Passwort bestätigen
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setErrors({ ...errors, confirmPassword: undefined });
                }}
                onBlur={validateForm}
                className={cn(
                  "w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] transition-all text-base pr-12",
                  errors.confirmPassword ? "border-red-500" : "border-gray-300"
                )}
                placeholder="Passwort bestätigen"
                maxLength={100}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <div className="flex justify-between items-center mt-2">
              {errors.confirmPassword && (
                <p className="text-xs text-red-600">{errors.confirmPassword}</p>
              )}
              <p className="text-xs text-[#5f6368] ml-auto">
                {confirmPassword.length}/100
              </p>
            </div>
          </div>

          {/* Checkboxes */}
          <div className="space-y-4 mb-8">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptUpdates}
                onChange={(e) => setAcceptUpdates(e.target.checked)}
                className="mt-1 w-4 h-4 border-gray-300 rounded text-[#14ad9f] focus:ring-[#14ad9f]"
              />
              <span className="text-sm text-gray-700 leading-relaxed">
                Ich möchte Ankündigungen zu neuen Funktionen sowie Tipps, Angebote und Möglichkeiten zum Teilen von Feedback erhalten.
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptTeamEmails}
                onChange={(e) => setAcceptTeamEmails(e.target.checked)}
                className="mt-1 w-4 h-4 border-gray-300 rounded text-[#14ad9f] focus:ring-[#14ad9f]"
              />
              <span className="text-sm text-gray-700 leading-relaxed">
                Ich möchte meinen Teammitgliedern E-Mails zu Taskilo Webmail-Apps und -Funktionen sowie Tipps zur Produktivitätssteigerung mit Taskilo Webmail senden.
              </span>
            </label>
          </div>

          {/* Terms */}
          <p className="text-xs text-gray-600 mb-6 leading-relaxed">
            Indem Sie auf <span className="font-medium">Ich stimme zu – weiter</span> klicken, akzeptieren Sie die{' '}
            <Link href="/agb" className="text-[#14ad9f] hover:underline">
              Taskilo Nutzungsbedingungen
            </Link>{' '}
            und{' '}
            <Link href="/datenschutz" className="text-[#14ad9f] hover:underline">
              Ergänzende Nutzungsbedingungen für den kostenlosen Testzeitraum
            </Link>.
          </p>

          {/* Submit Button */}
          <button
            onClick={handleContinue}
            disabled={!isFormValid || isLoading}
            style={{ 
              backgroundColor: '#14ad9f',
              color: 'white',
              opacity: (isFormValid && !isLoading) ? 1 : 0.4
            }}
            className="px-6 py-3 rounded-full font-medium transition-all text-[14px] shadow-sm hover:shadow disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Wird verarbeitet...
              </span>
            ) : (
              'Ich stimme zu – Weiter'
            )}
          </button>
        </div>
      </main>
    </div>
  );
}

export default function UsernamePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#14ad9f]" />
      </div>
    }>
      <UsernameContent />
    </Suspense>
  );
}
