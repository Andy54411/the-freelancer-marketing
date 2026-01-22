import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:table_calendar/table_calendar.dart';
import '../../theme/app_theme.dart';
import '../../services/api_service.dart';

class CalendarScreen extends StatefulWidget {
  const CalendarScreen({super.key});

  @override
  State<CalendarScreen> createState() => _CalendarScreenState();
}

class _CalendarScreenState extends State<CalendarScreen> {
  final ApiService _apiService = ApiService();
  
  DateTime _focusedDay = DateTime.now();
  DateTime _selectedDay = DateTime.now();
  CalendarFormat _calendarFormat = CalendarFormat.month;
  
  Map<DateTime, List<CalendarEvent>> _events = {};
  List<CalendarEvent> _selectedEvents = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadEvents();
  }

  Future<void> _loadEvents() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final startOfMonth = DateTime(_focusedDay.year, _focusedDay.month, 1);
      final endOfMonth = DateTime(_focusedDay.year, _focusedDay.month + 1, 0);
      
      final result = await _apiService.getCalendarEvents(
        start: startOfMonth,
        end: endOfMonth,
      );
      
      if (result['success'] == true) {
        final events = <DateTime, List<CalendarEvent>>{};
        
        for (final event in result['events'] ?? []) {
          final calEvent = CalendarEvent.fromJson(event);
          final dateKey = DateTime(
            calEvent.start.year,
            calEvent.start.month,
            calEvent.start.day,
          );
          
          events.putIfAbsent(dateKey, () => []).add(calEvent);
        }
        
        setState(() {
          _events = events;
          _selectedEvents = _getEventsForDay(_selectedDay);
        });
      }
    } catch (e) { // Fehler ignorieren 
      setState(() => _error = e.toString());
    }

    setState(() => _isLoading = false);
  }

  List<CalendarEvent> _getEventsForDay(DateTime day) {
    final key = DateTime(day.year, day.month, day.day);
    return _events[key] ?? [];
  }

  Future<void> _createEvent() async {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => EventEditScreen(
          initialDate: _selectedDay,
          onSave: () {
            _loadEvents();
          },
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        title: const Text('Kalender'),
        actions: [
          IconButton(
            icon: const Icon(Icons.today),
            onPressed: () {
              setState(() {
                _focusedDay = DateTime.now();
                _selectedDay = DateTime.now();
                _selectedEvents = _getEventsForDay(_selectedDay);
              });
            },
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadEvents,
          ),
        ],
      ),
      body: Column(
        children: [
          // Calendar
          Container(
            color: AppColors.surface,
            child: TableCalendar<CalendarEvent>(
              firstDay: DateTime.utc(2020, 1, 1),
              lastDay: DateTime.utc(2030, 12, 31),
              focusedDay: _focusedDay,
              selectedDayPredicate: (day) => isSameDay(_selectedDay, day),
              calendarFormat: _calendarFormat,
              startingDayOfWeek: StartingDayOfWeek.monday,
              locale: 'de_DE',
              eventLoader: _getEventsForDay,
              calendarStyle: CalendarStyle(
                selectedDecoration: const BoxDecoration(
                  color: AppColors.calendarRed,
                  shape: BoxShape.circle,
                ),
                todayDecoration: BoxDecoration(
                  color: AppColors.calendarRed.withValues(alpha: 0.3),
                  shape: BoxShape.circle,
                ),
                markerDecoration: const BoxDecoration(
                  color: AppColors.calendarRed,
                  shape: BoxShape.circle,
                ),
                markersMaxCount: 3,
              ),
              headerStyle: const HeaderStyle(
                formatButtonVisible: true,
                titleCentered: true,
                formatButtonShowsNext: false,
              ),
              onDaySelected: (selectedDay, focusedDay) {
                setState(() {
                  _selectedDay = selectedDay;
                  _focusedDay = focusedDay;
                  _selectedEvents = _getEventsForDay(selectedDay);
                });
              },
              onFormatChanged: (format) {
                setState(() => _calendarFormat = format);
              },
              onPageChanged: (focusedDay) {
                _focusedDay = focusedDay;
                _loadEvents();
              },
            ),
          ),
          
          const Divider(height: 1),
          
          // Selected date header
          Container(
            padding: const EdgeInsets.all(16),
            color: AppColors.surface,
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.calendarRed.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Column(
                    children: [
                      Text(
                        DateFormat('dd').format(_selectedDay),
                        style: const TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                          color: AppColors.calendarRed,
                        ),
                      ),
                      Text(
                        DateFormat('EEE', 'de_DE').format(_selectedDay),
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.calendarRed,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        DateFormat('MMMM yyyy', 'de_DE').format(_selectedDay),
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      Text(
                        _selectedEvents.isEmpty
                            ? 'Keine Termine'
                            : '${_selectedEvents.length} Termin${_selectedEvents.length == 1 ? '' : 'e'}',
                        style: const TextStyle(
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          
          // Events list
          Expanded(child: _buildEventsList()),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        heroTag: 'calendarFab',
        onPressed: _createEvent,
        backgroundColor: AppColors.calendarRed,
        child: const Icon(Icons.add, color: Colors.white),
      ),
    );
  }

  Widget _buildEventsList() {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.calendarRed),
      );
    }

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 48, color: AppColors.error),
            const SizedBox(height: 16),
            Text(_error!, style: const TextStyle(color: AppColors.error)),
          ],
        ),
      );
    }

    if (_selectedEvents.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.event_available, size: 48, color: AppColors.textSecondary),
            const SizedBox(height: 16),
            const Text(
              'Keine Termine an diesem Tag',
              style: TextStyle(color: AppColors.textSecondary),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(vertical: 8),
      itemCount: _selectedEvents.length,
      itemBuilder: (context, index) {
        final event = _selectedEvents[index];
        return _EventListItem(
          event: event,
          onTap: () => _openEvent(event),
        );
      },
    );
  }

  void _openEvent(CalendarEvent event) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => EventEditScreen(
          event: event,
          onSave: () {
            _loadEvents();
          },
        ),
      ),
    );
  }
}

class _EventListItem extends StatelessWidget {
  final CalendarEvent event;
  final VoidCallback onTap;

  const _EventListItem({
    required this.event,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final color = _getEventColor(event.color);
    
    return ListTile(
      onTap: onTap,
      leading: Container(
        width: 4,
        height: 40,
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(2),
        ),
      ),
      title: Text(
        event.title,
        style: const TextStyle(fontWeight: FontWeight.w500),
      ),
      subtitle: Text(
        event.isAllDay
            ? 'Ganztägig'
            : '${DateFormat('HH:mm').format(event.start)} - ${DateFormat('HH:mm').format(event.end)}',
        style: const TextStyle(fontSize: 13),
      ),
      trailing: event.location != null
          ? const Icon(Icons.location_on, size: 18, color: AppColors.textSecondary)
          : null,
    );
  }

  Color _getEventColor(String? colorName) {
    switch (colorName?.toLowerCase()) {
      case 'red':
        return Colors.red;
      case 'blue':
        return Colors.blue;
      case 'green':
        return Colors.green;
      case 'orange':
        return Colors.orange;
      case 'purple':
        return Colors.purple;
      case 'pink':
        return Colors.pink;
      default:
        return AppColors.calendarRed;
    }
  }
}

class EventEditScreen extends StatefulWidget {
  final CalendarEvent? event;
  final DateTime? initialDate;
  final VoidCallback onSave;

  const EventEditScreen({
    super.key,
    this.event,
    this.initialDate,
    required this.onSave,
  });

  @override
  State<EventEditScreen> createState() => _EventEditScreenState();
}

class _EventEditScreenState extends State<EventEditScreen> {
  final ApiService _apiService = ApiService();
  
  late TextEditingController _titleController;
  late TextEditingController _locationController;
  late TextEditingController _descriptionController;
  
  late DateTime _startDate;
  late TimeOfDay _startTime;
  late DateTime _endDate;
  late TimeOfDay _endTime;
  bool _isAllDay = false;
  String _color = 'red';
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    
    final now = DateTime.now();
    final initialDate = widget.initialDate ?? now;
    
    if (widget.event != null) {
      final event = widget.event!;
      _titleController = TextEditingController(text: event.title);
      _locationController = TextEditingController(text: event.location ?? '');
      _descriptionController = TextEditingController(text: event.description ?? '');
      _startDate = event.start;
      _startTime = TimeOfDay.fromDateTime(event.start);
      _endDate = event.end;
      _endTime = TimeOfDay.fromDateTime(event.end);
      _isAllDay = event.isAllDay;
      _color = event.color ?? 'red';
    } else {
      _titleController = TextEditingController();
      _locationController = TextEditingController();
      _descriptionController = TextEditingController();
      _startDate = initialDate;
      _startTime = TimeOfDay(hour: now.hour + 1, minute: 0);
      _endDate = initialDate;
      _endTime = TimeOfDay(hour: now.hour + 2, minute: 0);
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _locationController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_titleController.text.isEmpty) {
      return;
    }

    setState(() => _isSaving = true);

    try {
      final start = DateTime(
        _startDate.year,
        _startDate.month,
        _startDate.day,
        _isAllDay ? 0 : _startTime.hour,
        _isAllDay ? 0 : _startTime.minute,
      );
      
      final end = DateTime(
        _endDate.year,
        _endDate.month,
        _endDate.day,
        _isAllDay ? 23 : _endTime.hour,
        _isAllDay ? 59 : _endTime.minute,
      );

      if (widget.event != null) {
        await _apiService.updateCalendarEvent(
          eventId: widget.event!.id,
          title: _titleController.text,
          start: start,
          end: end,
          isAllDay: _isAllDay,
          location: _locationController.text.isNotEmpty ? _locationController.text : null,
          description: _descriptionController.text.isNotEmpty ? _descriptionController.text : null,
          color: _color,
        );
      } else {
        await _apiService.createCalendarEvent(
          title: _titleController.text,
          start: start,
          end: end,
          isAllDay: _isAllDay,
          location: _locationController.text.isNotEmpty ? _locationController.text : null,
          description: _descriptionController.text.isNotEmpty ? _descriptionController.text : null,
          color: _color,
        );
      }

      widget.onSave();
      if (mounted) {
        Navigator.pop(context);
      }
    } catch (e) { // Fehler ignorieren 
      // Fehler beim Speichern ignorieren
    }

    setState(() => _isSaving = false);
  }

  Future<void> _delete() async {
    if (widget.event == null) return;
    
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Termin löschen'),
        content: const Text('Möchten Sie diesen Termin wirklich löschen?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Abbrechen'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: AppColors.error),
            child: const Text('Löschen'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      try {
        await _apiService.deleteCalendarEvent(widget.event!.id);
        widget.onSave();
        if (mounted) {
          Navigator.pop(context);
        }
      } catch (e) { // Fehler ignorieren 
        // Fehler beim Löschen ignorieren
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        title: Text(widget.event != null ? 'Termin bearbeiten' : 'Neuer Termin'),
        actions: [
          if (widget.event != null)
            IconButton(
              icon: const Icon(Icons.delete_outline, color: AppColors.error),
              onPressed: _delete,
            ),
          _isSaving
              ? const Padding(
                  padding: EdgeInsets.all(12),
                  child: SizedBox(
                    width: 24,
                    height: 24,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                )
              : IconButton(
                  icon: const Icon(Icons.check, color: AppColors.calendarRed),
                  onPressed: _save,
                ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            TextField(
              controller: _titleController,
              decoration: const InputDecoration(
                labelText: 'Titel',
                border: OutlineInputBorder(),
              ),
              style: const TextStyle(fontSize: 18),
            ),
            const SizedBox(height: 24),
            
            // All day switch
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Ganztägig'),
              value: _isAllDay,
              onChanged: (value) => setState(() => _isAllDay = value),
              activeTrackColor: AppColors.calendarRed.withValues(alpha: 0.5),
              activeThumbColor: AppColors.calendarRed,
            ),
            
            const Divider(),
            
            // Start date/time
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.schedule),
              title: const Text('Beginn'),
              subtitle: Text(
                _isAllDay
                    ? DateFormat('EEE, dd.MM.yyyy', 'de_DE').format(_startDate)
                    : '${DateFormat('EEE, dd.MM.yyyy', 'de_DE').format(_startDate)}, ${_startTime.format(context)}',
              ),
              onTap: () => _pickStartDateTime(),
            ),
            
            // End date/time
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.schedule_outlined),
              title: const Text('Ende'),
              subtitle: Text(
                _isAllDay
                    ? DateFormat('EEE, dd.MM.yyyy', 'de_DE').format(_endDate)
                    : '${DateFormat('EEE, dd.MM.yyyy', 'de_DE').format(_endDate)}, ${_endTime.format(context)}',
              ),
              onTap: () => _pickEndDateTime(),
            ),
            
            const Divider(),
            
            // Location
            TextField(
              controller: _locationController,
              decoration: const InputDecoration(
                labelText: 'Ort',
                prefixIcon: Icon(Icons.location_on_outlined),
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),
            
            // Description
            TextField(
              controller: _descriptionController,
              decoration: const InputDecoration(
                labelText: 'Beschreibung',
                prefixIcon: Icon(Icons.notes),
                border: OutlineInputBorder(),
                alignLabelWithHint: true,
              ),
              maxLines: 3,
            ),
            const SizedBox(height: 24),
            
            // Color
            const Text('Farbe', style: TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 12),
            Wrap(
              spacing: 12,
              children: [
                _ColorChip(color: Colors.red, name: 'red', selected: _color == 'red', onTap: () => setState(() => _color = 'red')),
                _ColorChip(color: Colors.blue, name: 'blue', selected: _color == 'blue', onTap: () => setState(() => _color = 'blue')),
                _ColorChip(color: Colors.green, name: 'green', selected: _color == 'green', onTap: () => setState(() => _color = 'green')),
                _ColorChip(color: Colors.orange, name: 'orange', selected: _color == 'orange', onTap: () => setState(() => _color = 'orange')),
                _ColorChip(color: Colors.purple, name: 'purple', selected: _color == 'purple', onTap: () => setState(() => _color = 'purple')),
                _ColorChip(color: Colors.pink, name: 'pink', selected: _color == 'pink', onTap: () => setState(() => _color = 'pink')),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _pickStartDateTime() async {
    final date = await showDatePicker(
      context: context,
      initialDate: _startDate,
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
    );
    
    if (date != null && mounted) {
      setState(() => _startDate = date);
      
      if (!_isAllDay && mounted) {
        final time = await showTimePicker(
          context: context,
          initialTime: _startTime,
        );
        if (time != null && mounted) {
          setState(() => _startTime = time);
        }
      }
    }
  }

  Future<void> _pickEndDateTime() async {
    final date = await showDatePicker(
      context: context,
      initialDate: _endDate,
      firstDate: _startDate,
      lastDate: DateTime(2030),
    );
    
    if (date != null && mounted) {
      setState(() => _endDate = date);
      
      if (!_isAllDay && mounted) {
        final time = await showTimePicker(
          context: context,
          initialTime: _endTime,
        );
        if (time != null && mounted) {
          setState(() => _endTime = time);
        }
      }
    }
  }
}

class _ColorChip extends StatelessWidget {
  final Color color;
  final String name;
  final bool selected;
  final VoidCallback onTap;

  const _ColorChip({
    required this.color,
    required this.name,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          color: color,
          shape: BoxShape.circle,
          border: selected
              ? Border.all(color: AppColors.textPrimary, width: 3)
              : null,
        ),
        child: selected
            ? const Icon(Icons.check, color: Colors.white, size: 20)
            : null,
      ),
    );
  }
}

// Model
class CalendarEvent {
  final String id;
  final String title;
  final DateTime start;
  final DateTime end;
  final bool isAllDay;
  final String? location;
  final String? description;
  final String? color;

  CalendarEvent({
    required this.id,
    required this.title,
    required this.start,
    required this.end,
    required this.isAllDay,
    this.location,
    this.description,
    this.color,
  });

  factory CalendarEvent.fromJson(Map<String, dynamic> json) {
    return CalendarEvent(
      id: json['id'] ?? json['_id'] ?? '',
      title: json['title'] ?? json['summary'] ?? '',
      start: DateTime.parse(json['start'] ?? json['startDate']),
      end: DateTime.parse(json['end'] ?? json['endDate']),
      isAllDay: json['isAllDay'] ?? json['allDay'] ?? false,
      location: json['location'],
      description: json['description'],
      color: json['color'],
    );
  }
}
