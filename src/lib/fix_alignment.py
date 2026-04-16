import os
import re

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. textAlign isRtl ? 'right' : 'left' -> textAlign: 'start'
    new_content = re.sub(r"textAlign:\s*isRtl\s*\?\s*'right'\s*:\s*'left'", "textAlign: 'start'", content)
    
    # 2. textAlign isRtl ? 'left' : 'right' -> textAlign: 'end'
    new_content = re.sub(r"textAlign:\s*isRtl\s*\?\s*'left'\s*:\s*'right'", "textAlign: 'end'", new_content)

    # 3. [isRtl ? 'right' : 'left']: -> insetInlineStart: (usually used for absolute positioning)
    # This might be tricky, let's look at examples first.
    # From profile/page.tsx: [isRtl ? 'right' : 'left']: '14px'
    # This is equivalent to insetInlineStart: '14px'
    new_content = re.sub(r"\[isRtl\s*\?\s*'right'\s*:\s*'left'\]:", "insetInlineStart:", new_content)
    
    # 4. Same for 'left' : 'right' -> insetInlineEnd
    new_content = re.sub(r"\[isRtl\s*\?\s*'left'\s*:\s*'right'\]:", "insetInlineEnd:", new_content)

    if content != new_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Fixed: {filepath}")

def main():
    base_dir = r"c:\Users\pc203\OneDrive\Desktop\ERP\erp-app\src"
    for root, dirs, files in os.walk(base_dir):
        for file in files:
            if file.endswith(('.tsx', '.ts')):
                fix_file(os.path.join(root, file))

if __name__ == "__main__":
    main()
