const fs = require('fs');
const file = 'src/app/pos/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Target 1: Remove top cart elements
const start1 = content.indexOf("<div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '6px' }}>");
const end1 = content.indexOf("{/* السلة */}");
if(start1 !== -1 && end1 !== -1) {
    content = content.substring(0, start1) + content.substring(end1);
} else {
    console.log("Could not find Target 1");
}

// Target 2: Remove bottom cart elements and insert 3 icons
const start2 = content.indexOf("{/* خصم + ضريبة + خدمة */}");
const end2 = content.indexOf("{/* اختيار الخزنة */}");
if(start2 !== -1 && end2 !== -1) {
    const iconsHtml = `
                        {/* 3 icons under notes */}
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '10px' }}>
                            <button onClick={() => setShowOrderTypeModal(true)} style={{ flex: 1, height: '40px', borderRadius: '10px', border: \`1px solid \${C.border}\`, background: C.card, color: C.textPrimary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }} title="نوع الطلب">
                                <Utensils size={16} /> <span style={{fontSize: '12px', fontWeight: 600, fontFamily: CAIRO}}>{ORDER_TYPES.find(o => o.value === orderType)?.label || 'نوع الطلب'}</span>
                            </button>
                            <button onClick={() => setShowCustomerModal(true)} style={{ flex: 1, height: '40px', borderRadius: '10px', border: \`1px solid \${selectedCustomer ? C.primary : C.border}\`, background: selectedCustomer ? \`\${C.primary}10\` : C.card, color: selectedCustomer ? C.primary : C.textPrimary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }} title="العميل">
                                <User size={16} /> <span style={{fontSize: '12px', fontWeight: 600, fontFamily: CAIRO}}>{selectedCustomer ? customers.find(c => c.id === selectedCustomer)?.name || 'العميل' : 'إضافة عميل'}</span>
                            </button>
                            <button onClick={() => setShowOffersModal(true)} style={{ flex: 1, height: '40px', borderRadius: '10px', border: \`1px solid \${C.border}\`, background: C.card, color: C.textPrimary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }} title="العروض">
                                <Tag size={16} /> <span style={{fontSize: '12px', fontWeight: 600, fontFamily: CAIRO}}>العروض</span>
                            </button>
                        </div>
                        
    `;
    content = content.substring(0, start2) + iconsHtml + content.substring(end2);
} else {
    console.log("Could not find Target 2");
}

fs.writeFileSync(file, content, 'utf8');
console.log('Script done');
