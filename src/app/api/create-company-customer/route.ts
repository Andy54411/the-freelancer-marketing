import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Initialize Firebase Admin
if (!getApps().length) {
    initializeApp({
        credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
    });
}

const db = getFirestore();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-06-20',
});

export async function POST(request: NextRequest) {
    try {
        const { companyData } = await request.json();
        
        if (!companyData || !companyData.email || !companyData.uid) {
            return NextResponse.json(
                { error: 'Unvollständige Unternehmensdaten' },
                { status: 400 }
            );
        }

        console.log('Creating Stripe Customer for company:', companyData);

        // Erstelle einen Stripe Customer für das Unternehmen
        const customer = await stripe.customers.create({
            email: companyData.email,
            name: companyData.name,
            metadata: {
                firebase_uid: companyData.uid,
                user_type: 'firma',
                stripe_account_id: companyData.stripeAccountId || '',
                created_for: 'company_booking'
            },
            description: `Company customer for ${companyData.name} (${companyData.email})`
        });

        console.log('Stripe Customer created:', customer.id);

        // Speichere die customerId in der Firestore Database
        try {
            await db.collection('firma').doc(companyData.uid).update({
                stripeCustomerId: customer.id,
                stripeCustomerCreatedAt: new Date(),
            });
            console.log('Updated firma document with stripeCustomerId');
        } catch (firestoreError) {
            console.error('Error updating Firestore:', firestoreError);
            // Customer wurde erstellt, aber nicht in DB gespeichert - das ist OK für jetzt
        }

        return NextResponse.json({
            success: true,
            customerId: customer.id,
            message: 'Company customer created successfully'
        });

    } catch (error) {
        console.error('Error creating company customer:', error);
        return NextResponse.json(
            { error: 'Fehler beim Erstellen des Unternehmenskundenkontos' },
            { status: 500 }
        );
    }
}
