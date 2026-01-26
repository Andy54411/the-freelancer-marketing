'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { X, Mail, Lock, Loader2, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { addAccount, isAccountLinked, getCurrentAccount } from '@/lib/webmail-multi-session';

interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountAdded: (email: string) => void;
  isDark?: boolean;
}

export function AddAccountModal({
  isOpen,
  onClose,
  onAccountAdded,
  isDark = false,
}: AddAccountModalProps) {
  const [email, setEmail] = useState('');
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

  // Reset State wenn Modal schließt
  useEffect(() => {
    if (!isOpen) {
      setEmail('');
      setPassword('');
      setError(null);
      setSuccess(false);
      setShowPassword(false);
    }
  }, [isOpen]);

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
          <h2 className={cn(
            "text-lg font-semibold",
            isDark ? "text-white" : "text-gray-900"
          )}>
            Konto hinzufügen
          </h2>
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
          ) : (
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

              {/* Hinweis */}
              <p className={cn(
                "text-xs text-center mt-4",
                isDark ? "text-gray-500" : "text-gray-400"
              )}>
                Noch kein Konto?{' '}
                <a 
                  href="/webmail/register" 
                  className="text-[#14ad9f] hover:underline"
                  onClick={onClose}
                >
                  Jetzt erstellen
                </a>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
