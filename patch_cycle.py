import re

with open('src/app/pos/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. payOpenOrder
content = re.sub(
    r"const payOpenOrder = async \(order: any\) => \{[\s\S]*?try \{",
    """const payOpenOrder = async (order: any, method: 'cash' | 'card' | 'mixed', splitAmounts?: {cash: number, card: number}) => {
        let paymentsArray = [];
        if (method === 'mixed' && splitAmounts) {
            if (splitAmounts.cash > 0) paymentsArray.push({ amount: splitAmounts.cash, paymentMethod: 'cash', treasuryId: restaurantSettings.defaultCashTreasuryId || null });
            if (splitAmounts.card > 0) paymentsArray.push({ amount: splitAmounts.card, paymentMethod: 'card', treasuryId: restaurantSettings.defaultCardTreasuryId || null });
        } else {
            let tId = null;
            if (method === 'cash') tId = restaurantSettings.defaultCashTreasuryId;
            if (method === 'card') tId = restaurantSettings.defaultCardTreasuryId;
            paymentsArray.push({ amount: order.total - order.paidAmount, paymentMethod: method, treasuryId: tId });
        }
        try {""",
    content
)

content = content.replace(
    "action: 'pay_and_close',\n                    paymentMethod,\n                    treasuryId: selectedTreasury",
    "action: 'pay_and_close',\n                    paymentMethod: method,\n                    payments: paymentsArray"
)

# 2. handleInitialSubmit -> handleDirectPay
content = re.sub(
    r"const handleInitialSubmit = \(\) => \{[\s\S]*?    \};",
    """const handleDirectPay = (method: string) => {
        if (cart.length === 0 && method !== 'none') { setErrorMsg('السلة فارغة'); return; }
        if (orderType === 'dine-in' && restaurantSettings.requireTableForDineIn !== false && !selectedTable) { setErrorMsg('يجب اختيار الطاولة'); return; }
        
        if (method === 'cash' && !restaurantSettings.defaultCashTreasuryId) {
            setErrorMsg('يرجى تحديد الخزنة النقدية الافتراضية من الإعدادات أولاً');
            return;
        }
        if (method === 'card' && !restaurantSettings.defaultCardTreasuryId) {
            setErrorMsg('يرجى تحديد حساب الشبكة الافتراضي من الإعدادات أولاً');
            return;
        }

        setPaymentMethod(method as any);
        setTimeout(() => handleSubmit(false), 0);
    };""",
    content
)

# 3. handleSubmit
content = re.sub(
    r"const paymentsArray: any\[\] = \[\];[\s\S]*?const finalDeliveryAddress",
    """const paymentsArray: any[] = [];
            const isPostPay = (orderType === 'dine-in' && restaurantSettings.dineInPaymentPolicy === 'post-pay') || orderType === 'delivery';
            if (paymentMethod !== 'none' && !isPostPay) {
                if (isSplit) {
                    if (splitAmounts.cash > 0) paymentsArray.push({ amount: splitAmounts.cash, paymentMethod: 'cash', treasuryId: restaurantSettings.defaultCashTreasuryId || null });
                    if (splitAmounts.card > 0) paymentsArray.push({ amount: splitAmounts.card, paymentMethod: 'card', treasuryId: restaurantSettings.defaultCardTreasuryId || null });
                } else if (total > 0 && paymentMethod !== 'app') {
                    let tId = null;
                    if (paymentMethod === 'cash') tId = restaurantSettings.defaultCashTreasuryId;
                    if (paymentMethod === 'card') tId = restaurantSettings.defaultCardTreasuryId;
                    paymentsArray.push({ amount: total, paymentMethod, treasuryId: tId || null });
                }
            }

            const finalDeliveryAddress""",
    content
)

# 4. Buttons
content = re.sub(
    r"\{\/\* أزرار \*\/\}.*?<div style=\{\{ display: 'flex', gap: '8px' \}\}>.*?(?=<\/div>.*?<\/div>.*?<\/div>.*?(?:\{\/\* Open Orders Modal \*\/\})|(?:\}\)\(\)\}\s*<\/div>))",
    """{/* أزرار الحفظ والدفع */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {(() => {
                                const isPostPay = (orderType === 'dine-in' && restaurantSettings.dineInPaymentPolicy === 'post-pay') || orderType === 'delivery';
                                
                                if (isPostPay) {
                                    return (
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            {cart.length > 0 && (
                                                <button onClick={clearCart} style={{ height: '48px', padding: '0 16px', borderRadius: '12px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textSecondary, fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: CAIRO }}>
                                                    {t('مسح')}
                                                </button>
                                            )}
                                            <button onClick={() => handleDirectPay('none')} disabled={submitting || cart.length === 0}
                                                style={{ ...BTN_PRIMARY(submitting || cart.length === 0, false), flex: 1, height: '48px', borderRadius: '12px', fontSize: '14px', gap: '8px' }}>
                                                {submitting ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> {t('جاري الحفظ...')}</> : <><ChefHat size={16} /> {t('إرسال للمطبخ (دفع لاحق)')}</>}
                                            </button>
                                        </div>
                                    );
                                }

                                return (
                                    <>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            {cart.length > 0 && (
                                                <button onClick={clearCart} style={{ height: '48px', padding: '0 16px', borderRadius: '12px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textSecondary, fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: CAIRO }}>
                                                    {t('مسح')}
                                                </button>
                                            )}
                                            {orderType === 'aggregator' ? (
                                                <button onClick={() => handleDirectPay('app')} disabled={submitting || cart.length === 0} style={{ ...BTN_PRIMARY(submitting || cart.length === 0, false), flex: 1, height: '48px', borderRadius: '12px', fontSize: '15px', background: '#ec4899', borderColor: '#ec4899' }}>
                                                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <><Store size={18} /> {t('تأكيد التطبيق')}</>}
                                                </button>
                                            ) : (
                                                <>
                                                    <button onClick={() => handleDirectPay('cash')} disabled={submitting || cart.length === 0} style={{ ...BTN_PRIMARY(submitting || cart.length === 0, false), flex: 1, height: '48px', borderRadius: '12px', fontSize: '15px', background: '#22c55e', borderColor: '#22c55e' }}>
                                                        {submitting ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <><Banknote size={18} /> {t('كاش')}</>}
                                                    </button>
                                                    <button onClick={() => handleDirectPay('card')} disabled={submitting || cart.length === 0} style={{ ...BTN_PRIMARY(submitting || cart.length === 0, false), flex: 1, height: '48px', borderRadius: '12px', fontSize: '15px', background: '#3b82f6', borderColor: '#3b82f6' }}>
                                                        {submitting ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <><CreditCard size={18} /> {t('شبكة')}</>}
                                                    </button>
                                                    <button onClick={() => {
                                                        if (cart.length === 0) { setErrorMsg('السلة فارغة'); return; }
                                                        setSplitAmounts({ cash: total / 2, card: total / 2 });
                                                        setShowSplitPayment(true);
                                                    }} disabled={submitting || cart.length === 0} style={{ ...BTN_PRIMARY(submitting || cart.length === 0, false), flex: '0 0 auto', padding: '0 16px', height: '48px', borderRadius: '12px', fontSize: '14px', background: C.card, color: C.textPrimary, border: `1px solid ${C.border}` }}>
                                                        <UtensilsCrossed size={18} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </>
                                );
                            })()}
                        </div>""",
    content,
    flags=re.DOTALL
)

# 5. Remove "زر تحديد طريقة الدفع"
content = re.sub(
    r"\{\/\* زر تحديد طريقة الدفع \*\/\}.*?&& \([\s\S]*?\n                        \)\}",
    "",
    content,
    flags=re.DOTALL
)

# 6. Delete showPaymentModal
content = re.sub(
    r"\{\/\* Payment Method & Treasury Modal \*\/\}.*?showPaymentModal && \([\s\S]*?\n            \)\}",
    "",
    content,
    flags=re.DOTALL
)

# 7. Update payOpenOrder modal
content = re.sub(
    r"<div>\s*<label[^>]*>\{t\('اختر الخزينة:'\)\}<\/label>[\s\S]*?<\/div>\s*<div>\s*<label[^>]*>\{t\('طريقة الدفع:'\)\}<\/label>[\s\S]*?<\/div>",
    """<div>
                            <label style={{ fontSize: '13px', color: C.textSecondary, marginBottom: '8px', display: 'block', fontWeight: 600 }}>{t('اختر طريقة الدفع:')}</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={() => payOpenOrder(payingOrder, 'cash')} style={{ flex: 1, padding: '16px', borderRadius: '12px', border: `1px solid #22c55e`, background: '#22c55e', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    <Banknote size={18} /> {t('نقدي')}
                                </button>
                                <button onClick={() => payOpenOrder(payingOrder, 'card')} style={{ flex: 1, padding: '16px', borderRadius: '12px', border: `1px solid #3b82f6`, background: '#3b82f6', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    <CreditCard size={18} /> {t('شبكة')}
                                </button>
                            </div>
                            <button onClick={() => {
                                setSplitAmounts({ cash: (payingOrder.total - payingOrder.paidAmount) / 2, card: (payingOrder.total - payingOrder.paidAmount) / 2 });
                                setShowSplitPayment(true);
                            }} style={{ width: '100%', marginTop: '8px', padding: '12px', borderRadius: '12px', border: `1px solid ${C.border}`, background: C.card, color: C.textPrimary, fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                <UtensilsCrossed size={18} /> {t('دفع متعدد')}
                            </button>
                        </div>""",
    content
)

# Remove the old "pay" button from payOpenOrder modal
content = re.sub(
    r"<button onClick=\{\(\) => payOpenOrder\(payingOrder\)\}[\s\S]*?<\/button>",
    "",
    content
)

# 8. Update split payment modal
content = re.sub(
    r"<button onClick=\{\(\) => handleSubmit\(true\)\} disabled=\{submitting \|\| \(splitAmounts\.cash \+ splitAmounts\.card !== total\)\}[\s\S]*?<\/button>",
    """{(() => {
                                const targetTotal = payingOrder ? (payingOrder.total - payingOrder.paidAmount) : total;
                                return <button onClick={() => {
                                    if (!restaurantSettings.defaultCashTreasuryId || !restaurantSettings.defaultCardTreasuryId) {
                                        setErrorMsg('يرجى تحديد خزائن الكاش والشبكة الافتراضية من الإعدادات أولاً');
                                        return;
                                    }
                                    if (payingOrder) {
                                        payOpenOrder(payingOrder, 'mixed', splitAmounts);
                                        setShowSplitPayment(false);
                                    } else {
                                        setPaymentMethod('mixed');
                                        setTimeout(() => handleSubmit(true), 0);
                                    }
                                }} disabled={submitting || (splitAmounts.cash + splitAmounts.card !== targetTotal)} 
                                style={{ ...BTN_PRIMARY(submitting || (splitAmounts.cash + splitAmounts.card !== targetTotal), false), flex: 2, height: '44px', borderRadius: '12px' }}>
                                {submitting ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'تأكيد الدفع وطباعة'}
                            </button>
                            })()}""",
    content
)

content = re.sub(
    r"<div style=\{\{ fontSize: '24px', fontWeight: 800, color: C\.textPrimary, fontFamily: OUTFIT \}\}>\n\s*\{fMoneyJSX\(total\)\}\n\s*<\/div>",
    """<div style={{ fontSize: '24px', fontWeight: 800, color: C.textPrimary, fontFamily: OUTFIT }}>
                                {fMoneyJSX(payingOrder ? (payingOrder.total - payingOrder.paidAmount) : total)}
                            </div>""",
    content
)


with open('src/app/pos/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
