'use strict';

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy,
  Timestamp,
  addDoc
} from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { v4 as uuidv4 } from 'uuid';

// Interfaces
export interface ReviewRequest {
  id: string;
  orderId: string;
  customerId: string;
  customerEmail: string;
  customerName: string;
  orderTitle: string;
  providerId: string;
  providerName: string;
  
  // Phase 1: Auftragsbewertung
  orderReviewToken: string;
  orderReviewSentAt: Timestamp | null;
  orderReviewExpiresAt: Timestamp | null;
  orderReviewCompletedAt: Timestamp | null;
  orderReviewId: string | null;
  
  // Phase 2: Firmenbewertung
  companyReviewToken: string;
  companyReviewSentAt: Timestamp | null;
  companyReviewExpiresAt: Timestamp | null;
  companyReviewCompletedAt: Timestamp | null;
  companyReviewId: string | null;
  
  status: 'pending_order' | 'pending_company' | 'completed' | 'expired';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CompanyReviewData {
  // 10 Fragen mit 1-10 Skala
  qualityOfWork: number;           // Qualität der Arbeit
  communication: number;           // Kommunikation
  punctuality: number;             // Pünktlichkeit
  professionalism: number;         // Professionalität
  pricePerformance: number;        // Preis-Leistungs-Verhältnis
  reliability: number;             // Zuverlässigkeit
  friendliness: number;            // Freundlichkeit
  expertise: number;               // Fachkompetenz
  cleanliness: number;             // Sauberkeit/Ordnung
  recommendation: number;          // Weiterempfehlung
  
  overallComment: string;
  wouldHireAgain: boolean;
}

export interface OrderReviewData {
  rating: number;                  // 1-5 Sterne
  comment: string;
  serviceType: string;
}

// Service
export class ReviewRequestService {
  
  /**
   * Erstellt einen neuen ReviewRequest nach Auftragsabschluss
   */
  static async createReviewRequest(data: {
    orderId: string;
    customerId: string;
    customerEmail: string;
    customerName: string;
    orderTitle: string;
    providerId: string;
    providerName: string;
  }): Promise<ReviewRequest> {
    const now = Timestamp.now();
    const expiresAt = Timestamp.fromDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)); // 14 Tage
    
    const reviewRequest: Omit<ReviewRequest, 'id'> = {
      orderId: data.orderId,
      customerId: data.customerId,
      customerEmail: data.customerEmail,
      customerName: data.customerName,
      orderTitle: data.orderTitle,
      providerId: data.providerId,
      providerName: data.providerName,
      
      orderReviewToken: uuidv4(),
      orderReviewSentAt: null,
      orderReviewExpiresAt: expiresAt,
      orderReviewCompletedAt: null,
      orderReviewId: null,
      
      companyReviewToken: uuidv4(),
      companyReviewSentAt: null,
      companyReviewExpiresAt: null,
      companyReviewCompletedAt: null,
      companyReviewId: null,
      
      status: 'pending_order',
      createdAt: now,
      updatedAt: now,
    };
    
    const docRef = await addDoc(
      collection(db, 'reviewRequests'),
      reviewRequest
    );
    
    return { id: docRef.id, ...reviewRequest };
  }
  
  /**
   * Holt ReviewRequest by Token
   */
  static async getByOrderToken(token: string): Promise<ReviewRequest | null> {
    const q = query(
      collection(db, 'reviewRequests'),
      where('orderReviewToken', '==', token)
    );
    
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    
    const docData = snapshot.docs[0];
    return { id: docData.id, ...docData.data() } as ReviewRequest;
  }
  
  static async getByCompanyToken(token: string): Promise<ReviewRequest | null> {
    const q = query(
      collection(db, 'reviewRequests'),
      where('companyReviewToken', '==', token)
    );
    
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    
    const docData = snapshot.docs[0];
    return { id: docData.id, ...docData.data() } as ReviewRequest;
  }
  
  /**
   * Holt alle pending Review Requests für E-Mail-Versand
   */
  static async getPendingOrderReviews(): Promise<ReviewRequest[]> {
    const q = query(
      collection(db, 'reviewRequests'),
      where('status', '==', 'pending_order'),
      where('orderReviewSentAt', '==', null)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ReviewRequest));
  }
  
  /**
   * Holt pending Company Reviews (2 Tage nach Order Review)
   */
  static async getPendingCompanyReviews(): Promise<ReviewRequest[]> {
    const twoDaysAgo = Timestamp.fromDate(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000));
    
    const q = query(
      collection(db, 'reviewRequests'),
      where('status', '==', 'pending_company'),
      where('companyReviewSentAt', '==', null),
      where('orderReviewCompletedAt', '<=', twoDaysAgo)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ReviewRequest));
  }
  
  /**
   * Markiert Order Review E-Mail als gesendet
   */
  static async markOrderReviewSent(requestId: string): Promise<void> {
    await updateDoc(doc(db, 'reviewRequests', requestId), {
      orderReviewSentAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  }
  
  /**
   * Markiert Company Review E-Mail als gesendet
   */
  static async markCompanyReviewSent(requestId: string): Promise<void> {
    const expiresAt = Timestamp.fromDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000));
    
    await updateDoc(doc(db, 'reviewRequests', requestId), {
      companyReviewSentAt: Timestamp.now(),
      companyReviewExpiresAt: expiresAt,
      updatedAt: Timestamp.now(),
    });
  }
  
  /**
   * Speichert Order Review
   */
  static async submitOrderReview(
    token: string, 
    reviewData: OrderReviewData
  ): Promise<{ success: boolean; error?: string }> {
    const request = await this.getByOrderToken(token);
    
    if (!request) {
      return { success: false, error: 'Ungültiger Token' };
    }
    
    if (request.orderReviewCompletedAt) {
      return { success: false, error: 'Bewertung wurde bereits abgegeben' };
    }
    
    const now = Timestamp.now();
    if (request.orderReviewExpiresAt && request.orderReviewExpiresAt.toMillis() < now.toMillis()) {
      return { success: false, error: 'Der Bewertungslink ist abgelaufen' };
    }
    
    // Review in der Company Subcollection speichern
    const reviewRef = await addDoc(
      collection(db, `companies/${request.providerId}/reviews`),
      {
        orderId: request.orderId,
        customerId: request.customerId,
        customerName: request.customerName,
        rating: reviewData.rating,
        comment: reviewData.comment,
        serviceType: reviewData.serviceType || request.orderTitle,
        isVerified: true,
        reviewType: 'order',
        createdAt: now,
      }
    );
    
    // ReviewRequest aktualisieren
    await updateDoc(doc(db, 'reviewRequests', request.id), {
      orderReviewCompletedAt: now,
      orderReviewId: reviewRef.id,
      status: 'pending_company',
      updatedAt: now,
    });
    
    return { success: true };
  }
  
  /**
   * Speichert Company Review (10 Fragen)
   */
  static async submitCompanyReview(
    token: string,
    reviewData: CompanyReviewData
  ): Promise<{ success: boolean; error?: string }> {
    const request = await this.getByCompanyToken(token);
    
    if (!request) {
      return { success: false, error: 'Ungültiger Token' };
    }
    
    if (request.companyReviewCompletedAt) {
      return { success: false, error: 'Firmenbewertung wurde bereits abgegeben' };
    }
    
    const now = Timestamp.now();
    if (request.companyReviewExpiresAt && request.companyReviewExpiresAt.toMillis() < now.toMillis()) {
      return { success: false, error: 'Der Bewertungslink ist abgelaufen' };
    }
    
    // Durchschnitt berechnen
    const avgRating = (
      reviewData.qualityOfWork +
      reviewData.communication +
      reviewData.punctuality +
      reviewData.professionalism +
      reviewData.pricePerformance +
      reviewData.reliability +
      reviewData.friendliness +
      reviewData.expertise +
      reviewData.cleanliness +
      reviewData.recommendation
    ) / 10;
    
    // Company Review speichern
    const reviewRef = await addDoc(
      collection(db, 'companyReviews'),
      {
        orderId: request.orderId,
        providerId: request.providerId,
        providerName: request.providerName,
        customerId: request.customerId,
        customerName: request.customerName,
        
        // Einzelbewertungen
        qualityOfWork: reviewData.qualityOfWork,
        communication: reviewData.communication,
        punctuality: reviewData.punctuality,
        professionalism: reviewData.professionalism,
        pricePerformance: reviewData.pricePerformance,
        reliability: reviewData.reliability,
        friendliness: reviewData.friendliness,
        expertise: reviewData.expertise,
        cleanliness: reviewData.cleanliness,
        recommendation: reviewData.recommendation,
        
        averageRating: avgRating,
        overallComment: reviewData.overallComment,
        wouldHireAgain: reviewData.wouldHireAgain,
        
        isVerified: true,
        reviewType: 'company',
        createdAt: now,
      }
    );
    
    // ReviewRequest aktualisieren
    await updateDoc(doc(db, 'reviewRequests', request.id), {
      companyReviewCompletedAt: now,
      companyReviewId: reviewRef.id,
      status: 'completed',
      updatedAt: now,
    });
    
    return { success: true };
  }
  
  /**
   * Holt alle Review Requests für Admin
   */
  static async getAllForAdmin(): Promise<ReviewRequest[]> {
    const q = query(
      collection(db, 'reviewRequests'),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ReviewRequest));
  }
  
  /**
   * Holt alle Company Reviews für Admin
   */
  static async getAllCompanyReviews(): Promise<any[]> {
    const q = query(
      collection(db, 'companyReviews'),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
}
