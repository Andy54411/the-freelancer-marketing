import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../utils/api_config.dart';

/// Service für Stripe-Zahlungen in der Flutter App
/// Speziell für zusätzliche Stunden-Zahlungen optimiert
class StripePaymentService {
  static const String _baseUrl = ApiConfig.baseUrl;
  
  /// Erstellt ein Payment Intent für zusätzliche Stunden
  /// 
  /// [orderId] - Die Auftrags-ID
  /// [timeEntryIds] - Liste der freizugebenden TimeEntry IDs
  /// [totalAmountInCents] - Gesamtbetrag in Cent
  /// [totalHours] - Anzahl der zusätzlichen Stunden
  /// [customerId] - Firebase UID des Kunden
  /// [providerId] - Firebase UID des Anbieters
  static Future<Map<String, dynamic>> createAdditionalHoursPaymentIntent({
    required String orderId,
    required List<String> timeEntryIds,
    required int totalAmountInCents,
    required int totalHours,
    required String customerId,
    required String providerId,
  }) async {
    try {
      debugPrint('🔄 Creating Payment Intent for additional hours...');
      debugPrint('📊 Amount: $totalAmountInCents¢, Hours: $totalHours h');
      
      final response = await http.post(
        Uri.parse('$_baseUrl/createAdditionalHoursPaymentIntent'),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: jsonEncode({
          'orderId': orderId,
          'timeEntryIds': timeEntryIds,
          'totalAmountInCents': totalAmountInCents,
          'totalHours': totalHours,
          'customerId': customerId,
          'providerId': providerId,
          'currency': 'eur',
          'paymentType': 'additional_hours',
          'description': 'Zusätzliche Arbeitsstunden für Auftrag $orderId',
          'metadata': {
            'orderId': orderId,
            'totalHours': totalHours.toString(),
            'timeEntryCount': timeEntryIds.length.toString(),
            'paymentType': 'additional_hours',
            'platform': 'flutter_mobile',
          },
        }),
      );

      debugPrint('📡 Payment Intent Response: ${response.statusCode}');
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        
        debugPrint('✅ Payment Intent created successfully');
        debugPrint('🔑 Client Secret: ${data['clientSecret']?.substring(0, 20)}...');
        
        return {
          'success': true,
          'data': {
            'clientSecret': data['clientSecret'],
            'paymentIntentId': data['paymentIntentId'],
            'publishableKey': data['publishableKey'],
            'totalAmount': totalAmountInCents,
            'currency': 'eur',
            'orderId': orderId,
            'timeEntryIds': timeEntryIds,
            'totalHours': totalHours,
            'customerId': customerId,
            'providerId': providerId,
          }
        };
      } else {
        final errorData = jsonDecode(response.body);
        debugPrint('❌ Payment Intent creation failed: ${errorData['error']}');
        
        return {
          'success': false,
          'error': errorData['error'] ?? 'Unbekannter Fehler bei der Payment Intent Erstellung',
          'statusCode': response.statusCode,
        };
      }
    } catch (error) {
      debugPrint('❌ Payment Intent Exception: $error');
      return {
        'success': false,
        'error': 'Netzwerkfehler: $error',
      };
    }
  }

  /// Bestätigt eine erfolgreiche Zahlung und löst die Stripe Connect Auszahlung aus
  /// 
  /// [paymentIntentId] - Die Stripe Payment Intent ID
  /// [orderId] - Die Auftrags-ID
  /// [timeEntryIds] - Liste der freizugebenden TimeEntry IDs
  static Future<Map<String, dynamic>> confirmAdditionalHoursPayment({
    required String paymentIntentId,
    required String orderId,
    required List<String> timeEntryIds,
  }) async {
    try {
      debugPrint('🔄 Confirming additional hours payment...');
      debugPrint('💳 Payment Intent: $paymentIntentId');
      
      final response = await http.post(
        Uri.parse('$_baseUrl/confirmAdditionalHoursPayment'),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: jsonEncode({
          'paymentIntentId': paymentIntentId,
          'orderId': orderId,
          'timeEntryIds': timeEntryIds,
          'confirmationSource': 'flutter_mobile',
          'timestamp': DateTime.now().toIso8601String(),
        }),
      );

      debugPrint('📡 Payment Confirmation Response: ${response.statusCode}');
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        
        debugPrint('✅ Payment confirmed successfully');
        debugPrint('💰 Transfer to provider: ${data['transferAmount']}¢');
        
        return {
          'success': true,
          'data': {
            'paymentIntentId': paymentIntentId,
            'orderId': orderId,
            'timeEntryIds': timeEntryIds,
            'transferAmount': data['transferAmount'],
            'platformFee': data['platformFee'],
            'providerNetAmount': data['providerNetAmount'],
            'stripeTransferId': data['stripeTransferId'],
            'paymentStatus': data['paymentStatus'],
            'confirmedAt': data['confirmedAt'],
            'approvedHours': data['approvedHours'],
            'message': data['message'] ?? 'Zahlung erfolgreich! Stunden wurden freigegeben.',
          }
        };
      } else {
        final errorData = jsonDecode(response.body);
        debugPrint('❌ Payment confirmation failed: ${errorData['error']}');
        
        return {
          'success': false,
          'error': errorData['error'] ?? 'Unbekannter Fehler bei der Zahlungsbestätigung',
          'statusCode': response.statusCode,
        };
      }
    } catch (error) {
      debugPrint('❌ Payment Confirmation Exception: $error');
      return {
        'success': false,
        'error': 'Netzwerkfehler: $error',
      };
    }
  }

  /// Lädt den Status einer Payment Intent
  /// 
  /// [paymentIntentId] - Die Stripe Payment Intent ID
  static Future<Map<String, dynamic>> getPaymentStatus({
    required String paymentIntentId,
  }) async {
    try {
      debugPrint('🔄 Getting payment status for: $paymentIntentId');
      
      final response = await http.get(
        Uri.parse('$_baseUrl/getPaymentStatus?paymentIntentId=$paymentIntentId'),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        
        debugPrint('✅ Payment status retrieved: ${data['status']}');
        
        return {
          'success': true,
          'data': {
            'paymentIntentId': paymentIntentId,
            'status': data['status'],
            'amount': data['amount'],
            'currency': data['currency'],
            'orderId': data['orderId'],
            'createdAt': data['createdAt'],
            'confirmedAt': data['confirmedAt'],
            'lastUpdated': data['lastUpdated'],
          }
        };
      } else {
        final errorData = jsonDecode(response.body);
        debugPrint('❌ Payment status failed: ${errorData['error']}');
        
        return {
          'success': false,
          'error': errorData['error'] ?? 'Fehler beim Laden des Payment Status',
        };
      }
    } catch (error) {
      debugPrint('❌ Payment Status Exception: $error');
      return {
        'success': false,
        'error': 'Netzwerkfehler: $error',
      };
    }
  }

  /// Protokolliert eine Payment-Transaktion für Auditing-Zwecke
  /// 
  /// [paymentData] - Zahlungsdaten für die Protokollierung
  static Future<void> logPaymentTransaction({
    required Map<String, dynamic> paymentData,
  }) async {
    try {
      debugPrint('📝 Logging payment transaction...');
      
      await http.post(
        Uri.parse('$_baseUrl/logPaymentTransaction'),
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          ...paymentData,
          'loggedAt': DateTime.now().toIso8601String(),
          'platform': 'flutter_mobile',
          'version': '1.0.0',
        }),
      );
      
      debugPrint('✅ Payment transaction logged successfully');
    } catch (error) {
      debugPrint('⚠️ Payment logging failed (non-critical): $error');
      // Logging ist nicht kritisch - Fehler nicht weiterwerfen
    }
  }
}
