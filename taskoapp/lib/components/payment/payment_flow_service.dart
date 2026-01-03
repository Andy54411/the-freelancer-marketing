import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cloud_firestore/cloud_firestore.dart' as firestore;
import '../../models/user_model.dart';
import '../../models/order.dart' as models;
import 'payment_dialog.dart';
import 'payment_loading_dialog.dart';
import 'payment_success_dialog.dart';

/// Service für komplette Payment-Abwicklung mit UI
/// 
/// Verwaltet den gesamten Payment-Flow von Dialog bis zur finalen Bestätigung
class PaymentFlowService {
  /// Startet den kompletten Payment-Flow für zusätzliche Stunden
  /// 
  /// [context] - Build Context für Dialoge
  /// [order] - Auftrag für den die Zahlung erfolgt
  /// [totalAmountInCents] - Gesamtbetrag in Cents
  /// [totalHours] - Anzahl der zu bezahlenden Stunden
  /// [onSuccess] - Callback bei erfolgreichem Payment
  static Future<void> startPaymentFlow(
    BuildContext context, {
    required models.Order order,
    required int totalAmountInCents,
    required int totalHours,
    VoidCallback? onSuccess,
  }) async {
    // SCHRITT 1: Zeige Payment Dialog
    await PaymentDialog.show(
      context,
      totalAmountInCents: totalAmountInCents,
      totalHours: totalHours,
      onPayNow: () => _processPayment(
        context,
        order: order,
        totalAmountInCents: totalAmountInCents,
        totalHours: totalHours,
        onSuccess: onSuccess,
      ),
      onPayLater: () {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Payment wurde verschoben. Sie können später bezahlen.'),
            backgroundColor: Colors.orange,
          ),
        );
      },
    );
  }

  /// Private Methode: Verarbeitet das Payment
  static Future<void> _processPayment(
    BuildContext context, {
    required models.Order order,
    required int totalAmountInCents,
    required int totalHours,
    VoidCallback? onSuccess,
  }) async {
    if (!context.mounted) return;
    
    // SCHRITT 2: Zeige Loading Dialog
    await PaymentLoadingDialog.show(context);

    try {
      // Sammle TimeEntry IDs für das Payment
      final timeTrackingData = await _loadTimeTrackingData(order.id);
      final timeEntries = timeTrackingData['timeEntries'] as List<dynamic>?;
      final timeEntryIds = <String>[];
      
      if (timeEntries != null) {
        for (final entry in timeEntries) {
          if (entry['status'] == 'logged' && entry['category'] == 'additional') {
            timeEntryIds.add(entry['id'] as String);
          }
        }
      }

      if (timeEntryIds.isEmpty) {
        if (!context.mounted) return;
        PaymentLoadingDialog.hide(context); // Schließe Loading Dialog
        
        if (!context.mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('❌ Keine zusätzlichen Stunden zum Bezahlen gefunden'),
            backgroundColor: Colors.red,
          ),
        );
        return;
      }

      // Hole User ID für Payment
      if (!context.mounted) return;
      final currentUser = Provider.of<TaskiloUser?>(context, listen: false);
      if (currentUser == null) {
        if (!context.mounted) return;
        PaymentLoadingDialog.hide(context);
        
        if (!context.mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('❌ Benutzerinformationen nicht verfügbar'),
            backgroundColor: Colors.red,
          ),
        );
        return;
      }

      debugPrint('Creating Payment for ${timeEntryIds.length} time entries...');
      debugPrint('Amount: $totalAmountInCents cents for ${totalHours}h');

      // SCHRITT 3: Erstelle Payment ueber die Escrow API
      // Hinweis: Payment erfolgt jetzt ueber Revolut API mit WebView/Browser
      final paymentResult = await _createEscrowPayment(
        orderId: order.id,
        timeEntryIds: timeEntryIds,
        totalAmountInCents: totalAmountInCents,
        totalHours: totalHours,
        customerId: currentUser.uid,
        providerId: order.selectedAnbieterId,
      );

      if (!context.mounted) return;
      PaymentLoadingDialog.hide(context); // Schließe Loading Dialog

      // SCHRITT 4: Verarbeite Payment Result
      if (paymentResult['success']) {
        final paymentData = paymentResult['data'];
        
        debugPrint('Payment created: ${paymentData['orderId']}');
        
        // SCHRITT 5: Zeige Payment Success Dialog
        await PaymentSuccessDialog.show(
          context,
          paymentData: paymentData,
          timeEntryIds: timeEntryIds,
          totalHours: totalHours,
        );
      } else {
        if (!context.mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Payment-Erstellung fehlgeschlagen: ${paymentResult['error']}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      if (!context.mounted) return;
      PaymentLoadingDialog.hide(context);
      
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Fehler beim Payment: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  /// Erstellt ein Escrow-Payment ueber die API
  static Future<Map<String, dynamic>> _createEscrowPayment({
    required String orderId,
    required List<String> timeEntryIds,
    required int totalAmountInCents,
    required int totalHours,
    required String customerId,
    required String providerId,
  }) async {
    try {
      // Erstelle Escrow-Payment in Firestore
      // Das Backend erstellt die Revolut-Order und liefert checkoutUrl
      final escrowRef = firestore.FirebaseFirestore.instance
          .collection('escrowPayments')
          .doc();
      
      await escrowRef.set({
        'orderId': orderId,
        'timeEntryIds': timeEntryIds,
        'totalAmountInCents': totalAmountInCents,
        'totalHours': totalHours,
        'customerId': customerId,
        'providerId': providerId,
        'status': 'pending',
        'paymentMethod': 'revolut',
        'createdAt': firestore.FieldValue.serverTimestamp(),
      });
      
      return {
        'success': true,
        'data': {
          'orderId': escrowRef.id,
          'customerPays': totalAmountInCents,
          'checkoutUrl': 'https://taskilo.de/payment/escrow/${escrowRef.id}',
        },
      };
    } catch (e) {
      debugPrint('Error creating escrow payment: $e');
      return {
        'success': false,
        'error': e.toString(),
      };
    }
  }

  /// Private Hilfsmethode: Laedt TimeTracking-Daten
  static Future<Map<String, dynamic>> _loadTimeTrackingData(String orderId) async {
    try {
      // Lade Order-Daten aus Firestore
      final orderDoc = await firestore.FirebaseFirestore.instance
          .collection('auftraege')
          .doc(orderId)
          .get();

      if (!orderDoc.exists) {
        return {};
      }

      final orderData = orderDoc.data()!;
      final timeTracking = orderData['timeTracking'] as Map<String, dynamic>? ?? {};
      
      return timeTracking;
    } catch (e) {
      debugPrint('Fehler beim Laden der TimeTracking-Daten: $e');
      return {};
    }
  }
}
