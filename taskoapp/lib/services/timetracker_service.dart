// /Users/andystaudinger/Tasko/taskoapp/lib/services/timetracker_service.dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:firebase_auth/firebase_auth.dart';

class TimeTrackerService {
  static const String baseUrl = 'https://taskilo.de/api';
  
  /// Genehmigt Stunden für einen Auftrag
  /// 
  /// [orderId] - ID des Auftrags
  /// [timeEntryIds] - Liste der zu genehmigenden TimeEntry IDs
  /// [paymentMethod] - Optional: Zahlungsmethode für zusätzliche Stunden
  static Future<Map<String, dynamic>> approveHours({
    required String orderId,
    required List<String> timeEntryIds,
    String? paymentMethod,
  }) async {
    try {
      // 1. Firebase Auth Token holen
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) {
        throw Exception('Benutzer ist nicht angemeldet');
      }

      final idToken = await user.getIdToken();

      // 2. API Request
      final response = await http.post(
        Uri.parse('$baseUrl/timetracker/approve-hours'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $idToken',
        },
        body: jsonEncode({
          'orderId': orderId,
          'timeEntryIds': timeEntryIds,
          if (paymentMethod != null) 'paymentMethod': paymentMethod,
        }),
      );

      // 3. Response verarbeiten
      final responseData = jsonDecode(response.body);

      if (response.statusCode == 200) {
        return {
          'success': true,
          'data': responseData,
        };
      } else {
        return {
          'success': false,
          'error': responseData['error'] ?? 'Unbekannter Fehler',
          'statusCode': response.statusCode,
        };
      }
    } catch (e) {
      return {
        'success': false,
        'error': 'Netzwerkfehler: $e',
      };
    }
  }

  /// Lädt TimeTracking Daten für einen Auftrag
  static Future<Map<String, dynamic>> getTimeTrackingData({
    required String orderId,
  }) async {
    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) {
        throw Exception('Benutzer ist nicht angemeldet');
      }

      final idToken = await user.getIdToken();

      final response = await http.get(
        Uri.parse('$baseUrl/timetracker/order/$orderId'),
        headers: {
          'Authorization': 'Bearer $idToken',
        },
      );

      final responseData = jsonDecode(response.body);

      if (response.statusCode == 200) {
        return {
          'success': true,
          'data': responseData,
        };
      } else {
        return {
          'success': false,
          'error': responseData['error'] ?? 'Fehler beim Laden der Daten',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'error': 'Netzwerkfehler: $e',
      };
    }
  }

  /// Erstellt einen Payment Intent für zusätzliche Stunden
  static Future<Map<String, dynamic>> createPaymentForAdditionalHours({
    required String orderId,
    required List<String> timeEntryIds,
    required int totalAmountInCents,
  }) async {
    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) {
        throw Exception('Benutzer ist nicht angemeldet');
      }

      final idToken = await user.getIdToken();

      final response = await http.post(
        Uri.parse('$baseUrl/timetracker/create-payment'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $idToken',
        },
        body: jsonEncode({
          'orderId': orderId,
          'timeEntryIds': timeEntryIds,
          'totalAmount': totalAmountInCents,
        }),
      );

      final responseData = jsonDecode(response.body);

      if (response.statusCode == 200) {
        return {
          'success': true,
          'data': responseData,
        };
      } else {
        return {
          'success': false,
          'error': responseData['error'] ?? 'Fehler bei der Zahlungserstellung',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'error': 'Netzwerkfehler: $e',
      };
    }
  }
}
