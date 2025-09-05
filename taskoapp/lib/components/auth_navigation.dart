import 'package:flutter/material.dart';
import '../models/user_model.dart';
import '../services/auth_service.dart';
import '../screens/dashboard/dashboard_user/home_screen.dart';
import '../screens/auth/login_screen.dart';

class AuthNavigation {
  /// Navigiert basierend auf UserType nach dem Login
  static Future<void> navigateAfterLogin(BuildContext context) async {
    try {
      final authService = AuthService();
      final currentUser = await authService.getCurrentUserData();
      
      if (currentUser == null) {
        debugPrint('❌ Kein User gefunden nach Login');
        return;
      }

      debugPrint('🔄 Navigiere basierend auf UserType: ${currentUser.userType}');

      // Context-Check vor Navigation
      if (!context.mounted) return;

      // Navigation basierend auf UserType - entsprechend Ihrem Web-Projekt
      switch (currentUser.userType) {
        case UserType.customer:
          // User -> User Dashboard (später: spezifische User-Screens)
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(
              builder: (context) => const HomeScreen(),
            ),
          );
          debugPrint('✅ User navigiert zu User Dashboard');
          break;

        case UserType.serviceProvider:
          // Company -> Company Dashboard (später: spezifische Company-Screens)
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(
              builder: (context) => const HomeScreen(),
            ),
          );
          debugPrint('✅ Company navigiert zu Company Dashboard');
          break;

        case UserType.admin:
          // Admin -> Admin Dashboard (später: spezifische Admin-Screens)
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(
              builder: (context) => const HomeScreen(),
            ),
          );
          debugPrint('✅ Admin navigiert zu Admin Dashboard');
          break;
      }
    } catch (e) {
      debugPrint('❌ Fehler bei Navigation nach Login: $e');
      // Context-Check vor Fallback Navigation
      if (!context.mounted) return;
      // Fallback zum allgemeinen Dashboard
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (context) => const HomeScreen(),
        ),
      );
    }
  }

  /// Zeigt Login Modal und navigiert nach erfolgreichem Login
  static Future<void> showLoginAndNavigate(
    BuildContext context, {
    String title = 'Anmeldung erforderlich',
    String description = 'Um mit Anbietern zu chatten oder Buchungen vorzunehmen, müssen Sie sich anmelden.',
  }) async {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => AuthLoginModal(
        title: title,
        description: description,
        onLoginSuccess: () => navigateAfterLogin(context),
      ),
    );
  }
}

/// Erweiterte Login Modal mit Benutzertyp-Auswahl und automatischer Navigation
class AuthLoginModal extends StatefulWidget {
  final String title;
  final String description;
  final VoidCallback? onLoginSuccess;
  final Map<String, dynamic>? selectedService; // Service-Daten für Registrierung

  const AuthLoginModal({
    super.key,
    required this.title,
    required this.description,
    this.onLoginSuccess,
    this.selectedService,
  });

  @override
  State<AuthLoginModal> createState() => _AuthLoginModalState();
}

class _AuthLoginModalState extends State<AuthLoginModal> {
  UserType? _selectedUserType;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.65,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      padding: const EdgeInsets.all(24.0),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          mainAxisSize: MainAxisSize.min,
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
            const SizedBox(height: 20),
            
            // Login Icon
            Container(
              width: 60,
              height: 60,
              decoration: BoxDecoration(
                color: const Color(0xFF14ad9f).withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(30),
              ),
              child: const Icon(
                Icons.login,
                size: 30,
                color: Color(0xFF14ad9f),
              ),
            ),
            
            const SizedBox(height: 20),
            
            // Title
            Text(
              widget.title,
              style: const TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            
            const SizedBox(height: 12),
            
            // Description
            Text(
              widget.description,
              style: TextStyle(
                fontSize: 15,
                color: Colors.grey.shade600,
                height: 1.4,
              ),
              textAlign: TextAlign.center,
            ),
            
            const SizedBox(height: 24),
            
            // User Type Selection
            const Text(
              'Wählen Sie Ihren Account-Typ:',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
            
            const SizedBox(height: 16),
            
            // User Type Options in Grid (2x1)
            Row(
              children: [
                // Privat (Customer) Option
                Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _selectedUserType = UserType.customer),
                    child: Container(
                      height: 70,
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                      decoration: BoxDecoration(
                        border: Border.all(
                          color: _selectedUserType == UserType.customer 
                              ? const Color(0xFF14ad9f) 
                              : Colors.grey.shade300,
                          width: _selectedUserType == UserType.customer ? 2 : 1,
                        ),
                        borderRadius: BorderRadius.circular(12),
                        color: _selectedUserType == UserType.customer
                            ? const Color(0xFF14ad9f).withValues(alpha: 0.1)
                            : Colors.white,
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            'Privat',
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                              color: _selectedUserType == UserType.customer 
                                  ? const Color(0xFF14ad9f) 
                                  : Colors.black87,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Services buchen',
                            style: TextStyle(
                              fontSize: 10,
                              color: Colors.grey.shade600,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                
                const SizedBox(width: 16),
                
                // Firma (Service Provider) Option
                Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _selectedUserType = UserType.serviceProvider),
                    child: Container(
                      height: 70,
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                      decoration: BoxDecoration(
                        border: Border.all(
                          color: _selectedUserType == UserType.serviceProvider 
                              ? const Color(0xFF14ad9f) 
                              : Colors.grey.shade300,
                          width: _selectedUserType == UserType.serviceProvider ? 2 : 1,
                        ),
                        borderRadius: BorderRadius.circular(12),
                        color: _selectedUserType == UserType.serviceProvider
                            ? const Color(0xFF14ad9f).withValues(alpha: 0.1)
                            : Colors.white,
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            'Firma',
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                              color: _selectedUserType == UserType.serviceProvider 
                                  ? const Color(0xFF14ad9f) 
                                  : Colors.black87,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Services anbieten',
                            style: TextStyle(
                              fontSize: 10,
                              color: Colors.grey.shade600,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
            
            const SizedBox(height: 24),
            
            // Login Button
            ElevatedButton(
              onPressed: _selectedUserType != null ? () async {
                Navigator.pop(context);
                
                // Starte Login-Prozess mit ausgewähltem UserType
                final loginResult = await _performLogin(context, _selectedUserType!);
                
                if (loginResult == true) {
                  // Login erfolgreich - automatische Navigation
                  if (widget.onLoginSuccess != null) {
                    widget.onLoginSuccess!();
                  } else {
                    // Fallback Navigation
                    if (context.mounted) {
                      AuthNavigation.navigateAfterLogin(context);
                    }
                  }
                }
              } : null,
              style: ElevatedButton.styleFrom(
                backgroundColor: _selectedUserType != null 
                    ? const Color(0xFF14ad9f) 
                    : Colors.grey.shade400,
                foregroundColor: Colors.white,
                minimumSize: const Size(double.infinity, 50),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: Text(
                _selectedUserType != null 
                    ? 'Als ${_selectedUserType == UserType.customer ? "Privat" : "Firma"} anmelden'
                    : 'Bitte wählen Sie einen Account-Typ',
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

  /// Führt den Login-Prozess durch mit ausgewähltem UserType
  Future<bool> _performLogin(BuildContext context, UserType userType) async {
    try {
      // Context-Check vor Navigation
      if (!context.mounted) return false;
      
      debugPrint('🔐 Login gestartet für UserType: ${userType.name}');
      debugPrint('🔍 Selected Service für Login: ${widget.selectedService?['displayName'] ?? 'null'}');
      
      // Direkte Navigation zum LoginScreen mit Service-Daten
      final result = await Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => LoginScreen(selectedService: widget.selectedService),
          settings: RouteSettings(arguments: {'userType': userType}),
        ),
      );
      
      return result == true;
    } catch (e) {
      debugPrint('❌ Login-Fehler: $e');
      return false;
    }
  }
}
