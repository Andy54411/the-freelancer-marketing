class Company {
  final String id;
  final String companyName;
  final String? description;
  final String? logoUrl;
  final String? headerImageUrl;
  final String? website;
  final String? email;
  final String? phone;
  final String? address;
  final String? city;
  final String? zip;
  final String? country;
  final String? employeeCount;
  final String? foundedYear;
  final String? industry;
  final Map<String, String>? socialMedia;

  Company({
    required this.id,
    required this.companyName,
    this.description,
    this.logoUrl,
    this.headerImageUrl,
    this.website,
    this.email,
    this.phone,
    this.address,
    this.city,
    this.zip,
    this.country,
    this.employeeCount,
    this.foundedYear,
    this.industry,
    this.socialMedia,
  });

  factory Company.fromMap(Map<String, dynamic> data, String id) {
    // Helper to get nested values safely
    dynamic getNested(Map<String, dynamic> map, String path) {
      final keys = path.split('.');
      dynamic current = map;
      for (final key in keys) {
        if (current is Map<String, dynamic> && current.containsKey(key)) {
          current = current[key];
        } else {
          return null;
        }
      }
      return current;
    }

    return Company(
      id: id,
      companyName:
          data['companyName'] ??
          data['firmenname'] ??
          'Unbekanntes Unternehmen',
      description: data['description'],
      logoUrl:
          data['logoUrl'] ??
          data['profilePictureURL'] ??
          data['profilbildUrl'] ??
          data['companyLogo'] ??
          data['photoURL'] ??
          getNested(data, 'step3.profilePictureURL'),
      headerImageUrl:
          data['headerImageUrl'] ??
          data['profileBannerImage'] ??
          getNested(data, 'step3.profileBannerImage') ??
          data['bannerUrl'] ??
          data['coverUrl'],
      website: data['website'],
      email: data['email'],
      phone: data['phone'],
      address: data['address'],
      city: data['city'],
      zip: data['postalCode'] ?? data['zip'],
      country: data['country'],
      employeeCount: data['employeeCount'],
      foundedYear: data['foundedYear'],
      industry: data['industry'],
      socialMedia: data['socialMedia'] != null
          ? Map<String, String>.from(data['socialMedia'])
          : null,
    );
  }
}
