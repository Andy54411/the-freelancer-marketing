import 'package:cloud_functions/cloud_functions.dart';

class GeneralService {
  final FirebaseFunctions _functions = FirebaseFunctions.instance;

  // Get client IP address
  Future<String> getClientIp() async {
    try {
      final callable = _functions.httpsCallable('getClientIp');
      final result = await callable.call();

      return result.data['ip'] ?? 'Unknown';
    } catch (e) {
      throw Exception('Failed to get client IP: $e');
    }
  }

  // Create temporary job draft
  Future<Map<String, dynamic>> createTemporaryJobDraft({
    String? customerType,
    String? selectedCategory,
    String? selectedSubcategory,
    required String description,
    String? jobStreet,
    String? jobPostalCode,
    String? jobCity,
    String? jobCountry,
    String? jobDateFrom,
    String? jobDateTo,
    String? jobTimePreference,
    String? providerName,
    String? selectedAnbieterId,
    String? jobDurationString,
    double? jobTotalCalculatedHours,
    int? jobCalculatedPriceInCents,
  }) async {
    try {
      final callable = _functions.httpsCallable('createTemporaryJobDraft');
      final result = await callable.call({
        'customerType': customerType,
        'selectedCategory': selectedCategory,
        'selectedSubcategory': selectedSubcategory,
        'description': description,
        'jobStreet': jobStreet,
        'jobPostalCode': jobPostalCode,
        'jobCity': jobCity,
        'jobCountry': jobCountry,
        'jobDateFrom': jobDateFrom,
        'jobDateTo': jobDateTo,
        'jobTimePreference': jobTimePreference,
        'providerName': providerName,
        'selectedAnbieterId': selectedAnbieterId,
        'jobDurationString': jobDurationString,
        'jobTotalCalculatedHours': jobTotalCalculatedHours,
        'jobCalculatedPriceInCents': jobCalculatedPriceInCents,
      });

      return Map<String, dynamic>.from(result.data);
    } catch (e) {
      throw Exception('Failed to create temporary job draft: $e');
    }
  }

  // Delete company account
  Future<Map<String, dynamic>> deleteCompanyAccount({
    required String companyId,
  }) async {
    try {
      final callable = _functions.httpsCallable('deleteCompanyAccount');
      final result = await callable.call({
        'companyId': companyId,
      });

      return Map<String, dynamic>.from(result.data);
    } catch (e) {
      throw Exception('Failed to delete company account: $e');
    }
  }

  // Sync specific company to user
  Future<Map<String, dynamic>> syncSpecificCompanyToUser({
    required String companyId,
  }) async {
    try {
      final callable = _functions.httpsCallable('syncSpecificCompanyToUser');
      final result = await callable.call({
        'companyId': companyId,
      });

      return Map<String, dynamic>.from(result.data);
    } catch (e) {
      throw Exception('Failed to sync company to user: $e');
    }
  }

  // Sync specific user to company
  Future<Map<String, dynamic>> syncSpecificUserToCompany({
    required String userId,
  }) async {
    try {
      final callable = _functions.httpsCallable('syncSpecificUserToCompany');
      final result = await callable.call({
        'userId': userId,
      });

      return Map<String, dynamic>.from(result.data);
    } catch (e) {
      throw Exception('Failed to sync user to company: $e');
    }
  }

  // Update company status
  Future<Map<String, dynamic>> updateCompanyStatus({
    required String companyId,
    required String status,
  }) async {
    try {
      final callable = _functions.httpsCallable('updateCompanyStatus');
      final result = await callable.call({
        'companyId': companyId,
        'status': status,
      });

      return Map<String, dynamic>.from(result.data);
    } catch (e) {
      throw Exception('Failed to update company status: $e');
    }
  }

  // Search company profiles
  Future<List<Map<String, dynamic>>> searchCompanyProfiles({
    String? category,
    String? subcategory,
    String? location,
    double? latitude,
    double? longitude,
    double? radiusKm,
    int? limit,
  }) async {
    try {
      final callable = _functions.httpsCallable('searchCompanyProfiles');
      final result = await callable.call({
        'category': category,
        'subcategory': subcategory,
        'location': location,
        'latitude': latitude,
        'longitude': longitude,
        'radiusKm': radiusKm,
        'limit': limit,
      });

      final companies = result.data['companies'] as List;
      return companies.map((company) => Map<String, dynamic>.from(company)).toList();
    } catch (e) {
      throw Exception('Failed to search company profiles: $e');
    }
  }

  // Get data for subcategory
  Future<Map<String, dynamic>> getDataForSubcategory({
    required String category,
    required String subcategory,
  }) async {
    try {
      final callable = _functions.httpsCallable('getDataForSubcategory');
      final result = await callable.call({
        'category': category,
        'subcategory': subcategory,
      });

      return Map<String, dynamic>.from(result.data);
    } catch (e) {
      throw Exception('Failed to get subcategory data: $e');
    }
  }

  // Create job posting
  Future<Map<String, dynamic>> createJobPosting({
    required String title,
    required String description,
    required String category,
    required String subcategory,
    required double budget,
    required String location,
    DateTime? deadline,
    List<String>? skills,
    String? duration,
  }) async {
    try {
      final callable = _functions.httpsCallable('createJobPosting');
      final result = await callable.call({
        'title': title,
        'description': description,
        'category': category,
        'subcategory': subcategory,
        'budget': budget,
        'location': location,
        'deadline': deadline?.toIso8601String(),
        'skills': skills,
        'duration': duration,
      });

      return Map<String, dynamic>.from(result.data);
    } catch (e) {
      throw Exception('Failed to create job posting: $e');
    }
  }

  // Search available providers
  Future<List<Map<String, dynamic>>> searchAvailableProviders({
    required String category,
    String? subcategory,
    String? location,
    double? latitude,
    double? longitude,
    double? radiusKm,
    double? minRating,
    double? maxHourlyRate,
    List<String>? skills,
    bool? availableNow,
  }) async {
    try {
      final callable = _functions.httpsCallable('searchAvailableProviders');
      final result = await callable.call({
        'category': category,
        'subcategory': subcategory,
        'location': location,
        'latitude': latitude,
        'longitude': longitude,
        'radiusKm': radiusKm,
        'minRating': minRating,
        'maxHourlyRate': maxHourlyRate,
        'skills': skills,
        'availableNow': availableNow,
      });

      final providers = result.data['providers'] as List;
      return providers.map((provider) => Map<String, dynamic>.from(provider)).toList();
    } catch (e) {
      throw Exception('Failed to search available providers: $e');
    }
  }

  // Migrate existing users to companies (admin function)
  Future<Map<String, dynamic>> migrateExistingUsersToCompanies({
    required String authToken,
  }) async {
    try {
      final callable = _functions.httpsCallable('migrateExistingUsersToCompanies');
      final result = await callable.call({
        'authToken': authToken,
      });

      return Map<String, dynamic>.from(result.data);
    } catch (e) {
      throw Exception('Failed to migrate users to companies: $e');
    }
  }

  // Sync company to user data
  Future<Map<String, dynamic>> syncCompanyToUserData({
    required String companyId,
  }) async {
    try {
      final callable = _functions.httpsCallable('syncCompanyToUserData');
      final result = await callable.call({
        'companyId': companyId,
      });

      return Map<String, dynamic>.from(result.data);
    } catch (e) {
      throw Exception('Failed to sync company to user data: $e');
    }
  }

  // Fix inconsistent payment
  Future<Map<String, dynamic>> fixInconsistentPayment({
    required String orderId,
  }) async {
    try {
      final callable = _functions.httpsCallable('fixInconsistentPayment');
      final result = await callable.call({
        'orderId': orderId,
      });

      return Map<String, dynamic>.from(result.data);
    } catch (e) {
      throw Exception('Failed to fix inconsistent payment: $e');
    }
  }

  // Backfill chat user details
  Future<Map<String, dynamic>> backfillChatUserDetails() async {
    try {
      final callable = _functions.httpsCallable('backfillChatUserDetails');
      final result = await callable.call();

      return Map<String, dynamic>.from(result.data);
    } catch (e) {
      throw Exception('Failed to backfill chat user details: $e');
    }
  }

  // Helper functions for formatting
  String formatPrice(double price) {
    return '€${price.toStringAsFixed(2)}';
  }

  String formatCurrency(double amount) {
    return '€${amount.toStringAsFixed(2)}';
  }

  String formatDistance(double distanceKm) {
    if (distanceKm < 1) {
      return '${(distanceKm * 1000).round()} m';
    }
    return '${distanceKm.toStringAsFixed(1)} km';
  }

  String formatDuration(Duration duration) {
    final hours = duration.inHours;
    final minutes = duration.inMinutes.remainder(60);
    
    if (hours > 0) {
      return '${hours}h ${minutes}min';
    }
    return '${minutes}min';
  }

  String formatFileSize(int bytes) {
    if (bytes < 1024) {
      return '$bytes B';
    } else if (bytes < 1024 * 1024) {
      return '${(bytes / 1024).toStringAsFixed(1)} KB';
    } else if (bytes < 1024 * 1024 * 1024) {
      return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
    } else {
      return '${(bytes / (1024 * 1024 * 1024)).toStringAsFixed(1)} GB';
    }
  }

  // Validation helpers
  bool isValidEmail(String email) {
    return RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(email);
  }

  bool isValidPhoneNumber(String phone) {
    final cleanPhone = phone.replaceAll(RegExp(r'[\s\-\(\)]'), '');
    return RegExp(r'^\+?[1-9]\d{1,14}$').hasMatch(cleanPhone);
  }

  bool isValidPostalCode(String postalCode, {String country = 'DE'}) {
    switch (country.toUpperCase()) {
      case 'DE':
        return RegExp(r'^\d{5}$').hasMatch(postalCode);
      case 'AT':
        return RegExp(r'^\d{4}$').hasMatch(postalCode);
      case 'CH':
        return RegExp(r'^\d{4}$').hasMatch(postalCode);
      default:
        return postalCode.isNotEmpty;
    }
  }

  String? validateRequired(String? value, String fieldName) {
    if (value == null || value.trim().isEmpty) {
      return '$fieldName ist erforderlich';
    }
    return null;
  }

  String? validateEmail(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'E-Mail ist erforderlich';
    }
    if (!isValidEmail(value)) {
      return 'Ungültige E-Mail-Adresse';
    }
    return null;
  }

  String? validatePhone(String? value) {
    if (value != null && value.isNotEmpty && !isValidPhoneNumber(value)) {
      return 'Ungültige Telefonnummer';
    }
    return null;
  }
}
