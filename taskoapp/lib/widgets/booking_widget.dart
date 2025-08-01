import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/user_model.dart';
import '../services/taskilo_service.dart';
import '../services/payment_service.dart';
import '../utils/app_theme.dart';

/// Booking Widget für alle 3 Payment-Systeme
/// B2C Festpreis, B2B Projekt, Stunden-Abrechnung
class BookingWidget extends StatefulWidget {
  final TaskiloUser provider;
  final String serviceTitle;
  final String serviceDescription;
  final BookingType bookingType;

  const BookingWidget({
    super.key,
    required this.provider,
    required this.serviceTitle,
    required this.serviceDescription,
    required this.bookingType,
  });

  @override
  State<BookingWidget> createState() => _BookingWidgetState();
}

class _BookingWidgetState extends State<BookingWidget> {
  final _formKey = GlobalKey<FormState>();
  final _amountController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _notesController = TextEditingController();
  
  bool _isProcessing = false;
  BookingStep _currentStep = BookingStep.details;
  
  // B2B Projekt Daten
  final List<ProjectMilestone> _milestones = [];
  final _milestoneControllers = <Map<String, TextEditingController>>[];
  
  // Stunden-Abrechnung Daten
  double _hourlyRate = 50.0;
  double _estimatedHours = 1.0;

  @override
  void initState() {
    super.initState();
    _descriptionController.text = widget.serviceDescription;
    
    // Setup basierend auf Booking Type
    switch (widget.bookingType) {
      case BookingType.b2c:
        _amountController.text = '50.00';
        break;
      case BookingType.b2b:
        _amountController.text = '500.00';
        _addMilestone(); // Erster Meilenstein
        break;
      case BookingType.hourly:
        // Hourly Rate aus Provider Profile laden (Standard: 50€)
        _hourlyRate = _getHourlyRateFromProvider();
        break;
    }
  }

  @override
  void dispose() {
    _amountController.dispose();
    _descriptionController.dispose();
    _notesController.dispose();
    for (final controllers in _milestoneControllers) {
      for (final controller in controllers.values) {
        controller.dispose();
      }
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<TaskiloUser?>();
    
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: 20,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Header
          _buildHeader(),
          
          // Content basierend auf Step
          Flexible(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Form(
                key: _formKey,
                child: _buildCurrentStep(),
              ),
            ),
          ),
          
          // Action Buttons
          _buildActionButtons(user),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            const Color(0xFF14ad9f),
            const Color(0xFF0f9d84),
          ],
        ),
        borderRadius: const BorderRadius.only(
          topLeft: Radius.circular(16),
          topRight: Radius.circular(16),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 30,
                backgroundImage: widget.provider.photoURL != null
                    ? NetworkImage(widget.provider.photoURL!)
                    : null,
                backgroundColor: Colors.white.withValues(alpha: 0.2),
                child: widget.provider.photoURL == null
                    ? Text(
                        widget.provider.displayName?.substring(0, 1).toUpperCase() ?? 'P',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 18,
                        ),
                      )
                    : null,
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.provider.displayName ?? 'Provider',
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 20,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        const Icon(Icons.star, color: Colors.amber, size: 16),
                        const SizedBox(width: 4),
                        Text(
                          widget.provider.profile?.rating?.toStringAsFixed(1) ?? '0.0',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 14,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Text(
                          '${widget.provider.profile?.completedJobs ?? 0} Jobs',
                          style: const TextStyle(
                            color: Colors.white70,
                            fontSize: 14,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  _getBookingTypeLabel(),
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            widget.serviceTitle,
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.bold,
              fontSize: 18,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCurrentStep() {
    switch (_currentStep) {
      case BookingStep.details:
        return _buildDetailsStep();
      case BookingStep.payment:
        return _buildPaymentStep();
      case BookingStep.confirmation:
        return _buildConfirmationStep();
    }
  }

  Widget _buildDetailsStep() {
    switch (widget.bookingType) {
      case BookingType.b2c:
        return _buildB2CDetails();
      case BookingType.b2b:
        return _buildB2BDetails();
      case BookingType.hourly:
        return _buildHourlyDetails();
    }
  }

  Widget _buildB2CDetails() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Service Details',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 16),
        
        TextFormField(
          controller: _descriptionController,
          decoration: const InputDecoration(
            labelText: 'Beschreibung',
            hintText: 'Beschreiben Sie Ihre Anforderungen...',
            border: OutlineInputBorder(),
          ),
          maxLines: 3,
          validator: (value) => value?.isEmpty == true ? 'Beschreibung ist erforderlich' : null,
        ),
        const SizedBox(height: 16),
        
        TextFormField(
          controller: _amountController,
          decoration: const InputDecoration(
            labelText: 'Festpreis (€)',
            hintText: '50.00',
            border: OutlineInputBorder(),
            prefixText: '€ ',
          ),
          keyboardType: TextInputType.number,
          validator: (value) {
            if (value?.isEmpty == true) return 'Preis ist erforderlich';
            final amount = double.tryParse(value!);
            if (amount == null || amount <= 0) return 'Ungültiger Preis';
            return null;
          },
        ),
        const SizedBox(height: 16),
        
        TextFormField(
          controller: _notesController,
          decoration: const InputDecoration(
            labelText: 'Zusätzliche Notizen (optional)',
            hintText: 'Spezielle Anforderungen oder Wünsche...',
            border: OutlineInputBorder(),
          ),
          maxLines: 2,
        ),
      ],
    );
  }

  Widget _buildB2BDetails() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Projekt Details',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 16),
        
        TextFormField(
          controller: _descriptionController,
          decoration: const InputDecoration(
            labelText: 'Projekt Beschreibung',
            hintText: 'Beschreiben Sie Ihr Projekt im Detail...',
            border: OutlineInputBorder(),
          ),
          maxLines: 4,
          validator: (value) => value?.isEmpty == true ? 'Projekt Beschreibung ist erforderlich' : null,
        ),
        const SizedBox(height: 16),
        
        TextFormField(
          controller: _amountController,
          decoration: const InputDecoration(
            labelText: 'Gesamtbudget (€)',
            hintText: '1000.00',
            border: OutlineInputBorder(),
            prefixText: '€ ',
          ),
          keyboardType: TextInputType.number,
          validator: (value) {
            if (value?.isEmpty == true) return 'Budget ist erforderlich';
            final amount = double.tryParse(value!);
            if (amount == null || amount <= 0) return 'Ungültiges Budget';
            return null;
          },
        ),
        const SizedBox(height: 24),
        
        // Meilensteine
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Projekt Meilensteine',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            TextButton.icon(
              onPressed: _addMilestone,
              icon: const Icon(Icons.add),
              label: const Text('Meilenstein hinzufügen'),
            ),
          ],
        ),
        const SizedBox(height: 12),
        
        ..._buildMilestones(),
      ],
    );
  }

  Widget _buildHourlyDetails() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Stunden-Abrechnung',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 16),
        
        TextFormField(
          controller: _descriptionController,
          decoration: const InputDecoration(
            labelText: 'Aufgaben Beschreibung',
            hintText: 'Beschreiben Sie die zu erledigenden Aufgaben...',
            border: OutlineInputBorder(),
          ),
          maxLines: 3,
          validator: (value) => value?.isEmpty == true ? 'Aufgaben Beschreibung ist erforderlich' : null,
        ),
        const SizedBox(height: 16),
        
        Row(
          children: [
            Expanded(
              child: TextFormField(
                initialValue: _hourlyRate.toStringAsFixed(2),
                decoration: const InputDecoration(
                  labelText: 'Stundensatz (€)',
                  border: OutlineInputBorder(),
                  prefixText: '€ ',
                ),
                keyboardType: TextInputType.number,
                onChanged: (value) {
                  _hourlyRate = double.tryParse(value) ?? _hourlyRate;
                  setState(() {});
                },
                validator: (value) {
                  if (value?.isEmpty == true) return 'Stundensatz erforderlich';
                  final rate = double.tryParse(value!);
                  if (rate == null || rate <= 0) return 'Ungültiger Stundensatz';
                  return null;
                },
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: TextFormField(
                initialValue: _estimatedHours.toStringAsFixed(1),
                decoration: const InputDecoration(
                  labelText: 'Geschätzte Stunden',
                  border: OutlineInputBorder(),
                  suffixText: 'h',
                ),
                keyboardType: TextInputType.number,
                onChanged: (value) {
                  _estimatedHours = double.tryParse(value) ?? _estimatedHours;
                  setState(() {});
                },
                validator: (value) {
                  if (value?.isEmpty == true) return 'Stunden erforderlich';
                  final hours = double.tryParse(value!);
                  if (hours == null || hours <= 0) return 'Ungültige Stundenzahl';
                  return null;
                },
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppTheme.primaryColor.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppTheme.primaryColor.withValues(alpha: 0.3)),
          ),
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Geschätzte Kosten:'),
                  Text(
                    '€ ${(_hourlyRate * _estimatedHours).toStringAsFixed(2)}',
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 18,
                      color: AppTheme.primaryColor,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              const Text(
                'Die tatsächliche Abrechnung erfolgt basierend auf der erfassten Arbeitszeit.',
                style: TextStyle(
                  fontSize: 12,
                  color: AppTheme.textSecondary,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ],
    );
  }

  List<Widget> _buildMilestones() {
    return _milestones.asMap().entries.map((entry) {
      final index = entry.key;
      final controllers = _milestoneControllers[index];
      
      return Container(
        margin: const EdgeInsets.only(bottom: 16),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          border: Border.all(color: Colors.grey.shade300),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Meilenstein ${index + 1}',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                IconButton(
                  onPressed: () => _removeMilestone(index),
                  icon: const Icon(Icons.delete, color: Colors.red),
                ),
              ],
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: controllers['title'],
              decoration: const InputDecoration(
                labelText: 'Titel',
                border: OutlineInputBorder(),
              ),
              validator: (value) => value?.isEmpty == true ? 'Titel erforderlich' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: controllers['description'],
              decoration: const InputDecoration(
                labelText: 'Beschreibung',
                border: OutlineInputBorder(),
              ),
              maxLines: 2,
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: controllers['amount'],
                    decoration: const InputDecoration(
                      labelText: 'Betrag (€)',
                      border: OutlineInputBorder(),
                      prefixText: '€ ',
                    ),
                    keyboardType: TextInputType.number,
                    validator: (value) {
                      if (value?.isEmpty == true) return 'Betrag erforderlich';
                      final amount = double.tryParse(value!);
                      if (amount == null || amount <= 0) return 'Ungültiger Betrag';
                      return null;
                    },
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: TextFormField(
                    controller: controllers['dueDate'],
                    decoration: const InputDecoration(
                      labelText: 'Fälligkeitsdatum',
                      border: OutlineInputBorder(),
                      suffixIcon: Icon(Icons.calendar_today),
                    ),
                    readOnly: true,
                    onTap: () => _selectDate(controllers['dueDate']!),
                    validator: (value) => value?.isEmpty == true ? 'Datum erforderlich' : null,
                  ),
                ),
              ],
            ),
          ],
        ),
      );
    }).toList();
  }

  Widget _buildPaymentStep() {
    return Column(
      children: [
        const Icon(
          Icons.payment,
          size: 64,
          color: AppTheme.primaryColor,
        ),
        const SizedBox(height: 16),
        Text(
          'Zahlung wird verarbeitet...',
          style: Theme.of(context).textTheme.titleLarge,
        ),
        const SizedBox(height: 8),
        const Text(
          'Bitte warten Sie, während wir Ihre Zahlung verarbeiten.',
          textAlign: TextAlign.center,
          style: TextStyle(color: AppTheme.textSecondary),
        ),
        const SizedBox(height: 32),
        const CircularProgressIndicator(
          valueColor: AlwaysStoppedAnimation<Color>(AppTheme.primaryColor),
        ),
      ],
    );
  }

  Widget _buildConfirmationStep() {
    return Column(
      children: [
        const Icon(
          Icons.check_circle,
          size: 64,
          color: AppTheme.successColor,
        ),
        const SizedBox(height: 16),
        Text(
          'Buchung erfolgreich!',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
            color: AppTheme.successColor,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 8),
        const Text(
          'Ihre Buchung wurde erfolgreich erstellt. Sie erhalten eine Bestätigung per E-Mail.',
          textAlign: TextAlign.center,
          style: TextStyle(color: AppTheme.textSecondary),
        ),
        const SizedBox(height: 24),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppTheme.successColor.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppTheme.successColor.withValues(alpha: 0.3)),
          ),
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Service:'),
                  Flexible(
                    child: Text(
                      widget.serviceTitle,
                      style: const TextStyle(fontWeight: FontWeight.bold),
                      textAlign: TextAlign.right,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Anbieter:'),
                  Text(
                    widget.provider.displayName ?? 'Provider',
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Typ:'),
                  Text(
                    _getBookingTypeLabel(),
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildActionButtons(TaskiloUser? user) {
    if (_currentStep == BookingStep.confirmation) {
      return Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.of(context).pop(true),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryColor,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: const Text('Schließen'),
              ),
            ),
            const SizedBox(height: 12),
            TextButton(
              onPressed: () {
                // Navigate to dashboard/orders
              },
              child: const Text('Meine Buchungen anzeigen'),
            ),
          ],
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.all(20),
      child: Row(
        children: [
          Expanded(
            child: OutlinedButton(
              onPressed: _isProcessing ? null : () => Navigator.of(context).pop(),
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: const Text('Abbrechen'),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            flex: 2,
            child: ElevatedButton(
              onPressed: _isProcessing ? null : () => _processBooking(user),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryColor,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: _isProcessing
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                      ),
                    )
                  : Text(_getActionButtonText()),
            ),
          ),
        ],
      ),
    );
  }

  // ===== LOGIC METHODS =====

  void _addMilestone() {
    setState(() {
      final controllers = {
        'title': TextEditingController(),
        'description': TextEditingController(),
        'amount': TextEditingController(),
        'dueDate': TextEditingController(),
      };
      
      _milestoneControllers.add(controllers);
      _milestones.add(ProjectMilestone(
        title: '',
        description: '',
        amount: 0.0,
        dueDate: DateTime.now().add(const Duration(days: 30)),
      ));
    });
  }

  void _removeMilestone(int index) {
    setState(() {
      for (final controller in _milestoneControllers[index].values) {
        controller.dispose();
      }
      _milestoneControllers.removeAt(index);
      _milestones.removeAt(index);
    });
  }

  Future<void> _selectDate(TextEditingController controller) async {
    final date = await showDatePicker(
      context: context,
      initialDate: DateTime.now().add(const Duration(days: 30)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    
    if (date != null) {
      controller.text = '${date.day}.${date.month}.${date.year}';
    }
  }

  Future<void> _processBooking(TaskiloUser? user) async {
    if (user == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Bitte melden Sie sich an, um zu buchen.')),
      );
      return;
    }

    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isProcessing = true;
      _currentStep = BookingStep.payment;
    });

    try {
      PaymentResult result;
      
      switch (widget.bookingType) {
        case BookingType.b2c:
          result = await _processB2CBooking();
          break;
        case BookingType.b2b:
          result = await _processB2BBooking();
          break;
        case BookingType.hourly:
          result = await _processHourlyBooking();
          break;
      }

      if (result.success) {
        setState(() {
          _currentStep = BookingStep.confirmation;
        });
      } else {
        _showError(result.error ?? 'Buchung fehlgeschlagen');
        setState(() {
          _currentStep = BookingStep.details;
        });
      }
    } catch (e) {
      _showError('Unerwarteter Fehler: $e');
      setState(() {
        _currentStep = BookingStep.details;
      });
    } finally {
      setState(() {
        _isProcessing = false;
      });
    }
  }

  Future<PaymentResult> _processB2CBooking() async {
    final amount = double.parse(_amountController.text);
    
    return await TaskiloService().processServicePayment(
      providerId: widget.provider.uid,
      serviceTitle: widget.serviceTitle,
      serviceDescription: _descriptionController.text,
      amount: amount,
    );
  }

  Future<PaymentResult> _processB2BBooking() async {
    final totalAmount = double.parse(_amountController.text);
    
    // Update milestones von Form
    for (int i = 0; i < _milestones.length; i++) {
      final controllers = _milestoneControllers[i];
      _milestones[i] = ProjectMilestone(
        title: controllers['title']!.text,
        description: controllers['description']!.text,
        amount: double.parse(controllers['amount']!.text),
        dueDate: _parseDateString(controllers['dueDate']!.text),
      );
    }
    
    return await TaskiloService().processProjectPayment(
      providerId: widget.provider.uid,
      projectTitle: widget.serviceTitle,
      projectDescription: _descriptionController.text,
      totalAmount: totalAmount,
      milestones: _milestones,
    );
  }

  Future<PaymentResult> _processHourlyBooking() async {
    // Für Hourly Booking: Erstelle erstmal einen "Setup" für die zukünftige Abrechnung
    // Die tatsächliche Payment erfolgt später nach Time Tracking
    
    return await TaskiloService().processHourlyPayment(
      providerId: widget.provider.uid,
      orderId: 'temp_${DateTime.now().millisecondsSinceEpoch}', // Temporäre ID
      hoursWorked: _estimatedHours,
      hourlyRate: _hourlyRate,
    );
  }

  DateTime _parseDateString(String dateStr) {
    final parts = dateStr.split('.');
    if (parts.length == 3) {
      return DateTime(
        int.parse(parts[2]), // year
        int.parse(parts[1]), // month
        int.parse(parts[0]), // day
      );
    }
    return DateTime.now().add(const Duration(days: 30));
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: AppTheme.errorColor,
      ),
    );
  }

  String _getBookingTypeLabel() {
    switch (widget.bookingType) {
      case BookingType.b2c:
        return 'Festpreis';
      case BookingType.b2b:
        return 'Projekt';
      case BookingType.hourly:
        return 'Stundenbasis';
    }
  }

  String _getActionButtonText() {
    switch (widget.bookingType) {
      case BookingType.b2c:
        return 'Jetzt buchen & bezahlen';
      case BookingType.b2b:
        return 'Projekt starten';
      case BookingType.hourly:
        return 'Auftrag erteilen';
    }
  }

  double _getHourlyRateFromProvider() {
    // Standard-Rate falls kein Provider Profile verfügbar
    const defaultRate = 50.0;
    
    // Versuche Rate aus Provider Profile zu laden
    try {
      // Check if provider has skills with hourly rates
      final skills = widget.provider.profile?.skills;
      if (skills != null && skills.isNotEmpty) {
        // For now, return a calculated rate based on provider rating and experience
        final rating = widget.provider.profile?.rating ?? 4.0;
        final completedJobs = widget.provider.profile?.completedJobs ?? 0;
        
        // Base rate calculation: 
        // Higher rating = higher rate, more experience = higher rate
        double calculatedRate = defaultRate;
        calculatedRate += (rating - 4.0) * 10; // +10€ per 0.1 rating above 4.0
        calculatedRate += (completedJobs / 10) * 5; // +5€ per 10 completed jobs
        
        // Ensure minimum rate and reasonable maximum
        calculatedRate = calculatedRate.clamp(25.0, 150.0);
        
        return calculatedRate;
      }
      
      return defaultRate;
    } catch (e) {
      debugPrint('Error calculating hourly rate from provider: $e');
      return defaultRate;
    }
  }
}

// ===== ENUMS =====

enum BookingType { b2c, b2b, hourly }

enum BookingStep { details, payment, confirmation }
