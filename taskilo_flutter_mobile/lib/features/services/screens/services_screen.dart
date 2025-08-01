import 'package:flutter/material.dart';
import 'package:get/get.dart';

class ServicesScreen extends StatefulWidget {
  const ServicesScreen({super.key});

  @override
  State<ServicesScreen> createState() => _ServicesScreenState();
}

class _ServicesScreenState extends State<ServicesScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _selectedCategory = 'Alle';
  
  final List<String> _categories = [
    'Alle',
    'Haushaltsservice',
    'Handwerk',
    'Garten & Außenbereich',
    'Technologie',
    'Transport',
    'Beauty & Wellness',
    'Bildung',
    'Events',
  ];

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Services'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0,
      ),
      body: Column(
        children: [
          // Suchleiste
          Container(
            padding: const EdgeInsets.all(16),
            color: Colors.white,
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Nach Services suchen...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: IconButton(
                  icon: const Icon(Icons.tune),
                  onPressed: _showFilterDialog,
                ),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(25),
                  borderSide: BorderSide.none,
                ),
                filled: true,
                fillColor: Colors.grey[100],
              ),
            ),
          ),
          
          // Kategorien
          SizedBox(
            height: 50,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: _categories.length,
              itemBuilder: (context, index) {
                final category = _categories[index];
                final isSelected = category == _selectedCategory;
                
                return Container(
                  margin: const EdgeInsets.only(right: 8),
                  child: FilterChip(
                    label: Text(category),
                    selected: isSelected,
                    onSelected: (selected) {
                      setState(() {
                        _selectedCategory = category;
                      });
                    },
                    backgroundColor: Colors.grey[100],
                    selectedColor: Theme.of(context).primaryColor.withOpacity(0.2),
                    checkmarkColor: Theme.of(context).primaryColor,
                    labelStyle: TextStyle(
                      color: isSelected ? Theme.of(context).primaryColor : Colors.black,
                      fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                    ),
                  ),
                );
              },
            ),
          ),
          
          // Service-Liste
          Expanded(
            child: _buildServiceList(),
          ),
        ],
      ),
    );
  }

  Widget _buildServiceList() {
    final services = _getFilteredServices();
    
    if (services.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.search_off,
              size: 80,
              color: Colors.grey[400],
            ),
            const SizedBox(height: 16),
            Text(
              'Keine Services gefunden',
              style: TextStyle(
                fontSize: 18,
                color: Colors.grey[600],
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Versuchen Sie andere Suchbegriffe',
              style: TextStyle(
                color: Colors.grey[500],
              ),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: services.length,
      itemBuilder: (context, index) {
        final service = services[index];
        return _buildServiceCard(service);
      },
    );
  }

  Widget _buildServiceCard(Map<String, dynamic> service) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: () => _showServiceDetails(service),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 60,
                    height: 60,
                    decoration: BoxDecoration(
                      color: Theme.of(context).primaryColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      service['icon'] as IconData,
                      color: Theme.of(context).primaryColor,
                      size: 30,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          service['name'],
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          service['description'],
                          style: TextStyle(
                            color: Colors.grey[600],
                            fontSize: 14,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Icon(
                              Icons.star,
                              size: 16,
                              color: Colors.amber,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              '${service['rating']}',
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              '(${service['reviews']} Bewertungen)',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.grey[600],
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              
              const SizedBox(height: 12),
              
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Ab ${service['price']}',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Colors.green,
                        ),
                      ),
                      Text(
                        service['provider'],
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                  ElevatedButton(
                    onPressed: () => _bookService(service),
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    ),
                    child: const Text('Buchen'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showServiceDetails(Map<String, dynamic> service) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _buildServiceDetailsSheet(service),
    );
  }

  Widget _buildServiceDetailsSheet(Map<String, dynamic> service) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.9,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        children: [
          Container(
            margin: const EdgeInsets.only(top: 8),
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.grey[300],
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header
                  Row(
                    children: [
                      Container(
                        width: 80,
                        height: 80,
                        decoration: BoxDecoration(
                          color: Theme.of(context).primaryColor.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Icon(
                          service['icon'] as IconData,
                          color: Theme.of(context).primaryColor,
                          size: 40,
                        ),
                      ),
                      const SizedBox(width: 20),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              service['name'],
                              style: const TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              service['provider'],
                              style: TextStyle(
                                color: Colors.grey[600],
                                fontSize: 16,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                Icon(
                                  Icons.star,
                                  size: 18,
                                  color: Colors.amber,
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  '${service['rating']}',
                                  style: const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  '(${service['reviews']} Bewertungen)',
                                  style: TextStyle(
                                    fontSize: 14,
                                    color: Colors.grey[600],
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  
                  const SizedBox(height: 24),
                  
                  // Beschreibung
                  Text(
                    'Beschreibung',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    service['fullDescription'] ?? service['description'],
                    style: const TextStyle(fontSize: 16, height: 1.5),
                  ),
                  
                  const SizedBox(height: 24),
                  
                  // Preis
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.green.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          Icons.euro,
                          color: Colors.green[700],
                        ),
                        const SizedBox(width: 8),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Preis',
                              style: TextStyle(
                                color: Colors.green[700],
                                fontSize: 12,
                              ),
                            ),
                            Text(
                              service['price'],
                              style: TextStyle(
                                color: Colors.green[700],
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  
                  const SizedBox(height: 24),
                  
                  // Verfügbarkeit
                  Text(
                    'Verfügbarkeit',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.blue.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          Icons.access_time,
                          color: Colors.blue[700],
                          size: 20,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'Verfügbar ab morgen',
                          style: TextStyle(
                            color: Colors.blue[700],
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                  
                  const SizedBox(height: 24),
                  
                  // Bewertungen
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Bewertungen',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      TextButton(
                        onPressed: () {
                          // TODO: Show all reviews
                        },
                        child: const Text('Alle anzeigen'),
                      ),
                    ],
                  ),
                  
                  const SizedBox(height: 8),
                  
                  _buildReviewItem(
                    name: 'Maria K.',
                    rating: 5,
                    comment: 'Sehr zufrieden mit dem Service. Pünktlich und professionell!',
                    date: '2 Tage',
                  ),
                  
                  const Divider(),
                  
                  _buildReviewItem(
                    name: 'Thomas M.',
                    rating: 4,
                    comment: 'Gute Arbeit, kann ich weiterempfehlen.',
                    date: '1 Woche',
                  ),
                  
                  const SizedBox(height: 32),
                ],
              ),
            ),
          ),
          
          // Buchungs-Button
          Container(
            padding: const EdgeInsets.all(24),
            child: SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  Get.back();
                  _bookService(service);
                },
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                child: Text(
                  'Jetzt buchen - ${service['price']}',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildReviewItem({
    required String name,
    required int rating,
    required String comment,
    required String date,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 16,
                backgroundColor: Theme.of(context).primaryColor.withOpacity(0.1),
                child: Text(
                  name[0],
                  style: TextStyle(
                    color: Theme.of(context).primaryColor,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          name,
                          style: const TextStyle(fontWeight: FontWeight.w500),
                        ),
                        const Spacer(),
                        Text(
                          'vor $date',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey[600],
                          ),
                        ),
                      ],
                    ),
                    Row(
                      children: List.generate(5, (index) {
                        return Icon(
                          index < rating ? Icons.star : Icons.star_border,
                          size: 14,
                          color: Colors.amber,
                        );
                      }),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            comment,
            style: const TextStyle(fontSize: 14),
          ),
        ],
      ),
    );
  }

  void _showFilterDialog() {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('Filter'),
          content: const Text('Filterfunktion wird implementiert'),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Schließen'),
            ),
          ],
        );
      },
    );
  }

  void _bookService(Map<String, dynamic> service) {
    Get.toNamed('/booking', arguments: {'service': service});
  }

  List<Map<String, dynamic>> _getFilteredServices() {
    List<Map<String, dynamic>> services = _getDummyServices();
    
    // Filter nach Kategorie
    if (_selectedCategory != 'Alle') {
      services = services.where((service) => service['category'] == _selectedCategory).toList();
    }
    
    // Filter nach Suchtext
    if (_searchController.text.isNotEmpty) {
      final searchText = _searchController.text.toLowerCase();
      services = services.where((service) {
        return service['name'].toLowerCase().contains(searchText) ||
               service['description'].toLowerCase().contains(searchText) ||
               service['provider'].toLowerCase().contains(searchText);
      }).toList();
    }
    
    return services;
  }

  List<Map<String, dynamic>> _getDummyServices() {
    return [
      {
        'id': '1',
        'name': 'Hausreinigung',
        'description': 'Professionelle Reinigung Ihres Zuhauses',
        'fullDescription': 'Unsere professionelle Hausreinigung umfasst alle Räume Ihrer Wohnung oder Ihres Hauses. Wir verwenden umweltfreundliche Reinigungsmittel und bringen alle notwendigen Geräte mit.',
        'category': 'Haushaltsservice',
        'price': '€35/Stunde',
        'rating': 4.8,
        'reviews': 127,
        'provider': 'CleanPro Services',
        'icon': Icons.cleaning_services,
      },
      {
        'id': '2',
        'name': 'Handwerker Service',
        'description': 'Reparaturen und Montagen im Haushalt',
        'fullDescription': 'Unser Handwerker-Service bietet schnelle und zuverlässige Hilfe bei allen Reparaturen und Montagen in Ihrem Zuhause. Von kleinen Reparaturen bis hin zu größeren Renovierungsarbeiten.',
        'category': 'Handwerk',
        'price': '€45/Stunde',
        'rating': 4.9,
        'reviews': 89,
        'provider': 'Fix-It Pro',
        'icon': Icons.handyman,
      },
      {
        'id': '3',
        'name': 'Gartenpflege',
        'description': 'Rasenmähen, Heckenschnitt und mehr',
        'fullDescription': 'Professionelle Gartenpflege für einen gepflegten Außenbereich. Wir kümmern uns um Rasenmähen, Heckenschnitt, Unkrautentfernung und saisonale Gartenarbeiten.',
        'category': 'Garten & Außenbereich',
        'price': '€30/Stunde',
        'rating': 4.7,
        'reviews': 56,
        'provider': 'Grün & Schön',
        'icon': Icons.grass,
      },
      {
        'id': '4',
        'name': 'Computer Support',
        'description': 'IT-Hilfe und Computerreparaturen',
        'fullDescription': 'Umfassender Computer-Support für Privatpersonen und kleine Unternehmen. Wir helfen bei Software-Problemen, Hardware-Reparaturen und IT-Beratung.',
        'category': 'Technologie',
        'price': '€40/Stunde',
        'rating': 4.6,
        'reviews': 73,
        'provider': 'TechHelp24',
        'icon': Icons.computer,
      },
      {
        'id': '5',
        'name': 'Umzugsservice',
        'description': 'Professionelle Umzugshilfe',
        'fullDescription': 'Stressfreier Umzug mit unserem professionellen Team. Wir bieten Verpackung, Transport und Aufbau - alles aus einer Hand.',
        'category': 'Transport',
        'price': '€25/Stunde pro Person',
        'rating': 4.5,
        'reviews': 94,
        'provider': 'MoveEasy',
        'icon': Icons.local_shipping,
      },
      {
        'id': '6',
        'name': 'Massage & Wellness',
        'description': 'Entspannung bei Ihnen zu Hause',
        'fullDescription': 'Professionelle Massage- und Wellness-Behandlungen in den eigenen vier Wänden. Verschiedene Massage-Techniken für Entspannung und Wohlbefinden.',
        'category': 'Beauty & Wellness',
        'price': '€60/Stunde',
        'rating': 4.9,
        'reviews': 41,
        'provider': 'Wellness Home',
        'icon': Icons.spa,
      },
    ];
  }
}
