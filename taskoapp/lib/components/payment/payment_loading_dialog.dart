import 'package:flutter/material.dart';
import '../../utils/colors.dart';

/// Loading Dialog für Payment-Prozess
class PaymentLoadingDialog {
  /// Zeigt Loading Dialog
  static Future<void> show(BuildContext context) async {
    return showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (context) => const AlertDialog(
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircularProgressIndicator(
              valueColor: AlwaysStoppedAnimation<Color>(TaskiloColors.primary),
            ),
            SizedBox(height: 16),
            Text('Payment wird vorbereitet...'),
          ],
        ),
      ),
    );
  }

  /// Schließt Loading Dialog
  static void hide(BuildContext context) {
    if (Navigator.canPop(context)) {
      Navigator.pop(context);
    }
  }
}
