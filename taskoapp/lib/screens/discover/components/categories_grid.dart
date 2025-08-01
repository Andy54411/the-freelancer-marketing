import 'package:flutter/material.dart';
import '../../../services/categories_service.dart';

class CategoriesGrid extends StatelessWidget {
  final String selectedCategory;
  final Function(String) onCategorySelected;
  final Function(String) onShowSubcategories;

  const CategoriesGrid({
    super.key,
    required this.selectedCategory,
    required this.onCategorySelected,
    required this.onShowSubcategories,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Service Kategorien',
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 16),
        
        LayoutBuilder(
          builder: (context, constraints) {
            int crossAxisCount = constraints.maxWidth > 600 ? 4 : 2;
            double childAspectRatio = constraints.maxWidth > 600 ? 1.2 : 1.5;
            
            return GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: crossAxisCount,
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: childAspectRatio,
              ),
              itemCount: CategoriesService.categories.keys.length,
              itemBuilder: (context, index) {
                final category = CategoriesService.categories.keys.toList()[index];
                final isSelected = selectedCategory == category;
                
                return GestureDetector(
                  onTap: () {
                    if (isSelected) {
                      onCategorySelected('');
                    } else {
                      onCategorySelected(category);
                      onShowSubcategories(category);
                    }
                  },
                  child: Container(
                    decoration: BoxDecoration(
                      color: isSelected ? const Color(0xFF14ad9f) : Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: isSelected ? const Color(0xFF14ad9f) : Colors.grey.shade300,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.05),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(12.0),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            _getCategoryIcon(category),
                            size: 32,
                            color: isSelected ? Colors.white : const Color(0xFF14ad9f),
                          ),
                          const SizedBox(height: 8),
                          Flexible(
                            child: Text(
                              category,
                              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                color: isSelected ? Colors.white : Colors.black87,
                                fontWeight: FontWeight.w500,
                              ),
                              textAlign: TextAlign.center,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            );
          },
        ),
      ],
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
}
