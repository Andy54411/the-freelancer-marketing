"use client";

import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { auth } from '@/firebase/clients';

export default function TestClaimsPage() {
    const { user, firebaseUser, loading } = useAuth();
    const [claims, setClaims] = useState<any>(null);

    useEffect(() => {
        if (firebaseUser) {
            firebaseUser.getIdTokenResult(true).then((result) => {
                setClaims(result.claims);
            });
        }
    }, [firebaseUser]);

    if (loading) {
        return <div className="p-8">Loading...</div>;
    }

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">Test Claims Page</h1>

            <div className="mb-4">
                <h2 className="text-lg font-semibold">User Profile:</h2>
                <pre className="bg-gray-100 p-4 rounded">
                    {JSON.stringify(user, null, 2)}
                </pre>
            </div>

            <div className="mb-4">
                <h2 className="text-lg font-semibold">Firebase User:</h2>
                <pre className="bg-gray-100 p-4 rounded">
                    {JSON.stringify(firebaseUser ? {
                        uid: firebaseUser.uid,
                        email: firebaseUser.email,
                        emailVerified: firebaseUser.emailVerified
                    } : null, null, 2)}
                </pre>
            </div>

            <div className="mb-4">
                <h2 className="text-lg font-semibold">Custom Claims:</h2>
                <pre className="bg-gray-100 p-4 rounded">
                    {JSON.stringify(claims, null, 2)}
                </pre>
            </div>
        </div>
    );
}
