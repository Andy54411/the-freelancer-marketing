import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../utils/colors.dart';

/// Success Dialog mit Payment Weiterleitung
/// Hinweis: Stripe wurde entfernt - Zahlung erfolgt via Revolut WebView/Browser
class PaymentSuccessDialog {
  /// Zeigt Success Dialog nach Payment Erstellung
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
            Text('Payment bereit'),
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
                  Text('${totalHours}h zusaetzliche Stunden'),
                  Text('EUR ${(paymentData['customerPays'] / 100).toStringAsFixed(2)} Zahlbetrag'),
                  Text('Payment ID: ${paymentData['orderId'].toString().substring(0, 15)}...'),
                ],
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Klicken Sie auf "Jetzt bezahlen", um zur Zahlungsseite weitergeleitet zu werden.',
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
              await _processPayment(context, paymentData);
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

  /// Oeffnet die Zahlungsseite im Browser/WebView
  static Future<void> _processPayment(
    BuildContext context,
    Map<String, dynamic> paymentData,
  ) async {
    try {
      final checkoutUrl = paymentData['checkoutUrl'] as String?;
      
      if (checkoutUrl == null || checkoutUrl.isEmpty) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Keine Zahlungs-URL verfuegbar'),
              backgroundColor: Colors.red,
            ),
          );
        }
        return;
      }

      // Oeffne Zahlungsseite im Browser
      final uri = Uri.parse(checkoutUrl);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
        
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Zahlungsseite geoeffnet. Bitte schliessen Sie die Zahlung ab.'),
              backgroundColor: Colors.green,
              duration: Duration(seconds: 5),
            ),
          );
        }
      } else {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Zahlungsseite konnte nicht geoeffnet werden'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }

    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Payment Fehler: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }
}
