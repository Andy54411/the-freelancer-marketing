import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../screens/splash/splash_screen.dart';
import '../screens/auth/welcome_screen.dart';
import '../screens/auth/provider_selection_screen.dart';
import '../screens/auth/login_screen.dart';
import '../screens/auth/oauth_login_screen.dart';
import '../screens/home/home_screen.dart';

/// GoRouter Konfiguration für Type-Safe Navigation & Deep Links
class AppRouter {
  static const String splash = '/';
  static const String welcome = '/welcome';
  static const String providers = '/providers';
  static const String login = '/login';
  static const String oauthLogin = '/oauth-login';
  static const String home = '/home';
  
  static final GoRouter router = GoRouter(
    initialLocation: splash,
    debugLogDiagnostics: true, // Für Entwicklung, später auf false
    
    routes: [
      GoRoute(
        path: splash,
        name: 'splash',
        builder: (context, state) => const SplashScreen(),
      ),
      
      GoRoute(
        path: welcome,
        name: 'welcome',
        builder: (context, state) => const WelcomeScreen(),
      ),
      
      GoRoute(
        path: providers,
        name: 'providers',
        builder: (context, state) => const ProviderSelectionScreen(),
      ),
      
      GoRoute(
        path: login,
        name: 'login',
        builder: (context, state) {
          // Deep Link Parameter: z.B. /login?email=user@example.com
          final email = state.uri.queryParameters['email'];
          return LoginScreen(prefilledEmail: email);
        },
      ),
      
      GoRoute(
        path: oauthLogin,
        name: 'oauth-login',
        builder: (context, state) {
          // OAuth Provider über Extra-Parameter übergeben
          final provider = state.extra as EmailProvider?;
          if (provider == null) {
            // Fallback zur Provider-Auswahl wenn kein Provider übergeben
            return const ProviderSelectionScreen();
          }
          return OAuthLoginScreen(provider: provider);
        },
      ),
      
      GoRoute(
        path: home,
        name: 'home',
        builder: (context, state) => const HomeScreen(),
      ),
    ],
    
    // Error Handler
    errorBuilder: (context, state) => Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 80, color: Colors.red),
            const SizedBox(height: 16),
            Text(
              'Seite nicht gefunden',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            Text(
              state.uri.toString(),
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Colors.grey,
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () => context.go(welcome),
              child: const Text('Zurück zur Startseite'),
            ),
          ],
        ),
      ),
    ),
  );
}
