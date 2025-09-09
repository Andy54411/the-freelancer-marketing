import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:image_picker/image_picker.dart';
import 'package:permission_handler/permission_handler.dart';
import 'dart:io';
import '../../models/user_model.dart';
import '../../utils/colors.dart';
import '../dashboard/dashboard_layout.dart';

/// Edit Profile Screen
/// Ermöglicht dem Benutzer sein Profil zu bearbeiten
class EditProfileScreen extends StatefulWidget {
  final TaskiloUser user;

  const EditProfileScreen({
    super.key,
    required this.user,
  });

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _streetController = TextEditingController();
  final _cityController = TextEditingController();
  final _postalCodeController = TextEditingController();
  final _countryController = TextEditingController();
  final _bioController = TextEditingController();

  bool _isLoading = false;
  bool _isUploadingImage = false;
  bool _agreesToNewsletter = false;
  DateTime? _selectedDateOfBirth;
  File? _selectedImage;
  String? _uploadedImageUrl;

  @override
  void initState() {
    super.initState();
    _initializeFields();
  }

  void _initializeFields() {
    final profile = widget.user.profile;
    
    _firstNameController.text = profile?.firstName ?? '';
    _lastNameController.text = profile?.lastName ?? '';
    _phoneController.text = profile?.phoneNumber ?? widget.user.phone ?? '';
    _streetController.text = profile?.street ?? '';
    _cityController.text = profile?.city ?? '';
    _postalCodeController.text = profile?.postalCode ?? '';
    _countryController.text = profile?.country ?? 'Deutschland';
    _bioController.text = profile?.bio ?? '';
    _agreesToNewsletter = profile?.agreesToNewsletter ?? false;
    _selectedDateOfBirth = profile?.dateOfBirth;
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _phoneController.dispose();
    _streetController.dispose();
    _cityController.dispose();
    _postalCodeController.dispose();
    _countryController.dispose();
    _bioController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return DashboardLayout(
      title: 'Profil bearbeiten',
      useGradientBackground: true,
      showBackButton: true,
      showBottomNavigation: false,
      body: _buildForm(),
    );
  }

  Widget _buildForm() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Profile Picture Section
            _buildProfilePictureSection(),
            
            const SizedBox(height: 20),
            
            // Personal Information Section
            _buildSectionCard(
              title: 'Persönliche Informationen',
              icon: Icons.person,
              children: [
                _buildTextField(
                  controller: _firstNameController,
                  label: 'Vorname',
                  icon: Icons.person_outline,
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'Bitte geben Sie Ihren Vornamen ein';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                _buildTextField(
                  controller: _lastNameController,
                  label: 'Nachname',
                  icon: Icons.person_outline,
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'Bitte geben Sie Ihren Nachnamen ein';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                _buildTextField(
                  controller: _phoneController,
                  label: 'Telefonnummer',
                  icon: Icons.phone,
                  keyboardType: TextInputType.phone,
                ),
                const SizedBox(height: 16),
                _buildDateField(),
              ],
            ),

            const SizedBox(height: 20),

            // Address Section
            _buildSectionCard(
              title: 'Adresse',
              icon: Icons.location_on,
              children: [
                _buildTextField(
                  controller: _streetController,
                  label: 'Straße und Hausnummer',
                  icon: Icons.home,
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      flex: 1,
                      child: _buildTextField(
                        controller: _postalCodeController,
                        label: 'PLZ',
                        icon: Icons.local_post_office,
                        keyboardType: TextInputType.number,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      flex: 2,
                      child: _buildTextField(
                        controller: _cityController,
                        label: 'Stadt',
                        icon: Icons.location_city,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                _buildTextField(
                  controller: _countryController,
                  label: 'Land',
                  icon: Icons.flag,
                ),
              ],
            ),

            const SizedBox(height: 20),

            // Bio Section
            _buildSectionCard(
              title: 'Über mich',
              icon: Icons.info,
              children: [
                _buildTextField(
                  controller: _bioController,
                  label: 'Beschreibung (optional)',
                  icon: Icons.edit,
                  maxLines: 4,
                  hintText: 'Erzählen Sie etwas über sich...',
                ),
              ],
            ),

            const SizedBox(height: 20),

            // Settings Section
            _buildSectionCard(
              title: 'Einstellungen',
              icon: Icons.settings,
              children: [
                _buildCheckboxField(
                  value: _agreesToNewsletter,
                  title: 'Newsletter abonnieren',
                  subtitle: 'Erhalten Sie Updates und Angebote per E-Mail',
                  onChanged: (value) => setState(() => _agreesToNewsletter = value ?? false),
                ),
              ],
            ),

            const SizedBox(height: 32),

            // Save Button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isLoading ? null : _saveProfile,
                style: ElevatedButton.styleFrom(
                  backgroundColor: TaskiloColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 18),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                  elevation: 2,
                ),
                child: _isLoading
                    ? const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          ),
                          SizedBox(width: 12),
                          Text('Wird gespeichert...'),
                        ],
                      )
                    : const Text(
                        'Profil speichern',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
              ),
            ),

            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionCard({
    required String title,
    required IconData icon,
    required List<Widget> children,
  }) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: Colors.white, size: 24),
              const SizedBox(width: 8),
              Text(
                title,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          ...children,
        ],
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    String? hintText,
    TextInputType? keyboardType,
    int maxLines = 1,
    String? Function(String?)? validator,
  }) {
    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      maxLines: maxLines,
      validator: validator,
      style: const TextStyle(color: Colors.white),
      decoration: InputDecoration(
        labelText: label,
        hintText: hintText,
        prefixIcon: Icon(icon, color: Colors.white70),
        labelStyle: const TextStyle(color: Colors.white70),
        hintStyle: const TextStyle(color: Colors.white54),
        filled: true,
        fillColor: Colors.white.withValues(alpha: 0.1),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.3)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.3)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: TaskiloColors.primary, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Colors.red, width: 2),
        ),
      ),
    );
  }

  Widget _buildDateField() {
    return InkWell(
      onTap: _selectDateOfBirth,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.white.withValues(alpha: 0.3)),
        ),
        child: Row(
          children: [
            const Icon(Icons.calendar_today, color: Colors.white70),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                _selectedDateOfBirth != null
                    ? 'Geburtsdatum: ${_formatDate(_selectedDateOfBirth!)}'
                    : 'Geburtsdatum auswählen (optional)',
                style: TextStyle(
                  color: _selectedDateOfBirth != null 
                      ? Colors.white 
                      : Colors.white70,
                  fontSize: 16,
                ),
              ),
            ),
            if (_selectedDateOfBirth != null)
              IconButton(
                onPressed: () => setState(() => _selectedDateOfBirth = null),
                icon: const Icon(Icons.clear, color: Colors.white70),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildCheckboxField({
    required bool value,
    required String title,
    required String subtitle,
    required ValueChanged<bool?> onChanged,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          Checkbox(
            value: value,
            onChanged: onChanged,
            activeColor: TaskiloColors.primary,
            checkColor: Colors.white,
            side: const BorderSide(color: Colors.white70),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Text(
                  subtitle,
                  style: const TextStyle(
                    color: Colors.white70,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProfilePictureSection() {
    return _buildSectionCard(
      title: 'Profilbild',
      icon: Icons.camera_alt,
      children: [
        Center(
          child: Column(
            children: [
              // Current Profile Picture
              Stack(
                children: [
                  CircleAvatar(
                    radius: 60,
                    backgroundColor: TaskiloColors.primary.withValues(alpha: 0.3),
                    backgroundImage: _getProfileImage(),
                    child: _getProfileImage() == null
                        ? Icon(
                            Icons.person,
                            size: 80,
                            color: Colors.white.withValues(alpha: 0.7),
                          )
                        : null,
                  ),
                  if (_isUploadingImage)
                    Positioned.fill(
                      child: Container(
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.5),
                          shape: BoxShape.circle,
                        ),
                        child: const Center(
                          child: CircularProgressIndicator(
                            color: Colors.white,
                            strokeWidth: 3,
                          ),
                        ),
                      ),
                    ),
                  Positioned(
                    bottom: 0,
                    right: 0,
                    child: Container(
                      decoration: BoxDecoration(
                        color: TaskiloColors.primary,
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white, width: 3),
                      ),
                      child: IconButton(
                        onPressed: _isUploadingImage ? null : _showImagePickerDialog,
                        icon: const Icon(
                          Icons.camera_alt,
                          color: Colors.white,
                          size: 20,
                        ),
                        padding: const EdgeInsets.all(8),
                        constraints: const BoxConstraints(
                          minWidth: 40,
                          minHeight: 40,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Text(
                'Tippen Sie auf die Kamera, um ein neues Foto hochzuladen',
                style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.7),
                  fontSize: 14,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ],
    );
  }

  ImageProvider? _getProfileImage() {
    if (_selectedImage != null) {
      return FileImage(_selectedImage!);
    } else if (_uploadedImageUrl != null) {
      return NetworkImage(_uploadedImageUrl!);
    } else if (widget.user.photoURL != null) {
      return NetworkImage(widget.user.photoURL!);
    }
    return null;
  }

  void _showImagePickerDialog() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        padding: const EdgeInsets.all(20),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 20),
            const Text(
              'Profilbild auswählen',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Colors.black87,
              ),
            ),
            const SizedBox(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _buildImagePickerOption(
                  icon: Icons.camera_alt,
                  label: 'Kamera',
                  onTap: () => _pickImage(ImageSource.camera),
                ),
                _buildImagePickerOption(
                  icon: Icons.photo_library,
                  label: 'Galerie',
                  onTap: () => _pickImage(ImageSource.gallery),
                ),
                if (widget.user.photoURL != null || _uploadedImageUrl != null)
                  _buildImagePickerOption(
                    icon: Icons.delete,
                    label: 'Entfernen',
                    onTap: _removeProfileImage,
                    isDestructive: true,
                  ),
              ],
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildImagePickerOption({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    bool isDestructive = false,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        width: 80,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isDestructive 
              ? Colors.red.shade50 
              : TaskiloColors.primary.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isDestructive 
                ? Colors.red.shade200 
                : TaskiloColors.primary.withValues(alpha: 0.3),
          ),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 32,
              color: isDestructive ? Colors.red : TaskiloColors.primary,
            ),
            const SizedBox(height: 8),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: isDestructive ? Colors.red : TaskiloColors.primary,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _pickImage(ImageSource source) async {
    Navigator.pop(context); // Close bottom sheet
    
    try {
      // Prüfe und fordere Berechtigungen an
      bool hasPermission = await _requestPermissions(source);
      
      if (!hasPermission) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Berechtigung erforderlich um Fotos aufzunehmen oder zu wählen'),
              backgroundColor: Colors.orange,
            ),
          );
        }
        return;
      }
      
      final ImagePicker picker = ImagePicker();
      final XFile? image = await picker.pickImage(
        source: source,
        maxWidth: 800,
        maxHeight: 800,
        imageQuality: 85,
      );

      if (image != null && mounted) {
        // Prüfe ob die Datei existiert
        final file = File(image.path);
        if (await file.exists()) {
          setState(() {
            _selectedImage = file;
            _isUploadingImage = true;
          });

          // Upload image to Firebase Storage
          await _uploadImageToFirebase(_selectedImage!);
        } else {
          throw Exception('Ausgewählte Datei existiert nicht');
        }
      }
    } on Exception catch (e) {
      debugPrint('❌ Exception picking image: $e');
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Fehler beim Auswählen des Bildes: ${e.toString()}'),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 5),
          ),
        );
      }
    } catch (e) {
      debugPrint('❌ Error picking image: $e');
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Unbekannter Fehler beim Auswählen des Bildes'),
            backgroundColor: Colors.red,
            duration: Duration(seconds: 3),
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isUploadingImage = false);
      }
    }
  }

  Future<bool> _requestPermissions(ImageSource source) async {
    if (source == ImageSource.camera) {
      // Kamera-Berechtigung
      final status = await Permission.camera.request();
      if (status.isGranted) {
        return true;
      } else if (status.isPermanentlyDenied) {
        _showPermissionDialog('Kamera');
        return false;
      }
      return false;
    } else {
      // Galerie-Berechtigung
      if (Platform.isAndroid) {
        // Versuche erst photos, dann storage als Fallback
        var status = await Permission.photos.request();
        if (status.isGranted) return true;
        
        status = await Permission.storage.request();
        if (status.isGranted) return true;
        
        if (status.isPermanentlyDenied) {
          _showPermissionDialog('Galerie');
        }
        return false;
      } else {
        // iOS
        final status = await Permission.photos.request();
        if (status.isGranted) {
          return true;
        } else if (status.isPermanentlyDenied) {
          _showPermissionDialog('Fotos');
          return false;
        }
        return false;
      }
    }
  }

  void _showPermissionDialog(String permissionType) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('$permissionType-Berechtigung erforderlich'),
        content: Text(
          'Um Fotos aufzunehmen oder auszuwählen, benötigt die App Zugriff auf Ihre $permissionType. '
          'Bitte aktivieren Sie die Berechtigung in den Einstellungen.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Abbrechen'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              openAppSettings();
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: TaskiloColors.primary,
            ),
            child: const Text('Einstellungen öffnen'),
          ),
        ],
      ),
    );
  }

  Future<void> _uploadImageToFirebase(File imageFile) async {
    try {
      final storageRef = FirebaseStorage.instance
          .ref()
          .child('profile_pictures')
          .child('${widget.user.uid}.jpg');

      final uploadTask = storageRef.putFile(imageFile);
      
      // Show upload progress (optional)
      uploadTask.snapshotEvents.listen((snapshot) {
        final progress = snapshot.bytesTransferred / snapshot.totalBytes;
        debugPrint('Upload progress: ${(progress * 100).toStringAsFixed(1)}%');
      });

      await uploadTask;
      final downloadUrl = await storageRef.getDownloadURL();
      
      setState(() {
        _uploadedImageUrl = downloadUrl;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Row(
              children: [
                Icon(Icons.check_circle, color: Colors.white),
                SizedBox(width: 12),
                Text('Profilbild erfolgreich hochgeladen!'),
              ],
            ),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      debugPrint('❌ Error uploading image: $e');
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Fehler beim Hochladen: $e'),
            backgroundColor: Colors.red,
          ),
        );
        
        setState(() {
          _selectedImage = null;
        });
      }
    }
  }

  void _removeProfileImage() {
    Navigator.pop(context); // Close bottom sheet
    
    setState(() {
      _selectedImage = null;
      _uploadedImageUrl = null;
    });

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Row(
          children: [
            Icon(Icons.info, color: Colors.white),
            SizedBox(width: 12),
            Text('Profilbild wird beim Speichern entfernt'),
          ],
        ),
        backgroundColor: Colors.orange,
      ),
    );
  }

  Future<void> _selectDateOfBirth() async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: _selectedDateOfBirth ?? DateTime(2000),
      firstDate: DateTime(1900),
      lastDate: DateTime.now(),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: ColorScheme.light(
              primary: TaskiloColors.primary,
              onPrimary: Colors.white,
              surface: Colors.white,
              onSurface: Colors.black,
            ),
          ),
          child: child!,
        );
      },
    );

    if (picked != null && picked != _selectedDateOfBirth) {
      setState(() => _selectedDateOfBirth = picked);
    }
  }

  String _formatDate(DateTime date) {
    return '${date.day}.${date.month}.${date.year}';
  }

  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() => _isLoading = true);

    try {
      // Erstelle UserProfile Objekt
      final updatedProfile = UserProfile(
        firstName: _firstNameController.text.trim(),
        lastName: _lastNameController.text.trim(),
        phoneNumber: _phoneController.text.trim().isNotEmpty 
            ? _phoneController.text.trim() 
            : null,
        street: _streetController.text.trim().isNotEmpty 
            ? _streetController.text.trim() 
            : null,
        city: _cityController.text.trim().isNotEmpty 
            ? _cityController.text.trim() 
            : null,
        postalCode: _postalCodeController.text.trim().isNotEmpty 
            ? _postalCodeController.text.trim() 
            : null,
        country: _countryController.text.trim().isNotEmpty 
            ? _countryController.text.trim() 
            : null,
        bio: _bioController.text.trim().isNotEmpty 
            ? _bioController.text.trim() 
            : null,
        agreesToNewsletter: _agreesToNewsletter,
        dateOfBirth: _selectedDateOfBirth,
        // Behalte bestehende Werte
        rating: widget.user.profile?.rating,
        completedJobs: widget.user.profile?.completedJobs,
        isAvailable: widget.user.profile?.isAvailable,
        skills: widget.user.profile?.skills,
      );

      // Aktualisiere User in Firestore
      final updateData = <String, dynamic>{
        'profile': updatedProfile.toMap(),
        'displayName': '${updatedProfile.firstName} ${updatedProfile.lastName}'.trim(),
      };

      // Füge Profilbild-URL hinzu wenn vorhanden
      if (_uploadedImageUrl != null) {
        updateData['photoURL'] = _uploadedImageUrl;
      } else if (_selectedImage == null && _uploadedImageUrl == null) {
        // Profilbild wurde entfernt
        updateData['photoURL'] = null;
      }

      await FirebaseFirestore.instance
          .collection('users')
          .doc(widget.user.uid)
          .update(updateData);

      // Erfolg anzeigen
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Row(
              children: [
                Icon(Icons.check_circle, color: Colors.white),
                SizedBox(width: 12),
                Text('Profil erfolgreich aktualisiert!'),
              ],
            ),
            backgroundColor: Colors.green,
            duration: Duration(seconds: 3),
          ),
        );

        // Zurück zum Profil-Screen
        Navigator.pop(context);
      }
    } catch (e) {
      debugPrint('❌ Error saving profile: $e');
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.error, color: Colors.white),
                const SizedBox(width: 12),
                Expanded(
                  child: Text('Fehler beim Speichern: ${e.toString()}'),
                ),
              ],
            ),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 5),
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }
}
