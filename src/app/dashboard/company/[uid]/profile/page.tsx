'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { User as FirebaseUser, getAuth } from 'firebase/auth';
import CompanyProfileManager from '../components/CompanyProfileManager';
import { calculateCompanyMetrics, type CompanyMetrics } from "@/lib/companyMetrics";
import { FiLoader, FiAlertCircle } from 'react-icons/fi';

export default function CompanyProfilePage() {
    const params = useParams();
    const uid = typeof params.uid === 'string' ? params.uid : '';
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
    const [companyMetrics, setCompanyMetrics] = useState<CompanyMetrics | null>(null);

    useEffect(() => {
        const auth = getAuth();
        const unsubscribe = auth.onAuthStateChanged(user => {
            setCurrentUser(user);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const fetchUserData = async () => {
            if (!uid) return;

            try {
                const userDoc = await getDoc(doc(db, 'users', uid));
                if (userDoc.exists()) {
                    setUserData({ uid, ...userDoc.data() });
                }

                // Automatische Metriken laden
                const metrics = await calculateCompanyMetrics(uid);
                setCompanyMetrics(metrics);
            } catch (error) {
                console.error('Fehler beim Laden der Benutzerdaten:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, [uid]);

    const handleDataSaved = async () => {
        // Aktualisiere die Daten nach dem Speichern
        try {
            const userDoc = await getDoc(doc(db, 'users', uid));
            if (userDoc.exists()) {
                setUserData({ uid, ...userDoc.data() });
            }

            // Metriken neu berechnen
            const metrics = await calculateCompanyMetrics(uid);
            setCompanyMetrics(metrics);
        } catch (error) {
            console.error('Fehler beim Laden der Benutzerdaten:', error);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <FiLoader className="animate-spin text-4xl text-[#14ad9f]" />
                <p className="ml-3">Lade Profile...</p>
            </div>
        );
    }

    if (!userData) {
        return (
            <div className="flex justify-center items-center min-h-screen text-red-500">
                <FiAlertCircle className="mr-2" /> Profil nicht gefunden
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Company Profile verwalten</h1>
                <p className="text-gray-600 mt-2">
                    Verwalten Sie Ihr Unternehmensprofil, Services, Portfolio und FAQ
                </p>
            </div>

            <CompanyProfileManager
                userData={userData}
                companyMetrics={companyMetrics}
                onDataSaved={handleDataSaved}
            />
        </div>
    );
}
