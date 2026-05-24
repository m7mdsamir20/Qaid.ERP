const fs = require('fs');

const filePath = 'src/app/installments/page.tsx';
let code = fs.readFileSync(filePath, 'utf8');

// 1. Add state for type and invoices
code = code.replace(
    /const \[showNew, setShowNew\] = useState\(false\);/,
    `const [showNew, setShowNew] = useState(false);
    const [planType, setPlanType] = useState('direct'); // 'direct' or 'invoice'
    const [unpaidInvoices, setUnpaidInvoices] = useState<any[]>([]);`
);

// 2. Fetch unpaid invoices in fetchData
const fetchInvoicesRegex = /fetch\('\/api\/items'\),/;
code = code.replace(
    fetchInvoicesRegex,
    `fetch('/api/items'),
                fetch('/api/invoices?status=unpaid'),`
);

const fetchInvoicesDestructRegex = /const \[pRes, cRes, tRes, iRes\] = await Promise\.all\(\[/;
code = code.replace(
    fetchInvoicesDestructRegex,
    `const [pRes, cRes, tRes, iRes, invRes] = await Promise.all([`
);

const fetchInvoicesSetRegex = /if \(iRes\.ok\) {[\s\S]*?setItems.*?;\s*}/;
code = code.replace(
    fetchInvoicesSetRegex,
    `if (iRes.ok) {
                const data = await iRes.json();
                setItems(Array.isArray(data) ? data : (data.items || []));
            }
            if (invRes && invRes.ok) {
                const data = await invRes.json();
                setUnpaidInvoices(Array.isArray(data) ? data : (data.invoices || []));
            }`
);

// 3. Reset form state
code = code.replace(
    /setSelectedItem\(null\);\s*}/g,
    `setSelectedItem(null);
            setPlanType('direct');
            setForm(f => ({ ...f, invoiceId: '' }));
        }`
);

// 4. Update the submit handler
const submitValidationRegex = /if \(!form\.customerId \|\| !form\.totalAmount \|\| !selectedItem\) {/;
code = code.replace(
    submitValidationRegex,
    `if (!form.customerId || !form.totalAmount || (planType === 'direct' && !selectedItem) || (planType === 'invoice' && !(form as any).invoiceId)) {`
);

// Disable stock validation for invoice type
const stockValidationRegex = /const selectedItemData = items\.find\(i => i\.id === selectedItem\);[\s\S]*?return;\s*}\s*}/;
code = code.replace(
    stockValidationRegex,
    `if (planType === 'direct') {
            const selectedItemData = items.find(i => i.id === selectedItem);
            if (selectedItemData) {
                const totalInStock = (selectedItemData.stocks || []).reduce((s: number, v: any) => s + v.quantity, 0);
                if (parseInt(form.quantity) > totalInStock) {
                    alert(t('عفواً، الكمية المطلوبة') + \` (\${form.quantity}) \` + t('غير متوفرة بالكامل في المخزن حالياً. المتاح:') + \` \${totalInStock}\`);
                    return;
                }
            }
        }`
);

// Add planType and invoiceId to POST body
const postBodyRegex = /monthsCount,\s*itemId: selectedItem,\s*}\),/;
code = code.replace(
    postBodyRegex,
    `monthsCount,
                    itemId: selectedItem,
                    type: planType,
                    invoiceId: (form as any).invoiceId,
                }),`
);

// 5. Update the Modal UI
const modalStartRegex = /<form onSubmit={handleSubmit}>\s*<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>/;
const planTypeToggleUI = `
<form onSubmit={handleSubmit}>
    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <div onClick={() => setPlanType('direct')} style={{ flex: 1, padding: '12px', textAlign: 'center', borderRadius: '12px', cursor: 'pointer', border: \`1px solid \${planType === 'direct' ? C.primary : C.border}\`, background: planType === 'direct' ? 'rgba(37,106,244,0.1)' : 'transparent', color: planType === 'direct' ? C.primary : C.textSecondary, fontWeight: 600 }}>
            {t('تقسيط مباشر (منتج/خدمة)')}
        </div>
        <div onClick={() => setPlanType('invoice')} style={{ flex: 1, padding: '12px', textAlign: 'center', borderRadius: '12px', cursor: 'pointer', border: \`1px solid \${planType === 'invoice' ? '#10b981' : C.border}\`, background: planType === 'invoice' ? 'rgba(16,185,129,0.1)' : 'transparent', color: planType === 'invoice' ? '#10b981' : C.textSecondary, fontWeight: 600 }}>
            {t('جدولة فاتورة آجلة')}
        </div>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
`;
code = code.replace(modalStartRegex, planTypeToggleUI);

// 6. Conditionally render Item selection vs Invoice selection
const itemSelectRegex = /<div>\s*<label style={{ \.\.\.LS, fontSize: '11\.5px' }}>{t\('المنتج \/ غرض التقسيط'\)} <span style={{ color: C\.danger }}>\*<\/span><\/label>\s*<CustomSelect[\s\S]*?icon={Package}\s*style={{ height: '36px', background: C\.inputBg }}\s*\/>\s*<\/div>\s*<div>\s*<label style={{ \.\.\.LS, fontSize: '11\.5px' }}>{t\('الكمية'\)}<\/label>\s*<input type="number" min="1" value={form\.quantity} onChange={e => setForm\(f => \({ \.\.\.f, quantity: e\.target\.value }\)\)} style={{ \.\.\.IS, height: '38px', textAlign: 'center' }} onFocus={focusIn} onBlur={focusOut} \/>\s*<\/div>/;

const dynamicSelectUI = `
    {planType === 'direct' ? (
        <>
            <div>
                <label style={{ ...LS, fontSize: '11.5px' }}>{t('المنتج / غرض التقسيط')} <span style={{ color: C.danger }}>*</span></label>
                <CustomSelect
                    value={selectedItem}
                    onChange={onSelectItem}
                    options={items.map(i => ({ value: i.id, label: i.name, sub: \`\${t('المتاح')}: \${i.stocks?.reduce((s:number,v:any)=>s+v.quantity,0)||0} | \${t('السعر')}: \${fmtN(i.sellPrice)} \${cSymbol}\` }))}
                    placeholder={t("اختر منتجاً من القائمة...")}
                    icon={Package}
                    style={{ height: '36px', background: C.inputBg }}
                />
            </div>
            <div>
                <label style={{ ...LS, fontSize: '11.5px' }}>{t('الكمية')}</label>
                <input type="number" min="1" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} style={{ ...IS, height: '38px', textAlign: 'center' }} onFocus={focusIn} onBlur={focusOut} />
            </div>
        </>
    ) : (
        <div style={{ gridColumn: 'span 2' }}>
            <label style={{ ...LS, fontSize: '11.5px' }}>{t('اختر الفاتورة الآجلة')} <span style={{ color: C.danger }}>*</span></label>
            <CustomSelect
                value={(form as any).invoiceId || ''}
                onChange={v => {
                    setForm(f => ({ ...f, invoiceId: v }));
                    const inv = unpaidInvoices.find(i => i.id === v);
                    if (inv) {
                        setForm(f => ({ ...f, totalAmount: String(inv.remaining || inv.total || 0), productName: \`فاتورة مبيعات رقم \${inv.invoiceNumber}\` }));
                    }
                }}
                options={unpaidInvoices
                    .filter(inv => !form.customerId || inv.customerId === form.customerId)
                    .map(inv => ({ value: inv.id, label: \`فاتورة #\${inv.invoiceNumber} - \${fmtN(inv.remaining || inv.total || 0)} \${cSymbol}\`, sub: new Date(inv.date).toLocaleDateString() }))}
                placeholder={t("اختر الفاتورة لجدولتها...")}
                icon={ShoppingCart}
                style={{ height: '36px', background: C.inputBg }}
            />
        </div>
    )}
`;
code = code.replace(itemSelectRegex, dynamicSelectUI);

// 7. Make Total Amount readonly if invoice type
const totalAmountRegex = /<input type="number" required min="0" placeholder="0\.00" value={form\.totalAmount}/;
code = code.replace(totalAmountRegex, `<input type="number" required min="0" placeholder="0.00" value={form.totalAmount} disabled={planType === 'invoice'}`);

fs.writeFileSync(filePath, code);
console.log("Installments UI updated successfully.");
