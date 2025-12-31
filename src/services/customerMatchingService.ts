import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '@/firebase/clients';

interface CustomerData {
  name: string;
  email?: string;
  customerNumber?: string;
}

interface CustomerMatchCandidate {
  id: string;
  name: string;
  email?: string;
  customerNumber?: string;
  matchScore: number;
  matchReason: string;
}

export class CustomerMatchingService {
  /**
   * Sucht nach einem passenden Kunden in der Datenbank
   * Matching-Strategie: CustomerNumber > Email (exakt) > Name (exakt) > Name (ähnlich)
   */
  static async findMatchingCustomer(
    companyId: string,
    customerName: string,
    customerEmail?: string,
    customerNumber?: string
  ): Promise<CustomerMatchCandidate | null> {
    try {
      const customersRef = collection(db, 'companies', companyId, 'customers');
      
      // 0. Höchste Priorität: CustomerNumber Match (100% eindeutig)
      if (customerNumber) {
        const customerNumberQuery = query(
          customersRef,
          where('customerNumber', '==', customerNumber.trim()),
          limit(1)
        );
        
        const customerNumberSnapshot = await getDocs(customerNumberQuery);
        if (!customerNumberSnapshot.empty) {
          const customer = customerNumberSnapshot.docs[0];
          return {
            id: customer.id,
            name: customer.data().name,
            email: customer.data().email,
            customerNumber: customer.data().customerNumber,
            matchScore: 100,
            matchReason: `Kundennummer-Match: ${customerNumber}`
          };
        }
      }
      
      // 1. Priorität: Email Match (100% sicher)
      if (customerEmail) {
        const emailQuery = query(
          customersRef,
          where('email', '==', customerEmail.toLowerCase().trim()),
          limit(1)
        );
        
        const emailSnapshot = await getDocs(emailQuery);
        if (!emailSnapshot.empty) {
          const customer = emailSnapshot.docs[0];
          return {
            id: customer.id,
            name: customer.data().name,
            email: customer.data().email,
            customerNumber: customer.data().customerNumber,
            matchScore: 100,
            matchReason: 'Exakte Email-Übereinstimmung'
          };
        }
      }
      
      // 2. Priorität: Exakter Name Match
      const nameQuery = query(
        customersRef,
        where('name', '==', customerName.trim()),
        limit(1)
      );
      
      const nameSnapshot = await getDocs(nameQuery);
      if (!nameSnapshot.empty) {
        const customer = nameSnapshot.docs[0];
        return {
          id: customer.id,
          name: customer.data().name,
          email: customer.data().email,
          customerNumber: customer.data().customerNumber,
          matchScore: 90,
          matchReason: 'Exakte Namensübereinstimmung'
        };
      }
      
      // 3. Priorität: Ähnlicher Name (Fuzzy Match)
      const allCustomersSnapshot = await getDocs(customersRef);
      const allCustomers = allCustomersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as CustomerData)
      }));
      
      const normalizedSearchName = this.normalizeString(customerName);
      
      for (const customer of allCustomers) {
        const normalizedCustomerName = this.normalizeString(customer.name);
        
        // Prüfe auf Substring-Match oder umgekehrt
        if (
          normalizedCustomerName.includes(normalizedSearchName) ||
          normalizedSearchName.includes(normalizedCustomerName)
        ) {
          // Berechne Ähnlichkeit
          const similarity = this.calculateSimilarity(normalizedSearchName, normalizedCustomerName);
          
          if (similarity >= 0.7) { // 70% Übereinstimmung
            return {
              id: customer.id,
              name: customer.name,
              email: customer.email,
              customerNumber: customer.customerNumber,
              matchScore: Math.round(similarity * 100),
              matchReason: 'Ähnlicher Name gefunden'
            };
          }
        }
      }
      
      // Kein Match gefunden
      return null;
      
    } catch (error) {
      console.error('❌ Fehler beim Customer Matching:', error);
      return null;
    }
  }
  
  /**
   * Normalisiert einen String für Vergleiche
   */
  private static normalizeString(str: string): string {
    return str
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ') // Multiple Leerzeichen zu einem
      .replace(/[äöü]/g, char => ({ 'ä': 'ae', 'ö': 'oe', 'ü': 'ue' }[char] || char));
  }
  
  /**
   * Berechnet Levenshtein-Distanz-basierte Ähnlichkeit (0-1)
   */
  private static calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }
  
  /**
   * Berechnet Levenshtein-Distanz zwischen zwei Strings
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
}
