import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:table_calendar/table_calendar.dart';
import 'package:intl/intl.dart';
import 'package:add_2_calendar/add_2_calendar.dart';
import '../../../models/user_model.dart';
import '../../../models/order.dart' as taskilo_order;
import '../../../services/order_service.dart';
import '../dashboard_layout.dart';
import 'order_detail_screen.dart';

class CalendarScreen extends StatefulWidget {
  const CalendarScreen({super.key});

  @override
  State<CalendarScreen> createState() => _CalendarScreenState();
}

class _CalendarScreenState extends State<CalendarScreen> {
  late final ValueNotifier<List<taskilo_order.Order>> _selectedEvents;
  CalendarFormat _calendarFormat = CalendarFormat.month;
  DateTime _focusedDay = DateTime.now();
  DateTime? _selectedDay;
  List<taskilo_order.Order> _allOrders = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _selectedDay = DateTime.now();
    _selectedEvents = ValueNotifier(_getEventsForDay(_selectedDay!));
    _loadOrders();
  }

  @override
  void dispose() {
    _selectedEvents.dispose();
    super.dispose();
  }

  Future<void> _loadOrders() async {
    final user = context.read<TaskiloUser?>();
    if (user == null) {
      setState(() {
        _error = 'Bitte melden Sie sich an, um Ihre Termine anzuzeigen.';
        _isLoading = false;
      });
      return;
    }

    try {
      final orders = await OrderService.getUserOrders(user.uid);
      debugPrint('📊 Geladene Aufträge: ${orders.length}');
      
      // Debug: Alle Aufträge mit ihren Daten anzeigen
      for (int i = 0; i < orders.length; i++) {
        final order = orders[i];
        debugPrint('📝 Auftrag $i: "${order.selectedSubcategory}"');
        debugPrint('   Status: ${order.status}');
        debugPrint('   Datum: ${order.orderDate}');
        debugPrint('   Erstellt: ${order.createdAt}');
        debugPrint('   ID: ${order.id}');
      }
      
      // Zuerst: Alle Aufträge mit Status filtern (ohne Datums-Requirement)
      final statusFilteredOrders = orders.where((order) {
        final validStatus = order.status.toLowerCase() == 'aktiv' || 
                           order.status.toLowerCase() == 'in bearbeitung' ||
                           order.status.toLowerCase() == 'bestätigt' ||
                           order.status.toLowerCase() == 'abgeschlossen' ||
                           order.status.toLowerCase() == 'zahlung_erhalten_clearing' ||
                           order.status.toLowerCase() == 'completed' ||
                           order.status.toLowerCase() == 'finished' ||
                           order.status.toLowerCase() == 'done' ||
                           order.status.toLowerCase() == 'beendet' ||
                           order.status.toLowerCase() == 'fertig' ||
                           order.status.toLowerCase() == 'erledigt';
        return validStatus;
      }).toList();
      
      debugPrint('📋 Status-gefilterte Aufträge: ${statusFilteredOrders.length}');
      
      // Zweitens: Von den status-gefilterten Aufträge mit verfügbaren Daten nehmen
      final filteredOrders = statusFilteredOrders.where((order) {
        // Verwende orderDate, falls verfügbar, sonst createdAt als Fallback
        final hasDate = order.orderDate != null || order.createdAt != null;
        
        if (hasDate) {
          final displayDate = order.orderDate ?? order.createdAt!;
          debugPrint('✅ Auftrag "${order.selectedSubcategory}" am ${DateFormat('dd.MM.yyyy').format(displayDate)} - Status: ${order.status}');
          return true;
        } else {
          debugPrint('❌ Auftrag "${order.selectedSubcategory}" - Kein Datum gesetzt');
          return false;
        }
      }).toList();
      
      // Falls keine Aufträge mit Datum vorhanden sind, verwende createdAt als Fallback
      if (filteredOrders.isEmpty && statusFilteredOrders.isNotEmpty) {
        debugPrint('🔄 Fallback: Verwende createdAt als Datum');
        final fallbackOrders = statusFilteredOrders.where((order) => order.createdAt != null).map((order) {
          // Erstelle eine modifizierte Version mit createdAt als orderDate
          debugPrint('📅 Fallback-Datum für "${order.selectedSubcategory}": ${order.createdAt}');
          return order;
        }).toList();
        
        setState(() {
          _allOrders = fallbackOrders;
          _isLoading = false;
        });
      } else {
        setState(() {
          _allOrders = filteredOrders;
          _isLoading = false;
        });
      }
      
      debugPrint('📅 Finale Aufträge für Kalender: ${_allOrders.length}');
      _selectedEvents.value = _getEventsForDay(_selectedDay!);
    } catch (e) {
      setState(() {
        _error = 'Fehler beim Laden der Termine: $e';
        _isLoading = false;
      });
    }
  }

    List<taskilo_order.Order> _getEventsForDay(DateTime day) {
    final events = _allOrders.where((order) {
      // Verwende orderDate falls verfügbar, sonst createdAt als Fallback
      final orderDateTime = order.orderDate ?? order.createdAt;
      if (orderDateTime == null) return false;
      
      final orderDay = DateTime(orderDateTime.year, orderDateTime.month, orderDateTime.day);
      final checkDay = DateTime(day.year, day.month, day.day);
      return orderDay.isAtSameMomentAs(checkDay);
    }).toList();
    
    // Debug: Zeige Events für den Tag
    if (events.isNotEmpty) {
      debugPrint('📅 Events für ${DateFormat('dd.MM.yyyy').format(day)}: ${events.length}');
      for (final event in events) {
        final displayDate = event.orderDate ?? event.createdAt!;
        debugPrint('  - ${event.selectedSubcategory} (${event.status}) am ${DateFormat('dd.MM.yyyy').format(displayDate)}');
      }
    }
    
    return events;
  }

  void _onDaySelected(DateTime selectedDay, DateTime focusedDay) {
    if (!isSameDay(_selectedDay, selectedDay)) {
      setState(() {
        _selectedDay = selectedDay;
        _focusedDay = focusedDay;
      });
      _selectedEvents.value = _getEventsForDay(selectedDay);
    }
  }

  Future<void> _exportToCalendar(taskilo_order.Order order) async {
    final eventDate = order.orderDate ?? order.createdAt;
    if (eventDate == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Dieser Auftrag hat kein festgelegtes Datum'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    try {
      final event = Event(
        title: '${order.selectedSubcategory} - Taskilo',
        description: 'Taskilo Auftrag\n\nAnbieter: ${order.providerName}\nPreis: ${order.getFormattedPrice()}\n\nDetails: ${order.projectName ?? 'Keine weiteren Details verfügbar'}',
        location: '', // Adresse nicht verfügbar in aktuellem Order-Model
        startDate: eventDate,
        endDate: eventDate.add(const Duration(hours: 2)), // Default 2 Stunden
        iosParams: const IOSParams(
          reminder: Duration(minutes: 30),
        ),
        androidParams: const AndroidParams(
          emailInvites: [],
        ),
      );

      final success = await Add2Calendar.addEvent2Cal(event);
      
      if (success) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Termin erfolgreich zum Kalender hinzugefügt!'),
              backgroundColor: Color(0xFF14ad9f),
            ),
          );
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Fehler beim Hinzufügen zum Kalender'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Fehler: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<TaskiloUser?>();
    
    if (user == null) {
      return DashboardLayout(
        title: 'Terminkalender',
        body: const Center(
          child: Text(
            'Bitte melden Sie sich an, um Ihre Termine anzuzeigen.',
            style: TextStyle(
              fontSize: 16,
              color: Colors.white,
            ),
            textAlign: TextAlign.center,
          ),
        ),
      );
    }

    return DashboardLayout(
      title: 'Terminkalender',
      useGradientBackground: true,
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(
                color: Colors.white,
              ),
            )
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(
                        Icons.error_outline,
                        size: 64,
                        color: Colors.white,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        _error!,
                        style: const TextStyle(
                          fontSize: 16,
                          color: Colors.white,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _loadOrders,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.white,
                          foregroundColor: const Color(0xFF14ad9f),
                        ),
                        child: const Text('Erneut versuchen'),
                      ),
                    ],
                  ),
                )
              : Column(
                  children: [
                    // Kalender Widget
                    Container(
                      margin: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: Colors.white.withValues(alpha: 0.2),
                          width: 1,
                        ),
                      ),
                      child: TableCalendar<taskilo_order.Order>(
                        firstDay: DateTime.utc(2020, 1, 1),
                        lastDay: DateTime.utc(2030, 12, 31),
                        focusedDay: _focusedDay,
                        calendarFormat: _calendarFormat,
                        eventLoader: _getEventsForDay,
                        startingDayOfWeek: StartingDayOfWeek.monday,
                        selectedDayPredicate: (day) {
                          return isSameDay(_selectedDay, day);
                        },
                        onDaySelected: _onDaySelected,
                        onFormatChanged: (format) {
                          if (_calendarFormat != format) {
                            setState(() {
                              _calendarFormat = format;
                            });
                          }
                        },
                        onPageChanged: (focusedDay) {
                          _focusedDay = focusedDay;
                        },
                        // Ereignis-Marker Builder für bessere Sichtbarkeit
                        calendarBuilders: CalendarBuilders(
                          markerBuilder: (context, day, events) {
                            if (events.isNotEmpty) {
                              return Positioned(
                                bottom: 1,
                                child: AnimatedContainer(
                                  duration: const Duration(milliseconds: 300),
                                  decoration: BoxDecoration(
                                    shape: BoxShape.rectangle,
                                    borderRadius: BorderRadius.circular(6),
                                    color: const Color(0xFF14ad9f),
                                  ),
                                  width: events.length > 2 ? 24 : (events.length * 8).toDouble(),
                                  height: 4,
                                  child: events.length > 2 
                                    ? Center(
                                        child: Text(
                                          '${events.length}',
                                          style: const TextStyle(
                                            color: Colors.white,
                                            fontSize: 8,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      )
                                    : null,
                                ),
                              );
                            }
                            return null;
                          },
                        ),
                        calendarStyle: CalendarStyle(
                          outsideDaysVisible: false,
                          weekendTextStyle: const TextStyle(color: Colors.white70),
                          defaultTextStyle: const TextStyle(color: Colors.white),
                          selectedTextStyle: const TextStyle(
                            color: Color(0xFF14ad9f),
                            fontWeight: FontWeight.bold,
                          ),
                          selectedDecoration: const BoxDecoration(
                            color: Colors.white,
                            shape: BoxShape.circle,
                          ),
                          todayTextStyle: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                          ),
                          todayDecoration: const BoxDecoration(
                            color: Color(0xFF14ad9f),
                            shape: BoxShape.circle,
                          ),
                          // Ereignis-Marker konfigurieren
                          markerDecoration: const BoxDecoration(
                            color: Colors.orange,
                            shape: BoxShape.circle,
                          ),
                          markersMaxCount: 3,
                          canMarkersOverflow: true,
                          markerMargin: const EdgeInsets.symmetric(horizontal: 1.5),
                          markerSize: 7.0,
                        ),
                        headerStyle: const HeaderStyle(
                          formatButtonVisible: true,
                          titleCentered: true,
                          formatButtonShowsNext: false,
                          formatButtonTextStyle: TextStyle(
                            color: Colors.white,
                            fontSize: 14,
                          ),
                          formatButtonDecoration: BoxDecoration(
                            color: Color(0xFF14ad9f),
                            borderRadius: BorderRadius.all(Radius.circular(8)),
                          ),
                          leftChevronIcon: Icon(
                            Icons.chevron_left,
                            color: Colors.white,
                          ),
                          rightChevronIcon: Icon(
                            Icons.chevron_right,
                            color: Colors.white,
                          ),
                          titleTextStyle: TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        daysOfWeekStyle: const DaysOfWeekStyle(
                          weekdayStyle: TextStyle(color: Colors.white70),
                          weekendStyle: TextStyle(color: Colors.white70),
                        ),
                      ),
                    ),
                    
                    // Termine für den ausgewählten Tag
                    Expanded(
                      child: ValueListenableBuilder<List<taskilo_order.Order>>(
                        valueListenable: _selectedEvents,
                        builder: (context, value, _) {
                          return Container(
                            margin: const EdgeInsets.symmetric(horizontal: 16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Padding(
                                  padding: const EdgeInsets.all(16),
                                  child: Text(
                                    'Termine für ${DateFormat('dd.MM.yyyy').format(_selectedDay!)}',
                                    style: const TextStyle(
                                      fontSize: 20,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.white,
                                    ),
                                  ),
                                ),
                                
                                Expanded(
                                  child: value.isEmpty
                                      ? Center(
                                          child: Column(
                                            mainAxisAlignment: MainAxisAlignment.center,
                                            children: [
                                              Icon(
                                                Icons.calendar_today_outlined,
                                                size: 64,
                                                color: Colors.white.withValues(alpha: 0.5),
                                              ),
                                              const SizedBox(height: 16),
                                              Text(
                                                'Keine Termine für diesen Tag',
                                                style: TextStyle(
                                                  fontSize: 16,
                                                  color: Colors.white.withValues(alpha: 0.7),
                                                ),
                                              ),
                                            ],
                                          ),
                                        )
                                      : ListView.builder(
                                          itemCount: value.length,
                                          itemBuilder: (context, index) {
                                            final order = value[index];
                                            return _buildAppointmentCard(order);
                                          },
                                        ),
                                ),
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

  Widget _buildAppointmentCard(taskilo_order.Order order) {
    String statusText = '';
    Color statusColor = Colors.white;
    
    switch (order.status.toLowerCase()) {
      case 'abgeschlossen':
      case 'zahlung_erhalten_clearing':
      case 'completed':
      case 'finished':
      case 'done':
      case 'beendet':
      case 'fertig':
      case 'erledigt':
        statusText = 'ABGESCHLOSSEN';
        statusColor = Colors.green;
        break;
      case 'aktiv':
      case 'in bearbeitung':
        statusText = 'AKTIV';
        statusColor = Colors.orange;
        break;
      case 'bestätigt':
        statusText = 'BESTÄTIGT';
        statusColor = const Color(0xFF14ad9f);
        break;
      case 'storniert':
      case 'cancelled':
      case 'abgebrochen':
        statusText = 'STORNIERT';
        statusColor = Colors.red;
        break;
      default:
        statusText = order.status.toUpperCase();
        statusColor = Colors.grey;
    }

    String timeText = 'Ganztägig';
    final eventDate = order.orderDate ?? order.createdAt;
    if (eventDate != null) {
      // Zeige das verfügbare Datum an
      timeText = order.orderDate != null 
        ? 'Geplant für ${DateFormat('HH:mm').format(order.orderDate!)}'
        : 'Erstellt am ${DateFormat('HH:mm').format(order.createdAt!)}';
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: statusColor.withValues(alpha: 0.5), // Farbiger Border je nach Status
          width: 2,
        ),
        // Zusätzlicher Effekt für abgeschlossene Aufträge
        boxShadow: statusColor == Colors.green 
          ? [
              BoxShadow(
                color: Colors.green.withValues(alpha: 0.3),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ]
          : null,
      ),
      child: InkWell(
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (context) => OrderDetailScreen(orderId: order.id),
            ),
          );
        },
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          order.selectedSubcategory,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Anbieter: ${order.providerName}',
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.white.withValues(alpha: 0.8),
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: statusColor.withValues(alpha: 0.9),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Text(
                      statusText,
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ],
              ),
              
              const SizedBox(height: 12),
              
              Row(
                children: [
                  Icon(
                    Icons.access_time,
                    size: 16,
                    color: Colors.white.withValues(alpha: 0.7),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    timeText,
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.white.withValues(alpha: 0.8),
                    ),
                  ),
                ],
              ),
              
              const SizedBox(height: 12),
              
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    order.getFormattedPrice(),
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                  ElevatedButton.icon(
                    onPressed: () => _exportToCalendar(order),
                    icon: const Icon(Icons.calendar_month, size: 16),
                    label: const Text('Exportieren'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF14ad9f),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      textStyle: const TextStyle(fontSize: 12),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}