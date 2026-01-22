#!/bin/bash

# Patch html_editor_enhanced to fix scroll issue
# This script modifies the package code to use EagerGestureRecognizer

PACKAGE_PATH="$HOME/.pub-cache/hosted/pub.dev/html_editor_enhanced-2.7.1"
TARGET_FILE="$PACKAGE_PATH/lib/src/widgets/html_editor_widget_mobile.dart"

if [ ! -f "$TARGET_FILE" ]; then
  echo "❌ Package file not found: $TARGET_FILE"
  exit 1
fi

echo "📦 Patching html_editor_enhanced..."

# Backup original file
cp "$TARGET_FILE" "$TARGET_FILE.backup"

# Replace gestureRecognizers
perl -i -pe 's/gestureRecognizers:\s*\{[^}]*\}/gestureRecognizers: [Factory<OneSequenceGestureRecognizer>(() => EagerGestureRecognizer())].toSet()/g' "$TARGET_FILE"

# Add import if not present
if ! grep -q "import 'package:flutter/gestures.dart';" "$TARGET_FILE"; then
  perl -i -pe 's/(import .*?;)/$1\nimport '\''package:flutter\/gestures.dart'\'';/' "$TARGET_FILE"
fi

echo "✅ Patch applied successfully!"
echo "🔄 Run 'flutter clean && flutter pub get' to apply changes"
