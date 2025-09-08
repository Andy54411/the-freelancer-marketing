import 'package:flutter/material.dart';
import '../../utils/colors.dart';

/// Dialog für Payment-Bestätigung
class PaymentDialog {
  /// Zeigt Payment-Bestätigungsdialog
  static Future<void> show(
    BuildContext context, {
    required int totalAmountInCents,
    required int totalHours,
    required VoidCallback onPayNow,
    required VoidCallback onPayLater,
  }) async {
    final amountInEuro = totalAmountInCents / 100.0;
    
    return showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.payment, color: TaskiloColors.primary),
            SizedBox(width: 8),
            Text('💳 Zusätzliche Zahlung erforderlich'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Für die ${totalHours}h zusätzliche Arbeitszeit ist eine Zahlung erforderlich:',
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: TaskiloColors.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: TaskiloColors.primary),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    '${totalHours}h zusätzlich:',
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                  Text(
                    '€${amountInEuro.toStringAsFixed(2)}',
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 18,
                      color: TaskiloColors.primary,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Nach der Zahlung werden die Stunden automatisch freigegeben und das Geld an den Anbieter ausgezahlt.',
              style: TextStyle(fontSize: 12, color: Colors.grey),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              onPayLater();
            },
            child: const Text('Später bezahlen'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              onPayNow();
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
}
