const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/app/pos/history/page.tsx');
let content = fs.readFileSync(file, 'utf8');

// Replace backgrounds and borders
content = content.replace(/background: '#f8fafc'/g, 'background: C.bg');
content = content.replace(/background: '#fff'/g, 'background: C.card');
content = content.replace(/background: '#ffffff'/g, 'background: C.card');
content = content.replace(/background: '#fafafa'/g, 'background: C.card');
content = content.replace(/background: '#f1f5f9'/g, 'background: C.bg');
content = content.replace(/border: `1px solid #e2e8f0`/g, 'border: `1px solid ${C.border}`');
content = content.replace(/borderBottom: '1px solid #e2e8f0'/g, "borderBottom: `1px solid ${C.border}`");
content = content.replace(/borderBottom: '1px solid #f1f5f9'/g, "borderBottom: `1px solid ${C.border}`");
content = content.replace(/borderTop: '1px solid #f1f5f9'/g, "borderTop: `1px solid ${C.border}`");
content = content.replace(/border: '1px solid #f1f5f9'/g, "border: `1px solid ${C.border}`");
content = content.replace(/border: '1px solid #cbd5e1'/g, "border: `1px solid ${C.border}`");

// Replace text colors
content = content.replace(/color: '#64748b'/g, 'color: C.textSecondary');
content = content.replace(/color: '#94a3b8'/g, 'color: C.textMuted');
content = content.replace(/color="#94a3b8"/g, 'color={C.textMuted}');
content = content.replace(/color: '#334155'/g, 'color: C.textPrimary');
content = content.replace(/color: '#1e293b'/g, 'color: C.textPrimary');
content = content.replace(/color: '#0f172a'/g, 'color: C.textPrimary');
content = content.replace(/color: '#475569'/g, 'color: C.textSecondary');

// Other elements
content = content.replace(/background: '#1e293b'/g, 'background: C.card, border: `1px solid ${C.border}`');
content = content.replace(/color: '#fff'/g, 'color: C.textPrimary');

fs.writeFileSync(file, content);
console.log('Fixed colors in POS history.');
