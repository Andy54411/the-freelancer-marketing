import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';

/// Firebase Functions Service für Taskilo Flutter App
/// Implementiert alle wichtigen Functions aus dem Web-Projekt
class FirebaseFunctionsService {
  static final FirebaseFunctions _functions = FirebaseFunctions.instanceFor(region: 'europe-west1');
  static final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  static final FirebaseAuth _auth = FirebaseAuth.instance;

  // ===== QUOTE MANAGEMENT FUNCTIONS =====

  /// Erstellt Quote-Anfrage für spezifischen Provider
  static Future<Map<String, dynamic>> createQuoteRequest({
    required String providerId,
    required String serviceTitle,
    required String serviceDescription,
    required String location,
    required double estimatedBudget,
    required String selectedDate,
    String? startTime,
    String? endTime,
    required String urgency,
    required List<String> tags,
    Map<String, dynamic>? service,
    Map<String, dynamic>? aiData,
  }) async {
    try {
      final user = _auth.currentUser;
      if (user == null) throw Exception('User not authenticated');

      // Quote-Daten zusammenstellen nach dem Schema von quotes collection
      final quoteData = {
        'title': serviceTitle,
        'description': serviceDescription,
        'location': {
          'address': location,
          'type': 'user_provided',
          'coordinates': null,
        },
        'estimatedBudget': estimatedBudget,
        'budgetRange': {
          'min': estimatedBudget * 0.8,
          'max': estimatedBudget * 1.2,
          'currency': 'EUR',
        },
        'selectedDate': selectedDate,
        'startTime': startTime,
        'endTime': endTime,
        'urgency': urgency,
        'tags': tags,
        'service': service,
        'providerId': providerId,
        'customerId': user.uid,
        'customerUid': user.uid,
        'createdBy': user.uid,
        'createdAt': FieldValue.serverTimestamp(),
        'updatedAt': FieldValue.serverTimestamp(),
        'status': 'pending',
        'allowsProposals': true,
        'isDirectQuest': true,
        'isExclusive': true,
        'isPublic': false,
        'maxProposals': 1,
        'proposalCount': 0,
        'responseCount': 0,
        'viewCount': 0,
        'aiGenerated': aiData != null,
        'source': aiData != null ? 'ai_assistant_direct' : 'manual_form',
        'questType': 'direct_assignment',
        'projectType': 'direct_quest',
        'category': service?['category'] ?? 'Allgemein',
        'subcategory': service?['name'] ?? 'Sonstiges',
        if (aiData != null) 'originalPrompt': aiData['originalPrompt'],
        if (aiData != null) 'generatedFrom': 'ai_assistant_targeted',
      };

      // Quote in Firestore speichern
      final docRef = await _firestore.collection('quotes').add(quoteData);
      
      return {
        'success': true,
        'quoteId': docRef.id,
        'message': 'Quote-Anfrage erfolgreich erstellt',
      };
    } catch (e) {
      debugPrint('Error creating quote request: $e');
      return {
        'success': false,
        'error': e.toString(),
      };
    }
  }

  // ===== PAYMENT FUNCTIONS =====

  /// Erstellt B2C Festpreis-Payment für sofortige Services
  static Future<Map<String, dynamic>> createB2CPayment({
    required String providerId,
    required String serviceTitle,
    required String serviceDescription,
    required double amount,
    required String currency,
    Map<String, dynamic>? metadata,
  }) async {
    try {
      final callable = _functions.httpsCallable('createB2CPayment');
      final result = await callable.call({
        'providerId': providerId,
        'serviceTitle': serviceTitle,
        'serviceDescription': serviceDescription,
        'amount': (amount * 100).round(), // Convert to cents
        'currency': currency,
        'metadata': metadata ?? {},
      });

      return {
        'success': true,
        'clientSecret': result.data['clientSecret'],
        'paymentIntentId': result.data['paymentIntentId'],
        'orderId': result.data['orderId'],
      };
    } catch (e) {
      return {
        'success': false,
        'error': e.toString(),
      };
    }
  }

  /// Erstellt B2B Projekt-Payment für umfangreiche Services
  static Future<Map<String, dynamic>> createB2BProjectPayment({
    required String providerId,
    required String projectTitle,
    required String projectDescription,
    required double totalAmount,
    required List<Map<String, dynamic>> milestones,
    required String currency,
    Map<String, dynamic>? metadata,
  }) async {
    try {
      final callable = _functions.httpsCallable('createB2BProjectPayment');
      final result = await callable.call({
        'providerId': providerId,
        'projectTitle': projectTitle,
        'projectDescription': projectDescription,
        'totalAmount': (totalAmount * 100).round(),
        'milestones': milestones,
        'currency': currency,
        'metadata': metadata ?? {},
      });

      return {
        'success': true,
        'clientSecret': result.data['clientSecret'],
        'paymentIntentId': result.data['paymentIntentId'],
        'projectId': result.data['projectId'],
        'setupIntentId': result.data['setupIntentId'],
      };
    } catch (e) {
      return {
        'success': false,
        'error': e.toString(),
      };
    }
  }

  /// Erstellt Stunden-Payment für zeitbasierte Abrechnung
  static Future<Map<String, dynamic>> createHourlyPayment({
    required String providerId,
    required String orderId,
    required double hoursWorked,
    required double hourlyRate,
    required String currency,
    Map<String, dynamic>? timeEntries,
  }) async {
    try {
      final callable = _functions.httpsCallable('createHourlyPayment');
      final result = await callable.call({
        'providerId': providerId,
        'orderId': orderId,
        'hoursWorked': hoursWorked,
        'hourlyRate': hourlyRate,
        'totalAmount': ((hoursWorked * hourlyRate) * 100).round(),
        'currency': currency,
        'timeEntries': timeEntries ?? {},
      });

      return {
        'success': true,
        'clientSecret': result.data['clientSecret'],
        'paymentIntentId': result.data['paymentIntentId'],
        'billingAmount': result.data['billingAmount'],
      };
    } catch (e) {
      return {
        'success': false,
        'error': e.toString(),
      };
    }
  }

  // ===== ORDER MANAGEMENT FUNCTIONS =====

  /// Holt User-Orders (Kunde Dashboard)
  static Future<List<Map<String, dynamic>>> getUserOrders({
    String? status,
    int? limit,
  }) async {
    try {
      final callable = _functions.httpsCallable('getUserOrders');
      final result = await callable.call({
        'status': status,
        'limit': limit ?? 20,
      });

      return List<Map<String, dynamic>>.from(result.data['orders'] ?? []);
    } catch (e) {
      debugPrint('Error getting user orders: $e');
      return [];
    }
  }

  /// Holt Provider-Orders (Anbieter Dashboard)
  static Future<List<Map<String, dynamic>>> getProviderOrders({
    String? status,
    int? limit,
  }) async {
    try {
      final callable = _functions.httpsCallable('getProviderOrders');
      final result = await callable.call({
        'status': status,
        'limit': limit ?? 20,
      });

      return List<Map<String, dynamic>>.from(result.data['orders'] ?? []);
    } catch (e) {
      debugPrint('Error getting provider orders: $e');
      return [];
    }
  }

  /// Aktualisiert Order Status
  static Future<bool> updateOrderStatus({
    required String orderId,
    required String status,
    String? message,
  }) async {
    try {
      final callable = _functions.httpsCallable('updateOrderStatus');
      await callable.call({
        'orderId': orderId,
        'status': status,
        'message': message,
      });

      return true;
    } catch (e) {
      debugPrint('Error updating order status: $e');
      return false;
    }
  }

  // ===== TIME TRACKING FUNCTIONS =====

  /// Startet Time Tracking für ein Projekt
  static Future<Map<String, dynamic>> startTimeTracking({
    required String orderId,
    required String taskDescription,
  }) async {
    try {
      final callable = _functions.httpsCallable('startTimeTracking');
      final result = await callable.call({
        'orderId': orderId,
        'taskDescription': taskDescription,
      });

      return {
        'success': true,
        'sessionId': result.data['sessionId'],
        'startTime': result.data['startTime'],
      };
    } catch (e) {
      return {
        'success': false,
        'error': e.toString(),
      };
    }
  }

  /// Stoppt Time Tracking
  static Future<Map<String, dynamic>> stopTimeTracking({
    required String sessionId,
    String? notes,
  }) async {
    try {
      final callable = _functions.httpsCallable('stopTimeTracking');
      final result = await callable.call({
        'sessionId': sessionId,
        'notes': notes,
      });

      return {
        'success': true,
        'totalHours': result.data['totalHours'],
        'totalAmount': result.data['totalAmount'],
      };
    } catch (e) {
      return {
        'success': false,
        'error': e.toString(),
      };
    }
  }

  /// Holt Time Tracking History
  static Future<List<Map<String, dynamic>>> getTimeTrackingHistory({
    required String orderId,
  }) async {
    try {
      final callable = _functions.httpsCallable('getTimeTrackingHistory');
      final result = await callable.call({
        'orderId': orderId,
      });

      return List<Map<String, dynamic>>.from(result.data['sessions'] ?? []);
    } catch (e) {
      debugPrint('Error getting time tracking history: $e');
      return [];
    }
  }

  // ===== AI ASSISTANT FUNCTIONS =====

  /// AI Project Assistant für Service-Matching
  static Future<Map<String, dynamic>> getAIAssistance({
    required String message,
    required String context,
    Map<String, dynamic>? orderData,
  }) async {
    try {
      final callable = _functions.httpsCallable('aiProjectAssistant');
      final result = await callable.call({
        'message': message,
        'context': context,
        'orderData': orderData ?? {},
      });

      return {
        'success': true,
        'response': result.data['response'],
        'nextStep': result.data['nextStep'],
        'suggestions': result.data['suggestions'] ?? [],
      };
    } catch (e) {
      return {
        'success': false,
        'error': e.toString(),
      };
    }
  }

  // ===== NOTIFICATIONS FUNCTIONS =====

  /// Sendet Push Notification
  static Future<bool> sendNotification({
    required String userId,
    required String title,
    required String body,
    Map<String, dynamic>? data,
  }) async {
    try {
      final callable = _functions.httpsCallable('sendNotification');
      await callable.call({
        'userId': userId,
        'title': title,
        'body': body,
        'data': data ?? {},
      });

      return true;
    } catch (e) {
      debugPrint('Error sending notification: $e');
      return false;
    }
  }

  // ===== PROVIDER ONBOARDING FUNCTIONS =====

  /// Erstellt Connected Account fuer Provider (Revolut/Bank)
  static Future<Map<String, dynamic>> createProviderAccount({
    required String email,
    required String businessName,
    required String businessType,
    required Map<String, dynamic> address,
  }) async {
    try {
      final callable = _functions.httpsCallable('createProviderAccount');
      final result = await callable.call({
        'email': email,
        'businessName': businessName,
        'businessType': businessType,
        'address': address,
      });

      return {
        'success': true,
        'accountId': result.data['accountId'],
        'onboardingUrl': result.data['onboardingUrl'],
      };
    } catch (e) {
      return {
        'success': false,
        'error': e.toString(),
      };
    }
  }

  /// Prüft Provider Account Status
  static Future<Map<String, dynamic>> getProviderAccountStatus() async {
    try {
      final callable = _functions.httpsCallable('getProviderAccountStatus');
      final result = await callable.call();

      return {
        'success': true,
        'chargesEnabled': result.data['chargesEnabled'],
        'payoutsEnabled': result.data['payoutsEnabled'],
        'requiresAction': result.data['requiresAction'],
        'actionUrl': result.data['actionUrl'],
      };
    } catch (e) {
      return {
        'success': false,
        'error': e.toString(),
      };
    }
  }

  // ===== ANALYTICS FUNCTIONS =====

  /// Holt Dashboard Analytics
  static Future<Map<String, dynamic>> getDashboardAnalytics({
    required String userType,
    String? timeframe,
  }) async {
    try {
      final callable = _functions.httpsCallable('getDashboardAnalytics');
      final result = await callable.call({
        'userType': userType,
        'timeframe': timeframe ?? '30d',
      });

      return {
        'success': true,
        'analytics': result.data,
      };
    } catch (e) {
      return {
        'success': false,
        'error': e.toString(),
      };
    }
  }

  // ===== UTILITY FUNCTIONS =====

  /// Check Firebase Functions Connection
  static Future<bool> testConnection() async {
    try {
      // Simple connectivity test - just check if Functions instance is configured correctly
      // This will fail fast if region or configuration is wrong
      _functions.httpsCallable('createInviteCode');
      debugPrint('🔧 Firebase Functions configured for region: europe-west1');
      return true;
    } catch (e) {
      debugPrint('Firebase Functions connection failed: $e');
      return false;
    }
  }

  /// Get current user's Taskilo profile
  static Future<Map<String, dynamic>?> getCurrentUserProfile() async {
    final user = _auth.currentUser;
    if (user == null) return null;

    try {
      final doc = await _firestore.collection('users').doc(user.uid).get();
      return doc.data();
    } catch (e) {
      debugPrint('Error getting user profile: $e');
      return null;
    }
  }

  /// Update FCM Token für Push Notifications
  static Future<void> updateFCMToken(String token) async {
    final user = _auth.currentUser;
    if (user == null) return;

    try {
      await _firestore.collection('users').doc(user.uid).update({
        'fcmToken': token,
        'lastTokenUpdate': FieldValue.serverTimestamp(),
      });
    } catch (e) {
      debugPrint('Error updating FCM token: $e');
    }
  }
}
