import 'package:flutter/material.dart';
import '../../utils/colors.dart';

/// Wiederverwendbare Final Success Dialog Component
/// 
/// Zeigt einen finalen Success-Dialog nach vollständiger Payment-Abwicklung an
class PaymentFinalSuccessDialog extends StatelessWidget {
  final Map<String, dynamic> paymentData;
  final VoidCallback? onClose;

  const PaymentFinalSuccessDialog({
    super.key,
    required this.paymentData,
    this.onClose,
  });

  /// Static Methode um den Dialog zu zeigen
  static Future<void> show(
    BuildContext context, {
    required Map<String, dynamic> paymentData,
    VoidCallback? onClose,
  }) {
    return showDialog(
      context: context,
      builder: (context) => PaymentFinalSuccessDialog(
        paymentData: paymentData,
        onClose: onClose,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Row(
        children: [
          Icon(Icons.check_circle, color: Colors.green.shade600),
          const SizedBox(width: 8),
          const Text('🎉 Erfolgreich!'),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Zahlung und Auszahlung erfolgreich abgeschlossen!'),
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
                Text('✅ Payment Intent erfolgreich erstellt'),
                Text('✅ Betrag: €${((paymentData['amount'] ?? 0) / 100).toStringAsFixed(2)}'),
                Text('✅ PaymentIntent ID: ${paymentData['paymentIntentId'] ?? 'N/A'}'),
                Text('✅ Status: Bereit zur Zahlung'),
              ],
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            'Die zusätzlichen Stunden wurden erfolgreich freigegeben und das Geld wurde direkt an das Verbundkonto des Anbieters ausgezahlt.',
            style: TextStyle(fontSize: 12, color: Colors.grey),
          ),
        ],
      ),
      actions: [
        ElevatedButton(
          onPressed: () {
            Navigator.pop(context);
            onClose?.call();
          },
          style: ElevatedButton.styleFrom(
            backgroundColor: TaskiloColors.primary,
          ),
          child: const Text('Verstanden'),
        ),
      ],
    );
  }
}
