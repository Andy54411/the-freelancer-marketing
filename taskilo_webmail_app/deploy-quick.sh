#!/bin/bash

# ============================================
# QUICK DEPLOYMENT (nur rsync, kein rebuild)
# ============================================

set -e

echo "⚡ Quick Deployment - nur Upload"

HETZNER_HOST="mail.taskilo.de"
HETZNER_USER="root"
BUILD_PATH="build/web"

# Upload
echo "⬆️  Uploading..."
rsync -avz --delete $BUILD_PATH/ $HETZNER_USER@$HETZNER_HOST:/opt/taskilo/webmail-proxy/public/app/

# Set permissions
ssh $HETZNER_USER@$HETZNER_HOST "chown -R root:root /opt/taskilo/webmail-proxy/public/app && chmod -R 755 /opt/taskilo/webmail-proxy/public/app"

echo "✅ Done! App under: https://mail.taskilo.de/app/"
