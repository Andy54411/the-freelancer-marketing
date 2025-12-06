import 'package:flutter/material.dart';
import 'package:syncfusion_flutter_pdfviewer/pdfviewer.dart';
import 'package:url_launcher/url_launcher.dart';

class FileViewerScreen extends StatelessWidget {
  final String url;
  final String fileName;

  const FileViewerScreen({
    super.key,
    required this.url,
    required this.fileName,
  });

  bool get _isPdf => fileName.toLowerCase().endsWith('.pdf');

  Future<void> _openExternally() async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(fileName),
        backgroundColor: Colors.teal,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.open_in_new),
            onPressed: _openExternally,
            tooltip: 'Extern öffnen',
          ),
        ],
      ),
      body: _isPdf
          ? SfPdfViewer.network(
              url,
              onDocumentLoadFailed: (PdfDocumentLoadFailedDetails details) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Fehler beim Laden: ${details.error}'),
                    action: SnackBarAction(
                      label: 'Extern öffnen',
                      onPressed: _openExternally,
                      textColor: Colors.white,
                    ),
                    duration: const Duration(seconds: 5),
                  ),
                );
              },
            )
          : Center(
              child: Image.network(
                url,
                loadingBuilder: (context, child, loadingProgress) {
                  if (loadingProgress == null) return child;
                  return Center(
                    child: CircularProgressIndicator(
                      value: loadingProgress.expectedTotalBytes != null
                          ? loadingProgress.cumulativeBytesLoaded /
                              loadingProgress.expectedTotalBytes!
                          : null,
                    ),
                  );
                },
                errorBuilder: (context, error, stackTrace) {
                  return const Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.error_outline, size: 48, color: Colors.red),
                        SizedBox(height: 16),
                        Text('Fehler beim Laden des Bildes'),
                      ],
                    ),
                  );
                },
              ),
            ),
    );
  }
}
