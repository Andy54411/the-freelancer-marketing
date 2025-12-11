import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../screens/jobs/job_detail_by_id_screen.dart';
import '../screens/jobs/job_board_screen.dart';

/// Navigation Service für Push Notification Navigation
class NotificationNavigationService {
  static final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

  /// Navigiert zu Incoming Offers Screen
  static Future<void> navigateToOffers({String? offerId, String? quoteId}) async {
    try {
      debugPrint('🎯 Navigiere zu Incoming Offers Screen');
      debugPrint('   OfferId: $offerId');
      debugPrint('   QuoteId: $quoteId');

      // Verwende GetX für Navigation
      await Get.toNamed('/dashboard/user/incoming-offers', arguments: {
        'offerId': offerId,
        'quoteId': quoteId,
        'highlightOffer': true,
      });

      debugPrint('✅ Navigation zu Offers erfolgreich');
    } catch (e) {
      debugPrint('❌ Fehler bei Navigation zu Offers: $e');
    }
  }

  /// Navigiert zu Quote Details
  static Future<void> navigateToQuote(String quoteId) async {
    try {
      debugPrint('🎯 Navigiere zu Quote Details: $quoteId');

      await Get.toNamed('/dashboard/user/quote-details/$quoteId');

      debugPrint('✅ Navigation zu Quote erfolgreich');
    } catch (e) {
      debugPrint('❌ Fehler bei Navigation zu Quote: $e');
    }
  }

  /// Navigiert zu Chat Screen
  static Future<void> navigateToChat({
    required String chatId,
    String? partnerId,
    String? partnerName,
  }) async {
    try {
      debugPrint('🎯 Navigiere zu Chat: $chatId');

      await Get.toNamed('/chat/$chatId', arguments: {
        'partnerId': partnerId,
        'partnerName': partnerName,
      });

      debugPrint('✅ Navigation zu Chat erfolgreich');
    } catch (e) {
      debugPrint('❌ Fehler bei Navigation zu Chat: $e');
    }
  }

  /// Navigiert zu Dashboard Home
  static Future<void> navigateToDashboard() async {
    try {
      debugPrint('🎯 Navigiere zu Dashboard Home');

      await Get.offAllNamed('/dashboard');

      debugPrint('✅ Navigation zu Dashboard erfolgreich');
    } catch (e) {
      debugPrint('❌ Fehler bei Navigation zu Dashboard: $e');
    }
  }

  /// Navigiert zu Job Detail Screen
  static Future<void> navigateToJobDetail(String jobId, {String? companyId}) async {
    try {
      debugPrint('🎯 Navigiere zu Job Detail: $jobId, companyId: $companyId');

      // Verwende direkte Navigation statt GetX Route
      final context = navigatorKey.currentContext;
      if (context != null) {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => JobDetailByIdScreen(jobId: jobId, companyId: companyId),
          ),
        );
        debugPrint('✅ Navigation zu Job Detail erfolgreich');
      } else {
        // Fallback: Versuche GetX
        Get.to(() => JobDetailByIdScreen(jobId: jobId, companyId: companyId));
      }
    } catch (e) {
      debugPrint('❌ Fehler bei Navigation zu Job Detail: $e');
      // Fallback: Navigiere zur Jobbörse
      try {
        Get.to(() => const JobBoardScreen());
      } catch (_) {
        await navigateToDashboard();
      }
    }
  }

  /// Navigiert zu einer spezifischen Screen basierend auf Notification Data
  static Future<void> navigateFromNotification(Map<String, dynamic> data) async {
    try {
      final String? type = data['type'];
      final String? screen = data['screen'];
      final String? offerId = data['offerId'];
      final String? quoteId = data['quoteId'];
      final String? chatId = data['chatId'];

      debugPrint('🎯 Navigation von Notification:');
      debugPrint('   Type: $type');
      debugPrint('   Screen: $screen');
      debugPrint('   OfferId: $offerId');
      debugPrint('   QuoteId: $quoteId');
      debugPrint('   ChatId: $chatId');

      switch (type) {
        case 'new_offer':
          await navigateToOffers(offerId: offerId, quoteId: quoteId);
          break;
          
        case 'new_quote':
          if (quoteId != null) {
            await navigateToQuote(quoteId);
          }
          break;
          
        case 'chat_message':
          if (chatId != null) {
            await navigateToChat(
              chatId: chatId,
              partnerId: data['partnerId'],
              partnerName: data['partnerName'],
            );
          }
          break;
          
        case 'order_update':
          // Navigiere zu Order Details
          final String? orderId = data['orderId'];
          if (orderId != null) {
            await Get.toNamed('/dashboard/user/order-details/$orderId');
          }
          break;

        case 'job_alert':
          // Navigiere zur Job-Detail-Seite
          final String? jobId = data['jobId'];
          final String? companyId = data['companyId'];
          debugPrint('   JobId: $jobId, CompanyId: $companyId');
          if (jobId != null) {
            await navigateToJobDetail(jobId, companyId: companyId);
          } else {
            // Fallback: Navigiere zur Jobbörse
            await Get.toNamed('/jobs');
          }
          break;

        default:
          // Fallback: Navigiere zu Dashboard
          debugPrint('⚠️ Unbekannter Notification Type: $type - navigiere zu Dashboard');
          await navigateToDashboard();
      }
    } catch (e) {
      debugPrint('❌ Fehler bei Notification Navigation: $e');
      // Fallback: Navigiere zu Dashboard
      await navigateToDashboard();
    }
  }

  /// Prüft ob Navigation möglich ist (App ist initialisiert)
  static bool canNavigate() {
    return Get.isRegistered<GetMaterialController>();
  }

  /// Wartet bis Navigation möglich ist
  static Future<void> waitForNavigation() async {
    int attempts = 0;
    const maxAttempts = 10;
    
    while (!canNavigate() && attempts < maxAttempts) {
      debugPrint('⏳ Warte auf Navigation Initialisierung... Versuch ${attempts + 1}');
      await Future.delayed(const Duration(milliseconds: 500));
      attempts++;
    }
    
    if (!canNavigate()) {
      debugPrint('❌ Navigation nach $maxAttempts Versuchen nicht verfügbar');
      throw Exception('Navigation Service nicht verfügbar');
    }
    
    debugPrint('✅ Navigation Service bereit');
  }
}
