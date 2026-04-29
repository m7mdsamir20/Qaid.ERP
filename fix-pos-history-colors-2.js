const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/app/pos/history/page.tsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/background: i % 2 === 0 \? '#ffffff' : '#fafafa'/g, "background: i % 2 === 0 ? C.card : C.bg");
content = content.replace(/e\.currentTarget\.style\.background = '#f8fafc'/g, "e.currentTarget.style.background = C.bg");
content = content.replace(/e\.currentTarget\.style\.background = i % 2 === 0 \? '#ffffff' : '#fafafa'/g, "e.currentTarget.style.background = i % 2 === 0 ? C.card : C.bg");
content = content.replace(/background: '#f8fafc'/g, "background: C.bg");

fs.writeFileSync(file, content);
console.log('Fixed remaining hardcoded colors in POS history.');
