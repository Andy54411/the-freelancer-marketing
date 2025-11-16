#!/bin/bash

echo "🔧 Behebt alle Tailwind CSS Probleme..."

# flex-shrink-0 → shrink-0
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's/flex-shrink-0/shrink-0/g'

# hover:bg-[#129488] → hover:bg-taskilo-hover  
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's/hover:bg-\[#129488\]/hover:bg-taskilo-hover/g'

# z-[9999] → z-9999
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's/z-\[9999\]/z-9999/g'

# hover:text-[#129488] → hover:text-taskilo-hover
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's/hover:text-\[#129488\]/hover:text-taskilo-hover/g'

echo "✅ Alle Tailwind CSS Probleme behoben!"