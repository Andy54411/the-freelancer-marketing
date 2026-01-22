import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../router/app_router.dart';

/// E-Mail Provider Model
class EmailProvider {
  final String id;
  final String name;
  final Widget icon;
  final bool isOAuth;
  final String? oauthUrl;

  const EmailProvider({
    required this.id,
    required this.name,
    required this.icon,
    this.isOAuth = false,
    this.oauthUrl,
  });
}

/// Provider Selection Screen - Wie bei Gmail iOS "Konto hinzufügen"
class ProviderSelectionScreen extends StatefulWidget {
  const ProviderSelectionScreen({super.key});

  @override
  State<ProviderSelectionScreen> createState() => _ProviderSelectionScreenState();
}

class _ProviderSelectionScreenState extends State<ProviderSelectionScreen> {

  static List<EmailProvider> get providers => [
    // Taskilo als erster Provider
    EmailProvider(
      id: 'taskilo',
      name: 'Taskilo',
      icon: _buildTaskiloIcon(),
      isOAuth: false,
    ),
    // Google
    EmailProvider(
      id: 'google',
      name: 'Google',
      icon: _buildGoogleIcon(),
      isOAuth: true,
      oauthUrl: 'https://accounts.google.com',
    ),
    // iCloud
    EmailProvider(
      id: 'icloud',
      name: 'iCloud',
      icon: _buildICloudIcon(),
      isOAuth: false,
    ),
    // Outlook
    EmailProvider(
      id: 'outlook',
      name: 'Outlook, Hotmail und Live',
      icon: _buildOutlookIcon(),
      isOAuth: true,
      oauthUrl: 'https://login.microsoftonline.com',
    ),
    // Office 365
    EmailProvider(
      id: 'office365',
      name: 'Office 365',
      icon: _buildOffice365Icon(),
      isOAuth: true,
      oauthUrl: 'https://login.microsoftonline.com',
    ),
    // Yahoo
    EmailProvider(
      id: 'yahoo',
      name: 'Yahoo!',
      icon: _buildYahooIcon(),
      isOAuth: true,
      oauthUrl: 'https://login.yahoo.com',
    ),
    // Andere (IMAP)
    EmailProvider(
      id: 'imap',
      name: 'Andere (IMAP)',
      icon: _buildImapIcon(),
      isOAuth: false,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Column(
          children: [
            // Header mit Schließen-Button - wie Gmail iOS
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                children: [
                  const Spacer(),
                  const Text(
                    'Konto hinzufügen',
                    style: TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w600,
                      color: Colors.black,
                    ),
                  ),
                  const Spacer(),
                  GestureDetector(
                    onTap: () => Navigator.pop(context),
                    child: Container(
                      width: 30,
                      height: 30,
                      decoration: BoxDecoration(
                        color: Colors.grey.shade200,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.close,
                        size: 18,
                        color: Colors.black54,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            
            // Content
            Expanded(
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 20),
                    
                    // Großes Taskilo Mail-Icon oben - wie Gmail M
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      child: _buildMailLogo(),
                    ),
                    const SizedBox(height: 12),
                    
                    // "E-Mail einrichten" Titel
                    const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 20),
                      child: Text(
                        'E-Mail einrichten',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w400,
                          color: Colors.black87,
                        ),
                      ),
                    ),
                    
                    const SizedBox(height: 16),
                    
                    // Divider
                    Divider(height: 1, color: Colors.grey.shade300),
                    
                    // Provider Liste
                    ...providers.map((provider) => _ProviderListItem(
                      provider: provider,
                      onTap: () => _onProviderSelected(provider),
                    )),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _onProviderSelected(EmailProvider provider) {
    if (provider.id == 'taskilo' || provider.id == 'imap' || provider.id == 'icloud') {
      // Direkt zum IMAP Login - mit GoRouter
      context.push(AppRouter.login);
    } else {
      // OAuth Flow - mit GoRouter und Extra-Parameter
      context.push(AppRouter.oauthLogin, extra: provider);
    }
  }

  // Großes Taskilo Mail Logo oben - echtes Logo
  static Widget _buildMailLogo() {
    return ClipRRect(
      borderRadius: BorderRadius.circular(10),
      child: Image.asset(
        'assets/images/taskilo_logo.png',
        width: 48,
        height: 48,
        fit: BoxFit.contain,
      ),
    );
  }

  // Taskilo Icon - echtes Logo
  static Widget _buildTaskiloIcon() {
    return ClipRRect(
      borderRadius: BorderRadius.circular(8),
      child: Image.asset(
        'assets/images/taskilo_logo.png',
        width: 40,
        height: 40,
        fit: BoxFit.contain,
      ),
    );
  }

  // Google Icon - Original G
  static Widget _buildGoogleIcon() {
    return SizedBox(
      width: 40,
      height: 40,
      child: CustomPaint(
        size: const Size(40, 40),
        painter: _GoogleLogoPainter(),
      ),
    );
  }

  // iCloud Icon
  static Widget _buildICloudIcon() {
    return Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        color: const Color(0xFF5AC8FA),
        borderRadius: BorderRadius.circular(8),
      ),
      child: const Icon(
        Icons.cloud,
        color: Colors.white,
        size: 24,
      ),
    );
  }

  // Outlook Icon
  static Widget _buildOutlookIcon() {
    return Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        color: const Color(0xFF0078D4),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Stack(
        alignment: Alignment.center,
        children: [
          Container(
            width: 20,
            height: 20,
            decoration: BoxDecoration(
              border: Border.all(color: Colors.white, width: 2),
              borderRadius: BorderRadius.circular(3),
            ),
          ),
          const Positioned(
            left: 10,
            top: 10,
            child: Text(
              'o',
              style: TextStyle(
                color: Colors.white,
                fontSize: 10,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }

  // Office 365 Icon
  static Widget _buildOffice365Icon() {
    return Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        color: const Color(0xFFEB3C00),
        borderRadius: BorderRadius.circular(8),
      ),
      child: const Icon(
        Icons.grid_view_rounded,
        color: Colors.white,
        size: 22,
      ),
    );
  }

  // Yahoo Icon
  static Widget _buildYahooIcon() {
    return Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        color: const Color(0xFF6001D2),
        borderRadius: BorderRadius.circular(8),
      ),
      child: const Icon(
        Icons.mail_outline_rounded,
        color: Colors.white,
        size: 22,
      ),
    );
  }

  // IMAP Icon
  static Widget _buildImapIcon() {
    return Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        color: Colors.grey.shade500,
        borderRadius: BorderRadius.circular(8),
      ),
      child: const Icon(
        Icons.mail_outline_rounded,
        color: Colors.white,
        size: 22,
      ),
    );
  }
}

/// Provider List Item Widget - wie Gmail iOS
class _ProviderListItem extends StatelessWidget {
  final EmailProvider provider;
  final VoidCallback onTap;

  const _ProviderListItem({
    required this.provider,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        InkWell(
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
            child: Row(
              children: [
                provider.icon,
                const SizedBox(width: 16),
                Expanded(
                  child: Text(
                    provider.name,
                    style: const TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w400,
                      color: Colors.black87,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.only(left: 76),
          child: Divider(height: 1, color: Colors.grey.shade300),
        ),
      ],
    );
  }
}

/// Google Logo Painter - echtes G Logo
class _GoogleLogoPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width * 0.38;
    
    // Google G Farben
    const blue = Color(0xFF4285F4);
    const red = Color(0xFFEA4335);
    const yellow = Color(0xFFFBBC05);
    const green = Color(0xFF34A853);
    
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = size.width * 0.16
      ..strokeCap = StrokeCap.butt;
    
    // Blau (rechts)
    paint.color = blue;
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      -0.5,
      1.3,
      false,
      paint,
    );
    
    // Rot (oben)
    paint.color = red;
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      -2.0,
      1.3,
      false,
      paint,
    );
    
    // Gelb (unten links)
    paint.color = yellow;
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      2.0,
      1.1,
      false,
      paint,
    );
    
    // Grün (unten)
    paint.color = green;
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      0.7,
      1.1,
      false,
      paint,
    );
    
    // Horizontale Linie des G
    final linePaint = Paint()
      ..color = blue
      ..style = PaintingStyle.fill;
    canvas.drawRect(
      Rect.fromLTWH(
        center.dx - 2,
        center.dy - size.width * 0.08,
        size.width * 0.38,
        size.width * 0.16,
      ),
      linePaint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
