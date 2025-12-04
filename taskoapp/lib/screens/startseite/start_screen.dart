import 'package:flutter/material.dart';
import 'components/hero_section.dart';
import 'components/categories_grid.dart';
import 'components/featured_services.dart';
import 'components/bottom_actions.dart';
import 'components/jobs_list_section.dart';

class DiscoverScreen extends StatefulWidget {
  const DiscoverScreen({super.key});

  @override
  State<DiscoverScreen> createState() => _DiscoverScreenState();
}

class _DiscoverScreenState extends State<DiscoverScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _selectedCategory = '';
  int _selectedMode = 0; // 0 = Services, 1 = Jobs

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: CustomScrollView(
        slivers: [
          // Hero Section
          HeroSection(
            searchController: _searchController,
            selectedMode: _selectedMode,
            onModeChanged: (mode) {
              setState(() {
                _selectedMode = mode;
              });
            },
          ),

          // Content based on mode
          if (_selectedMode == 0) ...[
            // Categories Section
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.all(20.0),
                child: CategoriesGrid(
                  selectedCategory: _selectedCategory,
                  onCategorySelected: (category) {
                    setState(() {
                      _selectedCategory = category;
                    });
                  },
                ),
              ),
            ),

            // Featured Services Section
            const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.all(20.0),
                child: FeaturedServices(),
              ),
            ),
          ] else ...[
            // Jobs List Section
            const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.all(20.0),
                child: JobsListSection(),
              ),
            ),
          ],

          // Bottom Actions
          const SliverToBoxAdapter(
            child: Padding(
              padding: EdgeInsets.all(20.0),
              child: BottomActions(),
            ),
          ),
        ],
      ),
    );
  }
}
