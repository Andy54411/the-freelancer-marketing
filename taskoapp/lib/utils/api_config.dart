/// API-Konfiguration für die Taskilo Flutter App
class ApiConfig {
  // Basis-URL für alle API-Calls
  static const String baseUrl = 'https://taskilo.de';
  
  // API Endpoints
  static const String billAdditionalHoursEndpoint = '$baseUrl/api/bill-additional-hours';
  static const String confirmAdditionalHoursEndpoint = '$baseUrl/api/confirm-additional-hours-payment';
  static const String approveHoursEndpoint = '$baseUrl/api/timetracker/approve-hours';
  
  // Webhook-URLs (für interne Verwendung)
  static const String stripeWebhookUrl = '$baseUrl/api/stripe-webhooks';
  
  // Firebase Functions URLs
  static const String firebaseFunctionsBaseUrl = 'https://europe-west1-tilvo-f142f.cloudfunctions.net';
  static const String createHourlyPaymentUrl = '$firebaseFunctionsBaseUrl/createHourlyPayment';
  static const String billApprovedAdditionalHoursUrl = '$firebaseFunctionsBaseUrl/billApprovedAdditionalHours';
  
  // Timeouts
  static const Duration defaultTimeout = Duration(seconds: 30);
  static const Duration paymentTimeout = Duration(seconds: 60);
  
  // Debug-Modus
  static const bool isDebugMode = true;
}
