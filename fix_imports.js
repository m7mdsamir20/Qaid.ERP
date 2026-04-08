const fs = require('fs');
const path = require('path');

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        arrayOfFiles.push(path.join(dirPath, "/", file));
      }
    }
  });

  return arrayOfFiles;
}

const srcDir = path.join(process.cwd(), 'src');
const files = getAllFiles(srcDir);
let fixedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Check if useTranslation is used but not imported from @/lib/i18n
  if (content.includes('useTranslation') && !content.includes('@/lib/i18n')) {
    console.log(`Fixing: ${file}`);
    
    // Add import after 'use client' or at top
    if (content.startsWith("'use client'")) {
      content = content.replace("'use client';", "'use client';\nimport { useTranslation } from '@/lib/i18n';");
    } else if (content.startsWith('"use client"')) {
      content = content.replace('"use client";', '"use client";\nimport { useTranslation } from "@/lib/i18n";');
    } else {
      content = "import { useTranslation } from '@/lib/i18n';\n" + content;
    }
    
    fs.writeFileSync(file, content);
    fixedCount++;
  }
});

console.log(`Done! Fixed ${fixedCount} files.`);
