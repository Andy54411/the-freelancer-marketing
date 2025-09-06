import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../models/user_model.dart';
import '../../../models/order.dart';
import '../../../services/order_service.dart';
import '../../../utils/colors.dart';
import '../dashboard_layout.dart';
import 'order_detail_screen.dart';

class MyOrdersScreen extends StatefulWidget {
  const MyOrdersScreen({super.key});

  @override
  State<MyOrdersScreen> createState() => _MyOrdersScreenState();
}

class _MyOrdersScreenState extends State<MyOrdersScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  List<Order> _orders = [];
  bool _isLoading = true;
  String? _error;
  String _searchTerm = '';

  final List<String> _tabs = ['ALLE', 'AKTIV', 'FERTIG', 'STORNO'];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _tabs.length, vsync: this);
    _loadOrders();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadOrders() async {
    final user = context.read<TaskiloUser?>();
    if (user == null) {
      setState(() {
        _error = 'Bitte melden Sie sich an, um Ihre Aufträge anzuzeigen.';
        _isLoading = false;
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final orders = await OrderService.getUserOrders(user.uid);
      setState(() {
        _orders = orders.where((order) => order.status != 'abgelehnt_vom_anbieter').toList();
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Aufträge konnten nicht geladen werden: ${e.toString()}';
        _isLoading = false;
      });
    }
  }

  List<Order> get _filteredOrders {
    List<Order> filtered = _orders;

    // Nach Tab filtern
    final activeTab = _tabs[_tabController.index];
    if (activeTab != 'ALLE') {
      filtered = filtered.where((order) {
        switch (activeTab) {
          case 'AKTIV':
            return order.status == 'AKTIV' || order.status == 'IN BEARBEITUNG';
          case 'FERTIG':
            return order.status == 'ABGESCHLOSSEN' || order.status == 'zahlung_erhalten_clearing';
          case 'STORNO':
            return order.status == 'STORNIERT';
          default:
            return true;
        }
      }).toList();
    }

    // Nach Suchbegriff filtern
    if (_searchTerm.isNotEmpty) {
      filtered = filtered.where((order) {
        return order.selectedSubcategory.toLowerCase().contains(_searchTerm.toLowerCase()) ||
            order.providerName.toLowerCase().contains(_searchTerm.toLowerCase());
      }).toList();
    }

    return filtered;
  }

  Map<String, int> get _orderCounts {
    return {
      'ALLE': _orders.length,
      'AKTIV': _orders.where((o) => o.status == 'AKTIV' || o.status == 'IN BEARBEITUNG').length,
      'FERTIG': _orders.where((o) => o.status == 'ABGESCHLOSSEN' || o.status == 'zahlung_erhalten_clearing').length,
      'STORNO': _orders.where((o) => o.status == 'STORNIERT').length,
    };
  }

  Color _getStatusColor(String status) {
    return TaskiloColors.getStatusColor(status);
  }

  String _getStatusText(String status) {
    return TaskiloColors.getStatusDisplayText(status);
  }

  String _formatPrice(int? amountInCents, String? currency) {
    if (amountInCents == null || amountInCents == 0) {
      return 'Preis nicht verfügbar';
    }
    final amountInEuro = amountInCents / 100.0;
    return '${amountInEuro.toStringAsFixed(2)} ${currency ?? 'EUR'}';
  }

  String _formatDate(DateTime? date) {
    if (date == null) return 'N/A';
    return '${date.day}.${date.month}.${date.year}';
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<TaskiloUser?>(
      builder: (context, user, child) {
        if (user == null) {
          return const Scaffold(
            body: Center(
              child: Text('Bitte melden Sie sich an.'),
            ),
          );
        }

        return DashboardLayout(
          title: 'Meine Aufträge',
          useGradientBackground: true,
          showBackButton: true,
          hasSearchBar: true,
          searchHint: 'Aufträge durchsuchen...',
          onSearchChanged: (value) => setState(() => _searchTerm = value),
          tabs: _tabs.map((tab) {
            final count = _orderCounts[tab] ?? 0;
            return Tab(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Text(
                      tab,
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                    ),
                  ),
                  if (count > 0) ...[
                    const SizedBox(height: 2),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.3),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        count.toString(),
                        style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ],
              ),
            );
          }).toList(),
          tabController: _tabController,
          body: _buildContent(),
        );
      },
    );
  }

  Widget _buildContent() {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(
          valueColor: AlwaysStoppedAnimation<Color>(TaskiloColors.primary),
        ),
      );
    }

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error, size: 48, color: Colors.red),
            const SizedBox(height: 16),
            Text(
              _error!,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.red),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _loadOrders,
              style: ElevatedButton.styleFrom(
                backgroundColor: TaskiloColors.primary,
                foregroundColor: Colors.white,
              ),
              child: const Text('Erneut versuchen'),
            ),
          ],
        ),
      );
    }

    final filteredOrders = _filteredOrders;

    if (filteredOrders.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.inbox, size: 48, color: Colors.grey),
            SizedBox(height: 16),
            Text(
              'Keine Aufträge in dieser Ansicht gefunden.',
              style: TextStyle(color: Colors.grey, fontSize: 16),
            ),
          ],
        ),
      );
    }

    return DashboardList(
      children: filteredOrders.map((order) => _buildOrderCard(order)).toList(),
    );
  }

  Widget _buildOrderCard(Order order) {
    final user = context.read<TaskiloUser?>();
    
    return DashboardCard(
      onTap: () {
        // Navigation zu Order Details
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => OrderDetailScreen(
              orderId: order.id,
              userId: user?.uid,
            ),
          ),
        );
      },
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Row
          Row(
            children: [
              Expanded(
                child: Text(
                  order.selectedSubcategory,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: _getStatusColor(order.status).withOpacity(0.3),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  _getStatusText(order.status),
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 8),

          // Provider Info
          Row(
            children: [
              const Icon(Icons.person, size: 16, color: Colors.white70),
              const SizedBox(width: 4),
              Text(
                order.providerName,
                style: const TextStyle(color: Colors.white70, fontSize: 14),
              ),
            ],
          ),

          const SizedBox(height: 8),

          // Project Name (if available)
          if (order.projectName != null && order.projectName!.isNotEmpty) ...[
            Row(
              children: [
                const Icon(Icons.folder, size: 16, color: Colors.white70),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    'Projekt: ${order.projectName}',
                    style: const TextStyle(color: Colors.white70, fontSize: 14),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
          ],

          // Bottom Row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                _formatPrice(order.totalAmountPaidByBuyerInCents, order.currency),
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: Colors.white,
                ),
              ),
              Row(
                children: [
                  const Icon(Icons.access_time, size: 16, color: Colors.white70),
                  const SizedBox(width: 4),
                  Text(
                    'Bestellt am ${_formatDate(order.paidAt)}',
                    style: const TextStyle(color: Colors.white70, fontSize: 12),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }
}
