import 'package:flutter/material.dart';
import '../../../services/categories_service.dart';
import '../../services/service_discovery_screen.dart';

class HeroSection extends StatelessWidget {
  final TextEditingController searchController;

  const HeroSection({
    super.key,
    required this.searchController,
  });

  void _performSearch(BuildContext context, String query) {
    if (query.trim().isEmpty) return;
    
    // Suche nach passenden Subkategorien
    final matchingSubcategories = CategoriesService.searchSubcategories(query);
    
    if (matchingSubcategories.isNotEmpty) {
      // Navigiere zur ersten passenden Subkategorie
      final firstMatch = matchingSubcategories.first;
      final category = CategoriesService.findCategoryBySubcategory(firstMatch);
      
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => ServiceDiscoveryScreen(
            subcategory: firstMatch,
            category: category ?? 'Allgemein',
          ),
        ),
      );
    } else {
      // Zeige eine Meldung, dass keine Services gefunden wurden
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Keine Services für "$query" gefunden'),
          backgroundColor: Colors.orange,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return SliverAppBar(
      expandedHeight: 360,
      floating: false,
      pinned: true,
      flexibleSpace: FlexibleSpaceBar(
        background: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Color(0xFF14ad9f),
                Color(0xFF0f9d84),
              ],
            ),
          ),
          child: SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Header Row
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Taskilo',
                              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            Text(
                              'Service Marktplatz',
                              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                color: Colors.white.withValues(alpha: 0.9),
                              ),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        onPressed: () {
                          Navigator.pushNamed(context, '/login');
                        },
                        icon: const Icon(
                          Icons.person,
                          color: Colors.white,
                          size: 28,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  
                  // Hero Title
                  Text(
                    'Finden Sie den\nperfekten Service',
                    style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      height: 1.2,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Über 1000+ Experten warten darauf,\nIhnen zu helfen',
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: Colors.white.withValues(alpha: 0.9),
                    ),
                  ),
                  const SizedBox(height: 20),
                  
                  // Search Bar
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(30),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.1),
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: TextField(
                      controller: searchController,
                      onSubmitted: (query) => _performSearch(context, query),
                      decoration: InputDecoration(
                        hintText: 'Nach Services suchen...',
                        prefixIcon: const Icon(Icons.search, color: Color(0xFF14ad9f)),
                        suffixIcon: IconButton(
                          icon: const Icon(Icons.arrow_forward, color: Color(0xFF14ad9f)),
                          onPressed: () => _performSearch(context, searchController.text),
                        ),
                        border: InputBorder.none,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
