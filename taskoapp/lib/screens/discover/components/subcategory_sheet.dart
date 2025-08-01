import 'package:flutter/material.dart';
import 'provider_card.dart';

class SubcategorySheet extends StatelessWidget {
  final String subcategory;
  final Map<String, dynamic>? data;

  const SubcategorySheet({
    super.key,
    required this.subcategory,
    required this.data,
  });

  @override
  Widget build(BuildContext context) {
    debugPrint('🔍 SubcategorySheet: $subcategory, data: ${data != null ? 'NOT NULL' : 'NULL'}');
    if (data != null) {
      debugPrint('🔍 SubcategorySheet data keys: ${data!.keys.toList()}');
      debugPrint('🔍 SubcategorySheet providers count: ${data!['providers']?.length ?? 'NULL'}');
      if (data!['providers'] != null) {
        debugPrint('🔍 SubcategorySheet providers type: ${data!['providers'].runtimeType}');
      }
    }
    
    return DraggableScrollableSheet(
      initialChildSize: 0.7,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      builder: (context, scrollController) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Handle
              Center(
                child: Container(
                  margin: const EdgeInsets.only(top: 12, bottom: 20),
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              
              // Header
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            subcategory,
                            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Verfügbare Anbieter und Services',
                            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: Colors.grey.shade600,
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.close),
                    ),
                  ],
                ),
              ),
              
              const SizedBox(height: 16),
              
              // Content
              Expanded(
                child: data == null
                    ? const Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.error_outline,
                              size: 64,
                              color: Colors.grey,
                            ),
                            SizedBox(height: 16),
                            Text(
                              'Keine Daten verfügbar',
                              style: TextStyle(
                                fontSize: 18,
                                color: Colors.grey,
                              ),
                            ),
                          ],
                        ),
                      )
                    : ListView(
                        controller: scrollController,
                        padding: const EdgeInsets.symmetric(horizontal: 20),
                        children: [
                          // Statistiken
                          if (data!['providers'] != null && (data!['providers'] as List).isNotEmpty) ...[
                            Container(
                              padding: const EdgeInsets.all(16),
                              margin: const EdgeInsets.only(bottom: 16),
                              decoration: BoxDecoration(
                                color: const Color(0xFF14ad9f).withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'Statistiken',
                                    style: TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  Text('Verfügbare Anbieter: ${(data!['providers'] as List).length}'),
                                  if (data!['statistics'] != null && data!['statistics']['averagePrice'] != null)
                                    Text('Durchschnittspreis: ${data!['statistics']['averagePrice']}€'),
                                  if (data!['statistics'] != null && data!['statistics']['averageRating'] != null)
                                    Text('Durchschnittsbewertung: ${data!['statistics']['averageRating']} ⭐'),
                                ],
                              ),
                            ),
                          ],
                          
                          // Anbieter Liste
                          const Text(
                            'Verfügbare Anbieter',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 12),
                          
                          // Provider Cards
                          if (data!['providers'] != null && (data!['providers'] as List).isNotEmpty) ...[
                            for (int i = 0; i < (data!['providers'] as List).length; i++)
                              ProviderCard(provider: (data!['providers'] as List)[i]),
                          ] else ...[
                            const Center(
                              child: Padding(
                                padding: EdgeInsets.all(40),
                                child: Column(
                                  children: [
                                    Icon(
                                      Icons.person_search,
                                      size: 64,
                                      color: Colors.grey,
                                    ),
                                    SizedBox(height: 16),
                                    Text(
                                      'Keine Anbieter gefunden',
                                      style: TextStyle(
                                        fontSize: 16,
                                        color: Colors.grey,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
              ),
            ],
          ),
        );
      },
    );
  }
}
