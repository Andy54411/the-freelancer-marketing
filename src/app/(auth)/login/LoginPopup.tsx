// src/components/LoginPopup.tsx
"use client";

import React, { useState, FormEvent, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth, db } from '@/firebase/clients'; // Pfad anpassen!
import {
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    OAuthProvider,
    User as FirebaseUser,
    AuthError,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
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
import Modal from '@/app/dashboard/user/userId/components/Modal'; // Import Ihrer Modal-Komponente (Pfad anpassen!)

// Hier ist das entscheidende Interface:
export interface LoginPopupProps { // <--- EXPORT HIER HINZUFÜGEN!
    isOpen: boolean;
    onClose: () => void;
    onLoginSuccess?: (user: FirebaseUser, redirectToUrl?: string | null) => void;
    redirectTo?: string | null;
    initialEmail?: string;
    isFullScreen?: boolean; // Diese Zeile sollte bereits vorhanden sein
}

const PAGE_LOG = "LoginPopup:";
const PAGE_ERROR = "LoginPopup ERROR:";

async function createUserProfileIfNew(user: FirebaseUser, email?: string | null, displayName?: string | null) {
    const userDocRef = doc(db, 'users', user.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
        console.log(PAGE_LOG, `Erstelle neues Profil für Social Login User: ${user.uid}`);
        const [firstName, lastName] = displayName ? displayName.split(' ').filter(Boolean) : ['', ''];
        await setDoc(userDocRef, {
            uid: user.uid,
            user_type: 'kunde',
            email: email || user.email,
            firstName: firstName,
            lastName: lastName,
            phoneNumber: user.phoneNumber || null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            savedPaymentMethods: [],
            savedAddresses: [],
        });
        console.log(PAGE_LOG, `Neues Firestore-Profil für ${user.uid} erstellt.`);
    }
}


export default function LoginPopup({ isOpen, onClose, onLoginSuccess, redirectTo, initialEmail, isFullScreen = false }: LoginPopupProps) {
    const router = useRouter();
    const pageSearchParams = useSearchParams();
    const actualRedirectTo = isFullScreen ? pageSearchParams?.get('redirectTo') : redirectTo;

    const [email, setEmail] = useState(initialEmail || '');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (initialEmail) {
            setEmail(initialEmail);
        }
    }, [initialEmail]);


    const commonLoginLogic = async (user: FirebaseUser) => {
        await createUserProfileIfNew(user, user.email, user.displayName);

        if (onLoginSuccess) {
            onLoginSuccess(user, actualRedirectTo);
        } else {
            let targetPath: string;
            if (actualRedirectTo) {
                targetPath = actualRedirectTo;
            } else {
                const userDocSnap = await getDoc(doc(db, 'users', user.uid));
                const userData = userDocSnap.data();
                const userType = userData?.user_type;
                targetPath = (userType === 'firma') ? `/dashboard/company/${user.uid}` : `/dashboard/user/${user.uid}`;
            }
            console.log(PAGE_LOG, `Weiterleitung zu: ${targetPath}`);
            router.push(targetPath);
        }
        onClose();
    };


    const handleLogin = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            console.log(PAGE_LOG, 'E-Mail/Passwort Login erfolgreich für:', userCredential.user.uid);
            await commonLoginLogic(userCredential.user);
        } catch (err: unknown) {
            console.error(PAGE_ERROR, "Login Fehler:", err);
            if (typeof err === 'object' && err !== null && 'code' in err) {
                const firebaseError = err as AuthError;
                if (firebaseError.code === 'auth/user-not-found' || firebaseError.code === 'auth/wrong-password') {
                    setError('E-Mail oder Passwort ist falsch.');
                } else if (firebaseError.code === 'auth/invalid-email') {
                    setError('Ungültiges E-Mail-Format.');
                } else {
                    setError(firebaseError.message || 'Login fehlgeschlagen. Bitte versuchen Sie es später erneut.');
                }
            } else {
                setError('Login fehlgeschlagen. Ein unbekannter Fehler ist aufgetreten.');
            }
        } finally {
            setLoading(false);
        }
    };

    const loginWithGoogle = async () => {
        const provider = new GoogleAuthProvider();
        setLoading(true);
        setError(null);
        try {
            const result = await signInWithPopup(auth, provider);
            console.log(PAGE_LOG, 'Google Login erfolgreich für:', result.user.uid);
            await commonLoginLogic(result.user);
        } catch (err: unknown) {
            console.error(PAGE_ERROR, "Google Login Fehler:", err);
            if (typeof err === 'object' && err !== null && 'code' in err) {
                const firebaseError = err as AuthError;
                setError(firebaseError.message || 'Google Login fehlgeschlagen.');
            } else {
                setError('Google Login fehlgeschlagen.');
            }
        } finally {
            setLoading(false);
        }
    };

    const loginWithApple = async () => {
        const provider = new OAuthProvider('apple.com');
        setLoading(true);
        setError(null);
        try {
            const result = await signInWithPopup(auth, provider);
            console.log(PAGE_LOG, 'Apple Login erfolgreich für:', result.user.uid);
            await commonLoginLogic(result.user);
        } catch (err: unknown) {
            console.error(PAGE_ERROR, "Apple Login Fehler:", err);
            if (typeof err === 'object' && err !== null && 'code' in err) {
                const firebaseError = err as AuthError;
                setError(firebaseError.message || 'Apple Login fehlgeschlagen.');
            } else {
                setError('Apple Login fehlgeschlagen.');
            }
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen && !isFullScreen) {
        return null;
    }

    const content = (
        <>
            {!isFullScreen && ( // Nur anzeigen, wenn es nicht der Vollbildmodus ist
                <CardHeader className="text-center py-4">
                    <CardTitle className="text-xl font-semibold text-[#14ad9f]">Willkommen zurück bei TASKO</CardTitle>
                    <CardDescription className="text-sm text-[#14ad9f]">Melde dich mit Apple, Google oder E-Mail an</CardDescription>
                </CardHeader>
            )}
            <form onSubmit={handleLogin} className={`space-y-6 ${isFullScreen ? 'w-full max-w-lg bg-white glowing-border p-6 mx-auto rounded-lg shadow-lg' : ''}`}>
                <div className="grid gap-1.5"> {/* Angepasst von gap-2 zu gap-1.5 wie im Original-Formular */}
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

                <div className="grid gap-1.5"> {/* Angepasst von gap-2 zu gap-1.5 */}
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
                        disabled={loading}
                    >
                        <FaGoogle size={20} />
                        Mit Google anmelden
                    </Button>
                    <Button
                        type="button"
                        onClick={loginWithApple}
                        className="w-full bg-black text-white py-3 flex items-center justify-center gap-2"
                        disabled={loading}
                    >
                        <FaApple size={20} />
                        Mit Apple anmelden
                    </Button>
                </div>
            </form>
        </>
    );

    // Stildefinitionen für den leuchtenden Rand
    const styles = (
        <style>{`
            .glowing-border {
              border: 2px solid transparent; /* Wichtig für den Hintergrundbild-Trick */
              /* border-radius: 1px; */ /* Entfernt, um den Radius der Card-Komponente zu nutzen */
              padding: 1px; /* Erzeugt Platz für den "Rand" */
              position: relative;
              animation: glowingBorder 1.5s infinite alternate;
              background-image: linear-gradient(white, white), /* Innere Hintergrundfarbe */
                linear-gradient(45deg, #14ad9f, #14ad9f); /* Farbe des Randes */
              background-origin: border-box;
              background-clip: content-box, border-box; /* Wichtig für den Effekt */
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
    );

    if (isFullScreen) {
        return (
            <>
                {styles}
                <main className="bg-gradient-to-r from-blue-100 to-teal-200 grid place-items-center min-h-screen p-6 md:p-12">
                    <h1 className="text-3xl font-semibold text-center text-[#14ad9f] mb-6">Willkommen zurück bei TASKO</h1>
                    {content} {/* Das Formular innerhalb von content hat bereits die glowing-border Klasse */}
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
            </>
        );
    }

    // Für den Modal-Fall
    return (
        <>
            {styles}
            <Modal onClose={onClose} title={isFullScreen ? "" : ""}>
                <Card className="w-full max-w-lg bg-transparent glowing-border p-2 mx-auto shadow-none">
                    <CardContent className="py-12">
                        {content}
                    </CardContent>
                </Card>
            </Modal>
        </>
    );
}