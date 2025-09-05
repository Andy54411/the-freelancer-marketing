// Category Model für Auftrag-System
class Category {
  final String title;
  final List<String> subcategories;

  const Category({
    required this.title,
    required this.subcategories,
  });

  factory Category.fromJson(Map<String, dynamic> json) {
    return Category(
      title: json['title'] as String,
      subcategories: List<String>.from(json['subcategories']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'title': title,
      'subcategories': subcategories,
    };
  }
}

// Kategorien-Daten
const List<Category> categories = [
  Category(
    title: 'Handwerk',
    subcategories: [
      'Tischler',
      'Klempner',
      'Maler & Lackierer',
      'Elektriker',
      'HeizungSanitär',
      'Fliesenleger',
      'Dachdecker',
      'Maurer',
      'Trockenbauer',
      'Schreiner',
      'Zimmerer',
      'Bodenleger',
      'Glaser',
      'Schlosser',
      'Metallbauer',
      'FensterTürenbau',
      'Heizung',
      'Autoreparatur',
      'Montageservice',
      'Umzugshelfer',
    ],
  ),
  Category(
    title: 'Haushalt',
    subcategories: [
      'Reinigungskraft',
      'Haushaltshilfe',
      'Fensterputzer',
      'Teppichreinigung',
      'Bodenreinigung',
      'Hausreinigung',
    ],
  ),
  Category(
    title: 'Transport',
    subcategories: [
      'Fahrer',
      'Kurierdienst',
      'Transportdienstleistungen',
      'Umzugsdienst',
      'Lagerdienst',
    ],
  ),
  Category(
    title: 'IT & Digital',
    subcategories: [
      'Webentwicklung',
      'App-Entwicklung',
      'Grafikdesign',
      'SEO',
      'Social Media Marketing',
      'IT-Support',
      'Datenbankentwicklung',
      'E-Commerce',
    ],
  ),
  Category(
    title: 'Beratung',
    subcategories: [
      'Unternehmensberatung',
      'Rechtsberatung',
      'Steuerberatung',
      'Finanzberatung',
      'Marketing-Beratung',
      'HR-Beratung',
    ],
  ),
  Category(
    title: 'Events & Catering',
    subcategories: [
      'Event-Management',
      'Catering',
      'DJ',
      'Fotograf',
      'Videograf',
      'Party-Service',
    ],
  ),
  Category(
    title: 'Garten & Landschaft',
    subcategories: [
      'Gärtner',
      'Landschaftsbau',
      'Baumpflege',
      'Rasenpflege',
      'Gartenpflege',
    ],
  ),
];
