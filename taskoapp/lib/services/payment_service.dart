import 'package:flutter/material.dart';
import 'package:flutter_stripe/flutter_stripe.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'firebase_functions_service.dart';

/// Taskilo Payment Service
/// Implementiert alle 3 Payment-Systeme: B2C, B2B, Stunden-Abrechnung
class TaskiloPaymentService {
  
  // ===== B2C FESTPREIS PAYMENTS =====
  
  /// Erstellt und verarbeitet B2C Festpreis-Payment
  /// Für: Handwerker, Reinigung, lokale Services
  static Future<PaymentResult> processB2CPayment({
    required String providerId,
    required String serviceTitle,
    required String serviceDescription,
    required double amount,
    String currency = 'EUR',
    Map<String, dynamic>? metadata,
  }) async {
    try {
      debugPrint('🔄 Starting B2C Payment: €${amount.toStringAsFixed(2)}');
      
      // 1. Erstelle Payment Intent via Firebase Function
      final paymentData = await FirebaseFunctionsService.createB2CPayment(
        providerId: providerId,
        serviceTitle: serviceTitle,
        serviceDescription: serviceDescription,
        amount: amount,
        currency: currency.toLowerCase(),
        metadata: metadata,
      );

      if (!paymentData['success']) {
        return PaymentResult.failure('Payment creation failed: ${paymentData['error']}');
      }

      // 2. Initialisiere Stripe Payment Sheet
      await Stripe.instance.initPaymentSheet(
        paymentSheetParameters: SetupPaymentSheetParameters(
          paymentIntentClientSecret: paymentData['clientSecret'],
          merchantDisplayName: 'Taskilo',
          allowsDelayedPaymentMethods: false,
          style: ThemeMode.system,
        ),
      );

      // 3. Zeige Payment Sheet
      await Stripe.instance.presentPaymentSheet();

      // 4. Erfolg - Webhook erstellt automatisch die Order
      debugPrint('✅ B2C Payment successful: ${paymentData['paymentIntentId']}');
      
      return PaymentResult.success(
        paymentIntentId: paymentData['paymentIntentId'],
        orderId: paymentData['orderId'],
        amount: amount,
        type: PaymentType.b2c,
      );

    } on StripeException catch (e) {
      debugPrint('❌ Stripe Error: ${e.error}');
      return PaymentResult.failure('Payment cancelled or failed: ${e.error.localizedMessage}');
    } catch (e) {
      debugPrint('❌ Payment Error: $e');
      return PaymentResult.failure('Payment failed: $e');
    }
  }

  // ===== B2B PROJEKT PAYMENTS =====
  
  /// Erstellt B2B Projekt-Payment mit Meilenstein-System
  /// Für: Consulting, Agenturen, größere Projekte
  static Future<PaymentResult> processB2BProjectPayment({
    required String providerId,
    required String projectTitle,
    required String projectDescription,
    required double totalAmount,
    required List<ProjectMilestone> milestones,
    String currency = 'EUR',
    Map<String, dynamic>? metadata,
  }) async {
    try {
      debugPrint('🔄 Starting B2B Project Payment: €${totalAmount.toStringAsFixed(2)}');
      
      // Konvertiere Milestones zu Map
      final milestonesData = milestones.map((m) => m.toMap()).toList();

      // 1. Erstelle B2B Project Payment
      final paymentData = await FirebaseFunctionsService.createB2BProjectPayment(
        providerId: providerId,
        projectTitle: projectTitle,
        projectDescription: projectDescription,
        totalAmount: totalAmount,
        milestones: milestonesData,
        currency: currency.toLowerCase(),
        metadata: metadata,
      );

      if (!paymentData['success']) {
        return PaymentResult.failure('B2B Payment creation failed: ${paymentData['error']}');
      }

      // 2. Setup Payment für zukünftige Meilenstein-Zahlungen
      await Stripe.instance.initPaymentSheet(
        paymentSheetParameters: SetupPaymentSheetParameters(
          paymentIntentClientSecret: paymentData['clientSecret'],
          merchantDisplayName: 'Taskilo Business',
          allowsDelayedPaymentMethods: true,
          style: ThemeMode.system,
        ),
      );

      // 3. Zeige Payment Setup
      await Stripe.instance.presentPaymentSheet();

      debugPrint('✅ B2B Project Payment setup successful: ${paymentData['projectId']}');
      
      return PaymentResult.success(
        paymentIntentId: paymentData['paymentIntentId'],
        orderId: paymentData['projectId'],
        amount: totalAmount,
        type: PaymentType.b2b,
        setupIntentId: paymentData['setupIntentId'],
      );

    } on StripeException catch (e) {
      debugPrint('❌ B2B Stripe Error: ${e.error}');
      return PaymentResult.failure('B2B Payment setup failed: ${e.error.localizedMessage}');
    } catch (e) {
      debugPrint('❌ B2B Payment Error: $e');
      return PaymentResult.failure('B2B Payment failed: $e');
    }
  }

  // ===== STUNDEN-ABRECHNUNG SYSTEM =====
  
  /// Verarbeitet Stunden-Payment für zeitbasierte Abrechnung
  /// Für: Langzeit-Projekte, flexible Arbeitszeiten
  static Future<PaymentResult> processHourlyPayment({
    required String providerId,
    required String orderId,
    required double hoursWorked,
    required double hourlyRate,
    String currency = 'EUR',
    Map<String, dynamic>? timeEntries,
  }) async {
    try {
      final totalAmount = hoursWorked * hourlyRate;
      debugPrint('🔄 Starting Hourly Payment: ${hoursWorked}h × €$hourlyRate/h = €${totalAmount.toStringAsFixed(2)}');
      
      // 1. Erstelle Hourly Payment
      final paymentData = await FirebaseFunctionsService.createHourlyPayment(
        providerId: providerId,
        orderId: orderId,
        hoursWorked: hoursWorked,
        hourlyRate: hourlyRate,
        currency: currency.toLowerCase(),
        timeEntries: timeEntries,
      );

      if (!paymentData['success']) {
        return PaymentResult.failure('Hourly Payment creation failed: ${paymentData['error']}');
      }

      // 2. Initialisiere Payment Sheet
      await Stripe.instance.initPaymentSheet(
        paymentSheetParameters: SetupPaymentSheetParameters(
          paymentIntentClientSecret: paymentData['clientSecret'],
          merchantDisplayName: 'Taskilo - Stundenabrechnung',
          allowsDelayedPaymentMethods: false,
          style: ThemeMode.system,
        ),
      );

      // 3. Zeige Payment Sheet
      await Stripe.instance.presentPaymentSheet();

      debugPrint('✅ Hourly Payment successful: ${paymentData['paymentIntentId']}');
      
      return PaymentResult.success(
        paymentIntentId: paymentData['paymentIntentId'],
        orderId: orderId,
        amount: totalAmount,
        type: PaymentType.hourly,
        billingAmount: paymentData['billingAmount'],
        hoursWorked: hoursWorked,
      );

    } on StripeException catch (e) {
      debugPrint('❌ Hourly Stripe Error: ${e.error}');
      return PaymentResult.failure('Hourly Payment failed: ${e.error.localizedMessage}');
    } catch (e) {
      debugPrint('❌ Hourly Payment Error: $e');
      return PaymentResult.failure('Hourly Payment failed: $e');
    }
  }

  // ===== PAYMENT UTILITIES =====
  
  /// Initialisiert Stripe mit Taskilo-Konfiguration
  static Future<void> initializeStripe() async {
    try {
      // Stripe Publishable Key (gleich wie im Web-Projekt)
      const stripePublishableKey = 'pk_test_51QI0YGPO27K0zZNX2F8dMYa0Uu3YNLbv9n7jhEMwZxBVvpHzQN8aeY5tCfxhEK4ZIz7bQJ7E2Q9A5E7H7V9Yt2LW00BLqAGzNm';
      
      Stripe.publishableKey = stripePublishableKey;
      await Stripe.instance.applySettings();
      
      debugPrint('✅ Stripe initialized for Taskilo');
    } catch (e) {
      debugPrint('❌ Stripe initialization failed: $e');
      rethrow; // Re-throw so main.dart can handle it
    }
  }

  /// Prüft Payment Status
  static Future<PaymentStatus> checkPaymentStatus(String paymentIntentId) async {
    try {
      // Implementierung über Firebase Function
      final functions = FirebaseFunctions.instance;
      final callable = functions.httpsCallable('checkPaymentStatus');
      final result = await callable.call({'paymentIntentId': paymentIntentId});
      
      final status = result.data['status'] as String;
      return PaymentStatus.values.firstWhere(
        (e) => e.name == status,
        orElse: () => PaymentStatus.unknown,
      );
    } catch (e) {
      debugPrint('Error checking payment status: $e');
      return PaymentStatus.unknown;
    }
  }
}

// ===== DATA MODELS =====

enum PaymentType { b2c, b2b, hourly }

enum PaymentStatus { 
  pending, 
  succeeded, 
  failed, 
  cancelled, 
  processing,
  unknown 
}

class PaymentResult {
  final bool success;
  final String? paymentIntentId;
  final String? orderId;
  final double? amount;
  final PaymentType? type;
  final String? error;
  final String? setupIntentId;
  final double? billingAmount;
  final double? hoursWorked;

  PaymentResult.success({
    required this.paymentIntentId,
    required this.orderId,
    required this.amount,
    required this.type,
    this.setupIntentId,
    this.billingAmount,
    this.hoursWorked,
  }) : success = true, error = null;

  PaymentResult.failure(this.error) 
    : success = false,
      paymentIntentId = null,
      orderId = null,
      amount = null,
      type = null,
      setupIntentId = null,
      billingAmount = null,
      hoursWorked = null;
}

class ProjectMilestone {
  final String title;
  final String description;
  final double amount;
  final DateTime dueDate;
  final bool isPaid;

  ProjectMilestone({
    required this.title,
    required this.description,
    required this.amount,
    required this.dueDate,
    this.isPaid = false,
  });

  Map<String, dynamic> toMap() {
    return {
      'title': title,
      'description': description,
      'amount': (amount * 100).round(), // Convert to cents
      'dueDate': dueDate.toIso8601String(),
      'isPaid': isPaid,
    };
  }

  factory ProjectMilestone.fromMap(Map<String, dynamic> map) {
    return ProjectMilestone(
      title: map['title'] ?? '',
      description: map['description'] ?? '',
      amount: (map['amount'] ?? 0) / 100.0, // Convert from cents
      dueDate: DateTime.parse(map['dueDate']),
      isPaid: map['isPaid'] ?? false,
    );
  }
}
