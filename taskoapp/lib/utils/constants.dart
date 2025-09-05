// Taskilo App Constants
// Zentrale Verwaltung aller App-weiten Konstanten

class TaskiloConstants {
  // ===== PAYMENT CONSTANTS =====
  
  /// Fixe Vertrauens- & Hilfsgebühr (entspricht Web-Projekt)
  /// Verwendet in allen Payment-Screens und Berechnungen
  static const double trustAndSupportFeeEur = 4.95;
  
  // ===== BUSINESS LOGIC CONSTANTS =====
  
  /// Platform-Gebühren für verschiedene Geschäftsmodelle
  static const double b2cPlatformFeeRate = 0.045; // 4.5% für B2C
  static const double b2bPlatformFeeRate = 0.035; // 3.5% für B2B
  
  /// Minimum und Maximum Preise
  static const double globalFallbackMinPrice = 10.0;
  static const double globalFallbackMaxPrice = 150.0;
  static const double priceStep = 5.0;
  
  // ===== UI CONSTANTS =====
  
  /// App-spezifische Farben (Taskilo Branding)
  static const String primaryColorHex = '#14ad9f';
  
  // ===== SERVICE CONSTANTS =====
  
  /// Service-Kategorien
  static const List<String> serviceCategories = [
    'Haushalt & Reinigung',
    'Handwerk & Reparaturen',
    'Garten & Landschaftsbau',
    'Transport & Umzug',
    'Betreuung & Pflege',
    'Unterricht & Nachhilfe',
    'IT & Technik',
    'Beauty & Wellness',
    'Fotografie & Video',
    'Veranstaltungen',
    'Sonstiges'
  ];
  
  // ===== VALIDATION CONSTANTS =====
  
  /// Input-Validierung
  static const int maxDescriptionLength = 500;
  static const int maxTitleLength = 100;
  static const double minBudget = 10.0;
  static const double maxBudget = 10000.0;
}
