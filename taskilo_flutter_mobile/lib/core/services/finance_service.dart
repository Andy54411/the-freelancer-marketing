import 'package:cloud_functions/cloud_functions.dart';

class FinanceService {
  final FirebaseFunctions _functions = FirebaseFunctions.instance;

  // Get finance dashboard data
  Future<Map<String, dynamic>> getFinanceDashboard({
    required String userId,
    required String companyId,
  }) async {
    try {
      final callable = _functions.httpsCallable('financeApi');
      final result = await callable.call({
        'action': 'dashboard',
        'userId': userId,
        'companyId': companyId,
      });

      return Map<String, dynamic>.from(result.data);
    } catch (e) {
      throw Exception('Failed to get finance dashboard: $e');
    }
  }

  // Get invoices
  Future<List<Map<String, dynamic>>> getInvoices({
    required String userId,
    required String companyId,
    String? status,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    try {
      final callable = _functions.httpsCallable('financeApi');
      final result = await callable.call({
        'action': 'getInvoices',
        'userId': userId,
        'companyId': companyId,
        'status': status,
        'startDate': startDate?.toIso8601String(),
        'endDate': endDate?.toIso8601String(),
      });

      final invoices = result.data['invoices'] as List;
      return invoices.map((invoice) => Map<String, dynamic>.from(invoice)).toList();
    } catch (e) {
      throw Exception('Failed to get invoices: $e');
    }
  }

  // Create invoice
  Future<Map<String, dynamic>> createInvoice({
    required String userId,
    required String companyId,
    required String customerName,
    required String customerEmail,
    required double amount,
    required String description,
    required List<Map<String, dynamic>> items,
    DateTime? dueDate,
  }) async {
    try {
      final callable = _functions.httpsCallable('financeApi');
      final result = await callable.call({
        'action': 'createInvoice',
        'userId': userId,
        'companyId': companyId,
        'customerName': customerName,
        'customerEmail': customerEmail,
        'amount': amount,
        'description': description,
        'items': items,
        'dueDate': dueDate?.toIso8601String(),
      });

      return Map<String, dynamic>.from(result.data);
    } catch (e) {
      throw Exception('Failed to create invoice: $e');
    }
  }

  // Update invoice
  Future<Map<String, dynamic>> updateInvoice({
    required String userId,
    required String companyId,
    required String invoiceId,
    required Map<String, dynamic> updateData,
  }) async {
    try {
      final callable = _functions.httpsCallable('financeApi');
      final result = await callable.call({
        'action': 'updateInvoice',
        'userId': userId,
        'companyId': companyId,
        'invoiceId': invoiceId,
        'updateData': updateData,
      });

      return Map<String, dynamic>.from(result.data);
    } catch (e) {
      throw Exception('Failed to update invoice: $e');
    }
  }

  // Send invoice
  Future<Map<String, dynamic>> sendInvoice({
    required String userId,
    required String companyId,
    required String invoiceId,
    String? emailSubject,
    String? emailMessage,
  }) async {
    try {
      final callable = _functions.httpsCallable('financeApi');
      final result = await callable.call({
        'action': 'sendInvoice',
        'userId': userId,
        'companyId': companyId,
        'invoiceId': invoiceId,
        'emailSubject': emailSubject,
        'emailMessage': emailMessage,
      });

      return Map<String, dynamic>.from(result.data);
    } catch (e) {
      throw Exception('Failed to send invoice: $e');
    }
  }

  // Get customers
  Future<List<Map<String, dynamic>>> getCustomers({
    required String userId,
    required String companyId,
  }) async {
    try {
      final callable = _functions.httpsCallable('financeApi');
      final result = await callable.call({
        'action': 'getCustomers',
        'userId': userId,
        'companyId': companyId,
      });

      final customers = result.data['customers'] as List;
      return customers.map((customer) => Map<String, dynamic>.from(customer)).toList();
    } catch (e) {
      throw Exception('Failed to get customers: $e');
    }
  }

  // Add customer
  Future<Map<String, dynamic>> addCustomer({
    required String userId,
    required String companyId,
    required String name,
    required String email,
    String? phone,
    String? address,
    Map<String, dynamic>? additionalData,
  }) async {
    try {
      final callable = _functions.httpsCallable('financeApi');
      final result = await callable.call({
        'action': 'addCustomer',
        'userId': userId,
        'companyId': companyId,
        'name': name,
        'email': email,
        'phone': phone,
        'address': address,
        'additionalData': additionalData,
      });

      return Map<String, dynamic>.from(result.data);
    } catch (e) {
      throw Exception('Failed to add customer: $e');
    }
  }

  // Get expenses
  Future<List<Map<String, dynamic>>> getExpenses({
    required String userId,
    required String companyId,
    DateTime? startDate,
    DateTime? endDate,
    String? category,
  }) async {
    try {
      final callable = _functions.httpsCallable('financeApi');
      final result = await callable.call({
        'action': 'getExpenses',
        'userId': userId,
        'companyId': companyId,
        'startDate': startDate?.toIso8601String(),
        'endDate': endDate?.toIso8601String(),
        'category': category,
      });

      final expenses = result.data['expenses'] as List;
      return expenses.map((expense) => Map<String, dynamic>.from(expense)).toList();
    } catch (e) {
      throw Exception('Failed to get expenses: $e');
    }
  }

  // Add expense
  Future<Map<String, dynamic>> addExpense({
    required String userId,
    required String companyId,
    required String description,
    required double amount,
    required String category,
    DateTime? date,
    String? receipt,
  }) async {
    try {
      final callable = _functions.httpsCallable('financeApi');
      final result = await callable.call({
        'action': 'addExpense',
        'userId': userId,
        'companyId': companyId,
        'description': description,
        'amount': amount,
        'category': category,
        'date': date?.toIso8601String(),
        'receipt': receipt,
      });

      return Map<String, dynamic>.from(result.data);
    } catch (e) {
      throw Exception('Failed to add expense: $e');
    }
  }

  // Get bank accounts
  Future<List<Map<String, dynamic>>> getBankAccounts({
    required String userId,
    required String companyId,
  }) async {
    try {
      final callable = _functions.httpsCallable('financeApi');
      final result = await callable.call({
        'action': 'getBankAccounts',
        'userId': userId,
        'companyId': companyId,
      });

      final accounts = result.data['bankAccounts'] as List;
      return accounts.map((account) => Map<String, dynamic>.from(account)).toList();
    } catch (e) {
      throw Exception('Failed to get bank accounts: $e');
    }
  }

  // Add bank account
  Future<Map<String, dynamic>> addBankAccount({
    required String userId,
    required String companyId,
    required String bankName,
    required String iban,
    String? bic,
    String? accountHolder,
  }) async {
    try {
      final callable = _functions.httpsCallable('financeApi');
      final result = await callable.call({
        'action': 'addBankAccount',
        'userId': userId,
        'companyId': companyId,
        'bankName': bankName,
        'iban': iban,
        'bic': bic,
        'accountHolder': accountHolder,
      });

      return Map<String, dynamic>.from(result.data);
    } catch (e) {
      throw Exception('Failed to add bank account: $e');
    }
  }

  // Get recurring invoices
  Future<List<Map<String, dynamic>>> getRecurringInvoices({
    required String userId,
    required String companyId,
  }) async {
    try {
      final callable = _functions.httpsCallable('financeApi');
      final result = await callable.call({
        'action': 'getRecurringInvoices',
        'userId': userId,
        'companyId': companyId,
      });

      final invoices = result.data['recurringInvoices'] as List;
      return invoices.map((invoice) => Map<String, dynamic>.from(invoice)).toList();
    } catch (e) {
      throw Exception('Failed to get recurring invoices: $e');
    }
  }

  // Create recurring invoice
  Future<Map<String, dynamic>> createRecurringInvoice({
    required String userId,
    required String companyId,
    required String templateName,
    required String frequency,
    required Map<String, dynamic> invoiceTemplate,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    try {
      final callable = _functions.httpsCallable('financeApi');
      final result = await callable.call({
        'action': 'createRecurringInvoice',
        'userId': userId,
        'companyId': companyId,
        'templateName': templateName,
        'frequency': frequency,
        'invoiceTemplate': invoiceTemplate,
        'startDate': startDate?.toIso8601String(),
        'endDate': endDate?.toIso8601String(),
      });

      return Map<String, dynamic>.from(result.data);
    } catch (e) {
      throw Exception('Failed to create recurring invoice: $e');
    }
  }

  // Get financial reports
  Future<Map<String, dynamic>> getFinancialReports({
    required String userId,
    required String companyId,
    required String reportType, // 'income', 'expense', 'profit_loss', 'balance'
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    try {
      final callable = _functions.httpsCallable('financeApi');
      final result = await callable.call({
        'action': 'getReports',
        'userId': userId,
        'companyId': companyId,
        'reportType': reportType,
        'startDate': startDate?.toIso8601String(),
        'endDate': endDate?.toIso8601String(),
      });

      return Map<String, dynamic>.from(result.data);
    } catch (e) {
      throw Exception('Failed to get financial reports: $e');
    }
  }

  // Calculate taxes
  Future<Map<String, dynamic>> calculateTaxes({
    required String userId,
    required String companyId,
    required int year,
    String? quarter,
  }) async {
    try {
      final callable = _functions.httpsCallable('financeApi');
      final result = await callable.call({
        'action': 'calculateTaxes',
        'userId': userId,
        'companyId': companyId,
        'year': year,
        'quarter': quarter,
      });

      return Map<String, dynamic>.from(result.data);
    } catch (e) {
      throw Exception('Failed to calculate taxes: $e');
    }
  }

  // Export data
  Future<Map<String, dynamic>> exportFinanceData({
    required String userId,
    required String companyId,
    required String exportType, // 'csv', 'pdf', 'excel'
    required String dataType, // 'invoices', 'expenses', 'customers'
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    try {
      final callable = _functions.httpsCallable('financeApi');
      final result = await callable.call({
        'action': 'exportData',
        'userId': userId,
        'companyId': companyId,
        'exportType': exportType,
        'dataType': dataType,
        'startDate': startDate?.toIso8601String(),
        'endDate': endDate?.toIso8601String(),
      });

      return Map<String, dynamic>.from(result.data);
    } catch (e) {
      throw Exception('Failed to export finance data: $e');
    }
  }
}
