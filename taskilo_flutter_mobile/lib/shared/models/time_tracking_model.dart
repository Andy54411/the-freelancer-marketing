import 'package:cloud_functions/cloud_functions.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

class TimeTrackingModel {
  final String orderId;
  final double originalPlannedHours;
  final double hourlyRate;
  final List<TimeEntry> timeEntries;
  final List<ApprovalRequest> approvalRequests;
  final double totalLoggedHours;
  final double totalOriginalHours;
  final double totalAdditionalHours;
  final double totalApprovedAdditionalHours;
  final double totalBilledAmount;
  final DateTime? lastUpdated;

  TimeTrackingModel({
    required this.orderId,
    required this.originalPlannedHours,
    required this.hourlyRate,
    required this.timeEntries,
    required this.approvalRequests,
    required this.totalLoggedHours,
    required this.totalOriginalHours,
    required this.totalAdditionalHours,
    required this.totalApprovedAdditionalHours,
    required this.totalBilledAmount,
    this.lastUpdated,
  });

  factory TimeTrackingModel.fromFirestore(Map<String, dynamic> data) {
    return TimeTrackingModel(
      orderId: data['orderId'] ?? '',
      originalPlannedHours: (data['originalPlannedHours'] ?? 0).toDouble(),
      hourlyRate: (data['hourlyRate'] ?? 0).toDouble(),
      timeEntries: (data['timeEntries'] as List<dynamic>?)
          ?.map((entry) => TimeEntry.fromMap(entry))
          .toList() ?? [],
      approvalRequests: (data['approvalRequests'] as List<dynamic>?)
          ?.map((request) => ApprovalRequest.fromMap(request))
          .toList() ?? [],
      totalLoggedHours: (data['totalLoggedHours'] ?? 0).toDouble(),
      totalOriginalHours: (data['totalOriginalHours'] ?? 0).toDouble(),
      totalAdditionalHours: (data['totalAdditionalHours'] ?? 0).toDouble(),
      totalApprovedAdditionalHours: (data['totalApprovedAdditionalHours'] ?? 0).toDouble(),
      totalBilledAmount: (data['totalBilledAmount'] ?? 0).toDouble(),
      lastUpdated: data['lastUpdated'] != null 
          ? (data['lastUpdated'] as Timestamp).toDate()
          : null,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'orderId': orderId,
      'originalPlannedHours': originalPlannedHours,
      'hourlyRate': hourlyRate,
      'timeEntries': timeEntries.map((entry) => entry.toMap()).toList(),
      'approvalRequests': approvalRequests.map((request) => request.toMap()).toList(),
      'totalLoggedHours': totalLoggedHours,
      'totalOriginalHours': totalOriginalHours,
      'totalAdditionalHours': totalAdditionalHours,
      'totalApprovedAdditionalHours': totalApprovedAdditionalHours,
      'totalBilledAmount': totalBilledAmount,
      'lastUpdated': lastUpdated != null ? Timestamp.fromDate(lastUpdated!) : null,
    };
  }
}

class TimeEntry {
  final String id;
  final DateTime date;
  final String startTime;
  final String? endTime;
  final double hours;
  final String description;
  final String category; // 'original' or 'additional'
  final String status; // 'draft', 'submitted', 'customer_approved', 'customer_rejected', 'billing_pending', 'billed'
  final bool isBreakTime;
  final int? breakMinutes;
  final String? notes;
  final DateTime createdAt;
  final DateTime? submittedAt;
  final DateTime? approvedAt;
  final DateTime? billedAt;

  TimeEntry({
    required this.id,
    required this.date,
    required this.startTime,
    this.endTime,
    required this.hours,
    required this.description,
    required this.category,
    required this.status,
    this.isBreakTime = false,
    this.breakMinutes,
    this.notes,
    required this.createdAt,
    this.submittedAt,
    this.approvedAt,
    this.billedAt,
  });

  factory TimeEntry.fromMap(Map<String, dynamic> data) {
    return TimeEntry(
      id: data['id'] ?? '',
      date: (data['date'] as Timestamp).toDate(),
      startTime: data['startTime'] ?? '',
      endTime: data['endTime'],
      hours: (data['hours'] ?? 0).toDouble(),
      description: data['description'] ?? '',
      category: data['category'] ?? 'original',
      status: data['status'] ?? 'draft',
      isBreakTime: data['isBreakTime'] ?? false,
      breakMinutes: data['breakMinutes'],
      notes: data['notes'],
      createdAt: (data['createdAt'] as Timestamp).toDate(),
      submittedAt: data['submittedAt'] != null 
          ? (data['submittedAt'] as Timestamp).toDate()
          : null,
      approvedAt: data['approvedAt'] != null 
          ? (data['approvedAt'] as Timestamp).toDate()
          : null,
      billedAt: data['billedAt'] != null 
          ? (data['billedAt'] as Timestamp).toDate()
          : null,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'date': Timestamp.fromDate(date),
      'startTime': startTime,
      'endTime': endTime,
      'hours': hours,
      'description': description,
      'category': category,
      'status': status,
      'isBreakTime': isBreakTime,
      'breakMinutes': breakMinutes,
      'notes': notes,
      'createdAt': Timestamp.fromDate(createdAt),
      'submittedAt': submittedAt != null ? Timestamp.fromDate(submittedAt!) : null,
      'approvedAt': approvedAt != null ? Timestamp.fromDate(approvedAt!) : null,
      'billedAt': billedAt != null ? Timestamp.fromDate(billedAt!) : null,
    };
  }

  TimeEntry copyWith({
    String? id,
    DateTime? date,
    String? startTime,
    String? endTime,
    double? hours,
    String? description,
    String? category,
    String? status,
    bool? isBreakTime,
    int? breakMinutes,
    String? notes,
    DateTime? createdAt,
    DateTime? submittedAt,
    DateTime? approvedAt,
    DateTime? billedAt,
  }) {
    return TimeEntry(
      id: id ?? this.id,
      date: date ?? this.date,
      startTime: startTime ?? this.startTime,
      endTime: endTime ?? this.endTime,
      hours: hours ?? this.hours,
      description: description ?? this.description,
      category: category ?? this.category,
      status: status ?? this.status,
      isBreakTime: isBreakTime ?? this.isBreakTime,
      breakMinutes: breakMinutes ?? this.breakMinutes,
      notes: notes ?? this.notes,
      createdAt: createdAt ?? this.createdAt,
      submittedAt: submittedAt ?? this.submittedAt,
      approvedAt: approvedAt ?? this.approvedAt,
      billedAt: billedAt ?? this.billedAt,
    );
  }
}

class ApprovalRequest {
  final String id;
  final String orderId;
  final List<String> entryIds;
  final String status; // 'pending', 'approved', 'rejected', 'partially_approved'
  final String? providerMessage;
  final String? customerFeedback;
  final List<String>? approvedEntryIds;
  final DateTime createdAt;
  final DateTime? responseAt;
  final double totalHours;
  final double totalAmount;

  ApprovalRequest({
    required this.id,
    required this.orderId,
    required this.entryIds,
    required this.status,
    this.providerMessage,
    this.customerFeedback,
    this.approvedEntryIds,
    required this.createdAt,
    this.responseAt,
    required this.totalHours,
    required this.totalAmount,
  });

  factory ApprovalRequest.fromMap(Map<String, dynamic> data) {
    return ApprovalRequest(
      id: data['id'] ?? '',
      orderId: data['orderId'] ?? '',
      entryIds: List<String>.from(data['entryIds'] ?? []),
      status: data['status'] ?? 'pending',
      providerMessage: data['providerMessage'],
      customerFeedback: data['customerFeedback'],
      approvedEntryIds: data['approvedEntryIds'] != null 
          ? List<String>.from(data['approvedEntryIds'])
          : null,
      createdAt: (data['createdAt'] as Timestamp).toDate(),
      responseAt: data['responseAt'] != null 
          ? (data['responseAt'] as Timestamp).toDate()
          : null,
      totalHours: (data['totalHours'] ?? 0).toDouble(),
      totalAmount: (data['totalAmount'] ?? 0).toDouble(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'orderId': orderId,
      'entryIds': entryIds,
      'status': status,
      'providerMessage': providerMessage,
      'customerFeedback': customerFeedback,
      'approvedEntryIds': approvedEntryIds,
      'createdAt': Timestamp.fromDate(createdAt),
      'responseAt': responseAt != null ? Timestamp.fromDate(responseAt!) : null,
      'totalHours': totalHours,
      'totalAmount': totalAmount,
    };
  }
}

// Status enums for better type safety
enum TimeEntryStatus {
  draft,
  submitted,
  customerApproved,
  customerRejected,
  billingPending,
  billed,
}

enum TimeEntryCategory {
  original,
  additional,
}

enum ApprovalRequestStatus {
  pending,
  approved,
  rejected,
  partiallyApproved,
}

// Helper extensions
extension TimeEntryStatusExtension on TimeEntryStatus {
  String get value {
    switch (this) {
      case TimeEntryStatus.draft:
        return 'draft';
      case TimeEntryStatus.submitted:
        return 'submitted';
      case TimeEntryStatus.customerApproved:
        return 'customer_approved';
      case TimeEntryStatus.customerRejected:
        return 'customer_rejected';
      case TimeEntryStatus.billingPending:
        return 'billing_pending';
      case TimeEntryStatus.billed:
        return 'billed';
    }
  }

  String get displayName {
    switch (this) {
      case TimeEntryStatus.draft:
        return 'Entwurf';
      case TimeEntryStatus.submitted:
        return 'Eingereicht';
      case TimeEntryStatus.customerApproved:
        return 'Genehmigt';
      case TimeEntryStatus.customerRejected:
        return 'Abgelehnt';
      case TimeEntryStatus.billingPending:
        return 'Abrechnung ausstehend';
      case TimeEntryStatus.billed:
        return 'Abgerechnet';
    }
  }
}

extension TimeEntryCategoryExtension on TimeEntryCategory {
  String get value {
    switch (this) {
      case TimeEntryCategory.original:
        return 'original';
      case TimeEntryCategory.additional:
        return 'additional';
    }
  }

  String get displayName {
    switch (this) {
      case TimeEntryCategory.original:
        return 'Geplante Stunden';
      case TimeEntryCategory.additional:
        return 'Zusätzliche Stunden';
    }
  }
}
