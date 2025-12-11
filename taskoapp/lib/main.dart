import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:provider/provider.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:get/get.dart';
import 'firebase_options.dart';
import 'services/auth_service.dart';
import 'services/taskilo_service.dart';
import 'services/payment_service.dart';
import 'services/firebase_functions_service.dart';
import 'services/push_notification_service.dart';
import 'services/notification_navigation_service.dart';
import 'models/user_model.dart';
import 'screens/auth/login_screen.dart';
import 'screens/startseite/start_screen.dart';
import 'screens/dashboard/dashboard_user/home_screen.dart';
import 'screens/dashboard/dashboard_user/incoming_offers_screen.dart';
import 'screens/jobs/job_detail_by_id_screen.dart';
import 'screens/jobs/job_board_screen.dart';
import 'utils/app_theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // 🎯 DEAKTIVIERE ALLE DEBUG-HIGHLIGHTING FÜR PRODUKTION
  if (kDebugMode) {
    // Deaktiviere alle Debug-Overlays die gelbe Hervorhebungen verursachen
    debugPaintSizeEnabled = false; // Keine Debug-Paint-Anzeigen
    debugRepaintRainbowEnabled = false; // Keine Repaint-Highlights
    debugRepaintTextRainbowEnabled = false; // Keine Text-Repaint-Highlights

    // Deaktiviere alle Material Debug-Features
    // RendererBinding.instance.ensureSemantics(); // Entfernt - kann Probleme verursachen
  }

  // Lade Environment Variables
  await dotenv.load(fileName: ".env");

  // Initialisiere Firebase (nur wenn noch nicht initialisiert)
  try {
    if (Firebase.apps.isEmpty) {
      await Firebase.initializeApp(
        options: DefaultFirebaseOptions.currentPlatform,
      );
      // debugPrint('✅ Firebase initialized successfully');
    } else {
      // debugPrint('✅ Firebase already initialized');
    }
  } catch (e) {
    debugPrint('⚠️ Firebase initialization error: $e');
    // Falls bereits initialisiert, weitermachen
  }

  // Initialisiere Stripe Payment Service
  try {
    await TaskiloPaymentService.initializeStripe();
    // debugPrint('✅ Stripe successfully initialized');
  } catch (e) {
    debugPrint('⚠️ Stripe initialization failed: $e');
    debugPrint('App will continue without payment functionality');
  }

  // Firebase Functions Connection testen
  await FirebaseFunctionsService.testConnection();
  // debugPrint('🔧 Firebase Functions ready: $functionsReady');

  // Push Notifications initialisieren
  try {
    await PushNotificationService.initialize();
    // debugPrint('✅ Push Notifications initialized successfully');
  } catch (e) {
    debugPrint('⚠️ Push Notifications initialization failed: $e');
  }

  runApp(const TaskiloApp());
}

class TaskiloApp extends StatelessWidget {
  const TaskiloApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        Provider<AuthService>(create: (_) => AuthService()),
        Provider<TaskiloService>(create: (_) => TaskiloService()),
        StreamProvider<TaskiloUser?>(
          create: (context) => context.read<AuthService>().userStream,
          initialData: null,
        ),
      ],
      child: GetMaterialApp(
        title: 'Taskilo - Service Marktplatz',
        theme: AppTheme.lightTheme,
        debugShowCheckedModeBanner: false,
        locale: const Locale('de', 'DE'),
        localizationsDelegates: const [
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        supportedLocales: const [Locale('de', 'DE'), Locale('en', 'US')],
        // 🎯 KOMPLETTE DEBUG-DEAKTIVIERUNG
        showPerformanceOverlay: false, // Keine Performance-Overlays
        showSemanticsDebugger: false, // Keine Accessibility-Debug-Anzeigen
        checkerboardRasterCacheImages: false, // Keine Raster-Cache-Anzeigen
        checkerboardOffscreenLayers: false, // Keine Offscreen-Layer-Anzeigen
        debugShowMaterialGrid: false, // Keine Material-Grid-Anzeigen
        navigatorKey: NotificationNavigationService.navigatorKey,
        home: const AuthWrapper(), // Auth-basierte Navigation
        getPages: [
          // Auth Routes
          GetPage(name: '/login', page: () => const LoginScreen()),
          GetPage(name: '/home', page: () => const DiscoverScreen()),
          GetPage(name: '/discover', page: () => const DiscoverScreen()),
          GetPage(name: '/dashboard', page: () => const HomeScreen()),

          // Dashboard Routes
          GetPage(
            name: '/dashboard/user/incoming-offers',
            page: () => const IncomingOffersScreen(),
          ),

          // Job Routes
          GetPage(
            name: '/jobs',
            page: () => const JobBoardScreen(),
          ),
          GetPage(
            name: '/jobs/detail/:jobId',
            page: () {
              final jobId = Get.parameters['jobId'] ?? '';
              return JobDetailByIdScreen(jobId: jobId);
            },
          ),

          // Fallback route
          GetPage(
            name: '/unknown',
            page: () => const Scaffold(
              body: Center(child: Text('Seite nicht gefunden')),
            ),
          ),
        ],
        unknownRoute: GetPage(
          name: '/unknown',
          page: () =>
              const Scaffold(body: Center(child: Text('Seite nicht gefunden'))),
        ),
      ),
    );
  }
}

class AuthWrapper extends StatelessWidget {
  const AuthWrapper({super.key});

  @override
  Widget build(BuildContext context) {
    final user = context.watch<TaskiloUser?>();

    debugPrint(
      'AUTH_WRAPPER: User = ${user != null ? "EINGELOGGT (${user.email})" : "AUSGELOGGT"}',
    );

    // Wenn User eingeloggt ist, zeige Dashboard
    // Sonst zeige DiscoverScreen (Startseite)
    if (user != null) {
      debugPrint('AUTH_WRAPPER: Zeige HomeScreen (Dashboard)');
      return const HomeScreen();
    } else {
      debugPrint('AUTH_WRAPPER: Zeige DiscoverScreen');
      return const DiscoverScreen();
    }
  }
}
