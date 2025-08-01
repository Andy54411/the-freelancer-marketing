import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../shared/models/order_model.dart';

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> with TickerProviderStateMixin {
  late TabController _tabController;
  
  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Meine Aufträge'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0,
        bottom: TabBar(
          controller: _tabController,
          labelColor: Theme.of(context).primaryColor,
          unselectedLabelColor: Colors.grey,
          indicatorColor: Theme.of(context).primaryColor,
          tabs: const [
            Tab(text: 'Alle'),
            Tab(text: 'Aktiv'),
            Tab(text: 'Geplant'),
            Tab(text: 'Abgeschlossen'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildOrderList('all'),
          _buildOrderList('active'),
          _buildOrderList('scheduled'),
          _buildOrderList('completed'),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          Get.toNamed('/services');
        },
        child: const Icon(Icons.add),
      ),
    );
  }

  Widget _buildOrderList(String status) {
    // TODO: Load actual orders from Firebase
    final dummyOrders = _getDummyOrders(status);
    
    if (dummyOrders.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.inbox_rounded,
              size: 80,
              color: Colors.grey[400],
            ),
            const SizedBox(height: 16),
            Text(
              'Keine Aufträge gefunden',
              style: TextStyle(
                fontSize: 18,
                color: Colors.grey[600],
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Buchen Sie einen Service um loszulegen',
              style: TextStyle(
                color: Colors.grey[500],
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () => Get.toNamed('/services'),
              child: const Text('Services durchsuchen'),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: dummyOrders.length,
      itemBuilder: (context, index) {
        final order = dummyOrders[index];
        return _buildOrderCard(order);
      },
    );
  }

  Widget _buildOrderCard(OrderModel order) {
    Color statusColor = _getStatusColor(order.status);
    IconData statusIcon = _getStatusIcon(order.status);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: () => _showOrderDetails(order),
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
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: statusColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(
                      statusIcon,
                      color: statusColor,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          order.serviceName,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        if (order.providerName != null) ...[
                          const SizedBox(height: 4),
                          Text(
                            'von ${order.providerName}',
                            style: TextStyle(
                              color: Colors.grey[600],
                              fontSize: 14,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: statusColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      _getStatusText(order.status),
                      style: TextStyle(
                        color: statusColor,
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
              
              const SizedBox(height: 12),
              
              if (order.scheduledDate != null) ...[
                Row(
                  children: [
                    Icon(
                      Icons.calendar_today,
                      size: 16,
                      color: Colors.grey[600],
                    ),
                    const SizedBox(width: 4),
                    Text(
                      _formatDate(order.scheduledDate!),
                      style: TextStyle(
                        color: Colors.grey[600],
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
              ],
              
              if (order.location != null) ...[
                Row(
                  children: [
                    Icon(
                      Icons.location_on,
                      size: 16,
                      color: Colors.grey[600],
                    ),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        order.location!,
                        style: TextStyle(
                          color: Colors.grey[600],
                          fontSize: 14,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
              ],
              
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  if (order.totalAmount != null)
                    Text(
                      '€${order.totalAmount!.toStringAsFixed(2)}',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Colors.green,
                      ),
                    ),
                  Row(
                    children: [
                      if (order.status == 'active' || order.status == 'scheduled') ...[
                        TextButton.icon(
                          onPressed: () => _contactProvider(order),
                          icon: const Icon(Icons.chat, size: 16),
                          label: const Text('Chat'),
                        ),
                        const SizedBox(width: 8),
                      ],
                      TextButton(
                        onPressed: () => _showOrderDetails(order),
                        child: const Text('Details'),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'active':
        return Colors.orange;
      case 'scheduled':
        return Colors.blue;
      case 'completed':
        return Colors.green;
      case 'cancelled':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  IconData _getStatusIcon(String status) {
    switch (status) {
      case 'active':
        return Icons.work;
      case 'scheduled':
        return Icons.schedule;
      case 'completed':
        return Icons.check_circle;
      case 'cancelled':
        return Icons.cancel;
      default:
        return Icons.info;
    }
  }

  String _getStatusText(String status) {
    switch (status) {
      case 'active':
        return 'In Bearbeitung';
      case 'scheduled':
        return 'Geplant';
      case 'completed':
        return 'Abgeschlossen';
      case 'cancelled':
        return 'Storniert';
      default:
        return 'Unbekannt';
    }
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final yesterday = today.subtract(const Duration(days: 1));
    final tomorrow = today.add(const Duration(days: 1));
    final orderDate = DateTime(date.year, date.month, date.day);

    if (orderDate == today) {
      return 'Heute, ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
    } else if (orderDate == tomorrow) {
      return 'Morgen, ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
    } else if (orderDate == yesterday) {
      return 'Gestern, ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
    } else {
      return '${date.day}.${date.month}.${date.year}, ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
    }
  }

  void _showOrderDetails(OrderModel order) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _buildOrderDetailsSheet(order),
    );
  }

  Widget _buildOrderDetailsSheet(OrderModel order) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.8,
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
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: _getStatusColor(order.status).withOpacity(0.1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(
                          _getStatusIcon(order.status),
                          color: _getStatusColor(order.status),
                          size: 24,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              order.serviceName,
                              style: const TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            Text(
                              _getStatusText(order.status),
                              style: TextStyle(
                                color: _getStatusColor(order.status),
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  
                  const SizedBox(height: 24),
                  
                  if (order.description != null) ...[
                    Text(
                      'Beschreibung',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(order.description!),
                    const SizedBox(height: 16),
                  ],
                  
                  if (order.scheduledDate != null) ...[
                    _buildDetailRow(
                      icon: Icons.calendar_today,
                      title: 'Termin',
                      value: _formatDate(order.scheduledDate!),
                    ),
                    const SizedBox(height: 12),
                  ],
                  
                  if (order.location != null) ...[
                    _buildDetailRow(
                      icon: Icons.location_on,
                      title: 'Ort',
                      value: order.location!,
                    ),
                    const SizedBox(height: 12),
                  ],
                  
                  if (order.providerName != null) ...[
                    _buildDetailRow(
                      icon: Icons.person,
                      title: 'Dienstleister',
                      value: order.providerName!,
                    ),
                    const SizedBox(height: 12),
                  ],
                  
                  if (order.totalAmount != null) ...[
                    _buildDetailRow(
                      icon: Icons.euro,
                      title: 'Gesamtbetrag',
                      value: '€${order.totalAmount!.toStringAsFixed(2)}',
                    ),
                    const SizedBox(height: 12),
                  ],
                  
                  _buildDetailRow(
                    icon: Icons.info,
                    title: 'Auftrags-ID',
                    value: order.id,
                  ),
                  
                  const SizedBox(height: 32),
                  
                  if (order.status == 'active' || order.status == 'scheduled') ...[
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        onPressed: () {
                          Get.back();
                          _contactProvider(order);
                        },
                        icon: const Icon(Icons.chat),
                        label: const Text('Mit Dienstleister chatten'),
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],
                  
                  if (order.status == 'completed') ...[
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        onPressed: () {
                          Get.back();
                          _rateService(order);
                        },
                        icon: const Icon(Icons.star),
                        label: const Text('Service bewerten'),
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],
                  
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: () {
                        Get.back();
                        _reorderService(order);
                      },
                      icon: const Icon(Icons.refresh),
                      label: const Text('Erneut buchen'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailRow({
    required IconData icon,
    required String title,
    required String value,
  }) {
    return Row(
      children: [
        Icon(
          icon,
          size: 20,
          color: Colors.grey[600],
        ),
        const SizedBox(width: 12),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey[600],
              ),
            ),
            Text(
              value,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ],
    );
  }

  void _contactProvider(OrderModel order) {
    Get.toNamed('/chat', arguments: {'orderId': order.id});
  }

  void _rateService(OrderModel order) {
    // TODO: Implement service rating
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Bewertungsfunktion wird implementiert')),
    );
  }

  void _reorderService(OrderModel order) {
    Get.toNamed('/services', arguments: {'serviceId': order.serviceId});
  }

  List<OrderModel> _getDummyOrders(String status) {
    final allOrders = [
      OrderModel(
        id: '1',
        serviceId: 'service1',
        serviceName: 'Hausreinigung',
        status: 'active',
        scheduledDate: DateTime.now().add(const Duration(hours: 2)),
        location: 'Musterstraße 123, 12345 Berlin',
        totalAmount: 75.0,
        providerName: 'Reinigungsservice Schmidt',
        description: 'Grundreinigung der Wohnung inklusive Badezimmer und Küche',
      ),
      OrderModel(
        id: '2',
        serviceId: 'service2',
        serviceName: 'Gartenpflege',
        status: 'scheduled',
        scheduledDate: DateTime.now().add(const Duration(days: 2)),
        location: 'Gartenstraße 45, 12345 Berlin',
        totalAmount: 120.0,
        providerName: 'Grün & Schön GmbH',
        description: 'Rasenmähen und Heckenschnitt',
      ),
      OrderModel(
        id: '3',
        serviceId: 'service3',
        serviceName: 'Handwerker Service',
        status: 'completed',
        scheduledDate: DateTime.now().subtract(const Duration(days: 1)),
        location: 'Bahnhofstraße 78, 12345 Berlin',
        totalAmount: 95.0,
        providerName: 'Fix-It Handwerker',
        description: 'Reparatur der Wasserhähne in der Küche',
      ),
      OrderModel(
        id: '4',
        serviceId: 'service4',
        serviceName: 'Computerhilfe',
        status: 'completed',
        scheduledDate: DateTime.now().subtract(const Duration(days: 5)),
        location: 'Online Service',
        totalAmount: 50.0,
        providerName: 'Tech Support Pro',
        description: 'Installation und Einrichtung neuer Software',
      ),
    ];

    if (status == 'all') return allOrders;
    return allOrders.where((order) => order.status == status).toList();
  }
}
