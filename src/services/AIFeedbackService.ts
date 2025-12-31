/**
 * Service für Taskilo KI Feedback
 * Speichert und analysiert Benutzer-Feedback zu KI-generierten Inhalten
 */

import { db } from '@/firebase/clients';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  Timestamp,
  limit as firestoreLimit
} from 'firebase/firestore';
import type { AIFeedback, PromptStatistics } from '@/config/ai-prompts';

const COLLECTION_NAME = 'ai_feedback';

export class AIFeedbackService {
  /**
   * Speichert Feedback zu einer KI-Generierung
   */
  static async saveFeedback(feedback: Omit<AIFeedback, 'id' | 'createdAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...feedback,
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  }

  /**
   * Holt alle Feedbacks (für Admin)
   */
  static async getAllFeedback(limitCount = 100): Promise<AIFeedback[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy('createdAt', 'desc'),
      firestoreLimit(limitCount)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    })) as AIFeedback[];
  }

  /**
   * Holt Feedbacks nach Rating
   */
  static async getFeedbackByRating(rating: 'good' | 'bad', limitCount = 50): Promise<AIFeedback[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('rating', '==', rating),
      orderBy('createdAt', 'desc'),
      firestoreLimit(limitCount)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    })) as AIFeedback[];
  }

  /**
   * Holt Feedbacks nach Kategorie
   */
  static async getFeedbackByCategory(category: string, limitCount = 50): Promise<AIFeedback[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('category', '==', category),
      orderBy('createdAt', 'desc'),
      firestoreLimit(limitCount)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    })) as AIFeedback[];
  }

  /**
   * Berechnet Statistiken für das Admin-Dashboard
   */
  static async getStatistics(): Promise<PromptStatistics> {
    const allFeedback = await this.getAllFeedback(1000);
    
    const stats: PromptStatistics = {
      promptId: 'profile-description',
      totalGenerations: allFeedback.length,
      goodRatings: 0,
      badRatings: 0,
      successRate: 0,
      byCategory: {},
      bySubcategory: {},
    };

    allFeedback.forEach(fb => {
      if (fb.rating === 'good') {
        stats.goodRatings++;
      } else {
        stats.badRatings++;
      }

      // Nach Kategorie gruppieren
      if (!stats.byCategory[fb.category]) {
        stats.byCategory[fb.category] = { total: 0, good: 0, bad: 0 };
      }
      stats.byCategory[fb.category].total++;
      if (fb.rating === 'good') {
        stats.byCategory[fb.category].good++;
      } else {
        stats.byCategory[fb.category].bad++;
      }

      // Nach Subkategorie gruppieren
      if (fb.subcategory) {
        if (!stats.bySubcategory[fb.subcategory]) {
          stats.bySubcategory[fb.subcategory] = { total: 0, good: 0, bad: 0 };
        }
        stats.bySubcategory[fb.subcategory].total++;
        if (fb.rating === 'good') {
          stats.bySubcategory[fb.subcategory].good++;
        } else {
          stats.bySubcategory[fb.subcategory].bad++;
        }
      }
    });

    // Erfolgsrate berechnen
    if (stats.totalGenerations > 0) {
      stats.successRate = Math.round((stats.goodRatings / stats.totalGenerations) * 100);
    }

    return stats;
  }

  /**
   * Holt die schlechtesten Feedbacks für Analyse
   */
  static async getWorstFeedback(limitCount = 20): Promise<AIFeedback[]> {
    return this.getFeedbackByRating('bad', limitCount);
  }

  /**
   * Holt Feedbacks für einen bestimmten Prompt
   */
  static async getFeedbackByPrompt(promptId: string, limitCount = 50): Promise<AIFeedback[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('promptId', '==', promptId),
      orderBy('createdAt', 'desc'),
      firestoreLimit(limitCount)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    })) as AIFeedback[];
  }
}
