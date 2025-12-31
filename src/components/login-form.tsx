// /Users/andystaudinger/taskilo/src/components/login-form.tsx
'use client'; // Annahme: Dies ist eine Client-Komponente, wenn sie Hooks wie useState verwendet oder Event-Handler hat.

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'; // Fehlende Imports hinzugefügt
import { Input } from '@/components/ui/input'; // Fehlender Import hinzugefügt
import { Label } from '@/components/ui/label'; // Fehlender Import hinzugefügt
import React, { useState } from 'react'; // Import für React und Typen wie React.FormEvent
import { Eye, EyeOff } from 'lucide-react';

interface LoginFormProps extends React.ComponentProps<'div'> {
  email?: string;
  onEmailChange?: (value: string) => void;
  password?: string;
  onPasswordChange?: (value: string) => void;
  onSubmitEmailPassword: (event: React.FormEvent<HTMLFormElement>) => void;
  onGoogleLogin: () => void;
  onAppleLogin: () => void;
  disabled?: boolean;
  authMode?: 'signin' | 'signup';
}

export function LoginForm({
  className,
  email,
  onEmailChange,
  password,
  onPasswordChange,
  onSubmitEmailPassword,
  onGoogleLogin,
  onAppleLogin,
  disabled,
  authMode = 'signin',
  ...props
}: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className={cn('flex flex-col gap-4', className)} {...props}>
      <Card className="border-0 shadow-none">
        <CardContent className="p-0">
          <form onSubmit={onSubmitEmailPassword}>
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="w-full gap-2 h-10"
                  type="button"
                  onClick={onGoogleLogin}
                  disabled={disabled}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4">
                    <path
                      d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                      fill="currentColor"
                    />
                  </svg>
                  Mit Google
                </Button>
                <Button
                  variant="outline"
                  className="w-full gap-2 h-10"
                  type="button"
                  onClick={onAppleLogin}
                  disabled={disabled}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4">
                    <path
                      d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"
                      fill="currentColor"
                    />
                  </svg>
                  Apple
                </Button>
              </div>
              <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
                <span className="bg-white text-muted-foreground relative z-10 px-2 text-xs">ODER</span>
              </div>
              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="email" className="text-sm">E-Mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="E-Mail-Adresse"
                    required
                    autoComplete="email"
                    value={email || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      onEmailChange?.(e.target.value)
                    }
                    className="h-10"
                  />
                </div>
                <div className="grid gap-1.5">
                  <div className="flex items-center">
                    <Label htmlFor="password" className="text-sm">Passwort</Label>
                    {authMode === 'signin' && (
                      <a
                        href="/forgot-password"
                        className="ml-auto text-xs text-[#14ad9f] underline-offset-4 hover:underline"
                      >
                        Passwort vergessen?
                      </a>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={authMode === 'signup' ? 6 : undefined}
                      placeholder={authMode === 'signup' ? 'Mind. 6 Zeichen' : ''}
                      value={password || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        onPasswordChange?.(e.target.value)
                      }
                      className="pr-10 h-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-[#14ad9f] hover:bg-teal-600 font-medium h-10 mt-1"
                  disabled={disabled}
                >
                  {authMode === 'signup' ? 'Konto erstellen' : 'Anmelden'}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
