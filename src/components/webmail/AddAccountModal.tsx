'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { X, Mail, Lock, Loader2, Eye, EyeOff, AlertCircle, CheckCircle, Building2, User, ArrowLeft } from 'lucide-react';
import { addAccount, isAccountLinked, getCurrentAccount } from '@/lib/webmail-multi-session';

type ModalView = 'options' | 'login';

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
  const modalRef = useRef<HTMLDivElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  // Focus Email-Input wenn Modal öffnet
  useEffect(() => {
    if (isOpen && emailInputRef.current) {
      setTimeout(() => emailInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Reset State wenn Modal öffnet/schließt
  useEffect(() => {
    if (!isOpen) {
      // Reset beim Schließen
      setPassword('');
      setError(null);
      setSuccess(false);
      setShowPassword(false);
    } else {
      // Beim Öffnen: Email auf initialEmail setzen (oder leer wenn undefined)
      setEmail(initialEmail || '');
      setPassword('');
      setError(null);
      setSuccess(false);
      // Wenn initialEmail vorhanden, direkt zum Login, sonst Optionen zeigen
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

    // Prüfen ob Account bereits verknüpft
    if (isAccountLinked(email)) {
      setError('Dieses Konto ist bereits verknüpft');
      return;
    }

    // Prüfen ob es der aktuelle Account ist
    const currentAccount = getCurrentAccount();
    if (currentAccount?.email === email) {
      setError('Du bist bereits mit diesem Konto angemeldet');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // IMAP-Login testen
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
        // Account zur Multi-Session hinzufügen
        addAccount({
          email,
          password,
          name: email.split('@')[0],
        });

        // Bidirektionale Verknüpfung im Backend
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
            // Verknüpfung fehlgeschlagen, aber Account wurde lokal hinzugefügt
          }
        }

        setSuccess(true);
        
        // Nach kurzer Verzögerung Callback aufrufen
        setTimeout(() => {
          onAccountAdded(email);
          onClose();
        }, 1000);
      } else {
        setError(data.error || 'Anmeldung fehlgeschlagen. Bitte Zugangsdaten prüfen.');
      }
    } catch {
      setError('Netzwerkfehler. Bitte erneut versuchen.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      
      {/* Modal */}
      <div
        ref={modalRef}
        className={cn(
          "relative w-full max-w-md mx-4 rounded-2xl shadow-2xl overflow-hidden",
          isDark ? "bg-[#2d2e30]" : "bg-white"
        )}
      >
        {/* Header */}
        <div className={cn(
          "flex items-center justify-between px-6 py-4 border-b",
          isDark ? "border-gray-600/50" : "border-gray-200"
        )}>
          <div className="flex items-center gap-3">
            {view === 'login' && !initialEmail && (
              <button
                onClick={() => setView('options')}
                className={cn(
                  "p-1.5 rounded-full transition-colors",
                  isDark ? "hover:bg-white/10 text-gray-300" : "hover:bg-gray-100 text-gray-500"
                )}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h2 className={cn(
              "text-lg font-semibold",
              isDark ? "text-white" : "text-gray-900"
            )}>
              {view === 'options' ? 'Konto hinzufügen' : 'Anmelden'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className={cn(
              "p-2 rounded-full transition-colors",
              isDark ? "hover:bg-white/10 text-gray-300" : "hover:bg-gray-100 text-gray-500"
            )}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {success ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className={cn(
                "text-lg font-semibold mb-2",
                isDark ? "text-white" : "text-gray-900"
              )}>
                Konto hinzugefügt!
              </h3>
              <p className={cn(
                "text-sm",
                isDark ? "text-gray-400" : "text-gray-600"
              )}>
                {email} wurde erfolgreich verknüpft.
              </p>
            </div>
          ) : view === 'options' ? (
            /* Options View - Auswahl zwischen Login, Business, Personal */
            <div className="space-y-3">
              <p className={cn(
                "text-sm mb-4",
                isDark ? "text-gray-400" : "text-gray-600"
              )}>
                Wähle eine Option:
              </p>

              {/* Bestehendes Konto hinzufügen */}
              <button
                onClick={() => setView('login')}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left",
                  isDark 
                    ? "border-gray-600 hover:border-[#8ab4f8] hover:bg-white/5" 
                    : "border-gray-200 hover:border-[#14ad9f] hover:bg-gray-50"
                )}
              >
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center shrink-0",
                  isDark ? "bg-[#8ab4f8]/20" : "bg-[#14ad9f]/10"
                )}>
                  <Mail className={cn("w-6 h-6", isDark ? "text-[#8ab4f8]" : "text-[#14ad9f]")} />
                </div>
                <div>
                  <h3 className={cn(
                    "font-semibold",
                    isDark ? "text-white" : "text-gray-900"
                  )}>
                    Bestehendes Konto hinzufügen
                  </h3>
                  <p className={cn(
                    "text-sm",
                    isDark ? "text-gray-400" : "text-gray-500"
                  )}>
                    Mit einem vorhandenen Taskilo Webmail Konto anmelden
                  </p>
                </div>
              </button>

              {/* Neuen Business Workspace erstellen */}
              <button
                onClick={() => {
                  onClose();
                  router.push('/webmail/register/business');
                }}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left",
                  isDark 
                    ? "border-gray-600 hover:border-[#8ab4f8] hover:bg-white/5" 
                    : "border-gray-200 hover:border-[#14ad9f] hover:bg-gray-50"
                )}
              >
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center shrink-0",
                  isDark ? "bg-amber-500/20" : "bg-amber-100"
                )}>
                  <Building2 className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h3 className={cn(
                    "font-semibold",
                    isDark ? "text-white" : "text-gray-900"
                  )}>
                    Business Workspace erstellen
                  </h3>
                  <p className={cn(
                    "text-sm",
                    isDark ? "text-gray-400" : "text-gray-500"
                  )}>
                    Eigene Domain nutzen (z.B. name@deine-firma.de)
                  </p>
                </div>
              </button>

              {/* Neues persönliches Konto erstellen */}
              <button
                onClick={() => {
                  onClose();
                  router.push('/webmail/register');
                }}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left",
                  isDark 
                    ? "border-gray-600 hover:border-[#8ab4f8] hover:bg-white/5" 
                    : "border-gray-200 hover:border-[#14ad9f] hover:bg-gray-50"
                )}
              >
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center shrink-0",
                  isDark ? "bg-blue-500/20" : "bg-blue-100"
                )}>
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className={cn(
                    "font-semibold",
                    isDark ? "text-white" : "text-gray-900"
                  )}>
                    Persönliches Konto erstellen
                  </h3>
                  <p className={cn(
                    "text-sm",
                    isDark ? "text-gray-400" : "text-gray-500"
                  )}>
                    Kostenloses @taskilo.de Konto anlegen
                  </p>
                </div>
              </button>
            </div>
          ) : (
            /* Login View */
            <>
              <p className={cn(
                "text-sm mb-6",
                isDark ? "text-gray-400" : "text-gray-600"
              )}>
                Melde dich mit einem bestehenden Taskilo Webmail Konto an, um es zu verknüpfen.
              </p>

              {error && (
                <div className={cn(
                  "flex items-center gap-2 p-3 rounded-lg mb-4",
                  "bg-red-50 text-red-700 border border-red-200"
                )}>
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* E-Mail */}
                <div>
                  <label className={cn(
                    "block text-sm font-medium mb-1.5",
                    isDark ? "text-gray-300" : "text-gray-700"
                  )}>
                    E-Mail-Adresse
                  </label>
                  <div className={cn(
                    "flex items-center rounded-lg border transition-colors",
                    isDark 
                      ? "bg-[#3c4043] border-gray-600 focus-within:border-[#8ab4f8]" 
                      : "bg-white border-gray-300 focus-within:border-[#14ad9f] focus-within:ring-2 focus-within:ring-[#14ad9f]/20"
                  )}>
                    <span className={cn(
                      "pl-3",
                      isDark ? "text-gray-400" : "text-gray-500"
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
                        "flex-1 px-3 py-3 bg-transparent outline-none text-sm",
                        isDark ? "text-white placeholder:text-gray-500" : "text-gray-900 placeholder:text-gray-400"
                      )}
                      autoComplete="email"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Passwort */}
                <div>
                  <label className={cn(
                    "block text-sm font-medium mb-1.5",
                    isDark ? "text-gray-300" : "text-gray-700"
                  )}>
                    Passwort
                  </label>
                  <div className={cn(
                    "flex items-center rounded-lg border transition-colors",
                    isDark 
                      ? "bg-[#3c4043] border-gray-600 focus-within:border-[#8ab4f8]" 
                      : "bg-white border-gray-300 focus-within:border-[#14ad9f] focus-within:ring-2 focus-within:ring-[#14ad9f]/20"
                  )}>
                    <span className={cn(
                      "pl-3",
                      isDark ? "text-gray-400" : "text-gray-500"
                    )}>
                      <Lock className="w-5 h-5" />
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Passwort eingeben"
                      className={cn(
                        "flex-1 px-3 py-3 bg-transparent outline-none text-sm",
                        isDark ? "text-white placeholder:text-gray-500" : "text-gray-900 placeholder:text-gray-400"
                      )}
                      autoComplete="current-password"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={cn(
                        "pr-3 transition-colors",
                        isDark ? "text-gray-400 hover:text-gray-200" : "text-gray-500 hover:text-gray-700"
                      )}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading || !email || !password}
                  className={cn(
                    "w-full py-3 rounded-lg font-semibold text-white transition-all",
                    "bg-[#14ad9f] hover:bg-teal-700",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "flex items-center justify-center gap-2"
                  )}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Wird angemeldet...
                    </>
                  ) : (
                    'Konto verknüpfen'
                  )}
                </button>
              </form>

              {/* Hinweis - nur wenn von Options-View gekommen */}
              {!initialEmail && (
                <p className={cn(
                  "text-xs text-center mt-4",
                  isDark ? "text-gray-500" : "text-gray-400"
                )}>
                  Neues Konto erstellen?{' '}
                  <button 
                    type="button"
                    onClick={() => setView('options')}
                    className="text-[#14ad9f] hover:underline"
                  >
                    Zurück zu Optionen
                  </button>
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
