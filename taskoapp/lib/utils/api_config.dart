/// API Konfiguration für die Taskilo Flutter App
class ApiConfig {
  /// Basis-URL für alle API-Calls
  /// 
  /// In Produktion: Firebase Functions URL
  /// Für Development: Lokaler Server oder Firebase Emulator
  static const String baseUrl = 'https://europe-west1-tilvo-f142f.cloudfunctions.net';
  
  /// Firebase Functions Endpoints
  static const String timeTrackerEndpoint = '$baseUrl/timeTracker';
  static const String paymentEndpoint = '$baseUrl/payment';
  static const String orderManagementEndpoint = '$baseUrl/orderManagement';
  
  /// Stripe Konfiguration
  static const String stripePublishableKey = 'pk_test_51RXvRUD5Lvjon30aMzieGY1n513cwTd8wUGf6cmYphSWfdTpsbKAHLFs5C17xubatZkLdMYRgBPRlWUMXMQZPrJK00N3Rtf7Dk';
  static const String stripeApiVersion = '2023-10-16';
  
  /// Timeout-Konfiguration
  static const Duration defaultTimeout = Duration(seconds: 30);
  static const Duration paymentTimeout = Duration(seconds: 60);
  
  /// API Versioning
  static const String apiVersion = 'v1';
  
  /// Debug-Modus (nur für Development)
  static const bool isDebugMode = false; // Production Mode
  
  /// Error Messages
  static const Map<String, String> errorMessages = {
    'network_error': 'Netzwerkverbindung fehlgeschlagen. Bitte versuchen Sie es erneut.',
    'timeout_error': 'Zeitüberschreitung. Bitte versuchen Sie es erneut.',
    'server_error': 'Serverfehler. Bitte kontaktieren Sie den Support.',
    'payment_failed': 'Zahlung fehlgeschlagen. Bitte überprüfen Sie Ihre Zahlungsdaten.',
    'unauthorized': 'Nicht autorisiert. Bitte loggen Sie sich erneut ein.',
    'forbidden': 'Zugriff verweigert.',
    'not_found': 'Ressource nicht gefunden.',
  };
  
  /// Success Messages
  static const Map<String, String> successMessages = {
    'payment_successful': 'Zahlung erfolgreich! Die Stunden wurden freigegeben.',
    'hours_approved': 'Stunden wurden erfolgreich freigegeben.',
    'transfer_completed': 'Auszahlung an den Anbieter erfolgreich.',
  };
}
