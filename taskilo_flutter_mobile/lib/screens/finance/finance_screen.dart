import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../core/services/finance_service.dart';

class FinanceScreen extends StatefulWidget {
  const FinanceScreen({super.key});

  @override
  State<FinanceScreen> createState() => _FinanceScreenState();
}

class _FinanceScreenState extends State<FinanceScreen> with TickerProviderStateMixin {
  late TabController _tabController;
  final FinanceService _financeService = FinanceService();
  
  Map<String, dynamic> _dashboardData = {};
  List<Map<String, dynamic>> _invoices = [];
  List<Map<String, dynamic>> _expenses = [];
  List<Map<String, dynamic>> _customers = [];
  List<Map<String, dynamic>> _bankAccounts = [];
  
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 5, vsync: this);
    _loadFinanceData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadFinanceData() async {
    setState(() => _isLoading = true);
    
    try {
      final user = Provider.of<AuthProvider>(context, listen: false).user;
      if (user == null) return;

      final userId = user.id;
      final companyId = user.isCompany ? user.id : user.id; // Use user ID as company ID for now

      // Load dashboard data
      final dashboard = await _financeService.getFinanceDashboard(
        userId: userId,
        companyId: companyId,
      );

      // Load invoices
      final invoices = await _financeService.getInvoices(
        userId: userId,
        companyId: companyId,
      );

      // Load expenses
      final expenses = await _financeService.getExpenses(
        userId: userId,
        companyId: companyId,
      );

      // Load customers
      final customers = await _financeService.getCustomers(
        userId: userId,
        companyId: companyId,
      );

      // Load bank accounts
      final bankAccounts = await _financeService.getBankAccounts(
        userId: userId,
        companyId: companyId,
      );

      setState(() {
        _dashboardData = dashboard;
        _invoices = invoices;
        _expenses = expenses;
        _customers = customers;
        _bankAccounts = bankAccounts;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Fehler beim Laden der Finanzdaten: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        title: const Text(
          'Finanzen',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
        backgroundColor: const Color(0xFF14AD9F),
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.white),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadFinanceData,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF14AD9F)))
          : Column(
              children: [
                _buildFinanceSummary(),
                _buildTabBar(),
                Expanded(
                  child: TabBarView(
                    controller: _tabController,
                    children: [
                      _buildOverviewTab(),
                      _buildInvoicesTab(),
                      _buildExpensesTab(),
                      _buildCustomersTab(),
                      _buildAccountsTab(),
                    ],
                  ),
                ),
              ],
            ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showCreateInvoiceDialog,
        backgroundColor: const Color(0xFF14AD9F),
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('Rechnung erstellen', style: TextStyle(color: Colors.white)),
      ),
    );
  }

  Widget _buildFinanceSummary() {
    final totalRevenue = _dashboardData['totalRevenue'] ?? 0.0;
    final totalExpenses = _dashboardData['totalExpenses'] ?? 0.0;
    final profit = totalRevenue - totalExpenses;
    final openInvoices = _invoices.where((inv) => inv['status'] == 'open').length;

    return Container(
      padding: const EdgeInsets.all(16),
      color: const Color(0xFF14AD9F),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: _buildSummaryCard(
                  'Umsatz',
                  '€${totalRevenue.toStringAsFixed(2)}',
                  Icons.trending_up,
                  Colors.white,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildSummaryCard(
                  'Ausgaben',
                  '€${totalExpenses.toStringAsFixed(2)}',
                  Icons.trending_down,
                  Colors.white,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildSummaryCard(
                  'Gewinn',
                  '€${profit.toStringAsFixed(2)}',
                  Icons.account_balance_wallet,
                  profit >= 0 ? Colors.white : Colors.red[100]!,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildSummaryCard(
                  'Offene Rechnungen',
                  '$openInvoices',
                  Icons.receipt_long,
                  Colors.white,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryCard(String title, String value, IconData icon, Color backgroundColor) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: backgroundColor.withOpacity(0.2),
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

  Widget _buildTabBar() {
    return Container(
      margin: const EdgeInsets.all(16),
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
        labelStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 11),
        isScrollable: true,
        tabs: const [
          Tab(text: 'Übersicht', icon: Icon(Icons.dashboard, size: 18)),
          Tab(text: 'Rechnungen', icon: Icon(Icons.receipt, size: 18)),
          Tab(text: 'Ausgaben', icon: Icon(Icons.money_off, size: 18)),
          Tab(text: 'Kunden', icon: Icon(Icons.people, size: 18)),
          Tab(text: 'Konten', icon: Icon(Icons.account_balance, size: 18)),
        ],
      ),
    );
  }

  Widget _buildOverviewTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Finanz-Übersicht',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          _buildQuickStats(),
          const SizedBox(height: 24),
          _buildRecentTransactions(),
        ],
      ),
    );
  }

  Widget _buildQuickStats() {
    return Row(
      children: [
        Expanded(
          child: _buildStatCard(
            'Rechnungen diesen Monat',
            '${_invoices.where((inv) => _isThisMonth(inv['date'])).length}',
            Icons.receipt_long,
            Colors.blue,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildStatCard(
            'Ausgaben diesen Monat',
            '€${_expenses.where((exp) => _isThisMonth(exp['date'])).fold(0.0, (sum, exp) => sum + (exp['amount'] ?? 0.0)).toStringAsFixed(0)}',
            Icons.trending_down,
            Colors.red,
          ),
        ),
      ],
    );
  }

  Widget _buildStatCard(String title, String value, IconData icon, Color color) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, color: color, size: 24),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    title,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: Colors.grey[700],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              value,
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRecentTransactions() {
    final recentInvoices = _invoices.take(5).toList();
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Letzte Rechnungen',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 12),
        if (recentInvoices.isEmpty)
          const Center(
            child: Text(
              'Keine Rechnungen vorhanden',
              style: TextStyle(color: Colors.grey),
            ),
          )
        else
          ...recentInvoices.map((invoice) => _buildInvoiceListItem(invoice)),
      ],
    );
  }

  Widget _buildInvoicesTab() {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _invoices.length,
      itemBuilder: (context, index) {
        return _buildInvoiceCard(_invoices[index]);
      },
    );
  }

  Widget _buildInvoiceCard(Map<String, dynamic> invoice) {
    final status = invoice['status'] ?? 'unknown';
    final amount = invoice['amount'] ?? 0.0;
    final customerName = invoice['customerName'] ?? 'Unbekannter Kunde';
    final date = invoice['date'] ?? '';

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: _getStatusColor(status),
          child: Icon(_getStatusIcon(status), color: Colors.white),
        ),
        title: Text(
          customerName,
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Text('Datum: $date'),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              '€${amount.toStringAsFixed(2)}',
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 16,
                color: Color(0xFF14AD9F),
              ),
            ),
            Text(
              _getStatusText(status),
              style: TextStyle(
                fontSize: 12,
                color: _getStatusColor(status),
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
        onTap: () => _showInvoiceDetails(invoice),
      ),
    );
  }

  Widget _buildInvoiceListItem(Map<String, dynamic> invoice) {
    return _buildInvoiceCard(invoice);
  }

  Widget _buildExpensesTab() {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _expenses.length,
      itemBuilder: (context, index) {
        return _buildExpenseCard(_expenses[index]);
      },
    );
  }

  Widget _buildExpenseCard(Map<String, dynamic> expense) {
    final description = expense['description'] ?? 'Keine Beschreibung';
    final amount = expense['amount'] ?? 0.0;
    final date = expense['date'] ?? '';
    final category = expense['category'] ?? 'Allgemein';

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: Colors.red[100],
          child: const Icon(Icons.money_off, color: Colors.red),
        ),
        title: Text(
          description,
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Text('$category • $date'),
        trailing: Text(
          '€${amount.toStringAsFixed(2)}',
          style: const TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 16,
            color: Colors.red,
          ),
        ),
      ),
    );
  }

  Widget _buildCustomersTab() {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _customers.length,
      itemBuilder: (context, index) {
        return _buildCustomerCard(_customers[index]);
      },
    );
  }

  Widget _buildCustomerCard(Map<String, dynamic> customer) {
    final name = customer['name'] ?? 'Unbekannter Kunde';
    final email = customer['email'] ?? '';

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: const Color(0xFF14AD9F),
          child: Text(
            name.isNotEmpty ? name[0].toUpperCase() : '?',
            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
          ),
        ),
        title: Text(
          name,
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Text(email),
        trailing: const Icon(Icons.arrow_forward_ios),
        onTap: () => _showCustomerDetails(customer),
      ),
    );
  }

  Widget _buildAccountsTab() {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _bankAccounts.length,
      itemBuilder: (context, index) {
        return _buildBankAccountCard(_bankAccounts[index]);
      },
    );
  }

  Widget _buildBankAccountCard(Map<String, dynamic> account) {
    final bankName = account['bankName'] ?? 'Unbekannte Bank';
    final iban = account['iban'] ?? '';
    final balance = account['balance'] ?? 0.0;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ListTile(
        leading: const CircleAvatar(
          backgroundColor: Color(0xFF14AD9F),
          child: Icon(Icons.account_balance, color: Colors.white),
        ),
        title: Text(
          bankName,
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Text('IBAN: $iban'),
        trailing: Text(
          '€${balance.toStringAsFixed(2)}',
          style: const TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 16,
            color: Color(0xFF14AD9F),
          ),
        ),
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'paid':
        return Colors.green;
      case 'open':
        return Colors.orange;
      case 'overdue':
        return Colors.red;
      case 'draft':
        return Colors.blue;
      default:
        return Colors.grey;
    }
  }

  IconData _getStatusIcon(String status) {
    switch (status.toLowerCase()) {
      case 'paid':
        return Icons.check_circle;
      case 'open':
        return Icons.schedule;
      case 'overdue':
        return Icons.warning;
      case 'draft':
        return Icons.edit;
      default:
        return Icons.help;
    }
  }

  String _getStatusText(String status) {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'Bezahlt';
      case 'open':
        return 'Offen';
      case 'overdue':
        return 'Überfällig';
      case 'draft':
        return 'Entwurf';
      default:
        return status;
    }
  }

  bool _isThisMonth(String? dateString) {
    if (dateString == null) return false;
    
    try {
      final date = DateTime.parse(dateString);
      final now = DateTime.now();
      return date.year == now.year && date.month == now.month;
    } catch (e) {
      return false;
    }
  }

  void _showCreateInvoiceDialog() {
    // TODO: Implement create invoice dialog
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Rechnung erstellen'),
        content: const Text('Funktion wird in Kürze verfügbar sein.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  void _showInvoiceDetails(Map<String, dynamic> invoice) {
    // TODO: Implement invoice details dialog
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Rechnung #${invoice['id'] ?? 'N/A'}'),
        content: Text('Details für ${invoice['customerName'] ?? 'Unbekannter Kunde'}'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Schließen'),
          ),
        ],
      ),
    );
  }

  void _showCustomerDetails(Map<String, dynamic> customer) {
    // TODO: Implement customer details dialog
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(customer['name'] ?? 'Kunde'),
        content: Text('E-Mail: ${customer['email'] ?? 'Keine E-Mail'}'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Schließen'),
          ),
        ],
      ),
    );
  }
}
