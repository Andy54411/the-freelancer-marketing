import 'package:flutter/material.dart';
import '../screens/auth/login_screen.dart';

class LoginRequiredModal extends StatelessWidget {
  final String title;
  final String description;
  final String buttonText;
  final VoidCallback? onLoginSuccess;

  const LoginRequiredModal({
    super.key,
    this.title = 'Anmeldung erforderlich',
    this.description = 'Um mit Anbietern zu chatten oder Buchungen vorzunehmen, müssen Sie sich anmelden oder registrieren.',
    this.buttonText = 'Jetzt anmelden',
    this.onLoginSuccess,
  });

  /// Zeigt das Login Modal an
  static Future<void> show(
    BuildContext context, {
    String? title,
    String? description,
    String? buttonText,
    VoidCallback? onLoginSuccess,
  }) async {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => LoginRequiredModal(
        title: title ?? 'Anmeldung erforderlich',
        description: description ?? 'Um mit Anbietern zu chatten oder Buchungen vorzunehmen, müssen Sie sich anmelden oder registrieren.',
        buttonText: buttonText ?? 'Jetzt anmelden',
        onLoginSuccess: onLoginSuccess,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.6,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            // Handle Bar
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 24),
            
            // Lock Icon
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: const Color(0xFF14ad9f).withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(40),
              ),
              child: const Icon(
                Icons.lock_outline,
                size: 40,
                color: Color(0xFF14ad9f),
              ),
            ),
            
            const SizedBox(height: 24),
            
            // Title
            Text(
              title,
              style: const TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            
            const SizedBox(height: 16),
            
            // Description
            Text(
              description,
              style: TextStyle(
                fontSize: 16,
                color: Colors.grey.shade600,
                height: 1.5,
              ),
              textAlign: TextAlign.center,
            ),
            
            const SizedBox(height: 32),
            
            // Login Button
            ElevatedButton(
              onPressed: () async {
                Navigator.pop(context);
                final result = await Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => const LoginScreen()),
                );
                
                if (result != null && onLoginSuccess != null) {
                  onLoginSuccess!();
                }
                
                debugPrint('🔐 Login Result: $result');
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF14ad9f),
                foregroundColor: Colors.white,
                minimumSize: const Size(double.infinity, 50),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: Text(
                buttonText,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
            ),
            
            const SizedBox(height: 16),
            
            // Close Button
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text(
                'Später',
                style: TextStyle(
                  color: Colors.grey.shade600,
                  fontSize: 16,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
