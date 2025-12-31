import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';
import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';

// Zod Schema für Order Review
const OrderReviewSchema = z.object({
  type: z.literal('order'),
  token: z.string().min(1),
  rating: z.number().min(1).max(5),
  comment: z.string().min(10, 'Bitte schreiben Sie mindestens 10 Zeichen'),
});

// Zod Schema für Company Review (10 Fragen, 1-10 Skala)
const CompanyReviewSchema = z.object({
  type: z.literal('company'),
  token: z.string().min(1),
  qualityOfWork: z.number().min(1).max(10),
  communication: z.number().min(1).max(10),
  punctuality: z.number().min(1).max(10),
  professionalism: z.number().min(1).max(10),
  pricePerformance: z.number().min(1).max(10),
  reliability: z.number().min(1).max(10),
  friendliness: z.number().min(1).max(10),
  expertise: z.number().min(1).max(10),
  cleanliness: z.number().min(1).max(10),
  recommendation: z.number().min(1).max(10),
  overallComment: z.string().min(10, 'Bitte schreiben Sie mindestens 10 Zeichen'),
  wouldHireAgain: z.boolean(),
});

/**
 * POST: Bewertung abgeben
 */
export async function POST(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Firebase nicht verfügbar' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { type } = body;
    
    if (type === 'order') {
      // Order Review validieren
      const validation = OrderReviewSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error.errors[0].message },
          { status: 400 }
        );
      }
      
      const { token, rating, comment } = validation.data;
      
      // ReviewRequest per Token finden
      const requestsQuery = await db.collection('reviewRequests')
        .where('orderReviewToken', '==', token)
        .limit(1)
        .get();
      
      if (requestsQuery.empty) {
        return NextResponse.json(
          { success: false, error: 'Ungültiger Bewertungslink' },
          { status: 400 }
        );
      }
      
      const reviewRequest = requestsQuery.docs[0];
      const requestData = reviewRequest.data();
      
      // Prüfen ob bereits bewertet
      if (requestData.orderReviewCompletedAt) {
        return NextResponse.json(
          { success: false, error: 'Sie haben diesen Auftrag bereits bewertet' },
          { status: 400 }
        );
      }
      
      // Prüfen ob abgelaufen
      const expiresAt = requestData.orderReviewExpiresAt?.toDate?.() || requestData.orderReviewExpiresAt;
      if (expiresAt && new Date(expiresAt) < new Date()) {
        return NextResponse.json(
          { success: false, error: 'Der Bewertungslink ist abgelaufen' },
          { status: 400 }
        );
      }
      
      // Review in Company-Subcollection speichern
      const reviewRef = await db.collection(`companies/${requestData.providerId}/reviews`).add({
        orderId: requestData.orderId,
        customerId: requestData.customerId,
        customerName: requestData.customerName,
        rating,
        comment,
        serviceType: requestData.orderTitle,
        isVerified: true,
        reviewType: 'order',
        createdAt: FieldValue.serverTimestamp(),
      });
      
      // ReviewRequest aktualisieren
      await reviewRequest.ref.update({
        orderReviewCompletedAt: FieldValue.serverTimestamp(),
        orderReviewId: reviewRef.id,
        status: 'pending_company',
        updatedAt: FieldValue.serverTimestamp(),
      });
      
      return NextResponse.json({
        success: true,
        message: 'Vielen Dank für Ihre Bewertung!',
      });
      
    } else if (type === 'company') {
      // Company Review validieren
      const validation = CompanyReviewSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error.errors[0].message },
          { status: 400 }
        );
      }
      
      const data = validation.data;
      
      // ReviewRequest per Token finden
      const requestsQuery = await db.collection('reviewRequests')
        .where('companyReviewToken', '==', data.token)
        .limit(1)
        .get();
      
      if (requestsQuery.empty) {
        return NextResponse.json(
          { success: false, error: 'Ungültiger Bewertungslink' },
          { status: 400 }
        );
      }
      
      const reviewRequest = requestsQuery.docs[0];
      const requestData = reviewRequest.data();
      
      // Prüfen ob bereits bewertet
      if (requestData.companyReviewCompletedAt) {
        return NextResponse.json(
          { success: false, error: 'Sie haben diese Firma bereits bewertet' },
          { status: 400 }
        );
      }
      
      // Durchschnitt berechnen
      const avgRating = (
        data.qualityOfWork +
        data.communication +
        data.punctuality +
        data.professionalism +
        data.pricePerformance +
        data.reliability +
        data.friendliness +
        data.expertise +
        data.cleanliness +
        data.recommendation
      ) / 10;
      
      // Company Review speichern
      const reviewRef = await db.collection('companyReviews').add({
        orderId: requestData.orderId,
        providerId: requestData.providerId,
        providerName: requestData.providerName,
        customerId: requestData.customerId,
        customerName: requestData.customerName,
        ratings: {
          qualityOfWork: data.qualityOfWork,
          communication: data.communication,
          punctuality: data.punctuality,
          professionalism: data.professionalism,
          pricePerformance: data.pricePerformance,
          reliability: data.reliability,
          friendliness: data.friendliness,
          expertise: data.expertise,
          cleanliness: data.cleanliness,
          recommendation: data.recommendation,
        },
        averageRating: avgRating,
        overallComment: data.overallComment,
        wouldHireAgain: data.wouldHireAgain,
        isVerified: true,
        createdAt: FieldValue.serverTimestamp(),
      });
      
      // ReviewRequest aktualisieren
      await reviewRequest.ref.update({
        companyReviewCompletedAt: FieldValue.serverTimestamp(),
        companyReviewId: reviewRef.id,
        status: 'completed',
        updatedAt: FieldValue.serverTimestamp(),
      });
      
      return NextResponse.json({
        success: true,
        message: 'Vielen Dank für Ihre detaillierte Bewertung!',
      });
      
    } else {
      return NextResponse.json(
        { success: false, error: 'Ungültiger Bewertungstyp' },
        { status: 400 }
      );
    }
    
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Ein Fehler ist aufgetreten' },
      { status: 500 }
    );
  }
}
