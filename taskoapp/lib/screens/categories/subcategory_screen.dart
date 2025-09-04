import 'package:flutter/material.dart';
import '../../services/categories_service.dart';
import '../services/service_discovery_screen.dart';

class SubcategoryScreen extends StatefulWidget {
  final String category;

  const SubcategoryScreen({
    super.key,
    required this.category,
  });

  @override
  State<SubcategoryScreen> createState() => _SubcategoryScreenState();
}

class _SubcategoryScreenState extends State<SubcategoryScreen> {
  final TextEditingController _searchController = TextEditingController();
  List<String> _filteredSubcategories = [];
  List<String> _allSubcategories = [];

  @override
  void initState() {
    super.initState();
    _allSubcategories = CategoriesService.getSubcategories(widget.category);
    _filteredSubcategories = _allSubcategories;
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _filterSubcategories(String query) {
    setState(() {
      if (query.isEmpty) {
        _filteredSubcategories = _allSubcategories;
      } else {
        _filteredSubcategories = _allSubcategories
            .where((subcategory) =>
                subcategory.toLowerCase().contains(query.toLowerCase()))
            .toList();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: CustomScrollView(
        slivers: [
          // App Bar mit Gradient
          SliverAppBar(
            expandedHeight: 200,
            pinned: true,
            backgroundColor: const Color(0xFF14ad9f),
            foregroundColor: Colors.white,
            surfaceTintColor: Colors.transparent,
            shadowColor: Colors.transparent,
            flexibleSpace: FlexibleSpaceBar(
              title: Text(
                widget.category,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
              background: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      Color(0xFF14ad9f),
                      Color(0xFF129488),
                    ],
                  ),
                ),
                child: SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.all(20.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const SizedBox(height: 20), // Reduced space for back button
                        Icon(
                          _getCategoryIcon(widget.category),
                          size: 48,
                          color: Colors.white.withValues(alpha: 0.8),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          '${_allSubcategories.length} Services verfügbar',
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.9),
                            fontSize: 16,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),

          // Such-Feld
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(20.0),
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(15),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.1),
                      blurRadius: 10,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: TextField(
                  controller: _searchController,
                  onChanged: _filterSubcategories,
                  cursorColor: const Color(0xFF14ad9f),
                  decoration: InputDecoration(
                    hintText: 'Subkategorien durchsuchen...',
                    prefixIcon: const Icon(Icons.search, color: Color(0xFF14ad9f)),
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.all(16),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(15),
                      borderSide: const BorderSide(
                        color: Color(0xFF14ad9f),
                        width: 2,
                      ),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(15),
                      borderSide: BorderSide.none,
                    ),
                  ),
                ),
              ),
            ),
          ),

          // Subkategorien Grid
          SliverPadding(
            padding: const EdgeInsets.symmetric(horizontal: 20.0),
            sliver: SliverGrid(
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                mainAxisSpacing: 16,
                crossAxisSpacing: 16,
                childAspectRatio: 1.1,
              ),
              delegate: SliverChildBuilderDelegate(
                (context, index) {
                  final subcategory = _filteredSubcategories[index];
                  return _buildSubcategoryCard(subcategory);
                },
                childCount: _filteredSubcategories.length,
              ),
            ),
          ),

          // Bottom Spacing
          const SliverToBoxAdapter(
            child: SizedBox(height: 20),
          ),
        ],
      ),
    );
  }

  Widget _buildSubcategoryCard(String subcategory) {
    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => ServiceDiscoveryScreen(
              subcategory: subcategory,
              category: widget.category,
            ),
          ),
        );
      },
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.08),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          children: [
            // Header mit Icon
            Container(
              height: 50,
              width: double.infinity,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    const Color(0xFF14ad9f).withValues(alpha: 0.1),
                    const Color(0xFF129488).withValues(alpha: 0.1),
                  ],
                ),
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(16),
                ),
              ),
              child: Center(
                child: Icon(
                  _getSubcategoryIcon(subcategory),
                  size: 20,
                  color: const Color(0xFF14ad9f),
                ),
              ),
            ),

            // Content
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(8.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Text Content
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            subcategory,
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: Colors.black87,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 2),
                          Text(
                            _getSubcategoryDescription(subcategory),
                            style: TextStyle(
                              fontSize: 9,
                              color: Colors.grey[600],
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                    
                    // Call-to-Action Button
                    Container(
                      width: double.infinity,
                      height: 20,
                      decoration: BoxDecoration(
                        color: const Color(0xFF14ad9f).withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: const Center(
                        child: Text(
                          'Entdecken',
                          style: TextStyle(
                            color: Color(0xFF14ad9f),
                            fontWeight: FontWeight.w600,
                            fontSize: 9,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  IconData _getCategoryIcon(String category) {
    switch (category) {
      case 'Handwerk':
        return Icons.build;
      case 'Haushalt':
        return Icons.cleaning_services;
      case 'Transport':
        return Icons.local_shipping;
      case 'IT & Digital':
        return Icons.computer;
      case 'Garten':
        return Icons.grass;
      case 'Wellness':
        return Icons.spa;
      case 'Hotel & Gastronomie':
        return Icons.restaurant;
      case 'Marketing & Vertrieb':
        return Icons.trending_up;
      case 'Finanzen & Recht':
        return Icons.account_balance;
      case 'Bildung & Unterstützung':
        return Icons.school;
      case 'Tiere & Pflanzen':
        return Icons.pets;
      case 'Kreativ & Kunst':
        return Icons.palette;
      case 'Event & Veranstaltung':
        return Icons.event;
      case 'Büro & Administration':
        return Icons.business;
      default:
        return Icons.miscellaneous_services;
    }
  }

  IconData _getSubcategoryIcon(String subcategory) {
    // Icon-Mapping für verschiedene Subkategorien
    final iconMap = {
      'Elektriker': Icons.electrical_services,
      'Klempner': Icons.plumbing,
      'Maler': Icons.format_paint,
      'Tischler': Icons.carpenter,
      'Reinigungsservice': Icons.cleaning_services,
      'Hausmeisterservice': Icons.handyman,
      'Fensterreinigung': Icons.window,
      'Umzugsservice': Icons.moving,
      'Kurierservice': Icons.delivery_dining,
      'Webentwicklung': Icons.web,
      'App-Entwicklung': Icons.smartphone,
      'Grafikdesign': Icons.design_services,
      'Marketing': Icons.campaign,
      'Fotografie': Icons.camera_alt,
      'Catering': Icons.restaurant_menu,
      'Koch/Köchin': Icons.restaurant,
      'Gartenpflege': Icons.yard,
      'Landschaftsbau': Icons.landscape,
      'Massage': Icons.spa,
      'Kosmetik': Icons.face,
    };

    return iconMap[subcategory] ?? Icons.work;
  }

  String _getSubcategoryDescription(String subcategory) {
    // Beschreibungen für verschiedene Subkategorien
    final descriptions = {
      'Elektriker': 'Elektroinstallationen und Reparaturen',
      'Klempner': 'Sanitärarbeiten und Rohrreparaturen',
      'Maler': 'Maler- und Lackierarbeiten',
      'Tischler': 'Möbelbau und Holzarbeiten',
      'Reinigungsservice': 'Professionelle Reinigungsdienste',
      'Hausmeisterservice': 'Wartung und Instandhaltung',
      'Fensterreinigung': 'Glasreinigung und Pflege',
      'Umzugsservice': 'Umzüge und Transporte',
      'Kurierservice': 'Schnelle Lieferungen',
      'Webentwicklung': 'Websites und Web-Apps',
      'App-Entwicklung': 'Mobile Anwendungen',
      'Grafikdesign': 'Kreative Designlösungen',
      'Marketing': 'Werbung und Promotion',
      'Fotografie': 'Professionelle Aufnahmen',
      'Catering': 'Event- und Party-Service',
      'Koch/Köchin': 'Private Kochservices',
      'Gartenpflege': 'Pflege und Gestaltung',
      'Landschaftsbau': 'Gartengestaltung',
      'Massage': 'Entspannung und Wellness',
      'Kosmetik': 'Beauty und Pflege',
    };

    return descriptions[subcategory] ?? 'Professionelle Dienstleistungen';
  }
}
