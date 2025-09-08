import 'package:flutter/material.dart';
import '../../utils/colors.dart';

/// Wiederverwendbare Payment Success Dialog Component
/// 
/// Zeigt einen Success-Dialog nach erfolgreicher Payment-Erstellung an
class PaymentSuccessDialog extends StatelessWidget {
  final Map<String, dynamic> paymentData;
  final List<String> timeEntryIds;
  final int totalHours;
  final VoidCallback onConfirmPayment;

  const PaymentSuccessDialog({
    super.key,
    required this.paymentData,
    required this.timeEntryIds,
    required this.totalHours,
    required this.onConfirmPayment,
  });

  /// Static Methode um den Dialog zu zeigen
  static Future<void> show(
    BuildContext context, {
    required Map<String, dynamic> paymentData,
    required List<String> timeEntryIds,
    required int totalHours,
    required VoidCallback onConfirmPayment,
  }) {
    return showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => PaymentSuccessDialog(
        paymentData: paymentData,
        timeEntryIds: timeEntryIds,
        totalHours: totalHours,
        onConfirmPayment: onConfirmPayment,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Row(
        children: [
          Icon(Icons.payment, color: Colors.green.shade600),
          const SizedBox(width: 8),
          const Text('💳 Payment bereit'),
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
                Text('✅ €${(paymentData['totalAmount'] / 100).toStringAsFixed(2)} Zahlbetrag'),
                Text('✅ Payment ID: ${paymentData['paymentIntentId'].substring(0, 15)}...'),
              ],
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            'Das Payment wird jetzt automatisch verarbeitet. Die Stunden werden freigegeben und das Geld an den Anbieter ausgezahlt.',
            style: TextStyle(fontSize: 12, color: Colors.grey),
          ),
        ],
      ),
      actions: [
        ElevatedButton(
          onPressed: () {
            Navigator.pop(context);
            onConfirmPayment();
          },
          style: ElevatedButton.styleFrom(
            backgroundColor: TaskiloColors.primary,
          ),
          child: const Text('Payment bestätigen'),
        ),
      ],
    );
  }
}
