import 'package:flutter/material.dart';
import '../../../services/categories_service.dart';
import '../../services/service_discovery_screen.dart';
import '../../jobs/job_board_screen.dart';

class HeroSection extends StatefulWidget {
  final TextEditingController searchController;
  final int selectedMode;
  final Function(int) onModeChanged;

  const HeroSection({
    super.key,
    required this.searchController,
    required this.selectedMode,
    required this.onModeChanged,
  });

  @override
  State<HeroSection> createState() => _HeroSectionState();
}

class _HeroSectionState extends State<HeroSection> {
  void _performSearch(BuildContext context, String query) {
    if (query.trim().isEmpty) return;

    if (widget.selectedMode == 0) {
      // Dienstleistungen Suche
      final matchingSubcategories = CategoriesService.searchSubcategories(
        query,
      );

      if (matchingSubcategories.isNotEmpty) {
        final firstMatch = matchingSubcategories.first;
        final category = CategoriesService.findCategoryBySubcategory(
          firstMatch,
        );

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
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Keine Services für "$query" gefunden'),
            backgroundColor: Colors.orange,
          ),
        );
      }
    } else {
      // Jobs Suche - Navigiere zur Jobbörse mit Suchbegriff
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => JobBoardScreen(initialSearchTerm: query),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return SliverAppBar(
      expandedHeight: 460,
      floating: false,
      pinned: true,
      flexibleSpace: FlexibleSpaceBar(
        background: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xFF14ad9f), Color(0xFF0f9d84)],
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
                              style: Theme.of(context).textTheme.headlineMedium
                                  ?.copyWith(
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold,
                                  ),
                            ),
                            Text(
                              'Service Marktplatz',
                              style: Theme.of(context).textTheme.bodyMedium
                                  ?.copyWith(
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

                  // Mode Tabs (Dienstleistungen / Jobs)
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(25),
                    ),
                    padding: const EdgeInsets.all(4),
                    child: Row(
                      children: [
                        Expanded(
                          child: GestureDetector(
                            onTap: () => widget.onModeChanged(0),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              decoration: BoxDecoration(
                                color: widget.selectedMode == 0
                                    ? Colors.white
                                    : Colors.transparent,
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Text(
                                'Dienstleistungen',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  color: widget.selectedMode == 0
                                      ? const Color(0xFF14ad9f)
                                      : Colors.white,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ),
                        ),
                        Expanded(
                          child: GestureDetector(
                            onTap: () => widget.onModeChanged(1),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              decoration: BoxDecoration(
                                color: widget.selectedMode == 1
                                    ? Colors.white
                                    : Colors.transparent,
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Text(
                                'Jobs',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  color: widget.selectedMode == 1
                                      ? const Color(0xFF14ad9f)
                                      : Colors.white,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Hero Title (dynamisch basierend auf Modus)
                  Text(
                    widget.selectedMode == 0
                        ? 'Finden Sie den\nperfekten Service'
                        : 'Finden Sie Ihren\nTraumjob',
                    style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      height: 1.2,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    widget.selectedMode == 0
                        ? 'Über 1000+ Experten warten darauf,\nIhnen zu helfen'
                        : 'Tausende Stellenangebote\nvon Top-Unternehmen',
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
                      controller: widget.searchController,
                      onSubmitted: (query) => _performSearch(context, query),
                      decoration: InputDecoration(
                        hintText: widget.selectedMode == 0
                            ? 'Nach Services suchen...'
                            : 'Nach Jobs suchen...',
                        prefixIcon: const Icon(
                          Icons.search,
                          color: Color(0xFF14ad9f),
                        ),
                        suffixIcon: IconButton(
                          icon: const Icon(
                            Icons.arrow_forward,
                            color: Color(0xFF14ad9f),
                          ),
                          onPressed: () => _performSearch(
                            context,
                            widget.searchController.text,
                          ),
                        ),
                        border: InputBorder.none,
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 20,
                          vertical: 16,
                        ),
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
