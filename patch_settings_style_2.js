const fs = require('fs');

let content = fs.readFileSync('src/app/settings/_tabs/RestaurantTab.tsx', 'utf-8');

// Fix the header style
content = content.replace(
    /<Monitor size=\{20\} className="text-gray-400" \/>\s*<h2 className="text-lg font-bold">الطباعة وشاشات العرض وماكينة الدفع<\/h2>/g,
    "<Printer size={14} /> {t('الطباعة وشاشات العرض وماكينة الدفع')}"
);

// Add the payment terminal fields back into the array map
const targetMapRegex = /\{\[\s*\{\s*label:\s*t\('طابعة المطبخ'\),\s*key:\s*'kitchenPrinterName'\s*\},[\s\S]*?\s*\]\.map\(\(f,\s*i,\s*arr\)\s*=>\s*\(/;

const replacementMap = `{[
                            { label: t('IP ماكينة الدفع (ECR)'), key: 'paymentTerminalIp', desc: t('اتركها فارغة لإلغاء الربط الآلي'), placeholder: '192.168.1.50' },
                            { label: t('منفذ الماكينة (Port)'), key: 'paymentTerminalPort', placeholder: '5000' },
                            { label: t('طابعة المطبخ'), key: 'kitchenPrinterName', isPrinter: true },
                            { label: t('طابعة الفاتورة'), key: 'receiptPrinterName', isPrinter: true },
                        ].map((f, i, arr) => (`;

content = content.replace(targetMapRegex, replacementMap);

// Also we need to make sure the input rendering block handles `f.isPrinter` properly since previously the replacement also failed!
// Let's check if the rendering block was replaced.
if (!content.includes('f.isPrinter')) {
    // Replace the rendering logic
    const oldRenderRegex = /\{isEditMode \? \([\s\S]*?availablePrinters\.length > 0 \? \([\s\S]*?<CustomSelect[\s\S]*?onChange=\{val => set\(f\.key as any, val\)\}[\s\S]*?\/>\s*<\/div>\s*\)\s*:\s*\([\s\S]*?<input[\s\S]*?onChange=\{e => set\(f\.key as any, e\.target\.value\)\}\s*\/>\s*\)\s*\)\s*:\s*\(/;
    
    const newRender = `{isEditMode ? (
                                        (f as any).isPrinter && availablePrinters.length > 0 ? (
                                            <div style={{ padding: '8px 0' }}>
                                                <CustomSelect
                                                    value={(form as any)[f.key] || ''}
                                                    onChange={val => set(f.key as any, val)}
                                                    options={[
                                                        { value: '', label: t('— الطابعة الافتراضية —') },
                                                        ...availablePrinters.map(p => ({ value: p, label: p }))
                                                    ]}
                                                />
                                            </div>
                                        ) : (
                                            <div style={{ position: 'relative', width: '100%' }}>
                                                <input style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: '13px', color: C.textPrimary, padding: '14px 0', boxSizing: 'border-box', fontWeight: 700, fontFamily: CAIRO }} placeholder={(f as any).placeholder || t('اسم الطابعة')} value={(form as any)[f.key]} onChange={e => set(f.key as any, e.target.value)} />
                                                {(f as any).desc && <div style={{ fontSize: '10px', color: C.textMuted, position: 'absolute', top: '14px', left: 0, pointerEvents: 'none' }}>{(f as any).desc}</div>}
                                            </div>
                                        )
                                    ) : (`;
                                    
    content = content.replace(oldRenderRegex, newRender);
}

fs.writeFileSync('src/app/settings/_tabs/RestaurantTab.tsx', content, 'utf-8');
console.log('Fixed missing fields and header');
