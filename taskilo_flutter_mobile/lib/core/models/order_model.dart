import 'package:cloud_firestore/cloud_firestore.dart';

class OrderModel {
  final String id;
  final String serviceId;
  final String serviceName;
  final String? description;
  final String status;
  final String? customerId;
  final String? customerName;
  final String? customerAvatarUrl;
  final String? providerId;
  final String? providerName;
  final String? providerAvatarUrl;
  final DateTime? scheduledDate;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final String? location;
  final double? totalAmount;
  final String? paymentStatus;
  final Map<String, dynamic>? metadata;
  
  // Additional B2B fields from web app
  final String? selectedCategory;
  final String? selectedSubcategory;
  final double? jobTotalCalculatedHours;
  final String? jobDurationString;
  final String? jobDateFrom;
  final String? jobDateTo;
  final String? jobTimePreference;
  final int? priceInCents;
  final String? customerType; // 'private' or 'business'
  final String? jobStreet;
  final String? jobCity;
  final String? jobPostalCode;
  final String? jobCountry;
  final DateTime? paidAt;
  final DateTime? clearingPeriodEndsAt;
  final String? paymentMethodId;
  final String? projectId;
  final bool isB2B;
  final String? customerEmail;
  final String? customerPhone;
  final String? customerAddress;
  final String? customerCity;
  final String? customerCountryCode;
  final String? providerEmail;
  final String? providerPhone;
  final String? providerAddress;
  final String? providerCountryCode;
  final Map<String, dynamic>? calculatedFinanceData;

  OrderModel({
    required this.id,
    required this.serviceId,
    required this.serviceName,
    this.description,
    required this.status,
    this.customerId,
    this.customerName,
    this.customerAvatarUrl,
    this.providerId,
    this.providerName,
    this.providerAvatarUrl,
    this.scheduledDate,
    this.createdAt,
    this.updatedAt,
    this.location,
    this.totalAmount,
    this.paymentStatus,
    this.metadata,
    this.selectedCategory,
    this.selectedSubcategory,
    this.jobTotalCalculatedHours,
    this.jobDurationString,
    this.jobDateFrom,
    this.jobDateTo,
    this.jobTimePreference,
    this.priceInCents,
    this.customerType,
    this.jobStreet,
    this.jobCity,
    this.jobPostalCode,
    this.jobCountry,
    this.paidAt,
    this.clearingPeriodEndsAt,
    this.paymentMethodId,
    this.projectId,
    this.isB2B = false,
    this.customerEmail,
    this.customerPhone,
    this.customerAddress,
    this.customerCity,
    this.customerCountryCode,
    this.providerEmail,
    this.providerPhone,
    this.providerAddress,
    this.providerCountryCode,
    this.calculatedFinanceData,
  });

  factory OrderModel.fromFirestore(String id, Map<String, dynamic> data) {
    return OrderModel(
      id: id,
      serviceId: data['serviceId'] ?? id,
      serviceName: data['serviceName'] ?? data['selectedSubcategory'] ?? 'Unbekannter Service',
      description: data['description'],
      status: data['status'] ?? 'unknown',
      customerId: data['customerId'] ?? data['customerFirebaseUid'],
      customerName: data['customerName'],
      customerAvatarUrl: data['customerAvatarUrl'],
      providerId: data['providerId'] ?? data['selectedAnbieterId'],
      providerName: data['providerName'],
      providerAvatarUrl: data['providerAvatarUrl'],
      scheduledDate: data['scheduledDate'] != null
          ? (data['scheduledDate'] as Timestamp).toDate()
          : data['jobDateFrom'] != null
              ? DateTime.tryParse(data['jobDateFrom'])
              : null,
      createdAt: data['createdAt'] != null
          ? (data['createdAt'] as Timestamp).toDate()
          : null,
      updatedAt: data['updatedAt'] != null
          ? (data['updatedAt'] as Timestamp).toDate()
          : data['lastUpdatedAt'] != null
              ? (data['lastUpdatedAt'] as Timestamp).toDate()
              : null,
      location: data['location'] ?? _buildLocationString(data),
      totalAmount: data['totalAmount']?.toDouble() ??
          data['jobCalculatedPriceInCents'] != null
              ? (data['jobCalculatedPriceInCents'] / 100).toDouble()
              : null,
      paymentStatus: data['paymentStatus'],
      metadata: data['metadata'],
      selectedCategory: data['selectedCategory'],
      selectedSubcategory: data['selectedSubcategory'],
      jobTotalCalculatedHours: data['jobTotalCalculatedHours']?.toDouble(),
      jobDurationString: data['jobDurationString']?.toString(),
      jobDateFrom: data['jobDateFrom'],
      jobDateTo: data['jobDateTo'],
      jobTimePreference: data['jobTimePreference'],
      priceInCents: data['priceInCents'] ?? data['jobCalculatedPriceInCents'],
      customerType: data['customerType'] ?? 'private',
      jobStreet: data['jobStreet'],
      jobCity: data['jobCity'],
      jobPostalCode: data['jobPostalCode'],
      jobCountry: data['jobCountry'],
      paidAt: data['paidAt'] != null
          ? (data['paidAt'] as Timestamp).toDate()
          : null,
      clearingPeriodEndsAt: data['clearingPeriodEndsAt'] != null
          ? (data['clearingPeriodEndsAt'] as Timestamp).toDate()
          : null,
      paymentMethodId: data['paymentMethodId'],
      projectId: data['projectId'],
    );
  }

  static String? _buildLocationString(Map<String, dynamic> data) {
    final street = data['jobStreet'];
    final city = data['jobCity'];
    final postalCode = data['jobPostalCode'];
    
    if (street != null || city != null || postalCode != null) {
      return [street, city, postalCode].where((e) => e != null).join(', ');
    }
    return null;
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'serviceId': serviceId,
      'serviceName': serviceName,
      'description': description,
      'status': status,
      'customerId': customerId,
      'customerName': customerName,
      'customerAvatarUrl': customerAvatarUrl,
      'providerId': providerId,
      'providerName': providerName,
      'providerAvatarUrl': providerAvatarUrl,
      'scheduledDate': scheduledDate,
      'createdAt': createdAt,
      'updatedAt': updatedAt,
      'location': location,
      'totalAmount': totalAmount,
      'paymentStatus': paymentStatus,
      'metadata': metadata,
      'selectedCategory': selectedCategory,
      'selectedSubcategory': selectedSubcategory,
      'jobTotalCalculatedHours': jobTotalCalculatedHours,
      'jobDurationString': jobDurationString,
      'jobDateFrom': jobDateFrom,
      'jobDateTo': jobDateTo,
      'jobTimePreference': jobTimePreference,
      'priceInCents': priceInCents,
      'customerType': customerType,
      'jobStreet': jobStreet,
      'jobCity': jobCity,
      'jobPostalCode': jobPostalCode,
      'jobCountry': jobCountry,
      'paidAt': paidAt,
      'clearingPeriodEndsAt': clearingPeriodEndsAt,
      'paymentMethodId': paymentMethodId,
      'projectId': projectId,
    };
  }

  OrderModel copyWith({
    String? id,
    String? serviceId,
    String? serviceName,
    String? description,
    String? status,
    String? customerId,
    String? customerName,
    String? customerAvatarUrl,
    String? providerId,
    String? providerName,
    String? providerAvatarUrl,
    DateTime? scheduledDate,
    DateTime? createdAt,
    DateTime? updatedAt,
    String? location,
    double? totalAmount,
    String? paymentStatus,
    Map<String, dynamic>? metadata,
    String? selectedCategory,
    String? selectedSubcategory,
    double? jobTotalCalculatedHours,
    String? jobDurationString,
    String? jobDateFrom,
    String? jobDateTo,
    String? jobTimePreference,
    int? priceInCents,
    String? customerType,
    String? jobStreet,
    String? jobCity,
    String? jobPostalCode,
    String? jobCountry,
    DateTime? paidAt,
    DateTime? clearingPeriodEndsAt,
    String? paymentMethodId,
    String? projectId,
  }) {
    return OrderModel(
      id: id ?? this.id,
      serviceId: serviceId ?? this.serviceId,
      serviceName: serviceName ?? this.serviceName,
      description: description ?? this.description,
      status: status ?? this.status,
      customerId: customerId ?? this.customerId,
      customerName: customerName ?? this.customerName,
      customerAvatarUrl: customerAvatarUrl ?? this.customerAvatarUrl,
      providerId: providerId ?? this.providerId,
      providerName: providerName ?? this.providerName,
      providerAvatarUrl: providerAvatarUrl ?? this.providerAvatarUrl,
      scheduledDate: scheduledDate ?? this.scheduledDate,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      location: location ?? this.location,
      totalAmount: totalAmount ?? this.totalAmount,
      paymentStatus: paymentStatus ?? this.paymentStatus,
      metadata: metadata ?? this.metadata,
      selectedCategory: selectedCategory ?? this.selectedCategory,
      selectedSubcategory: selectedSubcategory ?? this.selectedSubcategory,
      jobTotalCalculatedHours: jobTotalCalculatedHours ?? this.jobTotalCalculatedHours,
      jobDurationString: jobDurationString ?? this.jobDurationString,
      jobDateFrom: jobDateFrom ?? this.jobDateFrom,
      jobDateTo: jobDateTo ?? this.jobDateTo,
      jobTimePreference: jobTimePreference ?? this.jobTimePreference,
      priceInCents: priceInCents ?? this.priceInCents,
      customerType: customerType ?? this.customerType,
      jobStreet: jobStreet ?? this.jobStreet,
      jobCity: jobCity ?? this.jobCity,
      jobPostalCode: jobPostalCode ?? this.jobPostalCode,
      jobCountry: jobCountry ?? this.jobCountry,
      paidAt: paidAt ?? this.paidAt,
      clearingPeriodEndsAt: clearingPeriodEndsAt ?? this.clearingPeriodEndsAt,
      paymentMethodId: paymentMethodId ?? this.paymentMethodId,
      projectId: projectId ?? this.projectId,
    );
  }

  // Helper methods for status checking
  bool get isActive => status == 'AKTIV';
  bool get isCompleted => status == 'ABGESCHLOSSEN' || status == 'COMPLETED';
  bool get isPaid => status == 'bezahlt' || status == 'zahlung_erhalten_clearing';
  bool get isScheduled => status == 'scheduled' || status == 'geplant';
  bool get isCancelled => status == 'STORNIERT' || status == 'cancelled';
  bool get isRejected => status == 'abgelehnt_vom_anbieter';
  bool get isBusinessOrder => customerType == 'business';
  bool get isPrivateOrder => customerType == 'private';

  // Helper method for formatted price display
  String get formattedPrice {
    if (totalAmount != null) {
      return '€${totalAmount!.toStringAsFixed(2)}';
    } else if (priceInCents != null) {
      return '€${(priceInCents! / 100).toStringAsFixed(2)}';
    }
    return 'Preis nicht verfügbar';
  }

  // Helper method for formatted date display
  String get formattedDate {
    if (scheduledDate != null) {
      return _formatDate(scheduledDate!);
    } else if (createdAt != null) {
      return _formatDate(createdAt!);
    }
    return 'Datum nicht verfügbar';
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final yesterday = today.subtract(const Duration(days: 1));
    final tomorrow = today.add(const Duration(days: 1));
    final orderDate = DateTime(date.year, date.month, date.day);

    if (orderDate == today) {
      return 'Heute, ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
    } else if (orderDate == tomorrow) {
      return 'Morgen, ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
    } else if (orderDate == yesterday) {
      return 'Gestern, ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
    } else {
      return '${date.day}.${date.month}.${date.year}, ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
    }
  }

  // Status display names in German
  String get statusDisplayName {
    switch (status.toLowerCase()) {
      case 'aktiv':
        return 'Aktiv';
      case 'abgeschlossen':
      case 'completed':
        return 'Abgeschlossen';
      case 'bezahlt':
      case 'zahlung_erhalten_clearing':
        return 'Bezahlt';
      case 'scheduled':
      case 'geplant':
        return 'Geplant';
      case 'storniert':
      case 'cancelled':
        return 'Storniert';
      case 'abgelehnt_vom_anbieter':
        return 'Abgelehnt';
      case 'in bearbeitung':
        return 'In Bearbeitung';
      case 'fehlende details':
        return 'Fehlende Details';
      default:
        return status;
    }
  }

  // Factory constructor from Map (for Firestore)
  factory OrderModel.fromMap(Map<String, dynamic> data, {String? documentId}) {
    return OrderModel(
      id: documentId ?? data['id'] ?? '',
      serviceId: data['serviceId'] ?? '',
      serviceName: data['serviceName'] ?? '',
      description: data['description'],
      status: data['status'] ?? 'pending',
      customerId: data['customerId'],
      customerName: data['customerName'],
      customerAvatarUrl: data['customerAvatarUrl'],
      providerId: data['providerId'],
      providerName: data['providerName'],
      providerAvatarUrl: data['providerAvatarUrl'],
      scheduledDate: data['scheduledDate'] != null 
        ? (data['scheduledDate'] is Timestamp 
            ? (data['scheduledDate'] as Timestamp).toDate()
            : DateTime.tryParse(data['scheduledDate'].toString()))
        : null,
      createdAt: data['createdAt'] != null 
        ? (data['createdAt'] is Timestamp 
            ? (data['createdAt'] as Timestamp).toDate()
            : DateTime.tryParse(data['createdAt'].toString()))
        : null,
      updatedAt: data['updatedAt'] != null 
        ? (data['updatedAt'] is Timestamp 
            ? (data['updatedAt'] as Timestamp).toDate()
            : DateTime.tryParse(data['updatedAt'].toString()))
        : null,
      location: data['location'],
      totalAmount: data['totalAmount']?.toDouble(),
      paymentStatus: data['paymentStatus'],
      metadata: data['metadata'],
      selectedCategory: data['selectedCategory'],
      selectedSubcategory: data['selectedSubcategory'],
      jobTotalCalculatedHours: data['jobTotalCalculatedHours']?.toDouble(),
      jobDurationString: data['jobDurationString'],
      jobDateFrom: data['jobDateFrom'],
      jobDateTo: data['jobDateTo'],
      jobTimePreference: data['jobTimePreference'],
      isB2B: data['isB2B'] ?? false,
      customerEmail: data['customerEmail'],
      customerPhone: data['customerPhone'],
      customerAddress: data['customerAddress'],
      providerEmail: data['providerEmail'],
      providerPhone: data['providerPhone'],
      providerAddress: data['providerAddress'],
      customerCountryCode: data['customerCountryCode'],
      providerCountryCode: data['providerCountryCode'],
      calculatedFinanceData: data['calculatedFinanceData'],
    );
  }
}
