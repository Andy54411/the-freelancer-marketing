import 'package:flutter/material.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'firebase_functions_service.dart';

/// Taskilo Payment Service
/// Implementiert Payments via Revolut API (ueber Web-Redirect)
/// Hinweis: Stripe wurde entfernt - alle Zahlungen laufen jetzt ueber Revolut
class TaskiloPaymentService {
  
  // ===== B2C FESTPREIS PAYMENTS =====
  
  /// Erstellt B2C Festpreis-Payment
  /// Fuer: Handwerker, Reinigung, lokale Services
  /// Hinweis: Zahlung erfolgt via WebView/Browser Redirect zu Revolut
  static Future<PaymentResult> processB2CPayment({
    required String providerId,
    required String serviceTitle,
    required String serviceDescription,
    required double amount,
    String currency = 'EUR',
    Map<String, dynamic>? metadata,
  }) async {
    try {
      debugPrint('Starting B2C Payment: EUR ${amount.toStringAsFixed(2)}');
      
      // Erstelle Payment via Firebase Function (Revolut Order)
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

      // Bei Revolut erhalten wir eine checkoutUrl fuer WebView/Browser
      debugPrint('B2C Payment created: ${paymentData['orderId']}');
      
      return PaymentResult.success(
        paymentIntentId: paymentData['orderId'],
        orderId: null,
        amount: amount,
        type: PaymentType.b2c,
        checkoutUrl: paymentData['checkoutUrl'],
      );

    } catch (e) {
      debugPrint('Payment Error: $e');
      return PaymentResult.failure('Payment failed: $e');
    }
  }

  // ===== B2B PROJEKT PAYMENTS =====
  
  /// Erstellt B2B Projekt-Payment mit Meilenstein-System
  /// Fuer: Consulting, Agenturen, groessere Projekte
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
      debugPrint('Starting B2B Project Payment: EUR ${totalAmount.toStringAsFixed(2)}');
      
      // Konvertiere Milestones zu Map
      final milestonesData = milestones.map((m) => m.toMap()).toList();

      // Erstelle B2B Project Payment
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

      debugPrint('B2B Project Payment created: ${paymentData['projectId']}');
      
      return PaymentResult.success(
        paymentIntentId: paymentData['orderId'],
        orderId: paymentData['projectId'],
        amount: totalAmount,
        type: PaymentType.b2b,
        checkoutUrl: paymentData['checkoutUrl'],
      );

    } catch (e) {
      debugPrint('B2B Payment Error: $e');
      return PaymentResult.failure('B2B Payment failed: $e');
    }
  }

  // ===== STUNDEN-ABRECHNUNG SYSTEM =====
  
  /// Verarbeitet Stunden-Payment fuer zeitbasierte Abrechnung
  /// Fuer: Langzeit-Projekte, flexible Arbeitszeiten
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
      debugPrint('Starting Hourly Payment: ${hoursWorked}h x EUR $hourlyRate/h = EUR ${totalAmount.toStringAsFixed(2)}');
      
      // Erstelle Hourly Payment
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

      debugPrint('Hourly Payment created: ${paymentData['orderId']}');
      
      return PaymentResult.success(
        paymentIntentId: paymentData['orderId'],
        orderId: orderId,
        amount: totalAmount,
        type: PaymentType.hourly,
        billingAmount: paymentData['billingAmount'],
        hoursWorked: hoursWorked,
        checkoutUrl: paymentData['checkoutUrl'],
      );

    } catch (e) {
      debugPrint('Hourly Payment Error: $e');
      return PaymentResult.failure('Hourly Payment failed: $e');
    }
  }

  // ===== PAYMENT UTILITIES =====
  
  /// Initialisiert Payment System (Revolut - keine SDK-Initialisierung notwendig)
  static Future<void> initializePayments() async {
    try {
      debugPrint('Payment system ready (Revolut via API)');
    } catch (e) {
      debugPrint('Payment initialization failed: $e');
      rethrow;
    }
  }

  /// Prueft Payment Status
  static Future<PaymentStatus> checkPaymentStatus(String paymentId) async {
    try {
      final functions = FirebaseFunctions.instance;
      final callable = functions.httpsCallable('checkPaymentStatus');
      final result = await callable.call({'paymentId': paymentId});
      
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
  final String? checkoutUrl;
  final double? billingAmount;
  final double? hoursWorked;

  PaymentResult.success({
    required this.paymentIntentId,
    required this.orderId,
    required this.amount,
    required this.type,
    this.checkoutUrl,
    this.billingAmount,
    this.hoursWorked,
  }) : success = true, error = null;

  PaymentResult.failure(this.error) 
    : success = false,
      paymentIntentId = null,
      orderId = null,
      amount = null,
      type = null,
      checkoutUrl = null,
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
