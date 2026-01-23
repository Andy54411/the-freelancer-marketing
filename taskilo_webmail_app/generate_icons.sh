#!/bin/bash
cd /Users/andystaudinger/Tasko/taskilo_webmail_app/ios/Runner/Assets.xcassets/AppIcon.appiconset

# Generiere alle Icon-Größen
sips -z 60 60 Icon-App-1024x1024@1x.png --out Icon-App-20x20@3x.png
sips -z 40 40 Icon-App-1024x1024@1x.png --out Icon-App-20x20@2x.png
sips -z 20 20 Icon-App-1024x1024@1x.png --out Icon-App-20x20@1x.png
sips -z 87 87 Icon-App-1024x1024@1x.png --out Icon-App-29x29@3x.png
sips -z 58 58 Icon-App-1024x1024@1x.png --out Icon-App-29x29@2x.png
sips -z 29 29 Icon-App-1024x1024@1x.png --out Icon-App-29x29@1x.png
sips -z 114 114 Icon-App-1024x1024@1x.png --out Icon-App-57x57@2x.png
sips -z 57 57 Icon-App-1024x1024@1x.png --out Icon-App-57x57@1x.png
sips -z 144 144 Icon-App-1024x1024@1x.png --out Icon-App-72x72@2x.png
sips -z 72 72 Icon-App-1024x1024@1x.png --out Icon-App-72x72@1x.png
sips -z 100 100 Icon-App-1024x1024@1x.png --out Icon-App-50x50@2x.png
sips -z 50 50 Icon-App-1024x1024@1x.png --out Icon-App-50x50@1x.png

echo "All icons generated!"
