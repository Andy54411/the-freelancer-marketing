import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/user_model.dart';
import '../../services/auth_service.dart';
import '../../utils/app_theme.dart';

class DashboardLayout extends StatelessWidget {
  final Widget child;
  final String title;
  final bool showBackButton;
  final List<Widget>? actions;

  const DashboardLayout({
    required this.child,
    required this.title,
    this.showBackButton = true,
    this.actions,
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    final user = context.watch<TaskiloUser?>();

    return Scaffold(
      appBar: AppBar(
        title: Text(title),
        automaticallyImplyLeading: showBackButton,
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 1,
        shadowColor: Colors.black.withValues(alpha: 0.1),
        actions: [
          // User Avatar und Menu
          PopupMenuButton<String>(
            onSelected: (value) async {
              if (value == 'logout') {
                await _handleLogout(context);
              } else if (value == 'profile') {
                // Navigation zum Profil
                Navigator.of(context).pushNamed('/profile');
              } else if (value == 'settings') {
                // Navigation zu Einstellungen
                Navigator.of(context).pushNamed('/settings');
              }
            },
            itemBuilder: (BuildContext context) => [
              PopupMenuItem<String>(
                value: 'profile',
                child: Row(
                  children: [
                    Icon(Icons.person_outline, size: 18, color: AppTheme.textSecondary),
                    const SizedBox(width: 12),
                    const Text('Profil'),
                  ],
                ),
              ),
              PopupMenuItem<String>(
                value: 'settings',
                child: Row(
                  children: [
                    Icon(Icons.settings_outlined, size: 18, color: AppTheme.textSecondary),
                    const SizedBox(width: 12),
                    const Text('Einstellungen'),
                  ],
                ),
              ),
              const PopupMenuDivider(),
              PopupMenuItem<String>(
                value: 'logout',
                child: Row(
                  children: [
                    Icon(Icons.logout, size: 18, color: Colors.red[600]),
                    const SizedBox(width: 12),
                    Text(
                      'Abmelden',
                      style: TextStyle(color: Colors.red[600]),
                    ),
                  ],
                ),
              ),
            ],
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  CircleAvatar(
                    radius: 16,
                    backgroundColor: AppTheme.primaryColor,
                    backgroundImage: user?.photoURL != null
                        ? NetworkImage(user!.photoURL!)
                        : null,
                    child: user?.photoURL == null
                        ? Text(
                            user?.displayName?.substring(0, 1).toUpperCase() ?? 'U',
                            style: const TextStyle(
                              fontSize: 14,
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                            ),
                          )
                        : null,
                  ),
                  const SizedBox(width: 8),
                  Icon(
                    Icons.keyboard_arrow_down,
                    size: 18,
                    color: AppTheme.textSecondary,
                  ),
                ],
              ),
            ),
          ),
          if (actions != null) ...actions!,
        ],
      ),
      body: Container(
        color: Colors.grey[50],
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: child,
          ),
        ),
      ),
    );
  }

  Future<void> _handleLogout(BuildContext context) async {
    // Zeige Loading-Dialog
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(
        child: CircularProgressIndicator(),
      ),
    );

    try {
      final authService = context.read<AuthService>();
      await authService.signOut();
      
      // Loading-Dialog schließen
      if (context.mounted) {
        Navigator.of(context).pop();
      }
      
      // Zur Startseite navigieren
      if (context.mounted) {
        Navigator.of(context).pushNamedAndRemoveUntil(
          '/discover', 
          (route) => false,
        );
      }
    } catch (e) {
      debugPrint('Logout Fehler: $e');
      
      // Loading-Dialog schließen bei Fehler
      if (context.mounted) {
        Navigator.of(context).pop();
        
        // Fehler-Dialog zeigen
        showDialog(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Fehler'),
            content: const Text('Logout fehlgeschlagen. Bitte versuchen Sie es erneut.'),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('OK'),
              ),
            ],
          ),
        );
      }
    }
  }
}
