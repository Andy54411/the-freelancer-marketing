import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../utils/api_config.dart';
import 'package:firebase_auth/firebase_auth.dart';

/// Service für Quote-Zahlungen in der Flutter App
/// Verbindet sich mit der API für Quote Payment Intent Creation
class QuotePaymentService {
  static const String _baseUrl = ApiConfig.baseUrl;
  
  /// Erstellt ein Payment Intent für Quote-Zahlung
  /// 
  /// [quoteId] - Die Quote-ID
  /// [proposalId] - Die Proposal-ID (ID des angenommenen Angebots)
  /// [amount] - Betrag als double (in Euro)
  /// [quoteTitle] - Titel der Quote
  /// [companyName] - Name des Unternehmens
  static Future<Map<String, dynamic>> createQuotePaymentIntent({
    required String quoteId,
    required String proposalId,
    required double amount,
    required String quoteTitle,
    required String companyName,
  }) async {
    try {
      debugPrint('🔄 Creating Quote Payment Intent...');
      debugPrint('📊 Quote: $quoteId, Proposal: $proposalId, Amount: €${amount.toStringAsFixed(2)}');
      
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) {
        throw Exception('Benutzer nicht authentifiziert');
      }
      
      final token = await user.getIdToken();
      final uid = user.uid;
      
      final response = await http.post(
        Uri.parse('$_baseUrl/api/user/$uid/quotes/received/$quoteId/payment'),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'proposalId': proposalId,
          'quoteTitle': quoteTitle,
          'quoteDescription': 'Zahlung für angenommenes Angebot',
          'amount': amount,
          'currency': 'eur',
          'companyName': companyName,
          'customerFirebaseId': uid,
          // customerStripeId wird automatisch geholt oder erstellt
        }),
      );
      
      debugPrint('📡 Quote Payment API Response: ${response.statusCode}');
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        debugPrint('✅ Quote Payment Intent created successfully');
        return {
          'success': true,
          'clientSecret': data['clientSecret'],
          'paymentIntentId': data['paymentIntentId'],
          'paymentDetails': data['paymentDetails'],
        };
      } else {
        final errorData = jsonDecode(response.body);
        debugPrint('❌ Quote Payment API Error: ${response.statusCode}');
        debugPrint('❌ Error details: $errorData');
        throw Exception(errorData['error'] ?? 'Unbekannter Fehler bei der Quote-Zahlung');
      }
    } catch (e) {
      debugPrint('❌ Quote Payment Service Error: $e');
      return {
        'success': false,
        'error': e.toString(),
      };
    }
  }
  
  /// Bestätigt eine erfolgreiche Quote-Zahlung
  /// Dies wird normalerweise automatisch durch den Stripe Webhook erledigt
  static Future<Map<String, dynamic>> confirmQuotePayment({
    required String quoteId,
    required String paymentIntentId,
  }) async {
    try {
      debugPrint('🔄 Confirming Quote Payment...');
      
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) {
        throw Exception('Benutzer nicht authentifiziert');
      }
      
      final token = await user.getIdToken();
      final uid = user.uid;
      
      final response = await http.patch(
        Uri.parse('$_baseUrl/api/user/$uid/quotes/received/$quoteId/payment'),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'paymentIntentId': paymentIntentId,
          'status': 'completed',
        }),
      );
      
      debugPrint('📡 Quote Payment Confirmation Response: ${response.statusCode}');
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        debugPrint('✅ Quote Payment confirmed successfully');
        return {
          'success': true,
          'orderId': data['orderId'],
          'message': data['message'],
        };
      } else {
        final errorData = jsonDecode(response.body);
        debugPrint('❌ Quote Payment Confirmation Error: ${response.statusCode}');
        throw Exception(errorData['error'] ?? 'Fehler bei der Zahlungsbestätigung');
      }
    } catch (e) {
      debugPrint('❌ Quote Payment Confirmation Error: $e');
      return {
        'success': false,
        'error': e.toString(),
      };
    }
  }
}
