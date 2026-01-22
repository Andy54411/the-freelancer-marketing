import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:file_picker/file_picker.dart';
import 'package:share_plus/share_plus.dart';
import '../../theme/app_theme.dart';
import '../../services/api_service.dart';

class PhotosScreen extends StatefulWidget {
  const PhotosScreen({super.key});

  @override
  State<PhotosScreen> createState() => _PhotosScreenState();
}

class _PhotosScreenState extends State<PhotosScreen> with SingleTickerProviderStateMixin {
  final ApiService _apiService = ApiService();
  late TabController _tabController;
  
  List<PhotoItem> _photos = [];
  List<Album> _albums = [];
  bool _isLoading = true;
  bool _isSearching = false;
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();
  String? _error;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadPhotos();
    _loadAlbums();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadPhotos() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final result = await _apiService.getPhotos();
      
      if (result['success'] == true) {
        final photos = <PhotoItem>[];
        for (final photo in result['photos'] ?? []) {
          photos.add(PhotoItem.fromJson(photo));
        }
        setState(() => _photos = photos);
      }
    } catch (e) { // Fehler ignorieren 
      setState(() => _error = e.toString());
    }

    setState(() => _isLoading = false);
  }

  Future<void> _loadAlbums() async {
    try {
      final result = await _apiService.getPhotoAlbums();
      
      if (result['success'] == true) {
        final albums = <Album>[];
        for (final album in result['albums'] ?? []) {
          albums.add(Album.fromJson(album));
        }
        setState(() => _albums = albums);
      }
    } catch (e) { // Fehler ignorieren 
      // Ignorieren
    }
  }

  Future<void> _searchPhotos(String query) async {
    if (query.isEmpty) {
      _loadPhotos();
      return;
    }

    setState(() {
      _isLoading = true;
      _searchQuery = query;
    });

    try {
      final result = await _apiService.searchPhotos(query);
      if (result['success'] == true) {
        final photos = <PhotoItem>[];
        for (final photo in result['photos'] ?? []) {
          photos.add(PhotoItem.fromJson(photo));
        }
        setState(() => _photos = photos);
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
        _loadPhotos();
      }
    });
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
                  hintText: 'Fotos durchsuchen...',
                  border: InputBorder.none,
                  hintStyle: TextStyle(color: AppColors.textSecondary),
                ),
                onSubmitted: _searchPhotos,
              )
            : Text(_searchQuery.isNotEmpty ? 'Suche: $_searchQuery' : 'Fotos'),
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppColors.photosGreen,
          unselectedLabelColor: AppColors.textSecondary,
          indicatorColor: AppColors.photosGreen,
          tabs: const [
            Tab(text: 'Fotos'),
            Tab(text: 'Alben'),
          ],
        ),
        actions: [
          IconButton(
            icon: Icon(_isSearching ? Icons.close : Icons.search),
            onPressed: _toggleSearch,
          ),
        ],
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildPhotosTab(),
          _buildAlbumsTab(),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        heroTag: 'photosFab',
        onPressed: _uploadPhoto,
        backgroundColor: AppColors.photosGreen,
        child: const Icon(Icons.add_photo_alternate, color: Colors.white),
      ),
    );
  }

  Widget _buildPhotosTab() {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.photosGreen),
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
              onPressed: _loadPhotos,
              child: const Text('Erneut versuchen'),
            ),
          ],
        ),
      );
    }

    if (_photos.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.photo_library, size: 64, color: AppColors.textSecondary),
            const SizedBox(height: 16),
            const Text(
              'Keine Fotos',
              style: TextStyle(fontSize: 18, color: AppColors.textSecondary),
            ),
            const SizedBox(height: 8),
            const Text(
              'Tippen Sie auf + um Fotos hochzuladen',
              style: TextStyle(color: AppColors.textSecondary),
            ),
          ],
        ),
      );
    }

    // Gruppiere Fotos nach Datum
    final grouped = <String, List<PhotoItem>>{};
    for (final photo in _photos) {
      final dateKey = '${photo.date.year}-${photo.date.month.toString().padLeft(2, '0')}';
      grouped.putIfAbsent(dateKey, () => []).add(photo);
    }

    final sortedKeys = grouped.keys.toList()..sort((a, b) => b.compareTo(a));

    return RefreshIndicator(
      onRefresh: _loadPhotos,
      color: AppColors.photosGreen,
      child: ListView.builder(
        itemCount: sortedKeys.length,
        itemBuilder: (context, index) {
          final key = sortedKeys[index];
          final photos = grouped[key]!;
          final date = DateTime.parse('$key-01');
          final monthName = _getMonthName(date.month);
          
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.all(16),
                child: Text(
                  '$monthName ${date.year}',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
              GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 4),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 3,
                  mainAxisSpacing: 4,
                  crossAxisSpacing: 4,
                ),
                itemCount: photos.length,
                itemBuilder: (context, photoIndex) {
                  final photo = photos[photoIndex];
                  return _PhotoGridItem(
                    photo: photo,
                    onTap: () => _openPhoto(photo),
                  );
                },
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildAlbumsTab() {
    if (_albums.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.photo_album, size: 64, color: AppColors.textSecondary),
            const SizedBox(height: 16),
            const Text(
              'Keine Alben',
              style: TextStyle(fontSize: 18, color: AppColors.textSecondary),
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: _createAlbum,
              icon: const Icon(Icons.add),
              label: const Text('Album erstellen'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.photosGreen,
                foregroundColor: Colors.white,
              ),
            ),
          ],
        ),
      );
    }

    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        mainAxisSpacing: 16,
        crossAxisSpacing: 16,
        childAspectRatio: 0.85,
      ),
      itemCount: _albums.length,
      itemBuilder: (context, index) {
        final album = _albums[index];
        return _AlbumCard(
          album: album,
          onTap: () => _openAlbum(album),
        );
      },
    );
  }

  void _openPhoto(PhotoItem photo) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => PhotoViewScreen(
          photo: photo,
          photos: _photos,
          onDelete: (deletedPhoto) {
            setState(() {
              _photos.removeWhere((p) => p.id == deletedPhoto.id);
            });
          },
        ),
      ),
    );
  }

  void _openAlbum(Album album) {
    Navigator.push(context, MaterialPageRoute(builder: (context) => AlbumScreen(album: album)));
  }

  Future<void> _uploadPhoto() async {
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
            await _apiService.uploadPhoto(
              fileName: file.name,
              fileBytes: file.bytes!,
            );
          }
        }

        
        _loadPhotos();
      }
    } catch (e) { // Fehler ignorieren 
      setState(() => _isLoading = false);
    }
  }

  Future<void> _createAlbum() async {
    final nameController = TextEditingController();
    
    final name = await showDialog<String>(context: context, builder: (context) => 
      AlertDialog(
        title: const Text('Neues Album'),
        content: TextField(
          controller: nameController,
          autofocus: true,
          decoration: const InputDecoration(hintText: 'Albumname'),
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
      final result = await _apiService.createPhotoAlbum(name);
      if (result['success'] == true) {
        _loadAlbums();
      } else {
      }
    }
  }

  String _getMonthName(int month) {
    const months = [
      'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
      'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
    ];
    return months[month - 1];
  }
}

class _PhotoGridItem extends StatelessWidget {
  final PhotoItem photo;
  final VoidCallback onTap;

  const _PhotoGridItem({
    required this.photo,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Hero(
        tag: 'photo_${photo.id}',
        child: CachedNetworkImage(
          imageUrl: photo.thumbnailUrl,
          fit: BoxFit.cover,
          placeholder: (context, url) => Container(
            color: AppColors.divider,
            child: const Center(
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: AppColors.photosGreen,
              ),
            ),
          ),
          errorWidget: (context, url, error) => Container(
            color: AppColors.divider,
            child: const Icon(Icons.broken_image, color: AppColors.textSecondary),
          ),
        ),
      ),
    );
  }
}

class _AlbumCard extends StatelessWidget {
  final Album album;
  final VoidCallback onTap;

  const _AlbumCard({
    required this.album,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Container(
              decoration: BoxDecoration(
                color: AppColors.divider,
                borderRadius: BorderRadius.circular(12),
              ),
              child: album.coverUrl != null
                  ? ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: CachedNetworkImage(
                        imageUrl: album.coverUrl!,
                        fit: BoxFit.cover,
                        width: double.infinity,
                      ),
                    )
                  : const Center(
                      child: Icon(Icons.photo_album, size: 48, color: AppColors.textSecondary),
                    ),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            album.name,
            style: const TextStyle(fontWeight: FontWeight.w600),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          Text(
            '${album.photoCount} Fotos',
            style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
          ),
        ],
      ),
    );
  }
}

class PhotoViewScreen extends StatefulWidget {
  final PhotoItem photo;
  final List<PhotoItem> photos;
  final Function(PhotoItem)? onDelete;

  const PhotoViewScreen({
    super.key,
    required this.photo,
    required this.photos,
    this.onDelete,
  });

  @override
  State<PhotoViewScreen> createState() => _PhotoViewScreenState();
}

class _PhotoViewScreenState extends State<PhotoViewScreen> {
  final ApiService _apiService = ApiService();
  late PageController _pageController;
  late int _currentIndex;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.photos.indexOf(widget.photo);
    _pageController = PageController(initialPage: _currentIndex);
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  Future<void> _sharePhoto() async {
    final photo = widget.photos[_currentIndex];
    final result = await _apiService.sharePhoto(photo.id);
    
    if (result['success'] == true && result['shareUrl'] != null) {
      await Share.share(
        result['shareUrl'],
        subject: 'Geteiltes Foto von Taskilo',
      );
    } else {
      // Fallback: Teile direkt die URL
      await Share.share(
        photo.fullUrl,
        subject: 'Geteiltes Foto von Taskilo',
      );
    }
  }

  Future<void> _deletePhoto() async {
    final photo = widget.photos[_currentIndex];
    
    final confirm = await showDialog<bool>(context: context, builder: (context) => 
      AlertDialog(
        title: const Text('Foto löschen'),
        content: const Text('Möchten Sie dieses Foto wirklich löschen?'),
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
      final result = await _apiService.deletePhoto(photo.id);
      
      if (result['success'] == true) {
        widget.onDelete?.call(photo);
        
        if (!mounted) return;
        if (widget.photos.length <= 1) {
          Navigator.pop(context);
        } else {
          setState(() {
            widget.photos.removeAt(_currentIndex);
            if (_currentIndex >= widget.photos.length) {
              _currentIndex = widget.photos.length - 1;
            }
          });
        }
        
      } else {
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: Text('${_currentIndex + 1} / ${widget.photos.length}'),
        actions: [
          IconButton(
            icon: const Icon(Icons.share),
            onPressed: _sharePhoto,
          ),
          IconButton(
            icon: const Icon(Icons.delete),
            onPressed: _deletePhoto,
          ),
        ],
      ),
      body: PageView.builder(
        controller: _pageController,
        itemCount: widget.photos.length,
        onPageChanged: (index) => setState(() => _currentIndex = index),
        itemBuilder: (context, index) {
          final photo = widget.photos[index];
          return InteractiveViewer(
            child: Center(
              child: Hero(
                tag: 'photo_${photo.id}',
                child: CachedNetworkImage(
                  imageUrl: photo.fullUrl,
                  fit: BoxFit.contain,
                  placeholder: (context, url) => const Center(
                    child: CircularProgressIndicator(color: Colors.white),
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

/// Album Detail Screen
class AlbumScreen extends StatefulWidget {
  final Album album;

  const AlbumScreen({super.key, required this.album});

  @override
  State<AlbumScreen> createState() => _AlbumScreenState();
}

class _AlbumScreenState extends State<AlbumScreen> {
  final ApiService _apiService = ApiService();
  List<PhotoItem> _photos = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadAlbumPhotos();
  }

  Future<void> _loadAlbumPhotos() async {
    setState(() => _isLoading = true);

    try {
      final result = await _apiService.getAlbumPhotos(widget.album.id);
      if (result['success'] == true) {
        final photos = <PhotoItem>[];
        for (final photo in result['photos'] ?? []) {
          photos.add(PhotoItem.fromJson(photo));
        }
        setState(() => _photos = photos);
      }
    } catch (e) { // Fehler ignorieren 
    }

    setState(() => _isLoading = false);
  }

  Future<void> _uploadToAlbum() async {
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
            await _apiService.uploadPhoto(
              fileName: file.name,
              fileBytes: file.bytes!,
              albumId: widget.album.id,
            );
          }
        }

        
        _loadAlbumPhotos();
      }
    } catch (e) { // Fehler ignorieren 
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        title: Text(widget.album.name),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppColors.photosGreen))
          : _photos.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.photo_library, size: 64, color: AppColors.textSecondary),
                      const SizedBox(height: 16),
                      const Text(
                        'Album ist leer',
                        style: TextStyle(fontSize: 18, color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadAlbumPhotos,
                  color: AppColors.photosGreen,
                  child: GridView.builder(
                    padding: const EdgeInsets.all(4),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 3,
                      mainAxisSpacing: 4,
                      crossAxisSpacing: 4,
                    ),
                    itemCount: _photos.length,
                    itemBuilder: (context, index) {
                      final photo = _photos[index];
                      return GestureDetector(
                        onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => PhotoViewScreen(
                              photo: photo,
                              photos: _photos,
                              onDelete: (deletedPhoto) {
                                setState(() {
                                  _photos.removeWhere((p) => p.id == deletedPhoto.id);
                                });
                              },
                            ),
                          ),
                        ),
                        child: Hero(
                          tag: 'photo_${photo.id}',
                          child: CachedNetworkImage(
                            imageUrl: photo.thumbnailUrl,
                            fit: BoxFit.cover,
                            placeholder: (context, url) => Container(
                              color: AppColors.divider,
                              child: const Center(
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: AppColors.photosGreen,
                                ),
                              ),
                            ),
                            errorWidget: (context, url, error) => Container(
                              color: AppColors.divider,
                              child: const Icon(Icons.broken_image, color: AppColors.textSecondary),
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
      floatingActionButton: FloatingActionButton(
        heroTag: 'photosAlbumFab',
        onPressed: _uploadToAlbum,
        backgroundColor: AppColors.photosGreen,
        child: const Icon(Icons.add_photo_alternate, color: Colors.white),
      ),
    );
  }
}

// Models
class PhotoItem {
  final String id;
  final String thumbnailUrl;
  final String fullUrl;
  final DateTime date;
  final int width;
  final int height;

  PhotoItem({
    required this.id,
    required this.thumbnailUrl,
    required this.fullUrl,
    required this.date,
    required this.width,
    required this.height,
  });

  factory PhotoItem.fromJson(Map<String, dynamic> json) {
    return PhotoItem(
      id: json['id'] ?? json['_id'] ?? '',
      thumbnailUrl: json['thumbnailUrl'] ?? json['thumbnail'] ?? '',
      fullUrl: json['fullUrl'] ?? json['url'] ?? '',
      date: json['date'] != null
          ? DateTime.parse(json['date'])
          : json['createdAt'] != null
              ? DateTime.parse(json['createdAt'])
              : DateTime.now(),
      width: json['width'] ?? 0,
      height: json['height'] ?? 0,
    );
  }
}

class Album {
  final String id;
  final String name;
  final String? coverUrl;
  final int photoCount;

  Album({
    required this.id,
    required this.name,
    this.coverUrl,
    required this.photoCount,
  });

  factory Album.fromJson(Map<String, dynamic> json) {
    return Album(
      id: json['id'] ?? json['_id'] ?? '',
      name: json['name'] ?? '',
      coverUrl: json['coverUrl'],
      photoCount: json['photoCount'] ?? json['count'] ?? 0,
    );
  }
}
