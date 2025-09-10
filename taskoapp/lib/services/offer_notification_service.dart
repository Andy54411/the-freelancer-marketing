import 'dart:async';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'push_notification_service.dart';
import 'firebase_functions_service.dart';

/// Service für Angebot-spezifische Notifications
class OfferNotificationService {
  static final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  static final FirebaseAuth _auth = FirebaseAuth.instance;

  /// Startet Listener für neue Angebote für den eingeloggten User
  static StreamSubscription<QuerySnapshot>? _offerListener;

  /// Startet Monitoring für neue Angebote
  static Future<void> startOfferMonitoring() async {
    final user = _auth.currentUser;
    if (user == null) {
      debugPrint('⚠️ Kein User eingeloggt - Offer Monitoring nicht gestartet');
      return;
    }

    try {
      debugPrint('🔔 Starte Offer Monitoring für User: ${user.uid}');

      // Push Notifications für diesen User abonnieren
      await PushNotificationService.subscribeToOfferNotifications(user.uid);

      // Firestore Listener für eingehende Angebote
      _startIncomingOffersListener(user.uid);

      debugPrint('✅ Offer Monitoring erfolgreich gestartet');
    } catch (e) {
      debugPrint('❌ Fehler beim Starten des Offer Monitoring: $e');
    }
  }

  /// Stoppt Monitoring für Angebote
  static Future<void> stopOfferMonitoring() async {
    final user = _auth.currentUser;
    if (user != null) {
      await PushNotificationService.unsubscribeFromOfferNotifications(user.uid);
    }

    await _offerListener?.cancel();
    _offerListener = null;
    debugPrint('🔕 Offer Monitoring gestoppt');
  }

  /// Startet Listener für eingehende Angebote in Echtzeit
  static void _startIncomingOffersListener(String userId) {
    // Überwache alle Quotes wo der User der Customer ist
    _offerListener = _firestore
        .collection('quotes')
        .where('customerUid', isEqualTo: userId)
        .snapshots()
        .listen(
      (QuerySnapshot snapshot) {
        _handleQuoteSnapshots(snapshot, userId);
      },
      onError: (error) {
        debugPrint('❌ Fehler beim Quotes Listener: $error');
      },
    );

    debugPrint('👂 Incoming Offers Listener aktiv für User: $userId');
  }

  /// Behandelt Quote Snapshot Änderungen
  static void _handleQuoteSnapshots(QuerySnapshot snapshot, String userId) {
    for (final change in snapshot.docChanges) {
      if (change.type == DocumentChangeType.added) {
        _handleNewQuote(change.doc, userId);
      } else if (change.type == DocumentChangeType.modified) {
        _handleQuoteUpdate(change.doc, userId);
      }
    }
  }

  /// Behandelt neue Quote (Angebotsanfrage)
  static void _handleNewQuote(DocumentSnapshot doc, String userId) {
    try {
      final data = doc.data() as Map<String, dynamic>;
      final String projectTitle = data['projectTitle'] ?? 'Neue Angebotsanfrage';

      debugPrint('📋 Neue Quote erstellt: ${doc.id} - $projectTitle');
      
      // Notification kann hier gesendet werden, wenn gewünscht
      // Aber meist sind Quotes noch ohne Angebote
    } catch (e) {
      debugPrint('❌ Fehler beim Verarbeiten neuer Quote: $e');
    }
  }

  /// Behandelt Quote Updates (potentiell neue Angebote)
  static void _handleQuoteUpdate(DocumentSnapshot doc, String userId) {
    try {
      final data = doc.data() as Map<String, dynamic>;
      final String quoteId = doc.id;
      final String projectTitle = data['projectTitle'] ?? 'Angebotsanfrage';
      final String projectSubcategory = data['projectSubcategory'] ?? '';

      debugPrint('📝 Quote aktualisiert: $quoteId - $projectTitle');

      // Prüfe auf neue Angebote in dieser Quote
      _checkForNewOffers(quoteId, userId, projectTitle, projectSubcategory);
    } catch (e) {
      debugPrint('❌ Fehler beim Verarbeiten Quote Update: $e');
    }
  }

  /// Prüft auf neue Angebote in einer Quote
  static Future<void> _checkForNewOffers(
    String quoteId,
    String userId,
    String projectTitle,
    String projectSubcategory,
  ) async {
    try {
      // Prüfe Angebote in der offers Subcollection
      final offersQuery = await _firestore
          .collection('quotes')
          .doc(quoteId)
          .collection('offers')
          .orderBy('createdAt', descending: true)
          .limit(1)
          .get();

      if (offersQuery.docs.isNotEmpty) {
        final latestOffer = offersQuery.docs.first;
        final offerData = latestOffer.data();
        
        // Prüfe ob das Angebot neu ist (innerhalb der letzten 5 Minuten)
        final Timestamp? createdAt = offerData['createdAt'];
        if (createdAt != null) {
          final offerTime = createdAt.toDate();
          final now = DateTime.now();
          final difference = now.difference(offerTime).inMinutes;

          if (difference <= 5) {
            // Neues Angebot gefunden!
            await _sendNewOfferNotification(
              quoteId: quoteId,
              offerId: latestOffer.id,
              userId: userId,
              projectTitle: projectTitle,
              projectSubcategory: projectSubcategory,
              offerData: offerData,
            );
          }
        }
      }
    } catch (e) {
      debugPrint('❌ Fehler beim Prüfen neuer Angebote: $e');
    }
  }

  /// Sendet Notification für neues Angebot
  static Future<void> _sendNewOfferNotification({
    required String quoteId,
    required String offerId,
    required String userId,
    required String projectTitle,
    required String projectSubcategory,
    required Map<String, dynamic> offerData,
  }) async {
    try {
      final String providerName = offerData['providerName'] ?? 'Ein Anbieter';
      final double proposedPrice = (offerData['proposedPrice'] ?? 0).toDouble();

      final String title = '🎉 Neues Angebot erhalten!';
      final String body = '$providerName hat ein Angebot für "$projectSubcategory" abgegeben. Preis: €${proposedPrice.toStringAsFixed(0)}';

      debugPrint('📨 Sende Notification für neues Angebot:');
      debugPrint('   Quote: $quoteId');
      debugPrint('   Offer: $offerId');
      debugPrint('   Provider: $providerName');
      debugPrint('   Preis: €$proposedPrice');

      // Notification-Daten für Navigation
      final Map<String, dynamic> notificationData = {
        'type': 'new_offer',
        'quoteId': quoteId,
        'offerId': offerId,
        'screen': 'incoming_offers',
        'projectTitle': projectTitle,
        'projectSubcategory': projectSubcategory,
      };

      // Sende über Firebase Functions für zuverlässige Zustellung
      final success = await _sendPushNotificationViaFunction(
        userId: userId,
        title: title,
        body: body,
        data: notificationData,
      );

      if (success) {
        debugPrint('✅ Notification erfolgreich gesendet');
        
        // Speichere Notification in Firestore für Bell-Notifications
        await _saveBellNotification(
          userId: userId,
          title: title,
          message: body,
          quoteId: quoteId,
          offerId: offerId,
          data: notificationData,
        );
      } else {
        debugPrint('❌ Notification senden fehlgeschlagen');
      }
    } catch (e) {
      debugPrint('❌ Fehler beim Senden der Angebot-Notification: $e');
    }
  }

  /// Sendet Push Notification über Firebase Function
  static Future<bool> _sendPushNotificationViaFunction({
    required String userId,
    required String title,
    required String body,
    required Map<String, dynamic> data,
  }) async {
    try {
      // Nutze den bestehenden FirebaseFunctionsService
      final result = await FirebaseFunctionsService.sendNotification(
        userId: userId,
        title: title,
        body: body,
        data: data,
      );
      
      return result;
    } catch (e) {
      debugPrint('❌ Fehler beim Senden über Firebase Function: $e');
      return false;
    }
  }

  /// Speichert Bell-Notification in Firestore
  static Future<void> _saveBellNotification({
    required String userId,
    required String title,
    required String message,
    required String quoteId,
    required String offerId,
    required Map<String, dynamic> data,
  }) async {
    try {
      await _firestore.collection('notifications').add({
        'userId': userId,
        'type': 'new_offer',
        'title': title,
        'message': message,
        'quoteId': quoteId,
        'offerId': offerId,
        'link': '/dashboard/user/$userId/quotes/received/$quoteId',
        'isRead': false,
        'createdAt': FieldValue.serverTimestamp(),
        'metadata': {
          'projectTitle': data['projectTitle'],
          'projectSubcategory': data['projectSubcategory'],
        },
      });
      
      debugPrint('✅ Bell-Notification gespeichert');
    } catch (e) {
      debugPrint('❌ Fehler beim Speichern der Bell-Notification: $e');
    }
  }

  /// Manuelle Test-Notification senden
  static Future<void> sendTestOfferNotification() async {
    if (kDebugMode) {
      final user = _auth.currentUser;
      if (user != null) {
        await _sendNewOfferNotification(
          quoteId: 'test_quote_123',
          offerId: 'test_offer_456',
          userId: user.uid,
          projectTitle: 'Test Projekt',
          projectSubcategory: 'Malerarbeiten',
          offerData: {
            'providerName': 'Test Maler GmbH',
            'proposedPrice': 250.0,
            'proposedTimeline': '2-3 Tage',
          },
        );
      }
    }
  }
}
