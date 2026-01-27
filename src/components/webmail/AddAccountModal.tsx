'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { X, Mail, Lock, Loader2, Eye, EyeOff, AlertCircle, CheckCircle, ArrowLeft, Sparkles } from 'lucide-react';
import { addAccount, isAccountLinked, getCurrentAccount } from '@/lib/webmail-multi-session';

type ModalView = 'options' | 'login';

// SVG Illustrationen für die Optionen
const ExistingAccountIllustration = () => (
  <svg viewBox="0 0 120 90" className="w-full h-full">
    {/* Hintergrund Gradient */}
    <defs>
      <linearGradient id="existingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#14ad9f" stopOpacity="0.2" />
        <stop offset="100%" stopColor="#0d8a7f" stopOpacity="0.1" />
      </linearGradient>
      <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#f0fdf4" />
      </linearGradient>
    </defs>
    {/* Hintergrund Kreis */}
    <circle cx="60" cy="45" r="40" fill="url(#existingGrad)" />
    {/* E-Mail Karte */}
    <g transform="translate(30, 20)">
      <rect x="0" y="5" width="60" height="45" rx="6" fill="url(#cardGrad)" stroke="#14ad9f" strokeWidth="1.5" />
      <path d="M5 15 L30 32 L55 15" fill="none" stroke="#14ad9f" strokeWidth="2" strokeLinecap="round" />
      <circle cx="48" cy="40" r="12" fill="#14ad9f" />
      <path d="M44 40 L47 43 L53 37" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </g>
    {/* Pfeil */}
    <path d="M75 70 L85 70 M82 67 L85 70 L82 73" fill="none" stroke="#14ad9f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const BusinessWorkspaceIllustration = () => (
  <svg viewBox="0 0 120 90" className="w-full h-full">
    <defs>
      <linearGradient id="businessGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.2" />
        <stop offset="100%" stopColor="#d97706" stopOpacity="0.1" />
      </linearGradient>
    </defs>
    {/* Hintergrund */}
    <circle cx="60" cy="45" r="40" fill="url(#businessGrad)" />
    {/* Gebäude */}
    <g transform="translate(25, 15)">
      {/* Hauptgebäude */}
      <rect x="20" y="20" width="30" height="45" rx="3" fill="white" stroke="#f59e0b" strokeWidth="1.5" />
      {/* Fenster */}
      <rect x="25" y="26" width="8" height="8" rx="1" fill="#fef3c7" stroke="#f59e0b" strokeWidth="0.5" />
      <rect x="37" y="26" width="8" height="8" rx="1" fill="#fef3c7" stroke="#f59e0b" strokeWidth="0.5" />
      <rect x="25" y="38" width="8" height="8" rx="1" fill="#fef3c7" stroke="#f59e0b" strokeWidth="0.5" />
      <rect x="37" y="38" width="8" height="8" rx="1" fill="#fef3c7" stroke="#f59e0b" strokeWidth="0.5" />
      {/* Tür */}
      <rect x="30" y="52" width="10" height="13" rx="2" fill="#f59e0b" />
      {/* Dach */}
      <path d="M18 22 L35 8 L52 22" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* @ Symbol */}
      <circle cx="55" cy="15" r="10" fill="#f59e0b" />
      <text x="55" y="19" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">@</text>
    </g>
  </svg>
);

const PersonalAccountIllustration = () => (
  <svg viewBox="0 0 120 90" className="w-full h-full">
    <defs>
      <linearGradient id="personalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
        <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.1" />
      </linearGradient>
      <linearGradient id="avatarGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#60a5fa" />
        <stop offset="100%" stopColor="#3b82f6" />
      </linearGradient>
    </defs>
    {/* Hintergrund */}
    <circle cx="60" cy="45" r="40" fill="url(#personalGrad)" />
    {/* Avatar */}
    <circle cx="60" cy="35" r="18" fill="url(#avatarGrad)" />
    <circle cx="60" cy="30" r="8" fill="white" />
    <ellipse cx="60" cy="48" rx="12" ry="8" fill="white" />
    {/* Stern / Sparkle */}
    <g transform="translate(78, 22)">
      <path d="M6 0 L7.5 4 L12 4.5 L8.5 7.5 L9.5 12 L6 9.5 L2.5 12 L3.5 7.5 L0 4.5 L4.5 4 Z" fill="#3b82f6" />
    </g>
    {/* taskilo.de Badge */}
    <g transform="translate(30, 60)">
      <rect x="0" y="0" width="60" height="20" rx="10" fill="#3b82f6" />
      <text x="30" y="14" textAnchor="middle" fill="white" fontSize="9" fontWeight="600">@taskilo.de</text>
    </g>
  </svg>
);

const SuccessIllustration = () => (
  <svg viewBox="0 0 120 120" className="w-full h-full">
    <defs>
      <linearGradient id="successGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
        <stop offset="100%" stopColor="#059669" stopOpacity="0.1" />
      </linearGradient>
    </defs>
    <circle cx="60" cy="60" r="50" fill="url(#successGrad)" />
    <motion.circle 
      cx="60" cy="60" r="35" 
      fill="#10b981"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", duration: 0.5, delay: 0.2 }}
    />
    <motion.path 
      d="M45 60 L55 70 L78 47" 
      fill="none" 
      stroke="white" 
      strokeWidth="5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.4, delay: 0.5 }}
    />
  </svg>
);

interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountAdded: (email: string) => void;
  isDark?: boolean;
  initialEmail?: string;
}

export function AddAccountModal({
  isOpen,
  onClose,
  onAccountAdded,
  isDark = false,
  initialEmail,
}: AddAccountModalProps) {
  const router = useRouter();
  const [view, setView] = useState<ModalView>(initialEmail ? 'login' : 'options');
  const [email, setEmail] = useState(initialEmail || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [hoveredOption, setHoveredOption] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  // Focus Email-Input wenn Modal öffnet
  useEffect(() => {
    if (isOpen && view === 'login' && emailInputRef.current) {
      setTimeout(() => emailInputRef.current?.focus(), 100);
    }
  }, [isOpen, view]);

  // Reset State wenn Modal öffnet/schließt
  useEffect(() => {
    if (!isOpen) {
      setPassword('');
      setError(null);
      setSuccess(false);
      setShowPassword(false);
      setHoveredOption(null);
    } else {
      setEmail(initialEmail || '');
      setPassword('');
      setError(null);
      setSuccess(false);
      setView(initialEmail ? 'login' : 'options');
    }
  }, [isOpen, initialEmail]);

  // Klick außerhalb schließt Modal
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Bitte E-Mail und Passwort eingeben');
      return;
    }

    if (isAccountLinked(email)) {
      setError('Dieses Konto ist bereits verknüpft');
      return;
    }

    const currentAccount = getCurrentAccount();
    if (currentAccount?.email === email) {
      setError('Du bist bereits mit diesem Konto angemeldet');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/webmail/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          imapHost: 'mail.taskilo.de',
          imapPort: 993,
        }),
      });

      const data = await response.json();

      if (data.success) {
        addAccount({
          email,
          password,
          name: email.split('@')[0],
        });

        if (currentAccount) {
          try {
            await fetch(`/api/webmail/link-accounts`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                primaryEmail: currentAccount.email,
                linkedEmail: email,
              }),
            });
          } catch {
            // Verknüpfung fehlgeschlagen
          }
        }

        setSuccess(true);
        
        setTimeout(() => {
          onAccountAdded(email);
          onClose();
        }, 1500);
      } else {
        setError(data.error || 'Anmeldung fehlgeschlagen. Bitte Zugangsdaten prüfen.');
      }
    } catch {
      setError('Netzwerkfehler. Bitte erneut versuchen.');
    } finally {
      setIsLoading(false);
    }
  };

  const optionVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.3,
        ease: "easeOut" as const
      }
    }),
    hover: {
      scale: 1.02,
      transition: { duration: 0.2 }
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div 
          className="absolute inset-0 bg-black/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />
        
        {/* Modal */}
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", duration: 0.5 }}
          className={cn(
            "relative w-full max-w-lg mx-4 rounded-3xl shadow-2xl overflow-hidden",
            isDark 
              ? "bg-gradient-to-b from-[#2d2e30] to-[#1f2022]" 
              : "bg-gradient-to-b from-white to-gray-50/80"
          )}
        >
          {/* Header mit Gradient */}
          <div className={cn(
            "relative px-6 py-5 border-b",
            isDark ? "border-gray-700/50" : "border-gray-100"
          )}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {view === 'login' && !initialEmail && (
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setView('options')}
                    className={cn(
                      "p-2 rounded-xl transition-colors",
                      isDark ? "hover:bg-white/10 text-gray-300" : "hover:bg-gray-100 text-gray-500"
                    )}
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </motion.button>
                )}
                <div>
                  <h2 className={cn(
                    "text-xl font-bold",
                    isDark ? "text-white" : "text-gray-900"
                  )}>
                    {success ? 'Erfolgreich!' : view === 'options' ? 'Konto hinzufügen' : 'Anmelden'}
                  </h2>
                  {!success && (
                    <p className={cn(
                      "text-sm mt-0.5",
                      isDark ? "text-gray-400" : "text-gray-500"
                    )}>
                      {view === 'options' ? 'Wähle eine Option' : 'Mit Taskilo Webmail anmelden'}
                    </p>
                  )}
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className={cn(
                  "p-2 rounded-xl transition-colors",
                  isDark ? "hover:bg-white/10 text-gray-300" : "hover:bg-gray-100 text-gray-500"
                )}
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <AnimatePresence mode="wait">
              {success ? (
                /* Success View */
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-6"
                >
                  <div className="w-32 h-32 mx-auto mb-6">
                    <SuccessIllustration />
                  </div>
                  <motion.h3
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className={cn(
                      "text-xl font-bold mb-2",
                      isDark ? "text-white" : "text-gray-900"
                    )}
                  >
                    Konto verbunden!
                  </motion.h3>
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className={cn(
                      "text-sm",
                      isDark ? "text-gray-400" : "text-gray-600"
                    )}
                  >
                    {email} wurde erfolgreich verknüpft.
                  </motion.p>
                </motion.div>
              ) : view === 'options' ? (
                /* Options View */
                <motion.div
                  key="options"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  {/* Option 1: Bestehendes Konto */}
                  <motion.button
                    custom={0}
                    variants={optionVariants}
                    initial="hidden"
                    animate="visible"
                    whileHover="hover"
                    onHoverStart={() => setHoveredOption('existing')}
                    onHoverEnd={() => setHoveredOption(null)}
                    onClick={() => setView('login')}
                    className={cn(
                      "w-full flex items-center gap-5 p-5 rounded-2xl border-2 transition-all text-left group",
                      isDark 
                        ? "border-gray-700 hover:border-[#14ad9f] bg-gray-800/50 hover:bg-gray-800" 
                        : "border-gray-200 hover:border-[#14ad9f] bg-white hover:bg-[#14ad9f]/5 hover:shadow-lg hover:shadow-[#14ad9f]/10"
                    )}
                  >
                    <div className={cn(
                      "w-20 h-16 rounded-xl overflow-hidden shrink-0 transition-transform",
                      hoveredOption === 'existing' && "scale-110"
                    )}>
                      <ExistingAccountIllustration />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={cn(
                        "font-bold text-lg",
                        isDark ? "text-white" : "text-gray-900"
                      )}>
                        Bestehendes Konto
                      </h3>
                      <p className={cn(
                        "text-sm",
                        isDark ? "text-gray-400" : "text-gray-500"
                      )}>
                        Mit vorhandenem Taskilo Webmail anmelden
                      </p>
                    </div>
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center transition-all shrink-0",
                      hoveredOption === 'existing'
                        ? "bg-[#14ad9f] text-white"
                        : isDark ? "bg-gray-700 text-gray-400" : "bg-gray-100 text-gray-400"
                    )}>
                      <Mail className="w-5 h-5" />
                    </div>
                  </motion.button>

                  {/* Divider mit "oder" */}
                  <div className="flex items-center gap-4 py-3">
                    <div className={cn("flex-1 h-px", isDark ? "bg-gray-600" : "bg-gray-300")} />
                    <span className={cn("text-sm font-semibold uppercase tracking-wider", isDark ? "text-gray-300" : "text-gray-600")}>
                      oder neu erstellen
                    </span>
                    <div className={cn("flex-1 h-px", isDark ? "bg-gray-600" : "bg-gray-300")} />
                  </div>

                  {/* Option 2: Business Workspace */}
                  <motion.button
                    custom={1}
                    variants={optionVariants}
                    initial="hidden"
                    animate="visible"
                    whileHover="hover"
                    onHoverStart={() => setHoveredOption('business')}
                    onHoverEnd={() => setHoveredOption(null)}
                    onClick={() => {
                      onClose();
                      router.push('/webmail/register/business');
                    }}
                    className={cn(
                      "w-full flex items-center gap-5 p-5 rounded-2xl border-2 transition-all text-left group relative overflow-hidden",
                      isDark 
                        ? "border-gray-700 hover:border-amber-500 bg-gray-800/50 hover:bg-gray-800" 
                        : "border-gray-200 hover:border-amber-500 bg-white hover:bg-amber-50/50 hover:shadow-lg hover:shadow-amber-500/10"
                    )}
                  >
                    {/* Pro Badge */}
                    <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold">
                      <Sparkles className="w-3 h-3" />
                      PRO
                    </div>
                    <div className={cn(
                      "w-20 h-16 rounded-xl overflow-hidden shrink-0 transition-transform",
                      hoveredOption === 'business' && "scale-110"
                    )}>
                      <BusinessWorkspaceIllustration />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={cn(
                        "font-bold text-lg",
                        isDark ? "text-white" : "text-gray-900"
                      )}>
                        Business Workspace
                      </h3>
                      <p className={cn(
                        "text-sm",
                        isDark ? "text-gray-400" : "text-gray-500"
                      )}>
                        Eigene Domain nutzen (name@firma.de)
                      </p>
                    </div>
                  </motion.button>

                  {/* Option 3: Persönliches Konto */}
                  <motion.button
                    custom={2}
                    variants={optionVariants}
                    initial="hidden"
                    animate="visible"
                    whileHover="hover"
                    onHoverStart={() => setHoveredOption('personal')}
                    onHoverEnd={() => setHoveredOption(null)}
                    onClick={() => {
                      onClose();
                      router.push('/webmail/register');
                    }}
                    className={cn(
                      "w-full flex items-center gap-5 p-5 rounded-2xl border-2 transition-all text-left group",
                      isDark 
                        ? "border-gray-700 hover:border-blue-500 bg-gray-800/50 hover:bg-gray-800" 
                        : "border-gray-200 hover:border-blue-500 bg-white hover:bg-blue-50/50 hover:shadow-lg hover:shadow-blue-500/10"
                    )}
                  >
                    <div className={cn(
                      "w-20 h-16 rounded-xl overflow-hidden shrink-0 transition-transform",
                      hoveredOption === 'personal' && "scale-110"
                    )}>
                      <PersonalAccountIllustration />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={cn(
                        "font-bold text-lg",
                        isDark ? "text-white" : "text-gray-900"
                      )}>
                        Persönliches Konto
                      </h3>
                      <p className={cn(
                        "text-sm",
                        isDark ? "text-gray-400" : "text-gray-500"
                      )}>
                        Kostenloses @taskilo.de Konto
                      </p>
                    </div>
                    <div className={cn(
                      "px-3 py-1 rounded-full text-xs font-bold shrink-0",
                      isDark ? "bg-green-500/20 text-green-400" : "bg-green-100 text-green-700"
                    )}>
                      GRATIS
                    </div>
                  </motion.button>
                </motion.div>
              ) : (
                /* Login View */
                <motion.div
                  key="login"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-xl mb-5",
                        "bg-red-50 text-red-700 border border-red-200"
                      )}
                    >
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      <span className="text-sm font-medium">{error}</span>
                    </motion.div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* E-Mail Input */}
                    <div>
                      <label className={cn(
                        "block text-sm font-semibold mb-2",
                        isDark ? "text-gray-300" : "text-gray-700"
                      )}>
                        E-Mail-Adresse
                      </label>
                      <div className={cn(
                        "flex items-center rounded-xl border-2 transition-all",
                        isDark 
                          ? "bg-gray-800 border-gray-700 focus-within:border-[#14ad9f]" 
                          : "bg-white border-gray-200 focus-within:border-[#14ad9f] focus-within:shadow-lg focus-within:shadow-[#14ad9f]/10"
                      )}>
                        <span className={cn(
                          "pl-4",
                          isDark ? "text-gray-500" : "text-gray-400"
                        )}>
                          <Mail className="w-5 h-5" />
                        </span>
                        <input
                          ref={emailInputRef}
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="name@domain.de"
                          className={cn(
                            "flex-1 px-4 py-3.5 bg-transparent outline-none text-sm",
                            isDark ? "text-white placeholder:text-gray-500" : "text-gray-900 placeholder:text-gray-400"
                          )}
                          autoComplete="email"
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    {/* Passwort Input */}
                    <div>
                      <label className={cn(
                        "block text-sm font-semibold mb-2",
                        isDark ? "text-gray-300" : "text-gray-700"
                      )}>
                        Passwort
                      </label>
                      <div className={cn(
                        "flex items-center rounded-xl border-2 transition-all",
                        isDark 
                          ? "bg-gray-800 border-gray-700 focus-within:border-[#14ad9f]" 
                          : "bg-white border-gray-200 focus-within:border-[#14ad9f] focus-within:shadow-lg focus-within:shadow-[#14ad9f]/10"
                      )}>
                        <span className={cn(
                          "pl-4",
                          isDark ? "text-gray-500" : "text-gray-400"
                        )}>
                          <Lock className="w-5 h-5" />
                        </span>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Passwort eingeben"
                          className={cn(
                            "flex-1 px-4 py-3.5 bg-transparent outline-none text-sm",
                            isDark ? "text-white placeholder:text-gray-500" : "text-gray-900 placeholder:text-gray-400"
                          )}
                          autoComplete="current-password"
                          disabled={isLoading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className={cn(
                            "pr-4 transition-colors",
                            isDark ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"
                          )}
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <motion.button
                      type="submit"
                      disabled={isLoading || !email || !password}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        "w-full py-4 rounded-xl font-bold text-white transition-all",
                        "bg-gradient-to-r from-[#14ad9f] to-teal-600 hover:from-teal-600 hover:to-[#14ad9f]",
                        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
                        "flex items-center justify-center gap-2 shadow-lg shadow-[#14ad9f]/25"
                      )}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Wird angemeldet...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5" />
                          Konto verknüpfen
                        </>
                      )}
                    </motion.button>
                  </form>

                  {/* Zurück-Link */}
                  {!initialEmail && (
                    <p className={cn(
                      "text-sm text-center mt-5",
                      isDark ? "text-gray-500" : "text-gray-400"
                    )}>
                      Neues Konto erstellen?{' '}
                      <button 
                        type="button"
                        onClick={() => setView('options')}
                        className="text-[#14ad9f] font-semibold hover:underline"
                      >
                        Zurück zu Optionen
                      </button>
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
