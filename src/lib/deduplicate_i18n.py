import re
import json

filepath = r'c:\Users\pc203\OneDrive\Desktop\ERP\erp-app\src\lib\i18n.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the en object
match = re.search(r'en:\s*\{(.*?)\n\s*\}\s*\},', content, re.DOTALL)
if not match:
    # Try alternate match if it's the end of dictionaries
    match = re.search(r'en:\s*\{(.*?)\n\s*\}\s*\n\};', content, re.DOTALL)

if match:
    en_content = match.group(1)
    lines = en_content.split('\n')
    
    unique_keys = {}
    new_lines = []
    
    # Simple regex to catch "key": "value"
    # Matches: "key": "value" or "key": "value",
    key_value_pattern = re.compile(r'^\s*"(.*?)":\s*"(.*?)"(,?)\s*(//.*)?$')
    
    dict_part = {}
    
    # We want to maintain comments and structure if possible, 
    # but cleaning up duplicates is priority.
    # To keep things simple and safe, let's just build a real dict and then format it.
    
    # Parsing lines manually to preserve comments is hard.
    # Let's just collect all key-values and keep the last one.
    
    final_dict = {}
    for line in lines:
        m = key_value_pattern.match(line)
        if m:
            key = m.group(1)
            val = m.group(2)
            final_dict[key] = val
    
    # Now rebuild the en object string
    # We can group them somewhat or just list them alphabetically.
    # Alphabetical is better for finding things.
    
    sorted_keys = sorted(final_dict.keys())
    output = []
    for k in sorted_keys:
        output.append(f'        "{k}": "{final_dict[k]}",')
    
    # Remove last comma if you want to be perfect, but JS allows it.
    
    new_en_block = 'en: {\n' + '\n'.join(output) + '\n    }'
    
    # Replace the old en block with the new one.
    # Be careful with the surrounding context.
    
    # Since the file might change significantly, I'll use a more precise replacement.
    # But for now, let's just see what I have.
    
    new_content = re.sub(r'en:\s*\{(.*?)\n\s*\}', new_en_block, content, flags=re.DOTALL)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print("Deduplication complete.")
else:
    print("Could not find en block.")
