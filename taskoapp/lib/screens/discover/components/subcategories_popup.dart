import 'package:flutter/material.dart';
import '../../../services/categories_service.dart';
import 'subcategory_sheet.dart';

class SubcategoriesPopup extends StatelessWidget {
  final String category;

  const SubcategoriesPopup({
    super.key,
    required this.category,
  });

  @override
  Widget build(BuildContext context) {
    final subcategories = CategoriesService.getSubcategories(category);
    
    return Dialog(
      backgroundColor: Colors.transparent,
      child: Container(
        constraints: const BoxConstraints(maxWidth: 400, maxHeight: 600),
        margin: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.2),
              blurRadius: 20,
              offset: const Offset(0, 10),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    Color(0xFF14ad9f),
                    Color(0xFF0f9d84),
                  ],
                ),
                borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      _getCategoryIcon(category),
                      color: Colors.white,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          category,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${subcategories.length} Services verfügbar',
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.9),
                            fontSize: 14,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(
                      Icons.close,
                      color: Colors.white,
                      size: 24,
                    ),
                  ),
                ],
              ),
            ),
            
            // Subkategorien Grid
            Flexible(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: GridView.builder(
                  shrinkWrap: true,
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    mainAxisSpacing: 12,
                    crossAxisSpacing: 12,
                    childAspectRatio: 2.5,
                  ),
                  itemCount: subcategories.length,
                  itemBuilder: (context, index) {
                    final subcategory = subcategories[index];
                    return GestureDetector(
                      onTap: () async {
                        Navigator.pop(context); // Schließe Popup
                        
                        // Zeige Loading
                        showDialog(
                          context: context,
                          barrierDismissible: false,
                          builder: (context) => const Center(
                            child: CircularProgressIndicator(
                              color: Color(0xFF14ad9f),
                            ),
                          ),
                        );
                        
                        // Lade Daten für Subkategorie
                        final data = await CategoriesService.getDataForSubcategory(subcategory);
                        if (context.mounted) {
                          Navigator.pop(context); // Schließe Loading
                          
                          // Zeige Subkategorie-Details
                          showModalBottomSheet(
                            context: context,
                            isScrollControlled: true,
                            backgroundColor: Colors.transparent,
                            builder: (context) => SubcategorySheet(
                              subcategory: subcategory,
                              data: data,
                            ),
                          );
                        }
                      },
                      child: Container(
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: const Color(0xFF14ad9f).withValues(alpha: 0.2),
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.05),
                              blurRadius: 8,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: Center(
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 8),
                            child: Text(
                              subcategory,
                              style: const TextStyle(
                                color: Color(0xFF14ad9f),
                                fontWeight: FontWeight.w600,
                                fontSize: 13,
                              ),
                              textAlign: TextAlign.center,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ),
                      ),
                    );
                  },
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
}
