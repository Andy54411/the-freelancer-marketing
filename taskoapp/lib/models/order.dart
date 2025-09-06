import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';

class Order {
  final String id;
  final String selectedSubcategory;
  final String providerName;
  final int totalAmountPaidByBuyerInCents; // In Cent gespeichert in Firebase
  final String status;
  final String selectedAnbieterId;
  final String customerFirebaseUid;
  final String? currency;
  final DateTime? paidAt;
  final String? projectName;
  final String? projectId;
  final DateTime? orderDate;
  final DateTime? createdAt;
  final String? serviceImageUrl;
  final String? freelancerAvatarUrl;

  const Order({
    required this.id,
    required this.selectedSubcategory,
    required this.providerName,
    required this.totalAmountPaidByBuyerInCents,
    required this.status,
    required this.selectedAnbieterId,
    required this.customerFirebaseUid,
    this.currency,
    this.paidAt,
    this.projectName,
    this.projectId,
    this.orderDate,
    this.createdAt,
    this.serviceImageUrl,
    this.freelancerAvatarUrl,
  });

  /// Konvertiert Cent zu Euro für die Anzeige
  double get totalAmountInEuro => (totalAmountPaidByBuyerInCents) / 100.0;

  /// Formatiert den Preis für die Anzeige
  String getFormattedPrice() {
    if (totalAmountPaidByBuyerInCents == 0) {
      return 'Preis nicht verfügbar';
    }
    return '${totalAmountInEuro.toStringAsFixed(2)} ${currency ?? 'EUR'}';
  }

  factory Order.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    
    // Debug: Zeige alle verfügbaren Felder
    debugPrint('🔍 Order.fromFirestore Debug für ${doc.id}:');
    debugPrint('📊 Verfügbare Felder: ${data.keys.toList()}');
    debugPrint('💰 totalAmountPaidByBuyer: ${data['totalAmountPaidByBuyer']} (${data['totalAmountPaidByBuyer'].runtimeType})');
    debugPrint('💰 jobCalculatedPriceInCents: ${data['jobCalculatedPriceInCents']} (${data['jobCalculatedPriceInCents']?.runtimeType})');
    
    // Robust Cent-Konvertierung - mehrere Feldnamen überprüfen
    int totalAmountInCents = 0;
    
    // 1. Zuerst totalAmountPaidByBuyer versuchen
    final rawAmount = data['totalAmountPaidByBuyer'];
    if (rawAmount != null) {
      if (rawAmount is int) {
        totalAmountInCents = rawAmount;
      } else if (rawAmount is double) {
        totalAmountInCents = rawAmount.toInt();
      }
    }
    
    // 2. Falls immer noch 0, jobCalculatedPriceInCents versuchen
    if (totalAmountInCents == 0) {
      final jobPrice = data['jobCalculatedPriceInCents'];
      if (jobPrice != null) {
        if (jobPrice is int) {
          totalAmountInCents = jobPrice;
        } else if (jobPrice is double) {
          totalAmountInCents = jobPrice.toInt();
        }
      }
    }
    
    debugPrint('✅ Finaler totalAmountInCents: $totalAmountInCents');
    
    return Order(
      id: doc.id,
      selectedSubcategory: data['selectedSubcategory'] ?? '',
      providerName: data['providerName'] ?? '',
      totalAmountPaidByBuyerInCents: totalAmountInCents,
      status: data['status'] ?? 'FEHLENDE DETAILS',
      selectedAnbieterId: data['selectedAnbieterId'] ?? '',
      customerFirebaseUid: data['customerFirebaseUid'] ?? '',
      currency: data['currency'],
      paidAt: _parseDateTime(data['paidAt']),
      projectName: data['projectName'],
      projectId: data['projectId'],
      orderDate: _parseDateTime(data['orderDate']),
      createdAt: _parseDateTime(data['createdAt']),
      serviceImageUrl: data['serviceImageUrl'],
      freelancerAvatarUrl: data['freelancerAvatarUrl'],
    );
  }

  factory Order.fromMap(Map<String, dynamic> data, String documentId) {
    // Robust Cent-Konvertierung - mehrere Feldnamen überprüfen
    int totalAmountInCents = 0;
    
    // 1. Zuerst totalAmountPaidByBuyer versuchen
    final rawAmount = data['totalAmountPaidByBuyer'];
    if (rawAmount != null) {
      if (rawAmount is int) {
        totalAmountInCents = rawAmount;
      } else if (rawAmount is double) {
        totalAmountInCents = rawAmount.toInt();
      }
    }
    
    // 2. Falls immer noch 0, jobCalculatedPriceInCents versuchen
    if (totalAmountInCents == 0) {
      final jobPrice = data['jobCalculatedPriceInCents'];
      if (jobPrice != null) {
        if (jobPrice is int) {
          totalAmountInCents = jobPrice;
        } else if (jobPrice is double) {
          totalAmountInCents = jobPrice.toInt();
        }
      }
    }
    
    return Order(
      id: documentId,
      selectedSubcategory: data['selectedSubcategory'] ?? '',
      providerName: data['providerName'] ?? '',
      totalAmountPaidByBuyerInCents: totalAmountInCents,
      status: data['status'] ?? 'FEHLENDE DETAILS',
      selectedAnbieterId: data['selectedAnbieterId'] ?? '',
      customerFirebaseUid: data['customerFirebaseUid'] ?? data['kundeId'] ?? '',
      currency: data['currency'],
      paidAt: _parseDateTime(data['paidAt']),
      projectName: data['projectName'],
      projectId: data['projectId'],
      orderDate: _parseDateTime(data['orderDate']),
      createdAt: _parseDateTime(data['createdAt']),
      serviceImageUrl: data['serviceImageUrl'],
      freelancerAvatarUrl: data['freelancerAvatarUrl'],
    );
  }

  static DateTime? _parseDateTime(dynamic dateValue) {
    if (dateValue == null) return null;
    
    if (dateValue is Timestamp) {
      return dateValue.toDate();
    } else if (dateValue is Map<String, dynamic>) {
      // Firestore timestamp format from API
      final seconds = dateValue['_seconds'] as int?;
      if (seconds != null) {
        return DateTime.fromMillisecondsSinceEpoch(seconds * 1000);
      }
    } else if (dateValue is String) {
      return DateTime.tryParse(dateValue);
    } else if (dateValue is DateTime) {
      return dateValue;
    }
    
    return null;
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'selectedSubcategory': selectedSubcategory,
      'providerName': providerName,
      'totalAmountPaidByBuyer': totalAmountPaidByBuyerInCents,
      'status': status,
      'selectedAnbieterId': selectedAnbieterId,
      'customerFirebaseUid': customerFirebaseUid,
      'currency': currency,
      'paidAt': paidAt != null ? Timestamp.fromDate(paidAt!) : null,
      'projectName': projectName,
      'projectId': projectId,
      'orderDate': orderDate != null ? Timestamp.fromDate(orderDate!) : null,
      'createdAt': createdAt != null ? Timestamp.fromDate(createdAt!) : null,
      'serviceImageUrl': serviceImageUrl,
      'freelancerAvatarUrl': freelancerAvatarUrl,
    };
  }

  Order copyWith({
    String? id,
    String? selectedSubcategory,
    String? providerName,
    int? totalAmountPaidByBuyerInCents,
    String? status,
    String? selectedAnbieterId,
    String? customerFirebaseUid,
    String? currency,
    DateTime? paidAt,
    String? projectName,
    String? projectId,
    DateTime? orderDate,
    DateTime? createdAt,
    String? serviceImageUrl,
    String? freelancerAvatarUrl,
  }) {
    return Order(
      id: id ?? this.id,
      selectedSubcategory: selectedSubcategory ?? this.selectedSubcategory,
      providerName: providerName ?? this.providerName,
      totalAmountPaidByBuyerInCents: totalAmountPaidByBuyerInCents ?? this.totalAmountPaidByBuyerInCents,
      status: status ?? this.status,
      selectedAnbieterId: selectedAnbieterId ?? this.selectedAnbieterId,
      customerFirebaseUid: customerFirebaseUid ?? this.customerFirebaseUid,
      currency: currency ?? this.currency,
      paidAt: paidAt ?? this.paidAt,
      projectName: projectName ?? this.projectName,
      projectId: projectId ?? this.projectId,
      orderDate: orderDate ?? this.orderDate,
      createdAt: createdAt ?? this.createdAt,
      serviceImageUrl: serviceImageUrl ?? this.serviceImageUrl,
      freelancerAvatarUrl: freelancerAvatarUrl ?? this.freelancerAvatarUrl,
    );
  }
}
