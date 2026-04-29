const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/app/pos/history/page.tsx');
let content = fs.readFileSync(file, 'utf8');

// Swap Title and X button in Modal Header
const headerRegex = /\{?\/\* Modal Header \*\/\}?([\s\S]*?)<div style={{ padding: '20px 24px', borderBottom: `1px solid \$\{C\.border\}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>\s*<div style={{ display: 'flex', gap: '10px' }}>\s*<button onClick=\{\(\) => setSelectedOrder\(null\)\} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: C\.textMuted }}><X size=\{20\} \/><\/button>\s*<\/div>\s*<div style={{ textAlign: isRtl \? 'left' : 'right' }}>\s*<h2 style={{ margin: 0, fontFamily: OUTFIT, fontWeight: 800, fontSize: '20px', color: C\.textPrimary }}>([\s\S]*?)<\/h2>\s*<p style={{ margin: '4px 0 0', fontSize: '13px', color: C\.textSecondary, fontFamily: OUTFIT }}>([\s\S]*?)<\/p>\s*<\/div>\s*<\/div>/;

const newHeader = `{/* Modal Header */}
                            <div style={{ padding: '20px 24px', borderBottom: \`1px solid \${C.border}\`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ textAlign: isRtl ? 'right' : 'left' }}>
                                    <h2 style={{ margin: 0, fontFamily: OUTFIT, fontWeight: 800, fontSize: '20px', color: C.textPrimary }}>
                                        {selectedOrder.invoice?.invoiceNumber ? \`#\${selectedOrder.invoice.invoiceNumber.toString().padStart(4, '0')}\` : \`#\${selectedOrder.orderNumber.toString().padStart(4, '0')}\`}
                                    </h2>
                                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: C.textSecondary, fontFamily: OUTFIT }}>{formatDate(selectedOrder.createdAt)}</p>
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button onClick={() => setSelectedOrder(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: C.textMuted }}><X size={20} /></button>
                                </div>
                            </div>`;

content = content.replace(headerRegex, newHeader);

// Action Badges - swap Print buttons with Status badges
const badgesRegex = /<div style={{ padding: '16px 24px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>([\s\S]*?)<button onClick=\{\(\) => handlePrint\(selectedOrder\)\}([\s\S]*?)<\/button>\s*<button style=\{([\s\S]*?)\}([\s\S]*?)<\/button>\s*<\/div>/;

const newBadges = `<div style={{ padding: '16px 24px', display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={() => handlePrint(selectedOrder)} style={{ padding: '6px 12px', background: C.bg, border: \`1px solid \${C.border}\`, color: C.textPrimary, borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: CAIRO }}><FileText size={14} /> طباعة الفاتورة</button>
                                    <button style={{ padding: '6px 12px', background: C.bg, border: \`1px solid \${C.border}\`, color: C.textPrimary, borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: CAIRO }}><Printer size={14} /> طباعة تفاصيل الطلب</button>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {selectedOrder.status === 'preparing' && <span style={{ padding: '6px 12px', border: '1px solid #fcd34d', background: '#fffbeb', color: '#f59e0b', borderRadius: '6px', fontSize: '12px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b' }}></span> معالجة</span>}
                                    {selectedOrder.status === 'ready' && <span style={{ padding: '6px 12px', border: '1px solid #93c5fd', background: '#eff6ff', color: '#3b82f6', borderRadius: '6px', fontSize: '12px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6' }}></span> جاهز</span>}
                                </div>
                            </div>`;

content = content.replace(badgesRegex, newBadges);

fs.writeFileSync(file, content);
console.log('Fixed Modal Header Layout in POS history.');
