#!/bin/bash

# Simple Icon Generation Script for iOS
# Creates icons with the logo at 600px (smaller with more padding)

ICON_DIR="ios/Runner/Assets.xcassets/AppIcon.appiconset"
SVG="../public/favicon.svg"

echo "Generating iOS App Icons with 600px logo..."

# Step 1: Convert SVG to PNG at 600px height (smaller for more padding)
rsvg-convert -h 600 "$SVG" -o /tmp/taskilo_logo.png

# Step 2: Check size
sips -g pixelWidth -g pixelHeight /tmp/taskilo_logo.png

# Step 3: Pad to make it square (1024x1024) with white background
# First pad to square
sips -p 1024 1024 --padColor FFFFFF /tmp/taskilo_logo.png --out /tmp/icon_1024.png

# Step 4: Generate all required sizes
declare -a sizes=(1024 180 167 152 144 120 114 100 87 80 76 72 60 58 57 50 40 29 20)

for size in "${sizes[@]}"; do
    sips -z $size $size /tmp/icon_1024.png --out /tmp/icon_${size}.png
done

# Step 5: Copy to asset catalog
cp /tmp/icon_1024.png "$ICON_DIR/Icon-App-1024x1024@1x.png"

# iPhone icons
cp /tmp/icon_180.png "$ICON_DIR/Icon-App-60x60@3x.png"
cp /tmp/icon_120.png "$ICON_DIR/Icon-App-60x60@2x.png"
sips -z 60 60 /tmp/icon_1024.png --out "$ICON_DIR/Icon-App-60x60@1x.png"

cp /tmp/icon_87.png "$ICON_DIR/Icon-App-29x29@3x.png"
cp /tmp/icon_58.png "$ICON_DIR/Icon-App-29x29@2x.png"
cp /tmp/icon_29.png "$ICON_DIR/Icon-App-29x29@1x.png"

cp /tmp/icon_120.png "$ICON_DIR/Icon-App-40x40@3x.png"
cp /tmp/icon_80.png "$ICON_DIR/Icon-App-40x40@2x.png"
cp /tmp/icon_40.png "$ICON_DIR/Icon-App-40x40@1x.png"

sips -z 60 60 /tmp/icon_1024.png --out "$ICON_DIR/Icon-App-20x20@3x.png"
cp /tmp/icon_40.png "$ICON_DIR/Icon-App-20x20@2x.png"
cp /tmp/icon_20.png "$ICON_DIR/Icon-App-20x20@1x.png"

cp /tmp/icon_114.png "$ICON_DIR/Icon-App-57x57@2x.png"
cp /tmp/icon_57.png "$ICON_DIR/Icon-App-57x57@1x.png"

# iPad icons
cp /tmp/icon_167.png "$ICON_DIR/Icon-App-83.5x83.5@2x.png"
cp /tmp/icon_152.png "$ICON_DIR/Icon-App-76x76@2x.png"
cp /tmp/icon_76.png "$ICON_DIR/Icon-App-76x76@1x.png"
cp /tmp/icon_144.png "$ICON_DIR/Icon-App-72x72@2x.png"
cp /tmp/icon_72.png "$ICON_DIR/Icon-App-72x72@1x.png"
cp /tmp/icon_100.png "$ICON_DIR/Icon-App-50x50@2x.png"
cp /tmp/icon_50.png "$ICON_DIR/Icon-App-50x50@1x.png"

echo ""
echo "Done! Icons generated in $ICON_DIR"
ls -la "$ICON_DIR"/*.png | head -10

echo ""
echo "Opening 1024x1024 icon for preview..."
open /tmp/icon_1024.png
