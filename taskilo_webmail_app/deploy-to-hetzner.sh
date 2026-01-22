#!/bin/bash

# ============================================
# TASKILO WEBMAIL APP - HETZNER DEPLOYMENT
# ============================================
# Deployt Flutter Web App auf mail.taskilo.de

set -e

echo "🚀 Taskilo Webmail App - Hetzner Deployment"
echo "============================================"

# Configuration
HETZNER_HOST="mail.taskilo.de"
HETZNER_USER="root"
REMOTE_PATH="/var/www/webmail-app"
BUILD_PATH="build/web"

# 1. Flutter Web Build
echo ""
echo "📦 Building Flutter Web App..."
flutter clean
flutter pub get
flutter build web --release

# Check if build was successful
if [ ! -d "$BUILD_PATH" ]; then
  echo "❌ Build failed - $BUILD_PATH not found"
  exit 1
fi

echo "✅ Build successful"

# 2. Create remote directory if not exists
echo ""
echo "📁 Preparing remote directory..."
ssh $HETZNER_USER@$HETZNER_HOST "mkdir -p $REMOTE_PATH"

# 3. Upload build to Hetzner
echo ""
echo "⬆️  Uploading to Hetzner..."
rsync -avz --delete $BUILD_PATH/ $HETZNER_USER@$HETZNER_HOST:$REMOTE_PATH/

# 4. Set correct permissions
echo ""
echo "🔐 Setting permissions..."
ssh $HETZNER_USER@$HETZNER_HOST "chown -R www-data:www-data $REMOTE_PATH && chmod -R 755 $REMOTE_PATH"

# 5. Verify deployment
echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Access the app at: https://mail.taskilo.de/webmail-app"
echo ""
echo "📋 Next steps:"
echo "   1. Configure Nginx to serve /webmail-app"
echo "   2. Update webmail-proxy routing if needed"
echo ""
