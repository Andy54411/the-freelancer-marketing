import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../models/user_model.dart';
import '../../../utils/colors.dart';
import '../dashboard_layout.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _searchTerm = '';
  bool _isSearching = false;
  List<SearchResult> _searchResults = [];
  String? _selectedCategory; // Für die Sidebar

  final List<String> _recentSearches = [
    'Handwerker',
    'Reinigung',
    'Umzug',
    'Gartenarbeit',
    'Maler',
  ];

  final List<CategoryItem> _mainCategories = [
    CategoryItem(
      name: 'Handwerk',
      imageUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=200&h=150&fit=crop',
      icon: Icons.build,
    ),
    CategoryItem(
      name: 'Haushalt',
      imageUrl: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=200&h=150&fit=crop',
      icon: Icons.cleaning_services,
    ),
    CategoryItem(
      name: 'Transport',
      imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&h=150&fit=crop',
      icon: Icons.local_shipping,
    ),
    CategoryItem(
      name: 'IT & Digital',
      imageUrl: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=200&h=150&fit=crop',
      icon: Icons.computer,
    ),
    CategoryItem(
      name: 'Garten',
      imageUrl: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=200&h=150&fit=crop',
      icon: Icons.grass,
    ),
    CategoryItem(
      name: 'Wellness',
      imageUrl: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=200&h=150&fit=crop',
      icon: Icons.health_and_safety,
    ),
    CategoryItem(
      name: 'Hotel & Gastronomie',
      imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=200&h=150&fit=crop',
      icon: Icons.restaurant,
    ),
    CategoryItem(
      name: 'Marketing & Vertrieb',
      imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=200&h=150&fit=crop',
      icon: Icons.campaign,
    ),
    CategoryItem(
      name: 'Finanzen & Recht',
      imageUrl: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=200&h=150&fit=crop',
      icon: Icons.account_balance,
    ),
    CategoryItem(
      name: 'Bildung & Unterstützung',
      imageUrl: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=200&h=150&fit=crop',
      icon: Icons.school,
    ),
    CategoryItem(
      name: 'Tiere & Pflanzen',
      imageUrl: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=200&h=150&fit=crop',
      icon: Icons.pets,
    ),
    CategoryItem(
      name: 'Kreativ & Kunst',
      imageUrl: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=200&h=150&fit=crop',
      icon: Icons.brush,
    ),
    CategoryItem(
      name: 'Event & Veranstaltung',
      imageUrl: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=200&h=150&fit=crop',
      icon: Icons.event,
    ),
    CategoryItem(
      name: 'Büro & Administration',
      imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=200&h=150&fit=crop',
      icon: Icons.business_center,
    ),
  ];

  // Subkategorien für jede Hauptkategorie (exakt wie im Web-Projekt)
  final Map<String, List<String>> _subcategories = {
    'Handwerk': [
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
      'Umzugshelfer'
    ],
    'Haushalt': [
      'Reinigungskraft',
      'Haushaltshilfe',
      'Fensterputzer',
      'Teppichreinigung',
      'Bodenreinigung',
      'Hausreinigung'
    ],
    'Transport': [
      'Fahrer',
      'Kurierdienst',
      'Transportdienstleistungen',
      'Lagerlogistik',
      'Logistik',
      'MöbelTransportieren'
    ],
    'IT & Digital': [
      'Webentwicklung',
      'App-Entwicklung',
      'IT-Support',
      'Systemadministration',
      'Cybersecurity',
      'Softwareentwicklung',
      'Datenanalyse',
      'Cloud Services',
      'Netzwerktechnik',
      'Datenbankentwicklung',
      'IT-Beratung',
      'Webdesign',
      'UX/UI Design',
      'Systemintegration',
      'Cloud Computing'
    ],
    'Garten': [
      'Gartenpflege',
      'Landschaftsgärtner',
      'Rasenpflege',
      'Heckenschnitt',
      'Baumpflege',
      'Gartenplanung',
      'Bewässerungsanlagen'
    ],
    'Wellness': [
      'Massage',
      'Physiotherapie',
      'Ernährungsberatung',
      'Kosmetik',
      'Friseur',
      'FitnessTraining',
      'Seniorenbetreuung'
    ],
    'Hotel & Gastronomie': [
      'Mietkoch',
      'Mietkellner',
      'Catering'
    ],
    'Marketing & Vertrieb': [
      'OnlineMarketing',
      'Social Media Marketing',
      'ContentMarketing',
      'Marketingberater',
      'Marktforschung'
    ],
    'Finanzen & Recht': [
      'Buchhaltung',
      'Steuerberatung',
      'Rechtsberatung',
      'Finanzberatung',
      'Versicherungsberatung',
      'Rechnungswesen',
      'Unternehmensberatung',
      'Verwaltung'
    ],
    'Bildung & Unterstützung': [
      'Nachhilfe',
      'Nachhilfelehrer',
      'Sprachunterricht',
      'Musikunterricht',
      'Übersetzer',
      'Kinderbetreuung'
    ],
    'Tiere & Pflanzen': [
      'Tierbetreuung',
      'Hundetrainer',
      'TierarztAssistenz',
      'Tierpflege'
    ],
    'Kreativ & Kunst': [
      'Fotograf',
      'Videograf',
      'Grafiker',
      'Musiker',
      'Texter',
      'Dekoration'
    ],
    'Event & Veranstaltung': [
      'Eventplanung',
      'Sicherheitsdienst',
      'DJService',
      'Musiker'
    ],
    'Büro & Administration': [
      'Telefonservice',
      'Inventur',
      'Recherche'
    ],
  };

  final List<String> _popularCategories = [
    'Reinigungskraft',
    'Elektriker',
    'Klempner', 
    'Maler & Lackierer',
    'Gartenpflege',
    'Umzugshelfer',
    'Kinderbetreuung',
    'Nachhilfe',
    'IT-Support',
    'Webentwicklung',
    'Fotograf',
    'Massage',
  ];

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _performSearch(String query) {
    if (query.trim().isEmpty) {
      setState(() {
        _searchResults = [];
        _isSearching = false;
      });
      return;
    }

    setState(() {
      _isSearching = true;
      _searchTerm = query;
    });

    // Simuliere Search-Delay
    Future.delayed(const Duration(milliseconds: 800), () {
      if (mounted) {
        setState(() {
          _searchResults = _mockSearchResults(query);
          _isSearching = false;
        });
      }
    });
  }

  List<SearchResult> _mockSearchResults(String query) {
    // Mock-Daten für Demonstration
    return [
      SearchResult(
        title: 'Professionelle Haushaltsreinigung',
        category: 'Reinigung',
        rating: 4.8,
        price: 'ab 25€/h',
        distance: '2.1 km',
        imageUrl: null,
      ),
      SearchResult(
        title: 'Zuverlässiger Elektriker Service',
        category: 'Handwerk',
        rating: 4.9,
        price: 'ab 65€/h',
        distance: '3.5 km',
        imageUrl: null,
      ),
      SearchResult(
        title: 'Garten- und Landschaftsbau',
        category: 'Garten',
        rating: 4.7,
        price: 'ab 45€/h',
        distance: '1.8 km',
        imageUrl: null,
      ),
    ];
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<TaskiloUser?>(
      builder: (context, user, child) {
        return DashboardLayout(
          title: 'Suchen',
          useGradientBackground: true,
          showBackButton: true,
          body: _buildSearchContent(),
        );
      },
    );
  }

  Widget _buildSearchContent() {
    return Column(
      children: [
        // Hauptkategorien Horizontal Scroll
        if (_searchTerm.isEmpty) _buildMainCategories(),
        
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (_searchTerm.isEmpty) ...[
                  _buildRecentSearches(),
                  const SizedBox(height: 24),
                  _buildPopularCategories(),
                ] else if (_isSearching) ...[
                  _buildLoadingState(),
                ] else ...[
                  _buildSearchResults(),
                ],
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildMainCategories() {
    return Container(
      height: 160, // Vergrößert von 120 auf 160
      margin: const EdgeInsets.only(bottom: 16),
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: _mainCategories.length,
        itemBuilder: (context, index) {
          final category = _mainCategories[index];
          return _buildCategoryCard(category);
        },
      ),
    );
  }

  Widget _buildCategoryCard(CategoryItem category) {
    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedCategory = category.name;
        });
        _showSubcategorySidebar(category.name);
      },
      child: Container(
        width: 160, // Vergrößert von 130 auf 160
        margin: const EdgeInsets.only(right: 12),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.white.withValues(alpha: 0.3)),
        ),
        child: Column(
          children: [
            // Bild Container
            Expanded(
              flex: 4, // Vergrößert von 3 auf 4 für größere Bilder
              child: Container(
                width: double.infinity, // Volle Breite nutzen
                margin: const EdgeInsets.fromLTRB(8, 8, 8, 4), // Weniger Bottom-Margin
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  image: DecorationImage(
                    image: NetworkImage(category.imageUrl),
                    fit: BoxFit.cover,
                    onError: (error, stackTrace) {
                      // Fallback auf Icon wenn Bild nicht lädt
                    },
                  ),
                ),
                // Icon-Overlay entfernt - nur noch das pure Bild
              ),
            ),
            // Text Container
            Expanded(
              flex: 1,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(8, 0, 8, 8), // Padding für Text
                child: Center(
                  child: Text(
                    category.name,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 13, // Vergrößert von 12 auf 13
                      fontWeight: FontWeight.w600,
                    ),
                    textAlign: TextAlign.center,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showSubcategorySidebar(String categoryName) {
    showGeneralDialog(
      context: context,
      barrierDismissible: true,
      barrierLabel: '',
      barrierColor: Colors.black.withValues(alpha: 0.5),
      transitionDuration: const Duration(milliseconds: 300),
      pageBuilder: (context, animation, secondaryAnimation) {
        return Align(
          alignment: Alignment.centerLeft,
          child: Material(
            color: Colors.transparent,
            child: Container(
              width: MediaQuery.of(context).size.width * 0.8,
              height: MediaQuery.of(context).size.height,
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    Color(0xFF14ad9f),
                    Color(0xFF0d9488),
                    Color(0xFF2563eb),
                  ],
                ),
              ),
              child: SafeArea(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Header mit Kategorie-Name und Close-Button
                    Padding(
                      padding: const EdgeInsets.all(20),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              categoryName,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.close, color: Colors.white, size: 28),
                            onPressed: () => Navigator.of(context).pop(),
                          ),
                        ],
                      ),
                    ),
                    const Divider(color: Colors.white24, height: 1),
                    // Subkategorien Liste
                    Expanded(
                      child: ListView.builder(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        itemCount: _subcategories[categoryName]?.length ?? 0,
                        itemBuilder: (context, index) {
                          final subcategory = _subcategories[categoryName]![index];
                          return _buildSubcategoryItem(subcategory);
                        },
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
      transitionBuilder: (context, animation, secondaryAnimation, child) {
        const begin = Offset(-1.0, 0.0);
        const end = Offset.zero;
        const curve = Curves.easeInOut;

        var tween = Tween(begin: begin, end: end).chain(
          CurveTween(curve: curve),
        );

        return SlideTransition(
          position: animation.drive(tween),
          child: child,
        );
      },
    );
  }

  Widget _buildSubcategoryItem(String subcategory) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
      ),
      child: ListTile(
        title: Text(
          subcategory,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 16,
            fontWeight: FontWeight.w500,
          ),
        ),
        trailing: const Icon(Icons.arrow_forward_ios, color: Colors.white70, size: 16),
        onTap: () {
          Navigator.of(context).pop(); // Sidebar schließen
          _searchController.text = subcategory;
          _performSearch(subcategory);
        },
      ),
    );
  }

  Widget _buildRecentSearches() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Letzte Suchen',
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: _recentSearches.map((search) => _buildSearchChip(search, true)).toList(),
        ),
      ],
    );
  }

  Widget _buildPopularCategories() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Beliebte Kategorien',
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: _popularCategories.map((category) => _buildSearchChip(category, false)).toList(),
        ),
      ],
    );
  }

  Widget _buildSearchChip(String text, bool isRecent) {
    return GestureDetector(
      onTap: () {
        _searchController.text = text;
        _performSearch(text);
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: isRecent ? 0.15 : 0.1),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.white.withValues(alpha: 0.3)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (isRecent) Icon(Icons.history, size: 16, color: Colors.white.withValues(alpha: 0.7)),
            if (isRecent) const SizedBox(width: 4),
            Text(
              text,
              style: TextStyle(
                color: Colors.white.withValues(alpha: 0.9),
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLoadingState() {
    return Center(
      child: Column(
        children: [
          const SizedBox(height: 40),
          const CircularProgressIndicator(
            valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
          ),
          const SizedBox(height: 16),
          Text(
            'Suche nach "$_searchTerm"...',
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.8),
              fontSize: 16,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchResults() {
    if (_searchResults.isEmpty) {
      return Center(
        child: Column(
          children: [
            const SizedBox(height: 40),
            Icon(Icons.search_off, size: 64, color: Colors.white.withValues(alpha: 0.6)),
            const SizedBox(height: 16),
            Text(
              'Keine Ergebnisse für "$_searchTerm"',
              style: TextStyle(
                color: Colors.white.withValues(alpha: 0.8),
                fontSize: 16,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Versuchen Sie andere Suchbegriffe',
              style: TextStyle(
                color: Colors.white.withValues(alpha: 0.6),
                fontSize: 14,
              ),
            ),
          ],
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '${_searchResults.length} Ergebnisse für "$_searchTerm"',
          style: TextStyle(
            color: Colors.white.withValues(alpha: 0.8),
            fontSize: 14,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 16),
        ...(_searchResults.map((result) => _buildResultCard(result)).toList()),
      ],
    );
  }

  Widget _buildResultCard(SearchResult result) {
    return DashboardCard(
      margin: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      result.title,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      result.category,
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.white.withValues(alpha: 0.7),
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: TaskiloColors.primary.withValues(alpha: 0.3),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  result.price,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Icon(Icons.star, size: 16, color: Colors.amber),
              const SizedBox(width: 4),
              Text(
                result.rating.toString(),
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: Colors.white,
                ),
              ),
              const SizedBox(width: 16),
              Icon(Icons.location_on, size: 16, color: Colors.white.withValues(alpha: 0.7)),
              const SizedBox(width: 4),
              Text(
                result.distance,
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.white.withValues(alpha: 0.7),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class SearchResult {
  final String title;
  final String category;
  final double rating;
  final String price;
  final String distance;
  final String? imageUrl;

  SearchResult({
    required this.title,
    required this.category,
    required this.rating,
    required this.price,
    required this.distance,
    this.imageUrl,
  });
}

// DashboardCard Klasse (falls nicht bereits importiert)
class DashboardCard extends StatelessWidget {
  final Widget child;
  final EdgeInsets? margin;
  final EdgeInsets? padding;
  final VoidCallback? onTap;

  const DashboardCard({
    super.key,
    required this.child,
    this.margin,
    this.padding,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: margin ?? const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withValues(alpha: 0.2), width: 1),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(20),
          child: Padding(
            padding: padding ?? const EdgeInsets.all(20),
            child: child,
          ),
        ),
      ),
    );
  }
}

class CategoryItem {
  final String name;
  final String imageUrl;
  final IconData icon;

  CategoryItem({
    required this.name,
    required this.imageUrl,
    required this.icon,
  });
}
