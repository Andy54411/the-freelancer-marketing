import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../utils/api_config.dart';

/// Service für TimeTracker-Funktionen
/// 
/// Verwendet die existierende Web-API anstatt duplicate APIs zu erstellen
class TimeTrackerService {
  
  /// Genehmigt Stunden für einen Auftrag mit automatischer Stripe-Zahlung
  /// 
  /// Diese Methode verwendet die existierende Web-API /api/bill-additional-hours
  /// die bereits alle Payment-Funktionen implementiert hat
  /// 
  /// [orderId] - ID des Auftrags
  /// [timeEntryIds] - Liste der zu genehmigenden TimeEntry IDs
  static Future<Map<String, dynamic>> approveHours({
    required String orderId,
    required List<String> timeEntryIds,
  }) async {
    try {
      debugPrint('🔄 TimeTrackerService.approveHours startet...');
      debugPrint('📋 OrderId: $orderId');
      debugPrint('📋 TimeEntryIds: $timeEntryIds');
      
      // SCHRITT 1: Erst die TimeEntries in Firestore freigeben (Status ändern)
      debugPrint('🔄 Schritt 1: TimeEntries in Firestore freigeben...');
      await _approveTimeEntriesInFirestore(orderId, timeEntryIds);
      debugPrint('✅ TimeEntries in Firestore freigegeben');

      // SCHRITT 2: Firebase Auth Token holen
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) {
        debugPrint('❌ Benutzer ist nicht angemeldet');
        throw Exception('Benutzer ist nicht angemeldet');
      }

      debugPrint('✅ Firebase User gefunden: ${user.uid}');
      final idToken = await user.getIdToken();
      debugPrint('✅ Firebase Auth Token erhalten');

      // SCHRITT 3: API Request an die existierende Web-API
      debugPrint('🔄 Schritt 3: API Request für Payment...');
      debugPrint('🌐 API Request wird gesendet an: ${ApiConfig.billAdditionalHoursEndpoint}');
      
      final requestData = {
        'orderId': orderId,
        'approvedEntryIds': timeEntryIds, // Die Web-API erwartet "approvedEntryIds"
        // customerStripeId und providerStripeAccountId werden automatisch aus der Order geladen
      };
      
      debugPrint('📤 Request Body: ${jsonEncode(requestData)}');
      
      final response = await http.post(
        Uri.parse(ApiConfig.billAdditionalHoursEndpoint),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $idToken',
        },
        body: jsonEncode(requestData),
      );

      debugPrint('📥 API Response Status: ${response.statusCode}');
      debugPrint('📥 API Response Body: ${response.body}');

      // SCHRITT 4: Response verarbeiten
      if (response.statusCode == 200) {
        final responseData = jsonDecode(response.body);
        debugPrint('✅ API Call erfolgreich');
        
        // Prüfe Response-Typ: PaymentIntent oder direkter Transfer
        if (responseData.containsKey('paymentIntentId')) {
          // Fall 1: PaymentIntent wurde erstellt, Payment muss noch bestätigt werden
          debugPrint('� PaymentIntent erstellt: ${responseData['paymentIntentId']}');
          debugPrint('💰 Customer bezahlt: ${responseData['customerPays']}¢');
          debugPrint('🏦 Provider erhält: ${responseData['companyReceives']}¢');
          debugPrint('� Platform Fee: ${responseData['platformFee']}¢');
          
          return {
            'success': true,
            'requiresPayment': true, // WICHTIG: Payment muss noch durchgeführt werden
            'data': {
              'paymentIntentId': responseData['paymentIntentId'],
              'clientSecret': responseData['clientSecret'],
              'customerPays': responseData['customerPays'],
              'companyReceives': responseData['companyReceives'],
              'platformFee': responseData['platformFee'],
              'additionalHours': responseData['additionalHours'],
              'transferType': responseData['transferType'],
              'totalHours': timeEntryIds.length,
              'message': responseData['message'] ?? 'PaymentIntent erstellt, Payment erforderlich',
            }
          };
        } else {
          // Fall 2: Direkter Transfer (wenn bereits bezahlt)
          debugPrint('💰 Total Amount Transferred: ${responseData['totalAmountTransferred']}');
          debugPrint('🔗 Transfer ID: ${responseData['transferId']}');
          
          return {
            'success': true,
            'requiresPayment': false, // Payment bereits abgeschlossen
            'data': {
              'totalHours': timeEntryIds.length,
              'paymentRequired': false,
              'totalAmount': responseData['totalAmountTransferred'] ?? 0,
              'transferId': responseData['transferId'],
              'message': 'Stunden wurden erfolgreich freigegeben und bezahlt',
            }
          };
        }
      } else {
        final responseData = jsonDecode(response.body);
        debugPrint('❌ API Call fehlgeschlagen');
        debugPrint('❌ Error: ${responseData['error']}');
        
        return {
          'success': false,
          'error': responseData['error'] ?? 'Unbekannter Fehler',
          'statusCode': response.statusCode,
        };
      }
    } catch (e) {
      debugPrint('❌ Exception in TimeTrackerService.approveHours: $e');
      return {
        'success': false,
        'error': 'Netzwerkfehler: $e',
      };
    }
  }

  /// Private Hilfsfunktion: Genehmigt TimeEntries in Firestore
  /// 
  /// Ändert den Status von 'logged' zu 'customer_approved'
  static Future<void> _approveTimeEntriesInFirestore(
    String orderId,
    List<String> timeEntryIds,
  ) async {
    try {
      debugPrint('🔄 Genehmige TimeEntries in Firestore...');
      debugPrint('📋 TimeEntryIds: $timeEntryIds');
      
      final firestore = FirebaseFirestore.instance;
      final orderRef = firestore.collection('auftraege').doc(orderId);
      
      // Hole aktuelle Order-Daten
      final orderDoc = await orderRef.get();
      if (!orderDoc.exists) {
        throw Exception('Order nicht gefunden');
      }
      
      final orderData = orderDoc.data()!;
      final timeTracking = orderData['timeTracking'] as Map<String, dynamic>? ?? {};
      final timeEntries = (timeTracking['timeEntries'] as List<dynamic>?) ?? [];
      
      // Suche und update die spezifischen TimeEntries
      bool hasChanges = false;
      for (final entry in timeEntries) {
        if (entry is Map<String, dynamic> && 
            timeEntryIds.contains(entry['id']) && 
            entry['status'] == 'logged') {
          
          debugPrint('🔄 Genehmige TimeEntry: ${entry['id']} (${entry['hours']}h)');
          entry['status'] = 'customer_approved'; // WICHTIG: Ändere Status für API
          entry['approvedAt'] = DateTime.now().toIso8601String();
          entry['approvedBy'] = 'customer'; // Zur Dokumentation
          hasChanges = true;
        }
      }
      
      if (hasChanges) {
        // Update Firestore
        await orderRef.update({
          'timeTracking.timeEntries': timeEntries,
          'timeTracking.lastUpdated': DateTime.now().toIso8601String(),
        });
        debugPrint('✅ TimeEntries Status in Firestore aktualisiert');
      } else {
        debugPrint('⚠️ Keine TimeEntries zum Genehmigen gefunden');
      }
      
    } catch (e) {
      debugPrint('❌ Fehler beim Genehmigen der TimeEntries: $e');
      throw Exception('TimeEntries konnten nicht freigegeben werden: $e');
    }
  }

  /// HINWEIS: Weitere TimeTracker-Funktionen wie getTimeTrackingData()
  /// werden direkt über Firestore geladen, da sie keine speziellen API-Calls benötigen.
  /// Siehe _loadTimeTrackingData() in order_detail_screen.dart
  
  /// Hilfsfunktion: Erstelle Test-TimeEntries für Development/Testing
  /// 
  /// Diese Funktion erstellt echte TimeEntry-Daten in Firestore zum Testen der API
  static Future<List<String>> createTestTimeEntries({
    required String orderId,
    int count = 2,
  }) async {
    try {
      debugPrint('🔧 Erstelle Test-TimeEntries für Order: $orderId');
      
      // Import für Firestore
      final firestore = FirebaseFirestore.instance;
      final orderRef = firestore.collection('auftraege').doc(orderId);
      
      // Hole aktuelle Order-Daten
      final orderDoc = await orderRef.get();
      if (!orderDoc.exists) {
        throw Exception('Order nicht gefunden');
      }
      
      final orderData = orderDoc.data()!;
      final timeTracking = orderData['timeTracking'] as Map<String, dynamic>? ?? {};
      final existingEntries = (timeTracking['timeEntries'] as List<dynamic>?) ?? [];
      
      final newEntries = <Map<String, dynamic>>[];
      final newEntryIds = <String>[];
      
      for (int i = 0; i < count; i++) {
        final entryId = 'test_entry_${DateTime.now().millisecondsSinceEpoch}_$i';
        final hours = 2.0 + i; // 2h, 3h, etc.
        final hourlyRate = 50.0; // 50€/h
        final billableAmount = (hours * hourlyRate * 100).toInt(); // In Cents
        
        final entry = {
          'id': entryId,
          'startTime': DateTime.now().subtract(Duration(hours: 24 - i)).toIso8601String(),
          'endTime': DateTime.now().subtract(Duration(hours: 22 - i)).toIso8601String(),
          'hours': hours,
          'description': 'Test zusätzliche Arbeitszeit $i',
          'category': 'additional', // WICHTIG: Muss 'additional' sein
          'status': 'logged', // WICHTIG: API erwartet 'logged' Status für Approval
          'hourlyRate': hourlyRate,
          'billableAmount': billableAmount,
          'submittedAt': DateTime.now().toIso8601String(),
          'createdAt': DateTime.now().toIso8601String(),
        };
        
        newEntries.add(entry);
        newEntryIds.add(entryId);
      }
      
      // Füge neue Entries zu den existierenden hinzu
      final allEntries = [...existingEntries, ...newEntries];
      
      // Update Firestore
      await orderRef.update({
        'timeTracking.timeEntries': allEntries,
        'timeTracking.lastUpdated': DateTime.now().toIso8601String(),
      });
      
      debugPrint('✅ ${newEntries.length} Test-TimeEntries erstellt');
      debugPrint('📋 Entry IDs: $newEntryIds');
      
      return newEntryIds;
      
    } catch (e) {
      debugPrint('❌ Fehler beim Erstellen von Test-TimeEntries: $e');
      throw Exception('Test-TimeEntries konnten nicht erstellt werden: $e');
    }
  }
}
