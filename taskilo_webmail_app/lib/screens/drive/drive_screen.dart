import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:file_picker/file_picker.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../theme/app_theme.dart';
import '../../services/api_service.dart';
import '../../models/drive_models.dart';

class DriveScreen extends StatefulWidget {
  const DriveScreen({super.key});

  @override
  State<DriveScreen> createState() => _DriveScreenState();
}

class _DriveScreenState extends State<DriveScreen> {
  final ApiService _apiService = ApiService();
  
  List<dynamic> _items = [];
  List<Breadcrumb> _breadcrumbs = [];
  StorageInfo? _storageInfo;
  String _currentFolderId = 'root';
  bool _isLoading = true;
  bool _isGridView = true;
  bool _isSearching = false;
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadFolder('root');
    _loadStorageInfo();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadFolder(String folderId) async {
    setState(() {
      _isLoading = true;
      _error = null;
      _currentFolderId = folderId;
    });

    try {
      final result = await _apiService.getDriveFolder(folderId);
      
      if (result['success'] == true) {
        final items = <dynamic>[];
        
        if (result['folders'] != null) {
          for (final folder in result['folders']) {
            items.add(DriveFolder.fromJson(folder));
          }
        }
        
        if (result['files'] != null) {
          for (final file in result['files']) {
            items.add(DriveFile.fromJson(file));
          }
        }

        final breadcrumbs = <Breadcrumb>[];
        if (result['breadcrumbs'] != null) {
          for (final crumb in result['breadcrumbs']) {
            breadcrumbs.add(Breadcrumb.fromJson(crumb));
          }
        }

        setState(() {
          _items = items;
          _breadcrumbs = breadcrumbs;
        });
      }
    } catch (e) { // Fehler ignorieren 
      setState(() => _error = e.toString());
    }

    setState(() => _isLoading = false);
  }

  Future<void> _loadStorageInfo() async {
    try {
      final result = await _apiService.getDriveStorageInfo();
      if (result['success'] == true) {
        setState(() {
          _storageInfo = StorageInfo.fromJson(result['storage']);
        });
      }
    } catch (e) { // Fehler ignorieren 
      // Ignorieren
    }
  }

  Future<void> _createFolder() async {
    final nameController = TextEditingController();
    
    final name = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Neuer Ordner'),
        content: TextField(
          controller: nameController,
          autofocus: true,
          decoration: const InputDecoration(
            hintText: 'Ordnername',
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
        await _apiService.createDriveFolder(
          name: name,
          parentId: _currentFolderId == 'root' ? null : _currentFolderId,
        );
        _loadFolder(_currentFolderId);
      } catch (e) { // Fehler ignorieren 
      }
    }
  }

  Future<void> _uploadFile() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        allowMultiple: true,
        withData: true,
      );

      if (result != null && result.files.isNotEmpty) {
        setState(() => _isLoading = true);
        
        for (final file in result.files) {
          if (file.bytes != null) {
            await _apiService.uploadDriveFile(
              fileName: file.name,
              fileBytes: file.bytes!,
              parentId: _currentFolderId == 'root' ? null : _currentFolderId,
            );
          }
        }

        
        _loadFolder(_currentFolderId);
      }
    } catch (e) { // Fehler ignorieren 
      setState(() => _isLoading = false);
    }
  }

  Future<void> _searchFiles(String query) async {
    if (query.isEmpty) {
      _loadFolder(_currentFolderId);
      return;
    }

    setState(() {
      _isLoading = true;
      _searchQuery = query;
    });

    try {
      final result = await _apiService.searchDrive(query);
      if (result['success'] == true) {
        final items = <dynamic>[];
        
        if (result['folders'] != null) {
          for (final folder in result['folders']) {
            items.add(DriveFolder.fromJson(folder));
          }
        }
        
        if (result['files'] != null) {
          for (final file in result['files']) {
            items.add(DriveFile.fromJson(file));
          }
        }

        setState(() {
          _items = items;
          _breadcrumbs = [];
        });
      }
    } catch (e) { // Fehler ignorieren 
      setState(() => _error = e.toString());
    }

    setState(() => _isLoading = false);
  }

  void _toggleSearch() {
    setState(() {
      _isSearching = !_isSearching;
      if (!_isSearching) {
        _searchController.clear();
        _searchQuery = '';
        _loadFolder(_currentFolderId);
      }
    });
  }

  Future<void> _downloadFile(DriveFile file) async {
    try {
      final url = _apiService.getDriveFileUrl(file.id);
      final uri = Uri.parse(url);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      }
    } catch (e) { // Fehler ignorieren 
    }
  }

  Future<void> _renameItem(dynamic item) async {
    final isFolder = item is DriveFolder;
    final currentName = isFolder ? item.name : (item as DriveFile).name;
    final itemId = isFolder ? item.id : (item as DriveFile).id;
    final nameController = TextEditingController(text: currentName);
    
    final newName = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Umbenennen'),
        content: TextField(
          controller: nameController,
          autofocus: true,
          decoration: const InputDecoration(
            hintText: 'Neuer Name',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Abbrechen'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, nameController.text),
            child: const Text('Speichern'),
          ),
        ],
      ),
    );

    if (newName != null && newName.isNotEmpty && newName != currentName) {
      final result = await _apiService.renameDriveItem(itemId, newName, isFolder: isFolder);
      if (result['success'] == true) {
        _loadFolder(_currentFolderId);
      } else {
      }
    }
  }

  Future<void> _shareItem(dynamic item) async {
    final isFolder = item is DriveFolder;
    final itemId = isFolder ? item.id : (item as DriveFile).id;
    final emailController = TextEditingController();
    
    final email = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Teilen'),
        content: TextField(
          controller: emailController,
          autofocus: true,
          keyboardType: TextInputType.emailAddress,
          decoration: const InputDecoration(
            hintText: 'E-Mail-Adresse eingeben',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Abbrechen'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, emailController.text),
            child: const Text('Teilen'),
          ),
        ],
      ),
    );

    if (email != null && email.isNotEmpty) {
      final result = await _apiService.shareDriveItem(itemId, [email], isFolder: isFolder);
      if (result['success'] == true) {
      } else {
      }
    }
  }

  Future<void> _deleteItem(dynamic item) async {
    final isFolder = item is DriveFolder;
    final itemId = isFolder ? item.id : (item as DriveFile).id;
    final name = isFolder ? item.name : (item as DriveFile).name;

    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Löschen bestätigen'),
        content: Text('Möchten Sie "$name" wirklich löschen?'),
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
      final result = await _apiService.deleteDriveItem(itemId, isFolder: isFolder);
      if (result['success'] == true) {
        _loadFolder(_currentFolderId);
      } else {
      }
    }
  }

  void _openFilePreview(DriveFile file) {
    showDialog(
      context: context,
      builder: (context) => Dialog(
        child: Container(
          constraints: const BoxConstraints(maxWidth: 600, maxHeight: 600),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              AppBar(
                title: Text(file.name),
                automaticallyImplyLeading: false,
                actions: [
                  IconButton(
                    icon: const Icon(Icons.download),
                    onPressed: () => _downloadFile(file),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              Expanded(
                child: file.mimeType.startsWith('image/')
                    ? Image.network(
                        _apiService.getDriveFileUrl(file.id),
                        fit: BoxFit.contain,
                        errorBuilder: (context, error, stackTrace) => const Center(
                          child: Icon(Icons.broken_image, size: 64),
                        ),
                      )
                    : Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.insert_drive_file, size: 64, color: AppColors.textSecondary),
                            const SizedBox(height: 16),
                            Text(file.name),
                            const SizedBox(height: 8),
                            Text(
                              _formatSize(file.size),
                              style: const TextStyle(color: AppColors.textSecondary),
                            ),
                            const SizedBox(height: 16),
                            ElevatedButton.icon(
                              onPressed: () => _downloadFile(file),
                              icon: const Icon(Icons.download),
                              label: const Text('Herunterladen'),
                            ),
                          ],
                        ),
                      ),
              ),
            ],
          ),
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
        title: _isSearching
            ? TextField(
                controller: _searchController,
                autofocus: true,
                decoration: const InputDecoration(
                  hintText: 'Dateien durchsuchen...',
                  border: InputBorder.none,
                  hintStyle: TextStyle(color: AppColors.textSecondary),
                ),
                onSubmitted: _searchFiles,
              )
            : Text(_searchQuery.isNotEmpty ? 'Suche: $_searchQuery' : 'Drive'),
        actions: [
          IconButton(
            icon: Icon(_isGridView ? Icons.list : Icons.grid_view),
            onPressed: () => setState(() => _isGridView = !_isGridView),
          ),
          IconButton(
            icon: Icon(_isSearching ? Icons.close : Icons.search),
            onPressed: _toggleSearch,
          ),
        ],
      ),
      body: Column(
        children: [
          // Breadcrumbs
          if (_breadcrumbs.isNotEmpty)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              color: AppColors.surface,
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    InkWell(
                      onTap: () => _loadFolder('root'),
                      child: const Row(
                        children: [
                          Icon(Icons.home, size: 20, color: AppColors.driveYellow),
                          SizedBox(width: 4),
                          Text('Meine Ablage'),
                        ],
                      ),
                    ),
                    ..._breadcrumbs.map((crumb) => Row(
                      children: [
                        const Padding(
                          padding: EdgeInsets.symmetric(horizontal: 8),
                          child: Icon(Icons.chevron_right, size: 18, color: AppColors.textSecondary),
                        ),
                        InkWell(
                          onTap: () {
                            if (crumb.id != null) _loadFolder(crumb.id!);
                          },
                          child: Text(crumb.name),
                        ),
                      ],
                    )),
                  ],
                ),
              ),
            ),
          
          // Storage Info
          if (_storageInfo != null)
            Container(
              padding: const EdgeInsets.all(16),
              color: AppColors.surface,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '${_formatSize(_storageInfo!.used)} von ${_formatSize(_storageInfo!.total)} verwendet',
                        style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                      ),
                      Text(
                        '${(_storageInfo!.used / _storageInfo!.total * 100).toStringAsFixed(1)}%',
                        style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: _storageInfo!.used / _storageInfo!.total,
                      backgroundColor: AppColors.divider,
                      valueColor: AlwaysStoppedAnimation<Color>(AppColors.driveYellow),
                      minHeight: 6,
                    ),
                  ),
                ],
              ),
            ),
          
          const Divider(height: 1),
          
          // Content
          Expanded(child: _buildBody()),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        heroTag: 'driveFab',
        onPressed: () => _showAddMenu(),
        backgroundColor: AppColors.driveYellow,
        child: const Icon(Icons.add, color: Colors.white),
      ),
    );
  }

  void _showAddMenu() {
    showModalBottomSheet(
      context: context,
      builder: (context) => Container(
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: const BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.create_new_folder, color: AppColors.driveYellow),
              title: const Text('Neuer Ordner'),
              onTap: () {
                Navigator.pop(context);
                _createFolder();
              },
            ),
            ListTile(
              leading: const Icon(Icons.upload_file, color: AppColors.driveYellow),
              title: const Text('Datei hochladen'),
              onTap: () {
                Navigator.pop(context);
                _uploadFile();
              },
            ),
            ListTile(
              leading: const Icon(Icons.photo_library, color: AppColors.driveYellow),
              title: const Text('Fotos hochladen'),
              onTap: () async {
                Navigator.pop(context);
                try {
                  final result = await FilePicker.platform.pickFiles(
                    allowMultiple: true,
                    type: FileType.image,
                    withData: true,
                  );
                  if (result != null && result.files.isNotEmpty) {
                    setState(() => _isLoading = true);
                    for (final file in result.files) {
                      if (file.bytes != null) {
                        await _apiService.uploadDriveFile(
                          fileName: file.name,
                          fileBytes: file.bytes!,
                          parentId: _currentFolderId == 'root' ? null : _currentFolderId,
                        );
                      }
                    }
                    _loadFolder(_currentFolderId);
                  }
                } catch (e) { // Fehler ignorieren 
                  setState(() => _isLoading = false);
                }
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.driveYellow),
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
              onPressed: () => _loadFolder(_currentFolderId),
              child: const Text('Erneut versuchen'),
            ),
          ],
        ),
      );
    }

    if (_items.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.folder_open, size: 64, color: AppColors.textSecondary),
            const SizedBox(height: 16),
            const Text(
              'Ordner ist leer',
              style: TextStyle(fontSize: 18, color: AppColors.textSecondary),
            ),
            const SizedBox(height: 8),
            const Text(
              'Tippen Sie auf + um Dateien hinzuzufügen',
              style: TextStyle(color: AppColors.textSecondary),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () => _loadFolder(_currentFolderId),
      color: AppColors.driveYellow,
      child: _isGridView ? _buildGridView() : _buildListView(),
    );
  }

  Widget _buildGridView() {
    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 1,
      ),
      itemCount: _items.length,
      itemBuilder: (context, index) {
        final item = _items[index];
        return _DriveGridItem(
          item: item,
          onTap: () => _onItemTap(item),
          onLongPress: () => _showItemMenu(item),
        );
      },
    );
  }

  Widget _buildListView() {
    return ListView.builder(
      itemCount: _items.length,
      itemBuilder: (context, index) {
        final item = _items[index];
        return _DriveListItem(
          item: item,
          onTap: () => _onItemTap(item),
          onLongPress: () => _showItemMenu(item),
        );
      },
    );
  }

  void _onItemTap(dynamic item) {
    if (item is DriveFolder) {
      _loadFolder(item.id);
    } else if (item is DriveFile) {
      _openFilePreview(item);
    }
  }

  void _showItemMenu(dynamic item) {
    final isFolder = item is DriveFolder;
    final name = isFolder ? item.name : (item as DriveFile).name;
    
    showModalBottomSheet(
      context: context,
      builder: (context) => Container(
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: const BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text(
                name,
                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16),
              ),
            ),
            const Divider(),
            ListTile(
              leading: const Icon(Icons.share),
              title: const Text('Teilen'),
              onTap: () {
                Navigator.pop(context);
                _shareItem(item);
              },
            ),
            if (!isFolder)
              ListTile(
                leading: const Icon(Icons.download),
                title: const Text('Herunterladen'),
                onTap: () {
                  Navigator.pop(context);
                  _downloadFile(item as DriveFile);
                },
              ),
            ListTile(
              leading: const Icon(Icons.drive_file_rename_outline),
              title: const Text('Umbenennen'),
              onTap: () {
                Navigator.pop(context);
                _renameItem(item);
              },
            ),
            ListTile(
              leading: const Icon(Icons.delete, color: AppColors.error),
              title: const Text('Löschen', style: TextStyle(color: AppColors.error)),
              onTap: () {
                Navigator.pop(context);
                _deleteItem(item);
              },
            ),
          ],
        ),
      ),
    );
  }

  String _formatSize(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    if (bytes < 1024 * 1024 * 1024) return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
    return '${(bytes / (1024 * 1024 * 1024)).toStringAsFixed(2)} GB';
  }
}

class _DriveGridItem extends StatelessWidget {
  final dynamic item;
  final VoidCallback onTap;
  final VoidCallback onLongPress;

  const _DriveGridItem({
    required this.item,
    required this.onTap,
    required this.onLongPress,
  });

  @override
  Widget build(BuildContext context) {
    final isFolder = item is DriveFolder;
    final name = isFolder ? (item as DriveFolder).name : (item as DriveFile).name;
    
    return InkWell(
      onTap: onTap,
      onLongPress: onLongPress,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.divider),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              isFolder ? Icons.folder : _getFileIcon(item as DriveFile),
              size: 48,
              color: isFolder ? AppColors.driveYellow : AppColors.textSecondary,
            ),
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: Text(
                name,
                style: const TextStyle(fontSize: 13),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
              ),
            ),
          ],
        ),
      ),
    );
  }

  IconData _getFileIcon(DriveFile file) {
    final mime = file.mimeType.toLowerCase();
    if (mime.startsWith('image/')) return Icons.image;
    if (mime.startsWith('video/')) return Icons.video_file;
    if (mime.startsWith('audio/')) return Icons.audio_file;
    if (mime.contains('pdf')) return Icons.picture_as_pdf;
    if (mime.contains('word') || mime.contains('document')) return Icons.description;
    if (mime.contains('sheet') || mime.contains('excel')) return Icons.table_chart;
    if (mime.contains('presentation') || mime.contains('powerpoint')) return Icons.slideshow;
    if (mime.contains('zip') || mime.contains('rar') || mime.contains('archive')) return Icons.archive;
    return Icons.insert_drive_file;
  }
}

class _DriveListItem extends StatelessWidget {
  final dynamic item;
  final VoidCallback onTap;
  final VoidCallback onLongPress;

  const _DriveListItem({
    required this.item,
    required this.onTap,
    required this.onLongPress,
  });

  @override
  Widget build(BuildContext context) {
    final isFolder = item is DriveFolder;
    final name = isFolder ? (item as DriveFolder).name : (item as DriveFile).name;
    final date = isFolder ? (item as DriveFolder).updatedAt : (item as DriveFile).updatedAt;
    
    return ListTile(
      onTap: onTap,
      onLongPress: onLongPress,
      leading: Icon(
        isFolder ? Icons.folder : _getFileIcon(item as DriveFile),
        size: 40,
        color: isFolder ? AppColors.driveYellow : AppColors.textSecondary,
      ),
      title: Text(name, maxLines: 1, overflow: TextOverflow.ellipsis),
      subtitle: Text(
        DateFormat('dd.MM.yyyy').format(date),
        style: const TextStyle(fontSize: 12),
      ),
      trailing: isFolder
          ? null
          : Text(
              _formatSize((item as DriveFile).size),
              style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
            ),
    );
  }

  IconData _getFileIcon(DriveFile file) {
    final mime = file.mimeType.toLowerCase();
    if (mime.startsWith('image/')) return Icons.image;
    if (mime.startsWith('video/')) return Icons.video_file;
    if (mime.startsWith('audio/')) return Icons.audio_file;
    if (mime.contains('pdf')) return Icons.picture_as_pdf;
    return Icons.insert_drive_file;
  }

  String _formatSize(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }
}
