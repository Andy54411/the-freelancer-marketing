import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:provider/provider.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'firebase_options.dart';
import 'services/auth_service.dart';
import 'services/taskilo_service.dart';
import 'services/payment_service.dart';
import 'services/firebase_functions_service.dart';
import 'models/user_model.dart';
import 'screens/auth/login_screen.dart';
import 'screens/home/home_screen.dart';
import 'screens/dashboard/dashboard_screen.dart';
import 'utils/app_theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Lade Environment Variables
  await dotenv.load(fileName: ".env");
  
  // Initialisiere Firebase (nur wenn noch nicht initialisiert)
  try {
    if (Firebase.apps.isEmpty) {
      await Firebase.initializeApp(
        options: DefaultFirebaseOptions.currentPlatform,
      );
      debugPrint('✅ Firebase initialized successfully');
    } else {
      debugPrint('✅ Firebase already initialized');
    }
  } catch (e) {
    debugPrint('⚠️ Firebase initialization error: $e');
    // Falls bereits initialisiert, weitermachen
  }

  // Initialisiere Stripe Payment Service
  try {
    await TaskiloPaymentService.initializeStripe();
    debugPrint('✅ Stripe successfully initialized');
  } catch (e) {
    debugPrint('⚠️ Stripe initialization failed: $e');
    debugPrint('App will continue without payment functionality');
  }

  // Firebase Functions Connection testen
  final functionsReady = await FirebaseFunctionsService.testConnection();
  debugPrint('🔧 Firebase Functions ready: $functionsReady');
  
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
      child: MaterialApp(
        title: 'Taskilo - Service Marktplatz',
        theme: AppTheme.lightTheme,
        debugShowCheckedModeBanner: false,
        home: const AuthWrapper(),  // Auth-basierte Navigation
        routes: {
          '/login': (context) => const LoginScreen(),
          '/home': (context) => const HomeScreen(),
          '/dashboard': (context) => const DashboardScreen(),
        },
      ),
    );
  }
}

class AuthWrapper extends StatelessWidget {
  const AuthWrapper({super.key});

  @override
  Widget build(BuildContext context) {
    final user = context.watch<TaskiloUser?>();
    
    // Wenn User eingeloggt ist, zeige Dashboard
    // Sonst zeige HomeScreen
    if (user != null) {
      return const DashboardScreen();
    } else {
      return const HomeScreen();
    }
  }
}
