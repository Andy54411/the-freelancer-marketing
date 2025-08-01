import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:provider/provider.dart';
import 'package:get/get.dart';

import 'core/config/app_theme.dart';
import 'core/config/app_routes.dart';
import 'core/services/auth_service.dart';
import 'core/services/firebase_service.dart';
import 'features/splash/splash_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize Firebase with default options from google-services.json
  try {
    await Firebase.initializeApp();
    print('Firebase initialized successfully');
  } catch (e) {
    print('Firebase initialization error: $e');
    // Continue app startup even if Firebase fails
  }
  
  runApp(const TaskiloApp());
}

class TaskiloApp extends StatelessWidget {
  const TaskiloApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthService()),
        ChangeNotifierProvider(create: (_) => FirebaseService()),
      ],
      child: GetMaterialApp(
        title: 'Taskilo',
        theme: AppTheme.lightTheme,
        darkTheme: AppTheme.darkTheme,
        themeMode: ThemeMode.system,
        debugShowCheckedModeBanner: false,
        home: const SplashScreen(),
        getPages: AppRoutes.routes,
        locale: const Locale('de', 'DE'),
        fallbackLocale: const Locale('en', 'US'),
      ),
    );
  }
}
