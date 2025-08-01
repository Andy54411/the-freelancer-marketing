import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/order_provider.dart';
import '../../core/models/order_model.dart';
import '../../core/services/order_service.dart';
import '../orders/order_detail_screen.dart';
import '../orders/create_order_screen.dart';
import '../services/services_screen.dart';

class CustomerDashboardScreen extends StatefulWidget {
  const CustomerDashboardScreen({super.key});

  @override
  State<CustomerDashboardScreen> createState() => _CustomerDashboardScreenState();
}

class _CustomerDashboardScreenState extends State<CustomerDashboardScreen> with TickerProviderStateMixin {
  late TabController _tabController;
  final OrderService _orderService = OrderService();
  
  List<OrderModel> _activeOrders = [];
  List<OrderModel> _completedOrders = [];
  List<OrderModel> _recentOrders = [];
  
  bool _isLoading = true;
  
  Map<String, dynamic> _stats = {
    'totalOrders': 0,
    'activeOrders': 0,
    'totalSpent': 0.0,
    'savedAmount': 0.0,
  };

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadDashboardData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadDashboardData() async {
    setState(() => _isLoading = true);
    
    try {
      final userId = Provider.of<AuthProvider>(context, listen: false).user?.id;
      if (userId == null) return;

      // Load user orders
      final orders = await _orderService.getUserOrders(userId);
      
      setState(() {
        _activeOrders = orders.where((o) => ['pending', 'accepted', 'in_progress'].contains(o.status)).toList();
        _completedOrders = orders.where((o) => o.status == 'completed').toList();
        _recentOrders = orders.take(5).toList();
        
        _calculateStats(orders);
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Fehler beim Laden der Daten: $e')),
        );
      }
    }
  }

  void _calculateStats(List<OrderModel> orders) {
    double totalSpent = 0.0;
    
    for (final order in _completedOrders) {
      totalSpent += order.price ?? 0.0;
    }
    
    _stats = {
      'totalOrders': orders.length,
      'activeOrders': _activeOrders.length,
      'totalSpent': totalSpent,
      'savedAmount': totalSpent * 0.15, // Estimated savings
    };
  }

  @override
  Widget build(BuildContext context) {
    final user = Provider.of<AuthProvider>(context).user;
    
    return Scaffold(
      backgroundColor: Colors.grey[50],
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF14AD9F)))
          : CustomScrollView(
              slivers: [
                SliverAppBar(
                  expandedHeight: 200,
                  pinned: true,
                  backgroundColor: const Color(0xFF14AD9F),
                  flexibleSpace: FlexibleSpaceBar(
                    title: Text(
                      'Hallo ${user?.name ?? 'Kunde'}!',
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                    ),
                    background: _buildHeaderStats(),
                  ),
                ),
                SliverToBoxAdapter(
                  child: Column(
                    children: [
                      _buildQuickActions(),
                      const SizedBox(height: 16),
                      _buildRecentServices(),
                      const SizedBox(height: 16),
                      _buildTabBar(),
                    ],
                  ),
                ),
                SliverFillRemaining(
                  child: TabBarView(
                    controller: _tabController,
                    children: [
                      _buildActiveOrdersTab(),
                      _buildCompletedOrdersTab(),
                      _buildFavoritesTab(),
                    ],
                  ),
                ),
              ],
            ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => const CreateOrderScreen()),
        ),
        backgroundColor: const Color(0xFF14AD9F),
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('Service buchen', style: TextStyle(color: Colors.white)),
      ),
    );
  }

  Widget _buildHeaderStats() {
    return Container(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          const SizedBox(height: 40),
          Row(
            children: [
              Expanded(
                child: _buildStatCard(
                  'Aktive Aufträge',
                  '${_stats['activeOrders']}',
                  Icons.work_outline,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildStatCard(
                  'Gesamt ausgegeben',
                  '€${_stats['totalSpent'].toStringAsFixed(0)}',
                  Icons.euro_symbol,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard(String title, String value, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.2),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: Colors.white, size: 18),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 16,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickActions() {
    return Container(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Schnellaktionen',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildActionButton(
                  'Service buchen',
                  Icons.add_business,
                  () => Navigator.push(
                    context,
                    MaterialPageRoute(builder: (context) => const CreateOrderScreen()),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildActionButton(
                  'Services durchsuchen',
                  Icons.search,
                  () => Navigator.push(
                    context,
                    MaterialPageRoute(builder: (context) => const ServicesScreen()),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildActionButton(
                  'Favoriten',
                  Icons.favorite_outline,
                  () => _tabController.animateTo(2),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildActionButton(String title, IconData icon, VoidCallback onTap) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(12),
      elevation: 2,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
          child: Column(
            children: [
              Icon(icon, color: const Color(0xFF14AD9F), size: 28),
              const SizedBox(height: 8),
              Text(
                title,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF14AD9F),
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRecentServices() {
    const popularServices = [
      {'title': 'Reinigungsservice', 'icon': Icons.cleaning_services, 'category': 'cleaning'},
      {'title': 'Handwerker', 'icon': Icons.build, 'category': 'handyman'},
      {'title': 'IT-Support', 'icon': Icons.computer, 'category': 'it'},
      {'title': 'Umzugshelfer', 'icon': Icons.local_shipping, 'category': 'moving'},
    ];

    return Container(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Beliebte Services',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 100,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: popularServices.length,
              itemBuilder: (context, index) {
                final service = popularServices[index];
                return Container(
                  width: 120,
                  margin: const EdgeInsets.only(right: 12),
                  child: Material(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    elevation: 2,
                    child: InkWell(
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => CreateOrderScreen(
                            initialCategory: service['category'] as String,
                          ),
                        ),
                      ),
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              service['icon'] as IconData,
                              color: const Color(0xFF14AD9F),
                              size: 32,
                            ),
                            const SizedBox(height: 8),
                            Text(
                              service['title'] as String,
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                              textAlign: TextAlign.center,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTabBar() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: TabBar(
        controller: _tabController,
        indicatorColor: const Color(0xFF14AD9F),
        labelColor: const Color(0xFF14AD9F),
        unselectedLabelColor: Colors.grey[600],
        labelStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
        tabs: [
          Tab(
            text: 'Aktive (${_activeOrders.length})',
            icon: const Icon(Icons.pending_actions, size: 20),
          ),
          Tab(
            text: 'Abgeschlossen (${_completedOrders.length})',
            icon: const Icon(Icons.check_circle_outline, size: 20),
          ),
          const Tab(
            text: 'Favoriten',
            icon: Icon(Icons.favorite_outline, size: 20),
          ),
        ],
      ),
    );
  }

  Widget _buildActiveOrdersTab() {
    if (_activeOrders.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.work_outline, size: 64, color: Colors.grey),
            SizedBox(height: 16),
            Text(
              'Keine aktiven Aufträge',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w500),
            ),
            Text(
              'Buchen Sie einen Service um loszulegen',
              style: TextStyle(color: Colors.grey),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _activeOrders.length,
      itemBuilder: (context, index) {
        final order = _activeOrders[index];
        return _buildOrderCard(order);
      },
    );
  }

  Widget _buildCompletedOrdersTab() {
    if (_completedOrders.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.check_circle_outline, size: 64, color: Colors.grey),
            SizedBox(height: 16),
            Text(
              'Keine abgeschlossenen Aufträge',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w500),
            ),
            Text(
              'Erledigte Aufträge erscheinen hier',
              style: TextStyle(color: Colors.grey),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _completedOrders.length,
      itemBuilder: (context, index) {
        final order = _completedOrders[index];
        return _buildOrderCard(order, showRating: true);
      },
    );
  }

  Widget _buildFavoritesTab() {
    // TODO: Implement favorites functionality
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.favorite_outline, size: 64, color: Colors.grey),
          SizedBox(height: 16),
          Text(
            'Keine Favoriten',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w500),
          ),
          Text(
            'Markieren Sie Services als Favoriten',
            style: TextStyle(color: Colors.grey),
          ),
        ],
      ),
    );
  }

  Widget _buildOrderCard(OrderModel order, {bool showRating = false}) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        onTap: () => Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => OrderDetailScreen(orderId: order.id),
          ),
        ),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      order.title,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  _buildStatusChip(order.status),
                ],
              ),
              const SizedBox(height: 8),
              if (order.selectedCategory != null)
                Text(
                  '${order.selectedCategory} ${order.selectedSubcategory != null ? '• ${order.selectedSubcategory}' : ''}',
                  style: TextStyle(
                    color: Colors.grey[600],
                    fontSize: 14,
                  ),
                ),
              const SizedBox(height: 8),
              Text(
                order.description,
                style: TextStyle(color: Colors.grey[700]),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Icon(Icons.euro, size: 16, color: Colors.grey[600]),
                  const SizedBox(width: 4),
                  Text(
                    '${order.price?.toStringAsFixed(2) ?? 'N/A'}',
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF14AD9F),
                    ),
                  ),
                  const Spacer(),
                  if (order.location != null) ...[
                    Icon(Icons.location_on, size: 16, color: Colors.grey[600]),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        order.location!,
                        style: TextStyle(color: Colors.grey[600], fontSize: 12),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ],
              ),
              if (showRating && order.status == 'completed') ...[
                const SizedBox(height: 12),
                Row(
                  children: [
                    ElevatedButton.icon(
                      onPressed: () {
                        // TODO: Show rating dialog
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF14AD9F),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      icon: const Icon(Icons.star, size: 16),
                      label: const Text('Bewerten'),
                    ),
                    const SizedBox(width: 8),
                    OutlinedButton.icon(
                      onPressed: () {
                        // TODO: Show reorder dialog
                      },
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFF14AD9F),
                        side: const BorderSide(color: Color(0xFF14AD9F)),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      icon: const Icon(Icons.refresh, size: 16),
                      label: const Text('Erneut buchen'),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatusChip(String status) {
    Color backgroundColor;
    Color textColor;
    String displayText;

    switch (status) {
      case 'pending':
        backgroundColor = Colors.orange[100]!;
        textColor = Colors.orange[800]!;
        displayText = 'Ausstehend';
        break;
      case 'accepted':
        backgroundColor = Colors.blue[100]!;
        textColor = Colors.blue[800]!;
        displayText = 'Angenommen';
        break;
      case 'in_progress':
        backgroundColor = Colors.purple[100]!;
        textColor = Colors.purple[800]!;
        displayText = 'In Bearbeitung';
        break;
      case 'completed':
        backgroundColor = Colors.green[100]!;
        textColor = Colors.green[800]!;
        displayText = 'Abgeschlossen';
        break;
      case 'rejected':
        backgroundColor = Colors.red[100]!;
        textColor = Colors.red[800]!;
        displayText = 'Abgelehnt';
        break;
      case 'cancelled':
        backgroundColor = Colors.grey[100]!;
        textColor = Colors.grey[800]!;
        displayText = 'Storniert';
        break;
      default:
        backgroundColor = Colors.grey[100]!;
        textColor = Colors.grey[800]!;
        displayText = status;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        displayText,
        style: TextStyle(
          color: textColor,
          fontSize: 12,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }
}
