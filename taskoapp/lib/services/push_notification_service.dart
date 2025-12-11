import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'dart:convert';
import 'notification_navigation_service.dart';

/// Service für Push Notifications - speziell für neue Angebote
class PushNotificationService {
  static final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  static final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  static final FirebaseAuth _auth = FirebaseAuth.instance;

  // Local Notifications Plugin für iOS/Android foreground notifications
  static final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();

  /// Initialisiert Push Notifications
  static Future<void> initialize() async {
    try {
      // debugPrint('🔔 Initialisiere Push Notifications...');

      // Berechtigung anfordern (iOS)
      final NotificationSettings settings = await _messaging.requestPermission(
        alert: true,
        announcement: false,
        badge: true,
        carPlay: false,
        criticalAlert: false,
        provisional: false,
        sound: true,
      );

      // debugPrint('🔔 Notification permission: ${settings.authorizationStatus}');

      if (settings.authorizationStatus == AuthorizationStatus.authorized) {
        // debugPrint('✅ Push Notifications berechtigt');

        // Local Notifications initialisieren
        await _initializeLocalNotifications();

        // FCM Token abrufen und speichern
        await _setupFCMToken();

        // Message Handlers einrichten
        await _setupMessageHandlers();

        // Background Message Handler einrichten
        FirebaseMessaging.onBackgroundMessage(
          _firebaseMessagingBackgroundHandler,
        );

        // debugPrint('✅ Push Notifications vollständig eingerichtet');
      } else {
        debugPrint('❌ Push Notifications nicht berechtigt');
      }
    } catch (e) {
      debugPrint('❌ Fehler bei Push Notification Setup: $e');
    }
  }

  /// Initialisiert Local Notifications für Foreground Messages
  static Future<void> _initializeLocalNotifications() async {
    const AndroidInitializationSettings initializationSettingsAndroid =
        AndroidInitializationSettings('@mipmap/ic_launcher');

    const DarwinInitializationSettings initializationSettingsIOS =
        DarwinInitializationSettings(
          requestAlertPermission: false,
          requestBadgePermission: false,
          requestSoundPermission: false,
        );

    const InitializationSettings initializationSettings =
        InitializationSettings(
          android: initializationSettingsAndroid,
          iOS: initializationSettingsIOS,
        );

    await _localNotifications.initialize(
      initializationSettings,
      onDidReceiveNotificationResponse: _onNotificationTapped,
    );
  }

  /// FCM Token abrufen und in Firestore speichern
  static Future<void> _setupFCMToken() async {
    try {
      final token = await _messaging.getToken();
      debugPrint('🔑 FCM Token: $token');

      final user = _auth.currentUser;
      if (user != null && token != null) {
        await _firestore.collection('users').doc(user.uid).update({
          'fcmTokens': FieldValue.arrayUnion([token]),
          'lastTokenUpdate': FieldValue.serverTimestamp(),
        });
        debugPrint('✅ FCM Token in Firestore gespeichert');
      }

      // Token Refresh Listener
      _messaging.onTokenRefresh.listen((newToken) async {
        debugPrint('🔄 FCM Token refreshed: $newToken');
        final user = _auth.currentUser;
        if (user != null) {
          await _firestore.collection('users').doc(user.uid).update({
            'fcmTokens': FieldValue.arrayUnion([newToken]),
            'lastTokenUpdate': FieldValue.serverTimestamp(),
          });
        }
      });
    } catch (e) {
      debugPrint('❌ Fehler beim FCM Token Setup: $e');
    }
  }

  /// Message Handlers für verschiedene App-Zustände
  static Future<void> _setupMessageHandlers() async {
    // Foreground Messages (App ist geöffnet)
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      debugPrint(
        '📱 Foreground Message empfangen: ${message.notification?.title}',
      );
      _showLocalNotification(message);
    });

    // Background Messages (App im Hintergrund, User tippt auf Notification)
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      debugPrint('🎯 App durch Notification geöffnet: ${message.data}');
      _handleNotificationTap(message.data);
    });

    // App komplett geschlossen, durch Notification geöffnet
    final RemoteMessage? initialMessage = await _messaging.getInitialMessage();
    if (initialMessage != null) {
      debugPrint('🚀 App durch Notification gestartet: ${initialMessage.data}');
      _handleNotificationTap(initialMessage.data);
    }
  }

  /// Zeigt Local Notification im Foreground
  static Future<void> _showLocalNotification(RemoteMessage message) async {
    const AndroidNotificationDetails androidDetails =
        AndroidNotificationDetails(
          'taskilo_offers', // Channel ID
          'Neue Angebote', // Channel Name
          channelDescription: 'Benachrichtigungen für neue Angebote',
          importance: Importance.high,
          priority: Priority.high,
          showWhen: true,
          color: Color(0xFF14AD9F), // Taskilo Primary Color
          icon: '@mipmap/ic_launcher',
        );

    const DarwinNotificationDetails iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    const NotificationDetails platformDetails = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _localNotifications.show(
      DateTime.now().millisecondsSinceEpoch.remainder(100000),
      message.notification?.title ?? 'Neue Benachrichtigung',
      message.notification?.body ?? 'Sie haben eine neue Benachrichtigung',
      platformDetails,
      payload: jsonEncode(message.data),
    );
  }

  /// Behandelt Notification Tap Events
  static Future<void> _onNotificationTapped(
    NotificationResponse response,
  ) async {
    debugPrint('🎯 Local Notification getippt: ${response.payload}');

    try {
      // Parse payload als Map
      if (response.payload != null && response.payload!.isNotEmpty) {
        Map<String, dynamic> data;
        
        try {
          // Versuche JSON zu parsen
          data = jsonDecode(response.payload!) as Map<String, dynamic>;
        } catch (e) {
          // Fallback: Standard "new_offer" Navigation
          debugPrint('⚠️ Payload konnte nicht geparst werden, nutze Fallback');
          data = <String, dynamic>{
            'type': 'new_offer',
            'screen': 'incoming_offers',
          };
        }
        
        debugPrint('📦 Parsed notification data: $data');
        await _handleNotificationNavigation(data);
      }
    } catch (e) {
      debugPrint('❌ Fehler beim Verarbeiten der Local Notification: $e');
    }
  }

  /// Behandelt Notification Tap Navigation
  static Future<void> _handleNotificationTap(Map<String, dynamic> data) async {
    debugPrint('🎯 Notification Navigation: $data');
    await _handleNotificationNavigation(data);
  }

  /// Zentrale Navigation Handler für alle Notification Types
  static Future<void> _handleNotificationNavigation(
    Map<String, dynamic> data,
  ) async {
    try {
      // Warte bis Navigation Service bereit ist
      await NotificationNavigationService.waitForNavigation();

      // Delegiere Navigation an NotificationNavigationService
      await NotificationNavigationService.navigateFromNotification(data);
    } catch (e) {
      debugPrint('❌ Fehler bei Notification Navigation: $e');
    }
  }

  /// Abonniert Topics für verschiedene Notification-Arten
  static Future<void> subscribeToOfferNotifications(String userId) async {
    try {
      // Topic für User-spezifische Angebote
      await _messaging.subscribeToTopic('user_offers_$userId');

      // Topic für allgemeine Angebote in der Region
      // await _messaging.subscribeToTopic('offers_general');

      debugPrint('✅ Angebot-Notifications abonniert für User: $userId');
    } catch (e) {
      debugPrint('❌ Fehler beim Abonnieren der Topics: $e');
    }
  }

  /// Deabonniert Topics beim Logout
  static Future<void> unsubscribeFromOfferNotifications(String userId) async {
    try {
      await _messaging.unsubscribeFromTopic('user_offers_$userId');
      debugPrint('✅ Angebot-Notifications deabonniert für User: $userId');
    } catch (e) {
      debugPrint('❌ Fehler beim Deabonnieren der Topics: $e');
    }
  }

  /// Sendet Test-Notification (nur für Development)
  static Future<void> sendTestNotification() async {
    if (kDebugMode) {
      await _localNotifications.show(
        999,
        '🧪 Test Notification',
        'Dies ist eine Test-Benachrichtigung für neue Angebote',
        const NotificationDetails(
          android: AndroidNotificationDetails(
            'taskilo_offers',
            'Neue Angebote',
            importance: Importance.high,
            priority: Priority.high,
            color: Color(0xFF14AD9F),
          ),
          iOS: DarwinNotificationDetails(),
        ),
      );
    }
  }

  /// Prüft ob Notifications aktiviert sind
  static Future<bool> areNotificationsEnabled() async {
    final settings = await _messaging.getNotificationSettings();
    return settings.authorizationStatus == AuthorizationStatus.authorized;
  }

  /// Öffnet App-Einstellungen für Notifications
  static Future<void> openNotificationSettings() async {
    await _messaging.requestPermission();
  }
}

/// Background Message Handler (muss top-level function sein)
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  debugPrint('🔔 Background Message: ${message.notification?.title}');
  // Hier können Background-Tasks ausgeführt werden
  // z.B. Badge Counter aktualisieren
}
