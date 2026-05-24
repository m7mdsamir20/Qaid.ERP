const fs = require('fs');

function updatePage() {
    const file = 'src/app/installments/page.tsx';
    let code = fs.readFileSync(file, 'utf8');

    // 1. Remove planType and unpaidInvoices
    code = code.replace(/const \[planType, setPlanType\] = useState\('direct'\);\s*\/\/ 'direct' or 'invoice'\s*const \[unpaidInvoices, setUnpaidInvoices\] = useState<any\[\]>\(\[\]\);/, `const [cart, setCart] = useState<any[]>([]);
    const [cartQuantity, setCartQuantity] = useState('1');
    const [cartPrice, setCartPrice] = useState('');`);

    // 2. Add addToCart methods
    const cartMethods = `
    const handleAddToCart = () => {
        if (!selectedItem) return alert(t('اختر الصنف'));
        const item = items.find(i => i.id === selectedItem);
        if (!item) return;
        const q = parseFloat(cartQuantity) || 1;
        const p = parseFloat(cartPrice) || item.sellPrice || 0;
        
        const inStock = (item.stocks || []).reduce((s: number, v: any) => s + v.quantity, 0);
        if (q > inStock) return alert(t('الكمية المطلوبة غير متوفرة. المتاح: ') + inStock);

        setCart(prev => [...prev, { id: item.id, name: item.name, quantity: q, price: p, total: q * p }]);
        setSelectedItem(null);
        setCartQuantity('1');
        setCartPrice('');
    };
    const handleRemoveFromCart = (idx: number) => {
        setCart(prev => prev.filter((_, i) => i !== idx));
    };

    useEffect(() => {
        if (showNew) {
            const total = cart.reduce((sum, item) => sum + item.total, 0);
            setForm(f => ({ ...f, totalAmount: String(total) }));
        }
    }, [cart, showNew]);
`;
    // Insert cartMethods before handleSubmit
    code = code.replace("const handleSubmit = async (e: React.FormEvent) => {", cartMethods + "\n    const handleSubmit = async (e: React.FormEvent) => {");

    // 3. Update handleSubmit logic
    const oldHandleSubmitBodyRegex = /const handleSubmit = async \(e: React\.FormEvent\) => \{[\s\S]*?finally \{ setSubmitting\(false\); \}\n    \};/;
    const newHandleSubmitBody = `const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.customerId || cart.length === 0) {
            alert(t('يرجى اختيار العميل وإضافة المنتجات للسلة أولاً'));
            return;
        }

        setSubmitting(true);
        try {
            const productName = cart.map(i => \`\${i.name} (\${i.quantity})\`).join(', ');

            const res = await fetch('/api/installments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    productName,
                    cart,
                    totalAmount,
                    downPayment,
                    interestRate,
                    taxRate,
                    taxAmount,
                    monthsCount,
                    type: 'invoice', // Force backend to create invoice
                }),
            });
            if (res.ok) {
                setShowNew(false);
                fetchData();
            } else {
                const d = await res.json();
                alert(d.error || t('فشل الحفظ'));
            }
        } finally { setSubmitting(false); }
    };`;
    code = code.replace(oldHandleSubmitBodyRegex, newHandleSubmitBody);

    // 4. Reset form effect
    code = code.replace(/setForm\(f => \(\{ \.\.\.f, invoiceId: '' \}\)\);/, `setCart([]);
            setCartQuantity('1');
            setCartPrice('');`);

    // 5. Remove fetch invoices from fetchData
    code = code.replace(/fetch\('\/api\/sales\?status=unpaid&limit=1000'\),/, '');
    code = code.replace(/if \(invRes && invRes\.ok\) \{[\s\S]*?\}/, '');

    // 6. Replace UI Toggle and Product Select with Cart UI
    const oldUIRegex = /<div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>[\s\S]*?\{planType === 'direct' \? \([\s\S]*?\) : \([\s\S]*?\}\)\]\}[\s\S]*?<\/div>[\s\S]*?\)\]\}[\s\S]*?<\/div>[\s\S]*?\)\]\}[\s\S]*?<\/div>[\s\S]*?\)/; // this regex is tricky. Let's do it safer.

    // Safer replacement for UI:
    // Let's replace from `<div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>` 
    // to the `<div>\n <label style={{ ...LS, fontSize: '11.5px' }}>{t('قيمة المنتج الإجمالية')}`
    
    // Find the toggle
    code = code.replace(/<div style=\{\{ display: 'flex', gap: '8px', marginBottom: '16px' \}\}>[\s\S]*?جدولة فاتورة آجلة'\)}[\s\S]*?<\/div>[\s\S]*?<\/div>/, '');

    // Replace the direct/invoice block
    code = code.replace(/\{planType === 'direct' \? \([\s\S]*?\) : \([\s\S]*?\}\)/, `
        {/* Cart Section */}
        <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px', borderBottom: \`1px solid \${C.border}\`, paddingBottom: '6px' }}>
            <Package size={14} color={C.primary} />
            <span style={{ fontSize: '12.5px', fontWeight: 600, color: C.primary }}>{t('المنتجات')}</span>
        </div>
        
        <div style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '8px', alignItems: 'end' }}>
            <div>
                <label style={{ ...LS, fontSize: '11px' }}>{t('المنتج')}</label>
                <CustomSelect
                    value={selectedItem}
                    onChange={(id) => {
                        setSelectedItem(id);
                        const it = items.find(i => i.id === id);
                        if (it) setCartPrice(String(it.sellPrice || 0));
                    }}
                    options={items.map(i => ({ value: i.id, label: i.name, sub: \`\${t('المتاح')}: \${i.stocks?.reduce((s:number,v:any)=>s+v.quantity,0)||0}\` }))}
                    placeholder={t("اختر المنتج...")}
                    style={{ height: '36px', background: C.inputBg }}
                />
            </div>
            <div>
                <label style={{ ...LS, fontSize: '11px' }}>{t('الكمية')}</label>
                <input type="number" min="1" value={cartQuantity} onChange={e => setCartQuantity(e.target.value)} style={{ ...IS, height: '36px', textAlign: 'center' }} onFocus={focusIn} onBlur={focusOut} />
            </div>
            <div>
                <label style={{ ...LS, fontSize: '11px' }}>{t('السعر')}</label>
                <input type="number" min="0" value={cartPrice} onChange={e => setCartPrice(e.target.value)} style={{ ...IS, height: '36px', textAlign: 'center' }} onFocus={focusIn} onBlur={focusOut} />
            </div>
            <button type="button" onClick={handleAddToCart} style={{ ...BTN_PRIMARY(false, false), height: '36px', padding: '0 16px', borderRadius: '10px' }}>
                <Plus size={16} /> {t('إضافة')}
            </button>
        </div>

        {cart.length > 0 && (
            <div style={{ gridColumn: 'span 2', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: \`1px solid \${C.border}\`, overflow: 'hidden' }}>
                <table style={{ width: '100%', fontSize: '12px' }}>
                    <thead style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <tr>
                            <th style={{ padding: '8px 12px', textAlign: 'start' }}>{t('المنتج')}</th>
                            <th style={{ padding: '8px 12px', textAlign: 'center' }}>{t('الكمية')}</th>
                            <th style={{ padding: '8px 12px', textAlign: 'center' }}>{t('السعر')}</th>
                            <th style={{ padding: '8px 12px', textAlign: 'center' }}>{t('الإجمالي')}</th>
                            <th style={{ padding: '8px 12px', textAlign: 'center' }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {cart.map((item, idx) => (
                            <tr key={idx} style={{ borderTop: \`1px solid \${C.border}\` }}>
                                <td style={{ padding: '8px 12px' }}>{item.name}</td>
                                <td style={{ padding: '8px 12px', textAlign: 'center' }}>{item.quantity}</td>
                                <td style={{ padding: '8px 12px', textAlign: 'center' }}>{fMoneyJSX(item.price)}</td>
                                <td style={{ padding: '8px 12px', textAlign: 'center', color: C.primary, fontWeight: 700 }}>{fMoneyJSX(item.total)}</td>
                                <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                    <button type="button" onClick={() => handleRemoveFromCart(idx)} style={{ background: 'none', border: 'none', color: C.danger, cursor: 'pointer' }}><Trash2 size={14} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
    `);

    // Make totalAmount input readonly
    code = code.replace(/<input type="number" required min="0" placeholder="0\.00" value=\{form\.totalAmount\} disabled=\{planType === 'invoice'\} onChange=\{e => setForm\(f => \(\{ \.\.\.f, totalAmount: e\.target\.value \}\)\)\} style=\{\{ \.\.\.IS, height: '38px',  paddingInlineStart: '40px', paddingInlineEnd: '40px' \}\} onFocus=\{focusIn\} onBlur=\{focusOut\} \/>/, 
        `<input type="number" required min="0" placeholder="0.00" value={form.totalAmount} disabled style={{ ...IS, height: '38px',  paddingInlineStart: '40px', paddingInlineEnd: '40px' }} />`);


    fs.writeFileSync(file, code);
}
updatePage();
console.log('UI Updated');
