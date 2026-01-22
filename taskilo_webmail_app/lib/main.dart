import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart'; // ✅ Riverpod statt GetX
import 'package:intl/date_symbol_data_local.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';
import 'package:flutter_quill/flutter_quill.dart';
import 'theme/app_theme.dart';
import 'providers/theme_provider.dart'; // ✅ Theme Provider
import 'router/app_router.dart'; // ✅ GoRouter

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // WebView Platform für Android initialisieren
  if (defaultTargetPlatform == TargetPlatform.android) {
    WebViewPlatform.instance = AndroidWebViewPlatform();
  }
  
  // Lade .env Datei ZUERST
  await dotenv.load(fileName: '.env');
  
  // Initialisiere Deutsche Lokalisierung
  await initializeDateFormatting('de_DE', null);
  
  // System UI Style
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.dark,
    systemNavigationBarColor: Colors.white,
    systemNavigationBarIconBrightness: Brightness.dark,
  ));
  
  // Preferred Orientations
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);
  
  // ✅ MODERN 2026: ProviderScope für Riverpod
  runApp(const ProviderScope(child: TaskiloWebmailApp()));
}

class TaskiloWebmailApp extends ConsumerWidget { // ✅ ConsumerWidget statt StatelessWidget
  const TaskiloWebmailApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) { // ✅ WidgetRef für Provider-Zugriff
    final themeMode = ref.watch(themeModeProvider); // ✅ Theme von Provider
    
    return MaterialApp.router( // ✅ MaterialApp.router für GoRouter
      routerConfig: AppRouter.router, // ✅ GoRouter Konfiguration
      
      title: 'Taskilo Webmail',
      debugShowCheckedModeBanner: false,
      
      // Theme - Material 3 mit dynamischem Mode
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: themeMode, // ✅ Dynamischer Theme-Wechsel
      
      // Localization
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        FlutterQuillLocalizations.delegate,
      ],
      supportedLocales: const [
        Locale('de', 'DE'),
        Locale('en', 'US'),
      ],
      locale: const Locale('de', 'DE'),
    );
  }
}
