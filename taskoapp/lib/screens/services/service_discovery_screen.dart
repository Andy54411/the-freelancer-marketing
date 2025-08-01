import 'package:flutter/material.dart';
import 'components/service_header.dart';
import 'components/service_filters.dart';
import 'components/service_grid.dart';
import 'components/service_sidebar.dart';
import '../../../services/categories_service.dart';

class ServiceDiscoveryScreen extends StatefulWidget {
  final String subcategory;
  final String? category;

  const ServiceDiscoveryScreen({
    super.key,
    required this.subcategory,
    this.category,
  });

  @override
  State<ServiceDiscoveryScreen> createState() => _ServiceDiscoveryScreenState();
}

class _ServiceDiscoveryScreenState extends State<ServiceDiscoveryScreen> {
  String _sortBy = 'recommended';
  double _minPrice = 0;
  double _maxPrice = 1000;
  List<String> _selectedFilters = [];
  bool _isLoading = true;
  List<Map<String, dynamic>> _services = [];
  
  @override
  void initState() {
    super.initState();
    _loadServices();
  }

  Future<void> _loadServices() async {
    setState(() => _isLoading = true);
    
    try {
      // Lade Services für diese Subkategorie
      final providers = await CategoriesService.getProvidersForSubcategory(widget.subcategory);
      
      setState(() {
        _services = providers;
        _isLoading = false;
      });
    } catch (e) {
      debugPrint('❌ Fehler beim Laden der Services: $e');
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      body: SafeArea(
        child: Column(
          children: [
            // Header mit Navigation und Titel
            ServiceHeader(
              subcategory: widget.subcategory,
              category: widget.category,
              onBack: () => Navigator.pop(context),
            ),
            
            // Filter-Sektion
            ServiceFilters(
              sortBy: _sortBy,
              minPrice: _minPrice,
              maxPrice: _maxPrice,
              selectedFilters: _selectedFilters,
              onSortChanged: (value) => setState(() => _sortBy = value),
              onPriceChanged: (min, max) => setState(() {
                _minPrice = min;
                _maxPrice = max;
              }),
              onFiltersChanged: (filters) => setState(() => _selectedFilters = filters),
            ),
            
            // Services Grid
            Expanded(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Sidebar (nur Desktop)
                  if (MediaQuery.of(context).size.width > 768)
                    ServiceSidebar(
                      onFiltersChanged: (filters) => setState(() => _selectedFilters = filters.keys.toList()),
                    ),
                  
                  // Main Content
                  Expanded(
                    child: ServiceGrid(
                      services: _services,
                      isLoading: _isLoading,
                      sortBy: _sortBy,
                      minPrice: _minPrice,
                      maxPrice: _maxPrice,
                      selectedFilters: _selectedFilters,
                      onRefresh: _loadServices,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
