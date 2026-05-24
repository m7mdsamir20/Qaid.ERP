const fs = require('fs');

function updatePage() {
    const file = 'src/app/installments/page.tsx';
    let code = fs.readFileSync(file, 'utf8');

    // 1. Remove planType and unpaidInvoices, add cart state
    code = code.replace(/const \[planType, setPlanType\] = useState\('direct'\);\s*\/\/ 'direct' or 'invoice'\s*const \[unpaidInvoices, setUnpaidInvoices\] = useState<any\[\]>\(\[\]\);/, `const [cart, setCart] = useState<any[]>([]);
    const [cartQuantity, setCartQuantity] = useState('1');
    const [cartPrice, setCartPrice] = useState('');`);

    // 2. Remove fetch invoices from fetchData
    code = code.replace(/fetch\('\/api\/sales\?status=unpaid&limit=1000'\),/, '');
    code = code.replace(/if \(invRes && invRes\.ok\) \{[\s\S]*?\}/, '');

    // 3. Reset cart on close
    code = code.replace(/setPlanType\('direct'\);\s*setForm\(f => \(\{ \.\.\.f, invoiceId: '' \}\)\);/, `setCart([]);
            setCartQuantity('1');
            setCartPrice('');`);

    // 4. Add cartMethods before handleSubmit
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
    code = code.replace("const handleSubmit = async (e: React.FormEvent) => {", cartMethods + "\n    const handleSubmit = async (e: React.FormEvent) => {");

    // 5. Update handleSubmit logic
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

    fs.writeFileSync(file, code);
}
updatePage();
console.log('UI State Updated');
