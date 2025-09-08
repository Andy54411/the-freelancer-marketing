import 'package:flutter/material.dart';
import '../../utils/colors.dart';

/// Wiederverwendbare Payment Dialog Component
/// 
/// Zeigt einen Dialog für die Zahlung zusätzlicher Stunden an
class PaymentDialog extends StatelessWidget {
  final int totalAmountInCents;
  final int totalHours;
  final VoidCallback onPayNow;
  final VoidCallback? onPayLater;

  const PaymentDialog({
    super.key,
    required this.totalAmountInCents,
    required this.totalHours,
    required this.onPayNow,
    this.onPayLater,
  });

  /// Static Methode um den Dialog zu zeigen
  static Future<void> show(
    BuildContext context, {
    required int totalAmountInCents,
    required int totalHours,
    required VoidCallback onPayNow,
    VoidCallback? onPayLater,
  }) {
    return showDialog(
      context: context,
      builder: (context) => PaymentDialog(
        totalAmountInCents: totalAmountInCents,
        totalHours: totalHours,
        onPayNow: onPayNow,
        onPayLater: onPayLater,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final amountInEuro = totalAmountInCents / 100.0;
    
    return AlertDialog(
      title: const Text('💳 Zusätzliche Zahlung erforderlich'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Für die ${totalHours}h zusätzliche Arbeitszeit ist eine Zahlung erforderlich:'),
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
            onPayLater?.call();
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
    );
  }
}
