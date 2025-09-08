import 'package:flutter/material.dart';
import 'package:flutter_stripe/flutter_stripe.dart';
import '../../utils/colors.dart';

/// Success Dialog mit Stripe PaymentSheet
class PaymentSuccessDialog {
  /// Zeigt Success Dialog nach Payment Intent Erstellung
  static Future<void> show(
    BuildContext context, {
    required Map<String, dynamic> paymentData,
    required List<String> timeEntryIds,
    required int totalHours,
  }) async {
    return showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.payment, color: Colors.green),
            SizedBox(width: 8),
            Text('💳 Payment bereit'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Das Payment wurde erfolgreich vorbereitet!'),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.green.shade50,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.green.shade200),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('✅ ${totalHours}h zusätzliche Stunden'),
                  Text('✅ €${(paymentData['customerPays'] / 100).toStringAsFixed(2)} Zahlbetrag'),
                  Text('✅ Payment ID: ${paymentData['paymentIntentId'].substring(0, 15)}...'),
                ],
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Klicken Sie auf "Jetzt bezahlen", um das Stripe Payment Sheet zu öffnen.',
              style: TextStyle(fontSize: 12, color: Colors.grey),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Abbrechen'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(context);
              await _processStripePayment(context, paymentData);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: TaskiloColors.primary,
            ),
            child: const Text('Jetzt bezahlen'),
          ),
        ],
      ),
    );
  }

  /// Verarbeitet Stripe PaymentSheet
  static Future<void> _processStripePayment(
    BuildContext context,
    Map<String, dynamic> paymentData,
  ) async {
    try {
      // 1. Initialize PaymentSheet
      await Stripe.instance.initPaymentSheet(
        paymentSheetParameters: SetupPaymentSheetParameters(
          paymentIntentClientSecret: paymentData['clientSecret'],
          merchantDisplayName: 'Taskilo - Zusätzliche Stunden',
          allowsDelayedPaymentMethods: false,
          style: ThemeMode.system,
        ),
      );

      // 2. Present PaymentSheet
      await Stripe.instance.presentPaymentSheet();

      // 3. Payment successful - show success message
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✅ Zahlung erfolgreich! Die Stunden werden automatisch freigegeben.'),
            backgroundColor: Colors.green,
            duration: Duration(seconds: 5),
          ),
        );
        // Note: Der weitere Prozess wird durch Webhooks automatisch abgewickelt
      }

    } on StripeException catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('❌ Stripe Fehler: ${e.error.localizedMessage}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('❌ Payment Fehler: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }
}
