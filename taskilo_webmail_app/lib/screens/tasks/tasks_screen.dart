import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../theme/app_theme.dart';
import '../../services/api_service.dart';
import '../../models/task_models.dart';

class TasksScreen extends StatefulWidget {
  const TasksScreen({super.key});

  @override
  State<TasksScreen> createState() => _TasksScreenState();
}

class _TasksScreenState extends State<TasksScreen> {
  final ApiService _apiService = ApiService();
  
  List<TaskList> _taskLists = [];
  String? _selectedListId;
  List<Task> _tasks = [];
  bool _isLoading = true;
  bool _showCompleted = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadTaskLists();
  }

  Future<void> _loadTaskLists() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final result = await _apiService.getTaskLists();
      
      if (result['success'] == true) {
        final lists = <TaskList>[];
        for (final list in result['lists'] ?? []) {
          lists.add(TaskList.fromJson(list));
        }
        
        setState(() {
          _taskLists = lists;
          if (lists.isNotEmpty && _selectedListId == null) {
            _selectedListId = lists.first.id;
          }
        });
        
        if (_selectedListId != null) {
          await _loadTasks();
        }
      }
    } catch (e) { // Fehler ignorieren 
      setState(() => _error = e.toString());
    }

    setState(() => _isLoading = false);
  }

  Future<void> _loadTasks() async {
    if (_selectedListId == null) return;

    try {
      final result = await _apiService.getTasks(_selectedListId!);
      
      if (result['success'] == true) {
        final tasks = <Task>[];
        for (final task in result['tasks'] ?? []) {
          tasks.add(Task.fromJson(task));
        }
        setState(() => _tasks = tasks);
      }
    } catch (e) { // Fehler ignorieren 
      setState(() => _error = e.toString());
    }
  }

  Future<void> _createTask() async {
    if (_selectedListId == null) return;
    
    final titleController = TextEditingController();
    
    final title = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Neue Aufgabe'),
        content: TextField(
          controller: titleController,
          autofocus: true,
          decoration: const InputDecoration(
            hintText: 'Aufgabentitel',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Abbrechen'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, titleController.text),
            child: const Text('Erstellen'),
          ),
        ],
      ),
    );

    if (title != null && title.isNotEmpty) {
      try {
        await _apiService.createTask(
          listId: _selectedListId!,
          title: title,
        );
        _loadTasks();
      } catch (e) { // Fehler ignorieren 
      }
    }
  }

  Future<void> _createTaskList() async {
    final nameController = TextEditingController();
    
    final name = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Neue Liste'),
        content: TextField(
          controller: nameController,
          autofocus: true,
          decoration: const InputDecoration(
            hintText: 'Listenname',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Abbrechen'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, nameController.text),
            child: const Text('Erstellen'),
          ),
        ],
      ),
    );

    if (name != null && name.isNotEmpty) {
      try {
        await _apiService.createTaskList(name);
        _loadTaskLists();
      } catch (e) { // Fehler ignorieren 
      }
    }
  }

  Future<void> _toggleTask(Task task) async {
    try {
      await _apiService.updateTask(
        listId: _selectedListId!,
        taskId: task.id,
        completed: !task.isCompleted,
      );
      
      setState(() {
        final index = _tasks.indexWhere((t) => t.id == task.id);
        if (index != -1) {
          _tasks[index] = task.copyWith(
            completed: !task.isCompleted,
          );
        }
      });
    } catch (e) { // Fehler ignorieren 
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        title: const Text('Aufgaben'),
        actions: [
          IconButton(
            icon: Icon(
              _showCompleted ? Icons.check_circle : Icons.check_circle_outline,
              color: _showCompleted ? AppColors.tasksBlue : null,
            ),
            onPressed: () => setState(() => _showCompleted = !_showCompleted),
            tooltip: 'Erledigte anzeigen',
          ),
          PopupMenuButton<String>(
            onSelected: (value) {
              if (value == 'new_list') {
                _createTaskList();
              }
            },
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'new_list',
                child: Row(
                  children: [
                    Icon(Icons.add),
                    SizedBox(width: 8),
                    Text('Neue Liste'),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
      drawer: _buildDrawer(),
      body: _buildBody(),
      floatingActionButton: _selectedListId != null
          ? FloatingActionButton.extended(
              heroTag: 'tasksFab',
              onPressed: _createTask,
              backgroundColor: AppColors.tasksBlue,
              icon: const Icon(Icons.add, color: Colors.white),
              label: const Text('Aufgabe', style: TextStyle(color: Colors.white)),
            )
          : null,
    );
  }

  Widget _buildDrawer() {
    return Drawer(
      child: SafeArea(
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              child: Row(
                children: [
                  Icon(Icons.check_circle, color: AppColors.tasksBlue, size: 28),
                  const SizedBox(width: 12),
                  const Text(
                    'Aufgaben',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600),
                  ),
                ],
              ),
            ),
            const Divider(),
            Expanded(
              child: ListView(
                padding: EdgeInsets.zero,
                children: [
                  ..._taskLists.map((list) {
                    final isSelected = list.id == _selectedListId;
                    final pendingCount = _tasks.where((t) => !t.isCompleted).length;
                    
                    return ListTile(
                      leading: Icon(
                        Icons.list,
                        color: isSelected ? AppColors.tasksBlue : AppColors.textSecondary,
                      ),
                      title: Text(
                        list.name,
                        style: TextStyle(
                          fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                          color: isSelected ? AppColors.tasksBlue : AppColors.textPrimary,
                        ),
                      ),
                      trailing: isSelected && pendingCount > 0
                          ? Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: AppColors.tasksBlue,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                '$pendingCount',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            )
                          : null,
                      selected: isSelected,
                      onTap: () {
                        setState(() => _selectedListId = list.id);
                        Navigator.pop(context);
                        _loadTasks();
                      },
                    );
                  }),
                  const Divider(),
                  ListTile(
                    leading: const Icon(Icons.add, color: AppColors.tasksBlue),
                    title: const Text('Neue Liste'),
                    onTap: () {
                      Navigator.pop(context);
                      _createTaskList();
                    },
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.tasksBlue),
      );
    }

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 64, color: AppColors.error),
            const SizedBox(height: 16),
            Text(_error!, style: const TextStyle(color: AppColors.error)),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _loadTaskLists,
              child: const Text('Erneut versuchen'),
            ),
          ],
        ),
      );
    }

    if (_taskLists.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.checklist, size: 64, color: AppColors.textSecondary),
            const SizedBox(height: 16),
            const Text(
              'Keine Aufgabenlisten',
              style: TextStyle(fontSize: 18, color: AppColors.textSecondary),
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: _createTaskList,
              icon: const Icon(Icons.add),
              label: const Text('Liste erstellen'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.tasksBlue,
                foregroundColor: Colors.white,
              ),
            ),
          ],
        ),
      );
    }

    final filteredTasks = _showCompleted
        ? _tasks
        : _tasks.where((t) => !t.isCompleted).toList();

    if (filteredTasks.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              _showCompleted ? Icons.inbox : Icons.check_circle_outline,
              size: 64,
              color: AppColors.textSecondary,
            ),
            const SizedBox(height: 16),
            Text(
              _showCompleted ? 'Keine Aufgaben' : 'Alle Aufgaben erledigt!',
              style: const TextStyle(fontSize: 18, color: AppColors.textSecondary),
            ),
          ],
        ),
      );
    }

    // Gruppiere nach Fälligkeit
    final overdue = <Task>[];
    final today = <Task>[];
    final upcoming = <Task>[];
    final noDue = <Task>[];
    final completed = <Task>[];

    final now = DateTime.now();
    final todayDate = DateTime(now.year, now.month, now.day);

    for (final task in filteredTasks) {
      if (task.isCompleted) {
        completed.add(task);
      } else if (task.dueDate == null) {
        noDue.add(task);
      } else {
        final dueDate = DateTime(task.dueDate!.year, task.dueDate!.month, task.dueDate!.day);
        if (dueDate.isBefore(todayDate)) {
          overdue.add(task);
        } else if (dueDate.isAtSameMomentAs(todayDate)) {
          today.add(task);
        } else {
          upcoming.add(task);
        }
      }
    }

    return RefreshIndicator(
      onRefresh: _loadTasks,
      color: AppColors.tasksBlue,
      child: ListView(
        padding: const EdgeInsets.only(bottom: 80),
        children: [
          if (overdue.isNotEmpty) ...[
            _buildSectionHeader('Überfällig', Colors.red),
            ...overdue.map((t) => _TaskListItem(
              task: t,
              onToggle: () => _toggleTask(t),
              onTap: () => _openTask(t),
            )),
          ],
          if (today.isNotEmpty) ...[
            _buildSectionHeader('Heute', AppColors.tasksBlue),
            ...today.map((t) => _TaskListItem(
              task: t,
              onToggle: () => _toggleTask(t),
              onTap: () => _openTask(t),
            )),
          ],
          if (upcoming.isNotEmpty) ...[
            _buildSectionHeader('Demnächst', AppColors.textSecondary),
            ...upcoming.map((t) => _TaskListItem(
              task: t,
              onToggle: () => _toggleTask(t),
              onTap: () => _openTask(t),
            )),
          ],
          if (noDue.isNotEmpty) ...[
            _buildSectionHeader('Ohne Datum', AppColors.textSecondary),
            ...noDue.map((t) => _TaskListItem(
              task: t,
              onToggle: () => _toggleTask(t),
              onTap: () => _openTask(t),
            )),
          ],
          if (_showCompleted && completed.isNotEmpty) ...[
            _buildSectionHeader('Erledigt', AppColors.success),
            ...completed.map((t) => _TaskListItem(
              task: t,
              onToggle: () => _toggleTask(t),
              onTap: () => _openTask(t),
            )),
          ],
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title, Color color) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      child: Text(
        title,
        style: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: color,
        ),
      ),
    );
  }

  void _openTask(Task task) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => TaskDetailScreen(
          task: task,
          listId: _selectedListId!,
          onUpdate: _loadTasks,
        ),
      ),
    );
  }
}

class _TaskListItem extends StatelessWidget {
  final Task task;
  final VoidCallback onToggle;
  final VoidCallback onTap;

  const _TaskListItem({
    required this.task,
    required this.onToggle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      onTap: onTap,
      leading: IconButton(
        icon: Icon(
          task.isCompleted ? Icons.check_circle : Icons.radio_button_unchecked,
          color: task.isCompleted ? AppColors.success : AppColors.textSecondary,
        ),
        onPressed: onToggle,
      ),
      title: Text(
        task.title,
        style: TextStyle(
          decoration: task.isCompleted ? TextDecoration.lineThrough : null,
          color: task.isCompleted ? AppColors.textSecondary : AppColors.textPrimary,
        ),
      ),
      subtitle: task.dueDate != null
          ? Text(
              DateFormat('dd.MM.yyyy').format(task.dueDate!),
              style: TextStyle(
                fontSize: 12,
                color: _getDueDateColor(),
              ),
            )
          : null,
      trailing: task.priority != null && task.priority! > 0
          ? Icon(
              Icons.flag,
              size: 18,
              color: _getPriorityColor(),
            )
          : null,
    );
  }

  Color _getDueDateColor() {
    if (task.isCompleted) return AppColors.textSecondary;
    if (task.dueDate == null) return AppColors.textSecondary;
    
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final dueDate = DateTime(task.dueDate!.year, task.dueDate!.month, task.dueDate!.day);
    
    if (dueDate.isBefore(today)) return Colors.red;
    if (dueDate.isAtSameMomentAs(today)) return AppColors.tasksBlue;
    return AppColors.textSecondary;
  }

  Color _getPriorityColor() {
    switch (task.priority) {
      case 3:
        return Colors.red;
      case 2:
        return Colors.orange;
      case 1:
        return AppColors.tasksBlue;
      default:
        return AppColors.textSecondary;
    }
  }
}

class TaskDetailScreen extends StatefulWidget {
  final Task task;
  final String listId;
  final VoidCallback onUpdate;

  const TaskDetailScreen({
    super.key,
    required this.task,
    required this.listId,
    required this.onUpdate,
  });

  @override
  State<TaskDetailScreen> createState() => _TaskDetailScreenState();
}

class _TaskDetailScreenState extends State<TaskDetailScreen> {
  final ApiService _apiService = ApiService();
  
  late TextEditingController _titleController;
  late TextEditingController _notesController;
  DateTime? _dueDate;
  int _priority = 0;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _titleController = TextEditingController(text: widget.task.title);
    _notesController = TextEditingController(text: widget.task.notes ?? '');
    _dueDate = widget.task.dueDate;
    _priority = widget.task.priority ?? 0;
  }

  @override
  void dispose() {
    _titleController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_titleController.text.isEmpty) return;

    setState(() => _isSaving = true);

    try {
      await _apiService.updateTask(
        listId: widget.listId,
        taskId: widget.task.id,
        title: _titleController.text,
        notes: _notesController.text.isNotEmpty ? _notesController.text : null,
        dueDate: _dueDate,
        priority: _priority,
      );
      
      widget.onUpdate();
      if (mounted) {
        Navigator.pop(context);
      }
    } catch (e) { // Fehler ignorieren 
    }

    setState(() => _isSaving = false);
  }

  Future<void> _delete() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Aufgabe löschen'),
        content: const Text('Möchten Sie diese Aufgabe wirklich löschen?'),
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
        await _apiService.deleteTask(
          listId: widget.listId,
          taskId: widget.task.id,
        );
        widget.onUpdate();
        if (mounted) {
          Navigator.pop(context);
        }
      } catch (e) { // Fehler ignorieren 
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        title: const Text('Aufgabe bearbeiten'),
        actions: [
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
                  icon: const Icon(Icons.check, color: AppColors.tasksBlue),
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
            const SizedBox(height: 16),
            
            // Due Date
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.calendar_today),
              title: Text(
                _dueDate != null
                    ? DateFormat('dd.MM.yyyy').format(_dueDate!)
                    : 'Fälligkeitsdatum',
              ),
              trailing: _dueDate != null
                  ? IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => setState(() => _dueDate = null),
                    )
                  : null,
              onTap: () async {
                final date = await showDatePicker(
                  context: context,
                  initialDate: _dueDate ?? DateTime.now(),
                  firstDate: DateTime.now().subtract(const Duration(days: 365)),
                  lastDate: DateTime.now().add(const Duration(days: 365 * 5)),
                );
                if (date != null) {
                  setState(() => _dueDate = date);
                }
              },
            ),
            
            const Divider(),
            
            // Priority
            const Text('Priorität', style: TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            Row(
              children: [
                _PriorityChip(
                  label: 'Keine',
                  priority: 0,
                  selected: _priority == 0,
                  onTap: () => setState(() => _priority = 0),
                ),
                const SizedBox(width: 8),
                _PriorityChip(
                  label: 'Niedrig',
                  priority: 1,
                  selected: _priority == 1,
                  onTap: () => setState(() => _priority = 1),
                ),
                const SizedBox(width: 8),
                _PriorityChip(
                  label: 'Mittel',
                  priority: 2,
                  selected: _priority == 2,
                  onTap: () => setState(() => _priority = 2),
                ),
                const SizedBox(width: 8),
                _PriorityChip(
                  label: 'Hoch',
                  priority: 3,
                  selected: _priority == 3,
                  onTap: () => setState(() => _priority = 3),
                ),
              ],
            ),
            
            const SizedBox(height: 24),
            
            // Notes
            TextField(
              controller: _notesController,
              decoration: const InputDecoration(
                labelText: 'Notizen',
                border: OutlineInputBorder(),
                alignLabelWithHint: true,
              ),
              maxLines: 5,
            ),
          ],
        ),
      ),
    );
  }
}

class _PriorityChip extends StatelessWidget {
  final String label;
  final int priority;
  final bool selected;
  final VoidCallback onTap;

  const _PriorityChip({
    required this.label,
    required this.priority,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    Color color;
    switch (priority) {
      case 3:
        color = Colors.red;
        break;
      case 2:
        color = Colors.orange;
        break;
      case 1:
        color = AppColors.tasksBlue;
        break;
      default:
        color = AppColors.textSecondary;
    }

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: selected ? color.withValues(alpha: 0.2) : Colors.transparent,
          border: Border.all(color: selected ? color : AppColors.divider),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: selected ? color : AppColors.textSecondary,
            fontWeight: selected ? FontWeight.w600 : FontWeight.normal,
          ),
        ),
      ),
    );
  }
}
