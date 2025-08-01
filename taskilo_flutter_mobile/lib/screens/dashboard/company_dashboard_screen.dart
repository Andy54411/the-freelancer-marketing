import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/order_provider.dart';
import '../../core/models/order_model.dart';
import '../../core/models/time_tracking_model.dart';
import '../../core/services/order_service.dart';
import '../../core/services/time_tracking_service.dart';
import '../../core/services/review_service.dart';
import '../../core/services/finance_service.dart';
import '../../core/services/stripe_service.dart';
import '../../core/services/chatbot_service.dart';
import '../../core/services/general_service.dart';
import '../../core/services/invite_service.dart';
import '../orders/order_detail_screen.dart';
import '../time_tracking/time_tracking_screen.dart';
import '../finance/finance_screen.dart';
import '../support/support_chat_screen.dart';

class CompanyDashboardScreen extends StatefulWidget {
  const CompanyDashboardScreen({super.key});

  @override
  State<CompanyDashboardScreen> createState() => _CompanyDashboardScreenState();
}

class _CompanyDashboardScreenState extends State<CompanyDashboardScreen> with TickerProviderStateMixin {
  late TabController _tabController;
  final OrderService _orderService = OrderService();
  final TimeTrackingService _timeTrackingService = TimeTrackingService();
  final ReviewService _reviewService = ReviewService();
  final FinanceService _financeService = FinanceService();
  final StripeService _stripeService = StripeService();
  final ChatbotService _chatbotService = ChatbotService();
  final GeneralService _generalService = GeneralService();
  final InviteService _inviteService = InviteService();
  
  List<OrderModel> _pendingOrders = [];
  List<OrderModel> _activeOrders = [];
  List<OrderModel> _completedOrders = [];
  List<TimeTrackingModel> _timeTracking = [];
  List<Map<String, dynamic>> _reviews = [];
  Map<String, dynamic>? _stripeAccountStatus;
  Map<String, dynamic>? _financeData;
  Map<String, dynamic> _financeData = {};
  Map<String, dynamic> _stripeAccountStatus = {};
  
  bool _isLoading = true;
  
  Map<String, dynamic> _stats = {
    'totalEarnings': 0.0,
    'pendingEarnings': 0.0,
    'completedOrders': 0,
    'activeOrders': 0,
    'totalHours': 0.0,
    'rating': 0.0,
    'totalReviews': 0,
    'monthlyRevenue': 0.0,
    'stripeEnabled': false,
  };

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 6, vsync: this);
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

      // Load orders
      final orders = await _orderService.getProviderOrders(userId);
      
      // Load time tracking
      final timeEntries = await _timeTrackingService.getTimeEntriesForProvider(userId);
      
      // Load reviews
      final reviews = await _reviewService.getReviewsByProvider(userId);
      
      // Load Stripe account status
      final stripeStatus = await _stripeService.getStripeAccountStatus();
      
      // Load finance data
      final financeData = await _financeService.getFinanceDashboard(
        userId: userId,
        companyId: userId,
      );
      
      setState(() {
        _pendingOrders = orders.where((o) => o.status == 'pending').toList();
        _activeOrders = orders.where((o) => ['accepted', 'in_progress'].contains(o.status)).toList();
        _completedOrders = orders.where((o) => o.status == 'completed').toList();
        _timeTracking = timeEntries;
        _reviews = reviews;
        _stripeAccountStatus = stripeStatus;
        _financeData = financeData;
        
        _calculateStats();
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

  void _calculateStats() {
    double totalEarnings = 0.0;
    double pendingEarnings = 0.0;
    double totalHours = 0.0;
    
    for (final order in _completedOrders) {
      totalEarnings += order.price ?? 0.0;
    }
    
    for (final order in _activeOrders) {
      pendingEarnings += order.price ?? 0.0;
    }
    
    for (final timeEntry in _timeTracking) {
      totalHours += timeEntry.totalHours;
    }
    
    _stats = {
      'totalEarnings': totalEarnings,
      'pendingEarnings': pendingEarnings,
      'completedOrders': _completedOrders.length,
      'activeOrders': _activeOrders.length,
      'totalHours': totalHours,
      'rating': 4.8, // TODO: Get actual rating from user profile
    };
  }

  @override
  Widget build(BuildContext context) {
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
                    title: const Text(
                      'Anbieter Dashboard',
                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                    ),
                    background: _buildHeaderStats(),
                  ),
                ),
                SliverToBoxAdapter(
                  child: Column(
                    children: [
                      _buildQuickActions(),
                      const SizedBox(height: 16),
                      _buildTabBar(),
                    ],
                  ),
                ),
                SliverFillRemaining(
                  child: TabBarView(
                    controller: _tabController,
                    children: [
                      _buildPendingOrdersTab(),
                      _buildActiveOrdersTab(),
                      _buildCompletedOrdersTab(),
                      _buildTimeTrackingTab(),
                      _buildReviewsTab(),
                      _buildFinanceTab(),
                    ],
                  ),
                ),
              ],
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
                  'Gesamteinnahmen',
                  '€${_stats['totalEarnings'].toStringAsFixed(2)}',
                  Icons.euro,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildStatCard(
                  'Laufende Aufträge',
                  '${_stats['activeOrders']}',
                  Icons.work,
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
      child: Row(
        children: [
          Expanded(
            child: _buildActionButton(
              'Zeit erfassen',
              Icons.access_time,
              () => Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const TimeTrackingScreen()),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _buildActionButton(
              'Finanzen',
              Icons.account_balance_wallet,
              () => Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const FinanceScreen()),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _buildActionButton(
              'Support Chat',
              Icons.chat_outlined,
              () => Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const SupportChatScreen()),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _buildActionButton(
              'Bewertungen',
              Icons.star_outline,
              () {
                // Navigate to reviews
                _tabController.animateTo(4); // Switch to reviews tab
              },
            ),
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
              Icon(icon, color: const Color(0xFF14AD9F), size: 24),
              const SizedBox(height: 4),
              Text(
                title,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
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
        labelStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12),
        tabs: [
          Tab(
            text: 'Anfragen (${_pendingOrders.length})',
            icon: const Icon(Icons.mail_outline, size: 18),
          ),
          Tab(
            text: 'Aktiv (${_activeOrders.length})',
            icon: const Icon(Icons.work_outline, size: 18),
          ),
          Tab(
            text: 'Abgeschlossen (${_completedOrders.length})',
            icon: const Icon(Icons.check_circle_outline, size: 18),
          ),
          Tab(
            text: 'Zeiterfassung',
            icon: const Icon(Icons.schedule, size: 18),
          ),
          Tab(
            text: 'Bewertungen',
            icon: const Icon(Icons.star_outline, size: 18),
          ),
          Tab(
            text: 'Finanzen',
            icon: const Icon(Icons.account_balance_wallet_outlined, size: 18),
          ),
        ],
      ),
    );
  }

  Widget _buildPendingOrdersTab() {
    if (_pendingOrders.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.mail_outline, size: 64, color: Colors.grey),
            SizedBox(height: 16),
            Text(
              'Keine neuen Anfragen',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w500),
            ),
            Text(
              'Neue Aufträge erscheinen hier',
              style: TextStyle(color: Colors.grey),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _pendingOrders.length,
      itemBuilder: (context, index) {
        final order = _pendingOrders[index];
        return _buildOrderCard(order, isPending: true);
      },
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
              'Angenommene Aufträge erscheinen hier',
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
        return _buildOrderCard(order);
      },
    );
  }

  Widget _buildTimeTrackingTab() {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _timeTracking.length,
      itemBuilder: (context, index) {
        final timeEntry = _timeTracking[index];
        return _buildTimeTrackingCard(timeEntry);
      },
    );
  }

  Widget _buildOrderCard(OrderModel order, {bool isPending = false}) {
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
              if (isPending) ...[
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () => _handleOrderAction(order, 'accept'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF14AD9F),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                        child: const Text('Annehmen'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => _handleOrderAction(order, 'reject'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.red,
                          side: const BorderSide(color: Colors.red),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                        child: const Text('Ablehnen'),
                      ),
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

  Widget _buildTimeTrackingCard(TimeTrackingModel timeEntry) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    'Auftrag: ${timeEntry.orderId}',
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ),
                _buildStatusChip(timeEntry.status),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Icon(Icons.access_time, size: 16, color: Colors.grey[600]),
                const SizedBox(width: 4),
                Text('${timeEntry.totalHours.toStringAsFixed(1)} Stunden'),
                const Spacer(),
                if (timeEntry.hourlyRate != null) ...[
                  Icon(Icons.euro, size: 16, color: Colors.grey[600]),
                  const SizedBox(width: 4),
                  Text(
                    '${(timeEntry.totalHours * timeEntry.hourlyRate!).toStringAsFixed(2)}',
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF14AD9F),
                    ),
                  ),
                ],
              ],
            ),
            if (timeEntry.description?.isNotEmpty == true) ...[
              const SizedBox(height: 8),
              Text(
                timeEntry.description!,
                style: TextStyle(color: Colors.grey[700]),
              ),
            ],
          ],
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

  Future<void> _handleOrderAction(OrderModel order, String action) async {
    try {
      if (action == 'accept') {
        await _orderService.acceptOrder(order.id);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Auftrag angenommen')),
        );
      } else if (action == 'reject') {
        await _orderService.rejectOrder(order.id);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Auftrag abgelehnt')),
        );
      }
      
      _loadDashboardData(); // Reload data
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Fehler: $e')),
      );
    }
  }

  Widget _buildReviewsTab() {
    if (_reviews.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.star_outline, size: 64, color: Colors.grey),
            SizedBox(height: 16),
            Text(
              'Noch keine Bewertungen',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w500),
            ),
            SizedBox(height: 8),
            Text(
              'Bewertungen erscheinen hier nach\nabgeschlossenen Aufträgen',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey, fontSize: 14),
            ),
          ],
        ),
      );
    }

    return Container(
      margin: const EdgeInsets.all(16),
      child: Column(
        children: [
          // Review Statistics
          Container(
            padding: const EdgeInsets.all(16),
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
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    children: [
                      Text(
                        '${_stats['rating']?.toStringAsFixed(1) ?? '0.0'}',
                        style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                      ),
                      const Text('Durchschnitt', style: TextStyle(color: Colors.grey)),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: List.generate(5, (index) {
                          return Icon(
                            index < (_stats['rating']?.floor() ?? 0)
                                ? Icons.star
                                : Icons.star_outline,
                            color: Colors.amber,
                            size: 16,
                          );
                        }),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: Column(
                    children: [
                      Text(
                        '${_stats['totalReviews'] ?? 0}',
                        style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                      ),
                      const Text('Bewertungen', style: TextStyle(color: Colors.grey)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          
          const SizedBox(height: 16),
          
          // Recent Reviews
          Expanded(
            child: ListView.builder(
              itemCount: _reviews.length,
              itemBuilder: (context, index) {
                final review = _reviews[index];
                return Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(16),
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
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          CircleAvatar(
                            radius: 20,
                            backgroundColor: Colors.grey[300],
                            child: Text(
                              review['customerName']?[0]?.toUpperCase() ?? '?',
                              style: const TextStyle(fontWeight: FontWeight.bold),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  review['customerName'] ?? 'Unbekannt',
                                  style: const TextStyle(fontWeight: FontWeight.w600),
                                ),
                                Row(
                                  children: [
                                    ...List.generate(5, (starIndex) {
                                      return Icon(
                                        starIndex < (review['rating'] ?? 0)
                                            ? Icons.star
                                            : Icons.star_outline,
                                        color: Colors.amber,
                                        size: 16,
                                      );
                                    }),
                                    const SizedBox(width: 8),
                                    Text(
                                      '${review['rating'] ?? 0}/5',
                                      style: const TextStyle(color: Colors.grey, fontSize: 12),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                          Text(
                            review['createdAt'] ?? '',
                            style: const TextStyle(color: Colors.grey, fontSize: 12),
                          ),
                        ],
                      ),
                      if (review['comment']?.isNotEmpty == true) ...[
                        const SizedBox(height: 12),
                        Text(
                          review['comment'],
                          style: const TextStyle(fontSize: 14),
                        ),
                      ],
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFinanceTab() {
    return Container(
      margin: const EdgeInsets.all(16),
      child: Column(
        children: [
          // Finance Overview
          Container(
            padding: const EdgeInsets.all(16),
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
            child: Column(
              children: [
                Row(
                  children: [
                    const Icon(Icons.account_balance_wallet, color: Color(0xFF14AD9F)),
                    const SizedBox(width: 8),
                    const Text(
                      'Finanzübersicht',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: _buildFinanceStatCard(
                        'Gesamteinnahmen',
                        '€${_stats['totalEarnings']?.toStringAsFixed(2) ?? '0.00'}',
                        Icons.trending_up,
                        Colors.green,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildFinanceStatCard(
                        'Ausstehend',
                        '€${_stats['pendingEarnings']?.toStringAsFixed(2) ?? '0.00'}',
                        Icons.schedule,
                        Colors.orange,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: _buildFinanceStatCard(
                        'Stripe-Status',
                        _stripeAccountStatus?['enabled'] == true ? 'Aktiv' : 'Inaktiv',
                        Icons.payment,
                        _stripeAccountStatus?['enabled'] == true ? Colors.green : Colors.red,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildFinanceStatCard(
                        'Stunden gesamt',
                        '${_stats['totalHours']?.toStringAsFixed(1) ?? '0.0'}h',
                        Icons.access_time,
                        const Color(0xFF14AD9F),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          
          const SizedBox(height: 16),
          
          // Quick Actions
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () {
                    Navigator.pushNamed(context, '/finance');
                  },
                  icon: const Icon(Icons.analytics_outlined),
                  label: const Text('Detailansicht'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF14AD9F),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _stripeAccountStatus?['enabled'] == true 
                      ? () {
                          // Open Stripe dashboard
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Stripe Dashboard wird geöffnet...')),
                          );
                        }
                      : () {
                          // Setup Stripe account
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Stripe-Konto einrichten...')),
                          );
                        },
                  icon: Icon(_stripeAccountStatus?['enabled'] == true 
                      ? Icons.open_in_new 
                      : Icons.settings),
                  label: Text(_stripeAccountStatus?['enabled'] == true 
                      ? 'Stripe Dashboard' 
                      : 'Stripe einrichten'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFF14AD9F),
                    side: const BorderSide(color: Color(0xFF14AD9F)),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                ),
              ),
            ],
          ),
          
          const SizedBox(height: 16),
          
          // Recent Transactions (if available)
          if (_financeData?['recentTransactions'] != null)
            Expanded(
              child: Container(
                padding: const EdgeInsets.all(16),
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
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Letzte Transaktionen',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 12),
                    Expanded(
                      child: ListView.builder(
                        itemCount: (_financeData!['recentTransactions'] as List).length,
                        itemBuilder: (context, index) {
                          final transaction = _financeData!['recentTransactions'][index];
                          return ListTile(
                            leading: CircleAvatar(
                              backgroundColor: transaction['type'] == 'income'
                                  ? Colors.green.withOpacity(0.2)
                                  : Colors.red.withOpacity(0.2),
                              child: Icon(
                                transaction['type'] == 'income'
                                    ? Icons.add
                                    : Icons.remove,
                                color: transaction['type'] == 'income'
                                    ? Colors.green
                                    : Colors.red,
                              ),
                            ),
                            title: Text(transaction['description'] ?? 'Transaktion'),
                            subtitle: Text(transaction['date'] ?? ''),
                            trailing: Text(
                              '${transaction['type'] == 'income' ? '+' : '-'}€${transaction['amount']?.toStringAsFixed(2) ?? '0.00'}',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: transaction['type'] == 'income'
                                    ? Colors.green
                                    : Colors.red,
                              ),
                            ),
                          );
                        },
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

  Widget _buildFinanceStatCard(String title, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          Text(
            title,
            style: const TextStyle(
              fontSize: 10,
              color: Colors.grey,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}
