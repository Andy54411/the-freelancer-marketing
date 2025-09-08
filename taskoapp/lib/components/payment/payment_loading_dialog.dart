import 'package:flutter/material.dart';
import '../../utils/colors.dart';

/// Wiederverwendbare Payment Loading Dialog Component
/// 
/// Zeigt einen Loading-Dialog während der Payment-Verarbeitung an
class PaymentLoadingDialog extends StatelessWidget {
  final String message;

  const PaymentLoadingDialog({
    super.key,
    this.message = 'Payment wird vorbereitet...',
  });

  /// Static Methode um den Loading Dialog zu zeigen
  static Future<void> show(
    BuildContext context, {
    String message = 'Payment wird vorbereitet...',
  }) {
    return showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => PaymentLoadingDialog(message: message),
    );
  }

  /// Static Methode um den Dialog zu schließen
  static void hide(BuildContext context) {
    if (Navigator.canPop(context)) {
      Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const CircularProgressIndicator(
            valueColor: AlwaysStoppedAnimation<Color>(TaskiloColors.primary),
          ),
          const SizedBox(height: 16),
          Text(message),
        ],
      ),
    );
  }
}
