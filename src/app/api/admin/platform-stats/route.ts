import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import Stripe from 'stripe';

// Firebase Admin Setup
let db: any;

try {
  if (getApps().length === 0) {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    let projectId = process.env.FIREBASE_PROJECT_ID;
    
    if (serviceAccountKey && serviceAccountKey !== 'undefined') {
      const serviceAccount = JSON.parse(serviceAccountKey);
      
      // Extract project ID from service account if not set in environment
      if (!projectId && serviceAccount.project_id) {
        projectId = serviceAccount.project_id;
      }
      
      if (serviceAccount.project_id && projectId) {
        initializeApp({
          credential: cert(serviceAccount),
          projectId: projectId,
        });
        db = getFirestore();
      }
    } else {
      console.warn('Firebase service account key not available in platform-stats');
    }
  } else {
    db = getFirestore();
  }
} catch (error) {
  console.error('Firebase Admin initialization error in platform-stats:', error);
  db = null;
}

// Stripe Setup
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

interface PlatformStats {
  totalRevenue: number;
  totalFees: number;
  connectedAccounts: number;
  monthlyGrowth: number;
  availableBalance: number;
  pendingBalance: number;
}

export async function GET() {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Stripe Daten abrufen
    const [
      applicationFees,
      lastMonthFees,
      connectedAccounts,
      balance
    ] = await Promise.all([
      // Gesamte Application Fees
      stripe.applicationFees.list({ 
        limit: 100,
        created: { gte: Math.floor(startOfMonth.getTime() / 1000) }
      }),
      
      // Letzter Monat für Wachstumsberechnung
      stripe.applicationFees.list({
        limit: 100,
        created: { 
          gte: Math.floor(startOfLastMonth.getTime() / 1000),
          lte: Math.floor(endOfLastMonth.getTime() / 1000)
        }
      }),
      
      // Connected Accounts
      stripe.accounts.list({ limit: 100 }),
      
      // Platform Balance
      stripe.balance.retrieve()
    ]);

    // Berechne Statistiken
    const totalFees = applicationFees.data.reduce((sum, fee) => sum + fee.amount, 0);
    const lastMonthTotalFees = lastMonthFees.data.reduce((sum, fee) => sum + fee.amount, 0);
    
    // Berechne Gesamtumsatz basierend auf Application Fees
    // Bei 4.5% Fee Rate: totalRevenue = totalFees / 0.045
    const currentFeeRate = 0.045; // Default, wird später dynamisch geladen
    const totalRevenue = totalFees > 0 ? Math.round(totalFees / currentFeeRate) : 0;
    
    // Berechne monatliches Wachstum
    const monthlyGrowth = lastMonthTotalFees > 0 
      ? ((totalFees - lastMonthTotalFees) / lastMonthTotalFees) * 100
      : 0;

    // Extrahiere Balance-Informationen
    const eurAvailable = balance.available.find(b => b.currency === 'eur');
    const eurPending = balance.pending.find(b => b.currency === 'eur');

    const stats: PlatformStats = {
      totalRevenue,
      totalFees,
      connectedAccounts: connectedAccounts.data.length,
      monthlyGrowth: Math.round(monthlyGrowth * 100), // Für Anzeige als Prozentwert
      availableBalance: eurAvailable?.amount || 0,
      pendingBalance: eurPending?.amount || 0
    };

    // Optional: Cache die Statistiken in Firestore für bessere Performance
    if (db) {
      try {
        await db.collection('platform_stats').doc('current').set({
          ...stats,
          lastUpdated: Math.floor(Date.now() / 1000)
        });
      } catch (dbError) {
        console.warn('Could not cache stats to Firestore:', dbError);
      }
    }

    return NextResponse.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Error fetching platform stats:', error);
    
    // Fallback: Lade gecachte Statistiken aus Firestore
    if (db) {
      try {
        const cachedStats = await db.collection('platform_stats').doc('current').get();
        if (cachedStats.exists) {
          return NextResponse.json({
            success: true,
            stats: cachedStats.data(),
            cached: true
          });
        }
      } catch (cacheError) {
        console.error('Error loading cached stats:', cacheError);
      }
    }

    // Ultimate fallback: Return basic stats
    return NextResponse.json({
      success: true,
      stats: {
        totalRevenue: 0,
        totalFees: 0,
        connectedAccounts: 0,
        monthlyGrowth: 0,
        availableBalance: 0,
        pendingBalance: 0
      },
      fallback: true
    });
  }
}
