import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../services/api_service.dart';
import '../../services/secure_storage_service.dart';
import '../../router/app_router.dart';

/// Unsichtbarer Auth-Check - kein sichtbarer Splash, nur schnelle Weiterleitung
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _checkAuthAndNavigate();
  }

  Future<void> _checkAuthAndNavigate() async {
    final apiService = ApiService();
    final storageService = SecureStorageService.instance;

    String targetRoute = AppRouter.welcome;

    final isApiLoggedIn = await apiService.isLoggedInAsync();

    if (isApiLoggedIn && await storageService.isSessionValid()) {
      targetRoute = AppRouter.home;
    } else if (await storageService.hasCredentials()) {
      final email = await storageService.getEmail();
      final password = await storageService.getPassword();

      if (email != null && password != null) {
        final loginResult = await apiService.login(email, password);
        if (loginResult['success'] == true) {
          targetRoute = AppRouter.home;
        }
      }
    }

    if (mounted) {
      context.go(targetRoute);
    }
  }

  @override
  Widget build(BuildContext context) {
    // Komplett weißer Screen - identisch mit nativem Splash
    return const Scaffold(
      backgroundColor: Colors.white,
      body: SizedBox.shrink(),
    );
  }
}
