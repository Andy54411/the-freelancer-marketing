#!/usr/bin/env python3
import re
import sys

def fix_file(filepath):
    print(f"🔧 Fixing {filepath}...")
    
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Get.dialog → showDialog
    content = re.sub(
        r'Get\.dialog<(\w+)>\(',
        r'showDialog<\1>(context: context, builder: (context) => ',
        content
    )
    content = re.sub(
        r'Get\.dialog\(',
        r'showDialog(context: context, builder: (context) => ',
        content
    )
    
    # Get.back() → Navigator.pop(context)
    content = re.sub(r'Get\.back\(\)', 'Navigator.pop(context)', content)
    # Get.back(result: xxx) → Navigator.pop(context, xxx)
    content = re.sub(r'Get\.back\(result:\s*([^)]+)\)', r'Navigator.pop(context, \1)', content)
    
    # Get.to(() => XXX) → Navigator.push(context, MaterialPageRoute(builder: (context) => XXX))
    content = re.sub(
        r'Get\.to\(\(\)\s*=>\s*(.*?)\)',
        r'Navigator.push(context, MaterialPageRoute(builder: (context) => \1))',
        content
    )
    
    # Get.offAll(() => XXX) → Navigator.pushAndRemoveUntil(context, MaterialPageRoute(builder: (context) => XXX), (route) => false)
    content = re.sub(
        r'Get\.offAll\(\(\)\s*=>\s*(.*?)\)',
        r'Navigator.pushAndRemoveUntil(context, MaterialPageRoute(builder: (context) => \1), (route) => false)',
        content
    )
    
    # Get.snackbar entfernen - zu komplex für Regex
    
    with open(filepath, 'w') as f:
        f.write(content)
    
    print(f"✅ {filepath} fixed!")

if __name__ == '__main__':
    files = [
        'lib/screens/auth/login_screen.dart',
        'lib/screens/home/home_screen.dart',
        'lib/screens/photos/photos_screen.dart',
        'lib/screens/email/email_detail_screen.dart',
    ]
    
    for f in files:
        try:
            fix_file(f)
        except Exception as e:
            print(f"❌ Error in {f}: {e}")
    
    print("\n🎉 Migration complete!")
