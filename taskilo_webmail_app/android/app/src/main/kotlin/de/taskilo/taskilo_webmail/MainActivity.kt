package de.taskilo.taskilo_webmail

import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import com.pichillilorenzo.flutter_inappwebview_android.InAppWebViewFlutterPlugin

class MainActivity : FlutterActivity() {
    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        flutterEngine.plugins.add(InAppWebViewFlutterPlugin())
    }
}
