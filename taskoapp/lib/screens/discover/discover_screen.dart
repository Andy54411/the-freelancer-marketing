import 'package:flutter/material.dart';
import 'components/hero_section.dart';
import 'components/categories_grid.dart';
import 'components/featured_services.dart';
import 'components/bottom_actions.dart';
import 'components/subcategories_popup.dart';

class DiscoverScreen extends StatefulWidget {
  const DiscoverScreen({super.key});

  @override
  State<DiscoverScreen> createState() => _DiscoverScreenState();
}

class _DiscoverScreenState extends State<DiscoverScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _selectedCategory = '';

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
          HeroSection(searchController: _searchController),
          
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
                onShowSubcategories: _showSubcategoriesPopup,
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

  void _showSubcategoriesPopup(String category) {
    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (context) => SubcategoriesPopup(category: category),
    );
  }
}
