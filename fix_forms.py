#!/usr/bin/env python3
import os
import re
import glob

forms_directory = "/Users/andystaudinger/Tasko/src/components/subcategory-forms"
form_files = glob.glob(f"{forms_directory}/*Form.tsx")

exclude_files = ["FormComponents.tsx", "SubcategoryFormManager.tsx"]

def fix_form_imports_and_functions(file_path):
    """Behebt fehlende Imports und Funktionen in Form-Dateien"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        file_name = os.path.basename(file_path)
        form_name = file_name.replace('Form.tsx', '')
        
        changed = False
        
        # 1. Füge FormSubmitButton zum Import hinzu (falls fehlt)
        if 'FormSubmitButton' not in content:
            # Suche nach FormComponents Import
            import_pattern = r'import\s*{([^}]+)}\s*from\s*[\'\"]\./FormComponents[\'\"]\s*;'
            import_match = re.search(import_pattern, content)
            
            if import_match:
                imports = import_match.group(1).strip()
                if 'FormSubmitButton' not in imports:
                    new_imports = imports + ',\\n  FormSubmitButton,'
                    new_import_line = f"import {{\\n  {new_imports}\\n}} from './FormComponents';"
                    content = re.sub(import_pattern, new_import_line, content)
                    changed = True
        
        # 2. Füge isFormValid Funktion hinzu (falls fehlt)
        if 'isFormValid' not in content:
            # Suche nach useEffect mit Validierungslogik
            useeffect_pattern = r'useEffect\(\(\)\s*=>\s*{\s*(.*?const\s+isValid\s*=\s*!!\((.*?)\);.*?)onValidationChange\(isValid\);.*?}, \[formData.*?\]\);'
            useeffect_match = re.search(useeffect_pattern, content, re.DOTALL)
            
            if useeffect_match:
                validation_logic = useeffect_match.group(2).strip()
                # Erstelle isFormValid Funktion
                isFormValid_function = f"""
  const isFormValid = () => {{
    return !!({validation_logic});
  }};"""
                
                # Füge die Funktion nach useEffect hinzu
                useeffect_full = useeffect_match.group(0)
                content = content.replace(useeffect_full, useeffect_full + isFormValid_function)
                changed = True
        
        if changed:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✓ Fixed: {file_name}")
        else:
            print(f"- OK: {file_name}")
        
        return True
        
    except Exception as e:
        print(f"✗ Error fixing {file_path}: {str(e)}")
        return False

def main():
    print("Fixing form imports and functions...")
    
    fixed_count = 0
    total_count = 0
    
    for file_path in form_files:
        file_name = os.path.basename(file_path)
        
        if file_name in exclude_files:
            continue
        
        total_count += 1
        if fix_form_imports_and_functions(file_path):
            fixed_count += 1
    
    print(f"\\nCompleted: {fixed_count}/{total_count} files processed")

if __name__ == "__main__":
    main()
