import 'package:cloud_functions/cloud_functions.dart';

class ReviewService {
  final FirebaseFunctions _functions = FirebaseFunctions.instance;

  // Submit review for a provider
  Future<Map<String, dynamic>> submitReview({
    required String anbieterId,
    required int sterne,
    required String kommentar,
    required String kundeId,
    required String kundeProfilePictureURL,
    String? auftragId,
    String? kategorie,
    String? unterkategorie,
  }) async {
    try {
      final callable = _functions.httpsCallable('submitReview');
      final result = await callable.call({
        'anbieterId': anbieterId,
        'sterne': sterne,
        'kommentar': kommentar,
        'kundeId': kundeId,
        'kundeProfilePictureURL': kundeProfilePictureURL,
        'auftragId': auftragId,
        'kategorie': kategorie,
        'unterkategorie': unterkategorie,
      });

      return Map<String, dynamic>.from(result.data);
    } catch (e) {
      throw Exception('Failed to submit review: $e');
    }
  }

  // Reply to a review (for companies)
  Future<Map<String, dynamic>> replyToReview({
    required String reviewId,
    required String antwortText,
    required String companyId,
    required String companyName,
  }) async {
    try {
      final callable = _functions.httpsCallable('replyToReview');
      final result = await callable.call({
        'reviewId': reviewId,
        'antwortText': antwortText,
        'companyId': companyId,
        'companyName': companyName,
      });

      return Map<String, dynamic>.from(result.data);
    } catch (e) {
      throw Exception('Failed to reply to review: $e');
    }
  }

  // Get reviews for a provider
  Future<List<Map<String, dynamic>>> getReviewsByProvider(String anbieterId) async {
    try {
      final callable = _functions.httpsCallable('getReviewsByProvider');
      final result = await callable.call({
        'anbieterId': anbieterId,
      });

      final reviews = result.data['reviews'] as List;
      return reviews.map((review) => Map<String, dynamic>.from(review)).toList();
    } catch (e) {
      throw Exception('Failed to get reviews: $e');
    }
  }

  // Get reviews via HTTP (alternative method)
  Future<List<Map<String, dynamic>>> getReviewsByProviderHTTP(String anbieterId) async {
    try {
      final callable = _functions.httpsCallable('getReviewsByProviderHTTP');
      final result = await callable.call({
        'anbieterId': anbieterId,
      });

      final reviews = result.data['reviews'] as List;
      return reviews.map((review) => Map<String, dynamic>.from(review)).toList();
    } catch (e) {
      throw Exception('Failed to get reviews via HTTP: $e');
    }
  }

  // Calculate average rating for a provider
  double calculateAverageRating(List<Map<String, dynamic>> reviews) {
    if (reviews.isEmpty) return 0.0;
    
    final totalStars = reviews.fold<int>(0, (sum, review) => sum + (review['sterne'] as int? ?? 0));
    return totalStars / reviews.length;
  }

  // Get rating distribution
  Map<int, int> getRatingDistribution(List<Map<String, dynamic>> reviews) {
    final distribution = <int, int>{1: 0, 2: 0, 3: 0, 4: 0, 5: 0};
    
    for (final review in reviews) {
      final stars = review['sterne'] as int? ?? 0;
      if (stars >= 1 && stars <= 5) {
        distribution[stars] = (distribution[stars] ?? 0) + 1;
      }
    }
    
    return distribution;
  }

  // Check if user can review a provider
  bool canUserReviewProvider({
    required List<Map<String, dynamic>> existingReviews,
    required String kundeId,
    String? auftragId,
  }) {
    if (auftragId != null) {
      // Check if user already reviewed this specific order
      return !existingReviews.any((review) => 
        review['kundeId'] == kundeId && review['auftragId'] == auftragId);
    } else {
      // Check if user already reviewed this provider
      return !existingReviews.any((review) => review['kundeId'] == kundeId);
    }
  }

  // Format review date
  String formatReviewDate(dynamic timestamp) {
    if (timestamp == null) return 'Unbekannt';
    
    DateTime date;
    if (timestamp is Map && timestamp.containsKey('_seconds')) {
      date = DateTime.fromMillisecondsSinceEpoch(timestamp['_seconds'] * 1000);
    } else if (timestamp is DateTime) {
      date = timestamp;
    } else {
      return 'Unbekannt';
    }
    
    final now = DateTime.now();
    final difference = now.difference(date);
    
    if (difference.inDays == 0) {
      return 'Heute';
    } else if (difference.inDays == 1) {
      return 'Gestern';
    } else if (difference.inDays < 7) {
      return 'vor ${difference.inDays} Tagen';
    } else if (difference.inDays < 30) {
      final weeks = (difference.inDays / 7).round();
      return 'vor $weeks Woche${weeks > 1 ? 'n' : ''}';
    } else if (difference.inDays < 365) {
      final months = (difference.inDays / 30).round();
      return 'vor $months Monat${months > 1 ? 'en' : ''}';
    } else {
      final years = (difference.inDays / 365).round();
      return 'vor $years Jahr${years > 1 ? 'en' : ''}';
    }
  }

  // Get review statistics
  Map<String, dynamic> getReviewStatistics(List<Map<String, dynamic>> reviews) {
    if (reviews.isEmpty) {
      return {
        'totalReviews': 0,
        'averageRating': 0.0,
        'distribution': {1: 0, 2: 0, 3: 0, 4: 0, 5: 0},
        'recentReviews': 0,
        'hasReplies': 0,
      };
    }

    final distribution = getRatingDistribution(reviews);
    final averageRating = calculateAverageRating(reviews);
    
    // Count recent reviews (last 30 days)
    final thirtyDaysAgo = DateTime.now().subtract(const Duration(days: 30));
    int recentReviews = 0;
    int hasReplies = 0;

    for (final review in reviews) {
      // Count recent reviews
      final timestamp = review['erstellungsdatum'];
      if (timestamp != null) {
        DateTime reviewDate;
        if (timestamp is Map && timestamp.containsKey('_seconds')) {
          reviewDate = DateTime.fromMillisecondsSinceEpoch(timestamp['_seconds'] * 1000);
        } else if (timestamp is DateTime) {
          reviewDate = timestamp;
        } else {
          continue;
        }
        
        if (reviewDate.isAfter(thirtyDaysAgo)) {
          recentReviews++;
        }
      }

      // Count reviews with replies
      if (review['antwort'] != null) {
        hasReplies++;
      }
    }

    return {
      'totalReviews': reviews.length,
      'averageRating': averageRating,
      'distribution': distribution,
      'recentReviews': recentReviews,
      'hasReplies': hasReplies,
      'replyRate': reviews.isNotEmpty ? (hasReplies / reviews.length * 100).round() : 0,
    };
  }
}
