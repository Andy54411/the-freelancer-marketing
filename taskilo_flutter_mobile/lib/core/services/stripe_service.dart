import 'package:cloud_functions/cloud_functions.dart';

class StripeService {
  final FirebaseFunctions _functions = FirebaseFunctions.instance;

  // Create Stripe account if profile is complete
  Future<Map<String, dynamic>> createStripeAccountIfComplete() async {
    try {
      final callable = _functions.httpsCallable('createStripeAccountIfComplete');
      final result = await callable.call();

      return Map<String, dynamic>.from(result.data);
    } catch (e) {
      throw Exception('Failed to create Stripe account: $e');
    }
  }

  // Get or create Stripe customer
  Future<Map<String, dynamic>> getOrCreateStripeCustomer({
    required String name,
    required String email,
    String? phone,
    Map<String, dynamic>? address,
  }) async {
    try {
      final callable = _functions.httpsCallable('getOrCreateStripeCustomer');
      final result = await callable.call({
        'name': name,
        'email': email,
        'phone': phone,
        'address': address,
      });

      return Map<String, dynamic>.from(result.data);
    } catch (e) {
      throw Exception('Failed to get or create Stripe customer: $e');
    }
  }

  // Update Stripe company details
  Future<Map<String, dynamic>> updateStripeCompanyDetails({
    required Map<String, dynamic> companyData,
  }) async {
    try {
      final callable = _functions.httpsCallable('updateStripeCompanyDetails');
      final result = await callable.call(companyData);

      return Map<String, dynamic>.from(result.data);
    } catch (e) {
      throw Exception('Failed to update Stripe company details: $e');
    }
  }

  // Get order participant details
  Future<Map<String, dynamic>> getOrderParticipantDetails({
    required String orderId,
  }) async {
    try {
      final callable = _functions.httpsCallable('getOrderParticipantDetails');
      final result = await callable.call({
        'orderId': orderId,
      });

      return Map<String, dynamic>.from(result.data);
    } catch (e) {
      throw Exception('Failed to get order participant details: $e');
    }
  }

  // Create setup intent for saving payment methods
  Future<Map<String, dynamic>> createSetupIntent({
    required String customerId,
    String? paymentMethodType,
  }) async {
    try {
      final callable = _functions.httpsCallable('createSetupIntent');
      final result = await callable.call({
        'customerId': customerId,
        'paymentMethodType': paymentMethodType ?? 'card',
      });

      return Map<String, dynamic>.from(result.data);
    } catch (e) {
      throw Exception('Failed to create setup intent: $e');
    }
  }

  // Get saved payment methods
  Future<List<Map<String, dynamic>>> getSavedPaymentMethods({
    required String customerId,
  }) async {
    try {
      final callable = _functions.httpsCallable('getSavedPaymentMethods');
      final result = await callable.call({
        'customerId': customerId,
      });

      final paymentMethods = result.data['paymentMethods'] as List;
      return paymentMethods.map((pm) => Map<String, dynamic>.from(pm)).toList();
    } catch (e) {
      throw Exception('Failed to get saved payment methods: $e');
    }
  }

  // Get Stripe account status
  Future<Map<String, dynamic>> getStripeAccountStatus() async {
    try {
      final callable = _functions.httpsCallable('getStripeAccountStatus');
      final result = await callable.call();

      return Map<String, dynamic>.from(result.data);
    } catch (e) {
      throw Exception('Failed to get Stripe account status: $e');
    }
  }

  // Get provider Stripe account ID
  Future<String?> getProviderStripeAccountId({
    required String providerId,
  }) async {
    try {
      final callable = _functions.httpsCallable('getProviderStripeAccountId');
      final result = await callable.call({
        'providerId': providerId,
      });

      return result.data['stripeAccountId'];
    } catch (e) {
      throw Exception('Failed to get provider Stripe account ID: $e');
    }
  }

  // Upload file to Stripe
  Future<Map<String, dynamic>> uploadStripeFile({
    required String fileData, // base64 encoded
    required String fileName,
    required String purpose, // 'identity_document', 'additional_verification', etc.
  }) async {
    try {
      final callable = _functions.httpsCallable('uploadStripeFile');
      final result = await callable.call({
        'fileData': fileData,
        'fileName': fileName,
        'purpose': purpose,
      });

      return Map<String, dynamic>.from(result.data);
    } catch (e) {
      throw Exception('Failed to upload Stripe file: $e');
    }
  }

  // Check if user needs to complete Stripe onboarding
  bool needsStripeOnboarding(Map<String, dynamic> accountStatus) {
    final requirementsNeeded = accountStatus['requirements']?['currently_due'] as List?;
    return requirementsNeeded?.isNotEmpty ?? false;
  }

  // Check if payments are enabled
  bool arePaymentsEnabled(Map<String, dynamic> accountStatus) {
    return accountStatus['charges_enabled'] == true;
  }

  // Check if payouts are enabled
  bool arePayoutsEnabled(Map<String, dynamic> accountStatus) {
    return accountStatus['payouts_enabled'] == true;
  }

  // Get onboarding requirements
  List<String> getOnboardingRequirements(Map<String, dynamic> accountStatus) {
    final requirements = accountStatus['requirements']?['currently_due'] as List?;
    return requirements?.map((req) => req.toString()).toList() ?? [];
  }

  // Get pending verification requirements
  List<String> getPendingVerificationRequirements(Map<String, dynamic> accountStatus) {
    final requirements = accountStatus['requirements']?['pending_verification'] as List?;
    return requirements?.map((req) => req.toString()).toList() ?? [];
  }

  // Format payment method for display
  String formatPaymentMethod(Map<String, dynamic> paymentMethod) {
    final type = paymentMethod['type'] as String?;
    
    switch (type) {
      case 'card':
        final card = paymentMethod['card'] as Map<String, dynamic>?;
        final brand = card?['brand'] ?? 'Karte';
        final last4 = card?['last4'] ?? '****';
        return '${brand.toString().toUpperCase()} •••• $last4';
      case 'sepa_debit':
        final sepa = paymentMethod['sepa_debit'] as Map<String, dynamic>?;
        final last4 = sepa?['last4'] ?? '****';
        return 'SEPA •••• $last4';
      default:
        return type?.toUpperCase() ?? 'Unbekannt';
    }
  }

  // Get card brand icon
  String getCardBrandIcon(String brand) {
    switch (brand.toLowerCase()) {
      case 'visa':
        return '💳'; // You can replace with actual icons
      case 'mastercard':
        return '💳';
      case 'amex':
        return '💳';
      case 'discover':
        return '💳';
      default:
        return '💳';
    }
  }

  // Validate IBAN format (basic check)
  bool isValidIBAN(String iban) {
    // Remove spaces and convert to uppercase
    final cleanIban = iban.replaceAll(' ', '').toUpperCase();
    
    // Basic length check (IBAN should be between 15-34 characters)
    if (cleanIban.length < 15 || cleanIban.length > 34) {
      return false;
    }
    
    // Check if it starts with two letters (country code)
    if (!RegExp(r'^[A-Z]{2}').hasMatch(cleanIban)) {
      return false;
    }
    
    // Basic format check (letters followed by numbers)
    if (!RegExp(r'^[A-Z]{2}[0-9]{2}[A-Z0-9]+$').hasMatch(cleanIban)) {
      return false;
    }
    
    return true;
  }

  // Format IBAN for display
  String formatIBAN(String iban) {
    final cleanIban = iban.replaceAll(' ', '').toUpperCase();
    return cleanIban.replaceAllMapped(
      RegExp(r'.{4}'),
      (match) => '${match.group(0)} ',
    ).trim();
  }
}
