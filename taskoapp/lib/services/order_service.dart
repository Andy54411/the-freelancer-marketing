import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:flutter/foundation.dart';
import '../models/order.dart' as model;

class OrderService {
  static final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  static final FirebaseAuth _auth = FirebaseAuth.instance;

  /// Lädt alle Aufträge für einen bestimmten User
  static Future<List<model.Order>> getUserOrders(String userId) async {
    try {
      debugPrint('🔍 OrderService: Lade Aufträge für User: $userId');

      // Authentication check
      final currentUser = _auth.currentUser;
      if (currentUser == null) {
        throw Exception('Benutzer ist nicht angemeldet');
      }

      if (currentUser.uid != userId) {
        throw Exception('Zugriff verweigert: Sie können nur Ihre eigenen Aufträge anzeigen');
      }

      // Fetch orders from Firestore - suche in customerFirebaseUid UND kundeId (legacy)
      final customerQuery = _firestore
          .collection('auftraege')
          .where('customerFirebaseUid', isEqualTo: userId);
          
      final legacyQuery = _firestore
          .collection('auftraege')
          .where('kundeId', isEqualTo: userId);

      // Führe beide Queries parallel aus
      final results = await Future.wait([
        customerQuery.get(),
        legacyQuery.get(),
      ]);

      final allDocs = <QueryDocumentSnapshot>[];
      final seenIds = <String>{};

      // Kombiniere Ergebnisse und entferne Duplikate
      for (final snapshot in results) {
        for (final doc in snapshot.docs) {
          if (!seenIds.contains(doc.id)) {
            allDocs.add(doc);
            seenIds.add(doc.id);
          }
        }
      }

      debugPrint('📦 OrderService: ${allDocs.length} Aufträge gefunden (kombiniert)');

      final orders = <model.Order>[];
      
      for (final doc in allDocs) {
        try {
          final data = doc.data() as Map<String, dynamic>;
          
          // Lade Provider-Daten falls providerName fehlt
          String providerName = data['providerName'] ?? '';
          if (providerName.isEmpty && data['selectedAnbieterId'] != null) {
            providerName = await _getProviderName(data['selectedAnbieterId']);
          }
          
          // Erstelle Order mit aktualisierten Provider-Daten
          final orderData = Map<String, dynamic>.from(data);
          if (providerName.isNotEmpty) {
            orderData['providerName'] = providerName;
          }
          
          final order = model.Order.fromMap(orderData, doc.id);
          orders.add(order);
        } catch (e) {
          debugPrint('❌ Fehler beim Parsen von Auftrag ${doc.id}: $e');
        }
      }

      // Sortiere nach createdAt (neueste zuerst)
      orders.sort((a, b) {
        final aDate = a.createdAt ?? DateTime.now();
        final bDate = b.createdAt ?? DateTime.now();
        return bDate.compareTo(aDate);
      });

      debugPrint('✅ OrderService: ${orders.length} Aufträge erfolgreich geladen');
      return orders;

    } catch (e) {
      debugPrint('❌ OrderService Fehler: $e');
      throw Exception('Aufträge konnten nicht geladen werden: $e');
    }
  }

  /// Hilfsfunktion um Provider-Namen zu laden
  static Future<String> _getProviderName(String providerId) async {
    try {
      // Versuche zuerst companies collection
      var providerDoc = await _firestore.collection('companies').doc(providerId).get();
      
      if (providerDoc.exists) {
        final data = providerDoc.data();
        return data?['companyName'] ?? data?['displayName'] ?? '';
      }
      
      // Fallback: users collection
      providerDoc = await _firestore.collection('users').doc(providerId).get();
      if (providerDoc.exists) {
        final data = providerDoc.data();
        final firstName = data?['firstName'] ?? '';
        final lastName = data?['lastName'] ?? '';
        final displayName = data?['displayName'] ?? '';
        
        if (firstName.isNotEmpty || lastName.isNotEmpty) {
          return '$firstName $lastName'.trim();
        } else if (displayName.isNotEmpty) {
          return displayName;
        }
      }
      
      return 'Unbekannter Anbieter';
    } catch (e) {
      debugPrint('❌ Fehler beim Laden des Provider-Namens für $providerId: $e');
      return 'Unbekannter Anbieter';
    }
  }

  /// Lädt einen einzelnen Auftrag
  static Future<model.Order?> getOrder(String orderId) async {
    try {
      debugPrint('🔍 OrderService: Lade Auftrag: $orderId');

      final doc = await _firestore.collection('auftraege').doc(orderId).get();

      if (!doc.exists) {
        debugPrint('❌ Auftrag nicht gefunden: $orderId');
        return null;
      }

      final order = model.Order.fromFirestore(doc);
      debugPrint('✅ OrderService: Auftrag erfolgreich geladen');
      return order;

    } catch (e) {
      debugPrint('❌ OrderService Fehler beim Laden einzelnen Auftrags: $e');
      throw Exception('Auftrag konnte nicht geladen werden: $e');
    }
  }

  /// Stream für Realtime-Updates eines einzelnen Auftrags
  static Stream<model.Order?> getOrderStream(String orderId) {
    return _firestore
        .collection('auftraege')
        .doc(orderId)
        .snapshots()
        .map((doc) {
      if (!doc.exists) return null;
      try {
        return model.Order.fromFirestore(doc);
      } catch (e) {
        debugPrint('❌ Fehler beim Parsen von Auftrag-Stream ${doc.id}: $e');
        return null;
      }
    });
  }

  /// Stream für Realtime-Updates aller User-Aufträge
  static Stream<List<model.Order>> getUserOrdersStream(String userId) {
    return _firestore
        .collection('auftraege')
        .where('customerFirebaseUid', isEqualTo: userId)
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) {
      return snapshot.docs.map((doc) {
        try {
          return model.Order.fromFirestore(doc);
        } catch (e) {
          debugPrint('❌ Fehler beim Parsen von Auftrag-Stream ${doc.id}: $e');
          return null;
        }
      }).where((order) => order != null).cast<model.Order>().toList();
    });
  }

  /// Aktualisiert den Status eines Auftrags
  static Future<void> updateOrderStatus(String orderId, String newStatus) async {
    try {
      debugPrint('🔄 OrderService: Aktualisiere Status für Auftrag $orderId zu $newStatus');

      await _firestore.collection('auftraege').doc(orderId).update({
        'status': newStatus,
        'updatedAt': FieldValue.serverTimestamp(),
      });

      debugPrint('✅ OrderService: Status erfolgreich aktualisiert');

    } catch (e) {
      debugPrint('❌ OrderService Fehler beim Status-Update: $e');
      throw Exception('Status konnte nicht aktualisiert werden: $e');
    }
  }

  /// Erstellt einen neuen Auftrag
  static Future<String> createOrder(model.Order order) async {
    try {
      debugPrint('📝 OrderService: Erstelle neuen Auftrag');

      final docRef = await _firestore.collection('auftraege').add(order.toMap());
      
      debugPrint('✅ OrderService: Auftrag erfolgreich erstellt: ${docRef.id}');
      return docRef.id;

    } catch (e) {
      debugPrint('❌ OrderService Fehler beim Erstellen: $e');
      throw Exception('Auftrag konnte nicht erstellt werden: $e');
    }
  }

  /// Löscht einen Auftrag (nur für Admins oder in bestimmten Status)
  static Future<void> deleteOrder(String orderId) async {
    try {
      debugPrint('🗑️ OrderService: Lösche Auftrag: $orderId');

      await _firestore.collection('auftraege').doc(orderId).delete();

      debugPrint('✅ OrderService: Auftrag erfolgreich gelöscht');

    } catch (e) {
      debugPrint('❌ OrderService Fehler beim Löschen: $e');
      throw Exception('Auftrag konnte nicht gelöscht werden: $e');
    }
  }

  /// Hilfsfunktion für Status-Farben
  static String getStatusDisplayText(String status) {
    switch (status.toLowerCase()) {
      case 'aktiv':
        return 'Aktiv';
      case 'in_bearbeitung':
        return 'In Bearbeitung';
      case 'abgeschlossen':
        return 'Abgeschlossen';
      case 'zahlung_erhalten_clearing':
        return 'Bezahlt';
      case 'storniert':
        return 'Storniert';
      case 'fehlende_details':
        return 'Fehlende Details';
      case 'pending':
        return 'Ausstehend';
      case 'completed':
        return 'Abgeschlossen';
      default:
        return status;
    }
  }

  /// Akzeptiert einen bezahlten Auftrag (Provider)
  /// Ändert Status von 'zahlung_erhalten_clearing' zu 'AKTIV'
  static Future<void> acceptOrder(String orderId) async {
    try {
      debugPrint('✅ OrderService: Akzeptiere Auftrag: $orderId');

      final currentUser = _auth.currentUser;
      if (currentUser == null) {
        throw Exception('Benutzer ist nicht angemeldet');
      }

      // Verwende die Firebase Cloud Function
      final result = await FirebaseFunctions.instanceFor(region: 'europe-west1')
          .httpsCallable('acceptOrder')
          .call({
        'orderId': orderId,
      });

      if (result.data['success'] == true) {
        debugPrint('✅ OrderService: Auftrag erfolgreich akzeptiert');
      } else {
        throw Exception(result.data['message'] ?? 'Unbekannter Fehler beim Akzeptieren');
      }

    } catch (e) {
      debugPrint('❌ OrderService Fehler beim Akzeptieren: $e');
      throw Exception('Auftrag konnte nicht akzeptiert werden: $e');
    }
  }

  /// Markiert einen Auftrag als vom Provider abgeschlossen
  /// Ändert Status von 'AKTIV' zu 'PROVIDER_COMPLETED'
  static Future<void> completeOrderAsProvider(String orderId, {String? completionNote}) async {
    try {
      debugPrint('🎯 OrderService: Markiere Auftrag als vom Provider abgeschlossen: $orderId');

      final currentUser = _auth.currentUser;
      if (currentUser == null) {
        throw Exception('Benutzer ist nicht angemeldet');
      }

      // Verwende die HTTP Cloud Function für Provider-Completion
      final result = await FirebaseFunctions.instanceFor(region: 'europe-west1')
          .httpsCallable('completeOrderHTTP')
          .call({
        'orderId': orderId,
        'completionNote': completionNote ?? 'Auftrag wurde vom Anbieter als abgeschlossen markiert.',
      });

      if (result.data['success'] == true) {
        debugPrint('✅ OrderService: Auftrag als Provider-abgeschlossen markiert');
      } else {
        throw Exception(result.data['message'] ?? 'Fehler beim Markieren als abgeschlossen');
      }

    } catch (e) {
      debugPrint('❌ OrderService Fehler beim Provider-Completion: $e');
      throw Exception('Auftrag konnte nicht als abgeschlossen markiert werden: $e');
    }
  }

  /// Bestätigt den Abschluss eines Auftrags als Kunde
  /// Ändert Status von 'PROVIDER_COMPLETED' zu 'ABGESCHLOSSEN' und löst Auszahlung aus
  static Future<void> completeOrderAsCustomer(
    String orderId, 
    String userId, {
    int? rating,
    String? review,
    String? completionNotes,
  }) async {
    try {
      debugPrint('🎯 OrderService: Bestätige Auftrag-Abschluss als Kunde: $orderId');

      final currentUser = _auth.currentUser;
      if (currentUser == null) {
        throw Exception('Benutzer ist nicht angemeldet');
      }

      if (currentUser.uid != userId) {
        throw Exception('Zugriff verweigert: Sie können nur Ihre eigenen Aufträge abschließen');
      }

      // Verwende die Web API für Customer-Completion
      final response = await _makeHttpRequest(
        'POST',
        '/api/user/$userId/orders/$orderId/complete',
        body: {
          if (rating != null) 'rating': rating,
          if (review != null) 'review': review,
          if (completionNotes != null) 'completionNotes': completionNotes,
        },
      );

      if (response['success'] == true) {
        debugPrint('✅ OrderService: Auftrag erfolgreich abgeschlossen und Auszahlung veranlasst');
      } else {
        throw Exception(response['error'] ?? 'Fehler beim Abschließen des Auftrags');
      }

    } catch (e) {
      debugPrint('❌ OrderService Fehler beim Customer-Completion: $e');
      throw Exception('Auftrag konnte nicht abgeschlossen werden: $e');
    }
  }

  /// HTTP Request Helper für API-Calls
  static Future<Map<String, dynamic>> _makeHttpRequest(
    String method, 
    String endpoint, {
    Map<String, dynamic>? body,
  }) async {
    try {
      final user = _auth.currentUser;
      if (user == null) {
        throw Exception('Benutzer ist nicht angemeldet');
      }

      final token = await user.getIdToken();
      
      debugPrint('🌐 HTTP $method Request zu: $endpoint');
      debugPrint('📝 Body: $body');

      final baseUrl = kDebugMode 
          ? 'http://localhost:3000' 
          : 'https://taskilo.de';
      
      final uri = Uri.parse('$baseUrl$endpoint');
      
      final headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      };

      http.Response response;
      
      switch (method.toUpperCase()) {
        case 'POST':
          response = await http.post(
            uri,
            headers: headers,
            body: body != null ? json.encode(body) : null,
          );
          break;
        case 'PATCH':
          response = await http.patch(
            uri,
            headers: headers,
            body: body != null ? json.encode(body) : null,
          );
          break;
        case 'GET':
          response = await http.get(uri, headers: headers);
          break;
        default:
          throw Exception('Unsupported HTTP method: $method');
      }

      final responseData = json.decode(response.body) as Map<String, dynamic>;
      
      if (response.statusCode >= 200 && response.statusCode < 300) {
        debugPrint('✅ HTTP Request erfolgreich: ${response.statusCode}');
        return responseData;
      } else {
        debugPrint('❌ HTTP Request fehlerhafte Antwort: ${response.statusCode}');
        throw Exception(responseData['error'] ?? 'HTTP ${response.statusCode} Fehler');
      }

    } catch (e) {
      debugPrint('❌ HTTP Request Fehler: $e');
      throw Exception('API-Request fehlgeschlagen: $e');
    }
  }
}
