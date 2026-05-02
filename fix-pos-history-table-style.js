const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/app/pos/history/page.tsx');
let content = fs.readFileSync(file, 'utf8');

// Add TABLE_STYLE to imports
content = content.replace(/import { C, CAIRO, OUTFIT, IS } from '@\/constants\/theme';/, "import { C, CAIRO, OUTFIT, IS, TABLE_STYLE } from '@/constants/theme';");

// Replace table container
content = content.replace(
    /<div style={{ padding: '0 24px', overflowX: 'auto' }}>\s*<table style={{.*?}}>/,
    `<div style={{ padding: '0 24px' }}>\n                        <div style={TABLE_STYLE.container}>\n                            <table style={TABLE_STYLE.table}>`
);

// Replace thead
const oldThead = `<thead.*?>[\\s\\S]*?<\/thead>`;
const newThead = `<thead style={TABLE_STYLE.thead}>
                                <tr>
                                    <th style={{ ...TABLE_STYLE.th(false), textAlign: isRtl ? 'right' : 'left' }}>فاتورة</th>
                                    <th style={TABLE_STYLE.th(false)}>العملاء</th>
                                    <th style={TABLE_STYLE.th(false)}>المصدر</th>
                                    <th style={TABLE_STYLE.th(false)}>نوع الخدمة</th>
                                    <th style={TABLE_STYLE.th(false)}>رقم الطاولة</th>
                                    <th style={TABLE_STYLE.th(false)}>اسم أمين الصندوق</th>
                                    <th style={TABLE_STYLE.th(false)}>المجموع</th>
                                    <th style={TABLE_STYLE.th(false)}>المدفوعات</th>
                                    <th style={{ ...TABLE_STYLE.th(false), textAlign: isRtl ? 'left' : 'right' }}>حالة</th>
                                </tr>
                            </thead>`;
content = content.replace(new RegExp(oldThead), newThead);

// Replace empty state
content = content.replace(/<td colSpan={9} style={{ textAlign: 'center', padding: '60px', color: C\.textMuted }}>/, "<td colSpan={9} style={{ textAlign: 'center', padding: '48px', color: C.textMuted, fontFamily: CAIRO }}>");

// Replace row styles
content = content.replace(
    /style={{ borderBottom: `1px solid \${C.border}`, cursor: 'pointer', transition: 'background 0.2s', background: i % 2 === 0 \? C\.card : C\.bg }}/g,
    `style={{ ...TABLE_STYLE.row(i === filteredOrders.length - 1), cursor: 'pointer' }}`
);

content = content.replace(/e\.currentTarget\.style\.background = C\.bg/g, "e.currentTarget.style.background = C.hover");
content = content.replace(/e\.currentTarget\.style\.background = i % 2 === 0 \? C\.card : C\.bg/g, "e.currentTarget.style.background = 'transparent'");

// Replace td styles in the row
content = content.replace(/<td style={{ padding: '12px 16px', textAlign: isRtl \? 'right' : 'left' }}>/g, "<td style={{ ...TABLE_STYLE.td(false), textAlign: isRtl ? 'right' : 'left' }}>");
content = content.replace(/<td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', color: C\.textSecondary }}>/g, "<td style={{ ...TABLE_STYLE.td(false), fontSize: '13px', color: C.textSecondary }}>");
content = content.replace(/<td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', color: C\.textSecondary }}>/g, "<td style={{ ...TABLE_STYLE.td(false), fontSize: '12px', color: C.textSecondary }}>");
content = content.replace(/<td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', color: C\.textSecondary, fontWeight: 600 }}>/g, "<td style={{ ...TABLE_STYLE.td(false), fontSize: '13px', color: C.textSecondary, fontWeight: 600 }}>");
content = content.replace(/<td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', color: C\.textSecondary, fontWeight: 600, fontFamily: OUTFIT }}>/g, "<td style={{ ...TABLE_STYLE.td(false), fontSize: '13px', color: C.textSecondary, fontWeight: 600, fontFamily: OUTFIT }}>");
content = content.replace(/<td style={{ padding: '12px 16px', textAlign: 'center', fontFamily: OUTFIT, fontWeight: 700, fontSize: '14px', color: C\.textPrimary }}>/g, "<td style={{ ...TABLE_STYLE.td(false), fontFamily: OUTFIT, fontWeight: 700, fontSize: '14px', color: C.textPrimary }}>");
content = content.replace(/<td style={{ padding: '12px 16px', textAlign: 'center' }}>/g, "<td style={{ ...TABLE_STYLE.td(false), textAlign: 'center' }}>");
content = content.replace(/<td style={{ padding: '12px 16px', textAlign: isRtl \? 'left' : 'right' }}>/g, "<td style={{ ...TABLE_STYLE.td(false), textAlign: isRtl ? 'left' : 'right' }}>");

// Close the extra div
content = content.replace(/<\/table>\n                    <\/div>/, "</table>\n                        </div>\n                    </div>");

fs.writeFileSync(file, content);
console.log('Applied TABLE_STYLE to POS history.');
