import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';

/// Service für Reviews und Bewertungen
/// Synchronisiert mit der Web-Version
class ReviewService {
  static final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  /// Lädt alle Reviews für einen Provider
  static Future<List<Map<String, dynamic>>> getProviderReviews(String providerId) async {
    try {
      debugPrint('🔍 Lade Reviews für Provider: $providerId');
      
      final reviewsQuery = await _firestore
          .collection('reviews')
          .where('providerId', isEqualTo: providerId)
          .orderBy('createdAt', descending: true)
          .limit(50)
          .get();

      List<Map<String, dynamic>> reviews = [];
      
      for (final doc in reviewsQuery.docs) {
        final data = doc.data();
        
        // Customer-Info laden
        Map<String, dynamic> customerInfo = {};
        if (data['customerId'] != null) {
          try {
            final customerDoc = await _firestore
                .collection('users')
                .doc(data['customerId'])
                .get();
            
            if (customerDoc.exists) {
              final customerData = customerDoc.data()!;
              customerInfo = {
                'name': customerData['firstName'] ?? customerData['displayName'] ?? 'Kunde',
                'avatar': customerData['profilePictureURL'] ?? customerData['photoURL'] ?? '',
              };
            }
          } catch (e) {
            debugPrint('⚠️ Fehler beim Laden der Customer-Info: $e');
          }
        }
        
        final review = {
          'id': doc.id,
          'rating': (data['rating'] as num?)?.toDouble() ?? 5.0,
          'comment': data['comment'] ?? data['review'] ?? '',
          'customerName': customerInfo['name'] ?? data['customerName'] ?? 'Anonymer Kunde',
          'customerAvatar': customerInfo['avatar'] ?? '',
          'date': _formatDate(data['createdAt']?.toDate() ?? DateTime.now()),
          'createdAt': data['createdAt']?.toDate() ?? DateTime.now(),
          'serviceType': data['serviceType'] ?? '',
          'isVerified': data['isVerified'] ?? false,
          ...data,
        };
        
        reviews.add(review);
      }
      
      debugPrint('✅ ${reviews.length} Reviews geladen für Provider $providerId');
      return reviews;
      
    } catch (e) {
      debugPrint('❌ Fehler beim Laden der Reviews: $e');
      return [];
    }
  }

  /// Berechnet Review-Statistiken
  static Future<Map<String, dynamic>> getReviewStats(String providerId) async {
    try {
      final reviews = await getProviderReviews(providerId);
      
      if (reviews.isEmpty) {
        return {
          'averageRating': 0.0,
          'totalReviews': 0,
          'ratingDistribution': {5: 0, 4: 0, 3: 0, 2: 0, 1: 0},
          'percentageDistribution': {5: 0.0, 4: 0.0, 3: 0.0, 2: 0.0, 1: 0.0},
        };
      }
      
      // Durchschnittsbewertung berechnen
      double totalRating = 0.0;
      Map<int, int> ratingDistribution = {5: 0, 4: 0, 3: 0, 2: 0, 1: 0};
      
      for (final review in reviews) {
        final rating = (review['rating'] as num).toDouble();
        totalRating += rating;
        
        // Rating-Verteilung
        final roundedRating = rating.round();
        if (roundedRating >= 1 && roundedRating <= 5) {
          ratingDistribution[roundedRating] = ratingDistribution[roundedRating]! + 1;
        }
      }
      
      final averageRating = totalRating / reviews.length;
      final totalReviews = reviews.length;
      
      // Prozentuale Verteilung berechnen
      Map<int, double> percentageDistribution = {};
      for (int rating = 1; rating <= 5; rating++) {
        percentageDistribution[rating] = (ratingDistribution[rating]! / totalReviews * 100);
      }
      
      return {
        'averageRating': double.parse(averageRating.toStringAsFixed(1)),
        'totalReviews': totalReviews,
        'ratingDistribution': ratingDistribution,
        'percentageDistribution': percentageDistribution,
      };
      
    } catch (e) {
      debugPrint('❌ Fehler beim Berechnen der Review-Stats: $e');
      return {
        'averageRating': 0.0,
        'totalReviews': 0,
        'ratingDistribution': {5: 0, 4: 0, 3: 0, 2: 0, 1: 0},
        'percentageDistribution': {5: 0.0, 4: 0.0, 3: 0.0, 2: 0.0, 1: 0.0},
      };
    }
  }

  /// Formatiert Datum für Anzeige
  static String _formatDate(DateTime date) {
    final now = DateTime.now();
    final difference = now.difference(date);
    
    if (difference.inDays == 0) {
      return 'heute';
    } else if (difference.inDays == 1) {
      return 'gestern';
    } else if (difference.inDays < 7) {
      return 'vor ${difference.inDays} Tagen';
    } else if (difference.inDays < 30) {
      final weeks = (difference.inDays / 7).floor();
      return 'vor $weeks Woche${weeks == 1 ? '' : 'n'}';
    } else if (difference.inDays < 365) {
      final months = (difference.inDays / 30).floor();
      return 'vor $months Monat${months == 1 ? '' : 'en'}';
    } else {
      final years = (difference.inDays / 365).floor();
      return 'vor $years Jahr${years == 1 ? '' : 'en'}';
    }
  }

  /// Erstellt eine neue Review (für zukünftige Funktionalität)
  static Future<bool> createReview({
    required String providerId,
    required String customerId,
    required double rating,
    required String comment,
    String? serviceType,
  }) async {
    try {
      await _firestore.collection('reviews').add({
        'providerId': providerId,
        'customerId': customerId,
        'rating': rating,
        'comment': comment,
        'serviceType': serviceType ?? '',
        'isVerified': false,
        'createdAt': FieldValue.serverTimestamp(),
        'updatedAt': FieldValue.serverTimestamp(),
      });
      
      debugPrint('✅ Review erfolgreich erstellt');
      return true;
      
    } catch (e) {
      debugPrint('❌ Fehler beim Erstellen der Review: $e');
      return false;
    }
  }
}
