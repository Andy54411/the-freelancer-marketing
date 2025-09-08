import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:firebase_auth/firebase_auth.dart';
import '../utils/api_config.dart';

/// Service für TimeTracker-Funktionen
/// 
/// Verwendet die existierende Web-API anstatt duplicate APIs zu erstellen
class TimeTrackerService {
  
  /// Genehmigt Stunden für einen Auftrag mit automatischer Stripe-Zahlung
  /// 
  /// Diese Methode verwendet die existierende Web-API /api/bill-additional-hours
  /// die bereits alle Payment-Funktionen implementiert hat
  /// 
  /// [orderId] - ID des Auftrags
  /// [timeEntryIds] - Liste der zu genehmigenden TimeEntry IDs
  static Future<Map<String, dynamic>> approveHours({
    required String orderId,
    required List<String> timeEntryIds,
  }) async {
    try {
      // 1. Firebase Auth Token holen
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) {
        throw Exception('Benutzer ist nicht angemeldet');
      }

      final idToken = await user.getIdToken();

      // 2. API Request an die existierende Web-API
      final response = await http.post(
        Uri.parse(ApiConfig.billAdditionalHoursEndpoint),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $idToken',
        },
        body: jsonEncode({
          'orderId': orderId,
          'approvedEntryIds': timeEntryIds, // Die Web-API erwartet "approvedEntryIds"
          // customerStripeId und providerStripeAccountId werden automatisch aus der Order geladen
        }),
      );

      // 3. Response verarbeiten
      if (response.statusCode == 200) {
        final responseData = jsonDecode(response.body);
        
        return {
          'success': true,
          'data': {
            'totalHours': timeEntryIds.length, // Approximation - könnte aus Response berechnet werden
            'paymentRequired': true, // Immer true bei zusätzlichen Stunden
            'totalAmount': responseData['totalAmountTransferred'] ?? 0,
            'transferId': responseData['transferId'],
            'message': 'Stunden wurden erfolgreich freigegeben und bezahlt',
          }
        };
      } else {
        final responseData = jsonDecode(response.body);
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

  /// HINWEIS: Weitere TimeTracker-Funktionen wie getTimeTrackingData()
  /// werden direkt über Firestore geladen, da sie keine speziellen API-Calls benötigen.
  /// Siehe _loadTimeTrackingData() in order_detail_screen.dart
}
