"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '../../../firebase/clients';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  User,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { FaGoogle, FaApple } from 'react-icons/fa';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user: User | null = userCredential.user;

      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          const userType = userData?.user_type;

          if (userType === 'firma') {
            router.push(`/dashboard/company/${user.uid}`);
          } else {
            router.push(`/dashboard/user/${user.uid}`);
          }
        } else {
          setError('Benutzerdaten nicht gefunden.');
        }
      }
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'code' in err) {
        const code = (err as { code: string }).code;
        if (code === 'auth/user-not-found') {
          setError('Benutzer nicht gefunden.');
        } else if (code === 'auth/wrong-password') {
          setError('Falsches Passwort.');
        } else {
          setError('Login fehlgeschlagen. Bitte versuche es später erneut.');
        }
      } else {
        setError('Login fehlgeschlagen. Bitte versuche es später erneut.');
      }
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const docSnap = await getDoc(doc(db, 'users', user.uid));
      const userData = docSnap.data();
      const userType = userData?.user_type;

      if (userType === 'firma') {
        router.push(`/dashboard/company/${user.uid}`);
      } else {
        router.push(`/dashboard/user/${user.uid}`);
      }
    } catch {
      setError('Google Login fehlgeschlagen.');
    }
  };

  const loginWithApple = async () => {
    const provider = new OAuthProvider('apple.com');
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const docSnap = await getDoc(doc(db, 'users', user.uid));
      const userData = docSnap.data();
      const userType = userData?.user_type;

      if (userType === 'firma') {
        router.push(`/dashboard/company/${user.uid}`);
      } else {
        router.push(`/dashboard/user/${user.uid}`);
      }
    } catch {
      setError('Apple Login fehlgeschlagen.');
    }
  };

  return (
    <main className="bg-gradient-to-r from-blue-100 to-teal-200 grid place-items-center min-h-screen mx-auto p-6 md:p-12">
      <div>
        <h1 className="text-3xl font-semibold text-center text-[#14ad9f]">Willkommen</h1>
      </div>

      <style>{`
        .glowing-border {
          border: 2px solid transparent;
          border-radius: 1px;
          padding: 1px;
          position: relative;
          animation: glowingBorder 1.5s infinite alternate;
          background-image: linear-gradient(white, white),
            linear-gradient(45deg, #14ad9f, #14ad9f);
          background-origin: border-box;
          background-clip: content-box, border-box;
        }

        @keyframes glowingBorder {
          0% {
            box-shadow: 0 0 5px #14ad9f, 0 0 1px #14ad9f, 0 0 10px #14ad9f;
          }
          100% {
            box-shadow: 0 0 30px #14ad9f, 0 0 10px #14ad9f, 0 0 70px #14ad9f;
          }
        }
      `}</style>

      <Card className="w-full max-w-lg bg-white glowing-border p-6">
        <CardHeader className="text-center py-4">
          <CardTitle className="text-xl font-semibold text-[#14ad9f]">Willkommen zurück bei TASKO</CardTitle>
          <CardDescription className="text-sm text-[#14ad9f]">Melde dich mit Apple, Google oder E-Mail an</CardDescription>
        </CardHeader>
        <CardContent className="py-6">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="grid gap-2">
              <Label htmlFor="email" className="text-[#14ad9f] font-semibold">E-Mail</Label>
              <Input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password" className="text-[#14ad9f] font-semibold">Passwort</Label>
              <Input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12"
              />
            </div>

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            <Button
              type="submit"
              className="w-full bg-[#14ad9f] text-white hover:bg-teal-700 py-3"
              disabled={loading}
            >
              {loading ? 'Anmelden...' : 'Anmelden mit E-Mail'}
            </Button>

            <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:border-t after:border-[#14ad9f]">
              <span className="bg-white text-[#14ad9f] relative z-10 px-2">oder</span>
            </div>

            <div className="flex flex-col gap-4">
              <Button
                type="button"
                onClick={loginWithGoogle}
                className="w-full bg-white border border-gray-300 text-[#14ad9f] py-3 flex items-center justify-center gap-2 hover:bg-teal-50"
              >
                <FaGoogle size={20} />
                Mit Google anmelden
              </Button>
              <Button
                type="button"
                onClick={loginWithApple}
                className="w-full bg-black text-white py-3 flex items-center justify-center gap-2"
              >
                <FaApple size={20} />
                Mit Apple anmelden
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="text-center text-sm text-[#14ad9f] mt-6">
        Noch kein Konto?{' '}
        <Link href="/register/user" className="underline">Registrieren</Link>
      </div>
      <div className="text-center text-sm text-[#14ad9f]">
        <p>
          Mit der Anmeldung bei <strong>Tasko</strong> stimmst du unseren{' '}
          <Link href="/datenschutz" className="underline">Datenschutzrichtlinien</Link> und{' '}
          <Link href="/nutzungsbedingungen" className="underline">Nutzungsbedingungen</Link> zu.
        </p>
      </div>
    </main>
  );
}
