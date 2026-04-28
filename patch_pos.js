const fs = require('fs');
let content = fs.readFileSync('src/app/pos/page.tsx', 'utf8');

const statesToAdd = `
    const [currentShift, setCurrentShift] = useState<any>(null);
    const [showStartShift, setShowStartShift] = useState(false);
    const [showEndShift, setShowEndShift] = useState(false);
    const [showDrawerModal, setShowDrawerModal] = useState(false);
    const [showSearchInput, setShowSearchInput] = useState(false);
    
    const [drawerAmount, setDrawerAmount] = useState<number | ''>('');
    const [drawerNotes, setDrawerNotes] = useState('');
    const [drawerType, setDrawerType] = useState<'in' | 'out'>('in');
    
    const [shiftOpeningBalance, setShiftOpeningBalance] = useState<number | ''>('');
    const [shiftClosingBalance, setShiftClosingBalance] = useState<number | ''>('');
    const [shiftNotes, setShiftNotes] = useState('');
    const [shiftLoading, setShiftLoading] = useState(false);
`;
content = content.replace("const [step, setStep] = useState<'cart' | 'payment'>('cart');", "const [step, setStep] = useState<'cart' | 'payment'>('cart');" + statesToAdd);

content = content.replace("fetch('/api/settings')", "fetch('/api/settings'), fetch('/api/restaurant/shifts?status=open')");
content = content.replace("const [cats, itms, tbls, mods, drvs, custs, treas, settings] = await Promise.all([catRes.json(), itemRes.json(), tableRes.json(), modRes.json(), driverRes.json(), custRes.json(), treasRes.json(), settingsRes.json()]);",
    "const [cats, itms, tbls, mods, drvs, custs, treas, settings, shiftsResData] = await Promise.all([catRes.json(), itemRes.json(), tableRes.json(), modRes.json(), driverRes.json(), custRes.json(), treasRes.json(), settingsRes.json(), shiftRes.json()]);");
content = content.replace("setRestaurantSettings(settings.restaurantSettings || {});", 
    "setRestaurantSettings(settings.restaurantSettings || {});\n            if (Array.isArray(shiftsResData) && shiftsResData.length > 0) setCurrentShift(shiftsResData[0]); else { setCurrentShift(null); setShowStartShift(true); }");

const handlers = `
    const handleStartShift = async () => {
        if (shiftOpeningBalance === '') return;
        setShiftLoading(true);
        try {
            const res = await fetch('/api/restaurant/shifts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ openingBalance: shiftOpeningBalance, notes: shiftNotes }) });
            if (res.ok) {
                const shift = await res.json();
                setCurrentShift(shift);
                setShowStartShift(false);
                setSuccessMsg('تم بدء الوردية بنجاح');
                setTimeout(() => setSuccessMsg(''), 3000);
            }
        } catch {} finally { setShiftLoading(false); }
    };

    const handleEndShift = async () => {
        if (shiftClosingBalance === '' || !currentShift) return;
        setShiftLoading(true);
        try {
            const res = await fetch('/api/restaurant/shifts', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: currentShift.id, closingBalance: shiftClosingBalance, notes: shiftNotes }) });
            if (res.ok) {
                const data = await res.json();
                setCurrentShift(null);
                setShowEndShift(false);
                setSuccessMsg('تم إنهاء الوردية بنجاح. الفارق: ' + fMoney(data.difference));
                setTimeout(() => setSuccessMsg(''), 5000);
                setShowStartShift(true);
            }
        } catch {} finally { setShiftLoading(false); }
    };

    const handleDrawerOperation = async () => {
        if (!drawerAmount || !currentShift || !selectedTreasury) {
            setErrorMsg('تأكد من اختيار الخزنة وإدخال المبلغ');
            setTimeout(() => setErrorMsg(''), 3000);
            return;
        }
        setShiftLoading(true);
        try {
            const res = await fetch('/api/restaurant/shifts/drawer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shiftId: currentShift.id, treasuryId: selectedTreasury, type: drawerType, amount: drawerAmount, notes: drawerNotes }) });
            if (res.ok) {
                setShowDrawerModal(false);
                setDrawerAmount('');
                setDrawerNotes('');
                setSuccessMsg(drawerType === 'in' ? 'تم إضافة المبلغ للدرج' : 'تم سحب المبلغ من الدرج');
                setTimeout(() => setSuccessMsg(''), 3000);
            }
        } catch {} finally { setShiftLoading(false); }
    };
`;
content = content.replace("    return (", handlers + "\n    return (");

const oldHeaderRegex = /\{\/\*\s*Header المنيو\s*\*\/\}\s*<div style=\{\{\s*padding:\s*'16px 20px'[\s\S]*?\{\/\*\s*التصنيفات\s*\*\/\}/;
const newHeader = `{/* Header المنيو (New Design) */}
                    <div style={{ padding: '16px 20px', background: C.card, borderBottom: \`1px solid \${C.border}\`, display: 'flex', gap: '12px', alignItems: 'center' }}>
                        
                        {/* Search Icon / Bar */}
                        {showSearchInput ? (
                            <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ position: 'relative', flex: 1 }}>
                                    <Search size={16} style={{ position: 'absolute', insetInlineStart: '12px', top: '50%', transform: 'translateY(-50%)', color: C.textMuted }} />
                                    <input autoFocus ref={searchRef} value={search} onChange={e => setSearch(e.target.value)} placeholder={t('ابحث عن صنف...')} style={{ ...IS, paddingInlineStart: '36px', height: '40px', fontSize: '13px' }} />
                                </div>
                                <button onClick={() => setShowSearchInput(false)} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer' }}><X size={20} /></button>
                            </div>
                        ) : (
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <button onClick={() => setShowSearchInput(true)} style={{ width: 40, height: 40, borderRadius: '10px', border: \`1px solid \${C.border}\`, background: C.card, color: C.textPrimary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Search size={18} />
                                </button>
                                
                                {/* Branch Selector */}
                                <button style={{ height: 40, padding: '0 12px', borderRadius: '10px', border: \`1px solid \${C.border}\`, background: C.card, color: C.textPrimary, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, fontFamily: CAIRO }}>
                                    <Store size={16} color={C.primary} />
                                    <span>{t('الفرع الرئيسي')}</span>
                                </button>

                                {/* Drawer Ops */}
                                <button onClick={() => setShowDrawerModal(true)} style={{ height: 40, padding: '0 12px', borderRadius: '10px', border: \`1px solid \${C.border}\`, background: C.card, color: C.textPrimary, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, fontFamily: CAIRO }}>
                                    <Wallet size={16} color={'#f59e0b'} />
                                    <span>{t('درج الكاشير')}</span>
                                </button>
                            </div>
                        )}

                        <button onClick={load} style={{ width: 40, height: 40, borderRadius: '10px', border: \`1px solid \${C.border}\`, background: C.card, color: C.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <RefreshCw size={15} />
                        </button>
                        
                        {currentShift ? (
                            <button onClick={() => setShowEndShift(true)} style={{ height: 40, padding: '0 16px', borderRadius: '10px', border: '1px solid #ef444430', background: '#ef444410', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, fontFamily: CAIRO }}>
                                <LogOut size={16} /> {t('إنهاء')}
                            </button>
                        ) : (
                            <button onClick={() => setShowStartShift(true)} style={{ height: 40, padding: '0 16px', borderRadius: '10px', border: \`1px solid \${C.primary}30\`, background: \`\${C.primary}10\`, color: C.primary, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, fontFamily: CAIRO }}>
                                <User size={16} /> {t('بدء الوردية')}
                            </button>
                        )}
                    </div>

                    {/* التصنيفات */}`;
content = content.replace(oldHeaderRegex, newHeader);

const modals = `
            {/* Start Shift Modal */}
            {showStartShift && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: C.card, border: \`1px solid \${C.border}\`, borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '400px' }}>
                        <h2 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: 700, color: C.primary, fontFamily: CAIRO, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <User size={20} /> بدء الوردية
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={LS}>الرصيد الافتتاحي للدرج 💰 <span style={{ color: C.danger }}>*</span></label>
                                <input type="number" min="0" value={shiftOpeningBalance} onChange={e => setShiftOpeningBalance(e.target.value ? Number(e.target.value) : '')} style={{ ...IS, fontFamily: OUTFIT, fontSize: '18px', fontWeight: 700 }} autoFocus />
                            </div>
                            <div>
                                <label style={LS}>ملاحظات (اختياري)</label>
                                <input value={shiftNotes} onChange={e => setShiftNotes(e.target.value)} style={IS} />
                            </div>
                        </div>
                        <button onClick={handleStartShift} disabled={shiftOpeningBalance === '' || shiftLoading} style={{ ...BTN_PRIMARY(shiftOpeningBalance === '' || shiftLoading, false), width: '100%', height: '48px', borderRadius: '12px', marginTop: '24px', fontSize: '15px' }}>
                            {shiftLoading ? <Loader2 size={18} className="animate-spin" /> : 'بدء العمل'}
                        </button>
                    </div>
                </div>
            )}

            {/* End Shift Modal */}
            {showEndShift && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: C.card, border: \`1px solid \${C.border}\`, borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '400px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: C.danger, fontFamily: CAIRO, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <LogOut size={20} /> إنهاء الوردية
                            </h2>
                            <button onClick={() => setShowEndShift(false)} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer' }}><X size={18} /></button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={LS}>الرصيد الفعلي الموجود بالدرج 💰 <span style={{ color: C.danger }}>*</span></label>
                                <input type="number" min="0" value={shiftClosingBalance} onChange={e => setShiftClosingBalance(e.target.value ? Number(e.target.value) : '')} style={{ ...IS, fontFamily: OUTFIT, fontSize: '18px', fontWeight: 700 }} autoFocus />
                            </div>
                            <div>
                                <label style={LS}>ملاحظات العجز/الزيادة (اختياري)</label>
                                <input value={shiftNotes} onChange={e => setShiftNotes(e.target.value)} style={IS} />
                            </div>
                        </div>
                        <button onClick={handleEndShift} disabled={shiftClosingBalance === '' || shiftLoading} style={{ ...BTN_PRIMARY(shiftClosingBalance === '' || shiftLoading, false), width: '100%', height: '48px', borderRadius: '12px', marginTop: '24px', fontSize: '15px', background: C.danger, borderColor: C.dangerBorder }}>
                            {shiftLoading ? <Loader2 size={18} className="animate-spin" /> : 'تأكيد الإنهاء وإصدار التقرير'}
                        </button>
                    </div>
                </div>
            )}

            {/* Drawer Operations Modal */}
            {showDrawerModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: C.card, border: \`1px solid \${C.border}\`, borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '400px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: C.textPrimary, fontFamily: CAIRO, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Wallet size={20} color={'#f59e0b'} /> إدارة الدرج النقدية
                            </h2>
                            <button onClick={() => setShowDrawerModal(false)} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer' }}><X size={18} /></button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                            <button onClick={() => setDrawerType('in')} style={{ height: '44px', borderRadius: '12px', border: \`1px solid \${drawerType === 'in' ? C.success : C.border}\`, background: drawerType === 'in' ? \`\${C.success}10\` : 'transparent', color: drawerType === 'in' ? C.success : C.textSecondary, fontWeight: 700, fontFamily: CAIRO, cursor: 'pointer' }}>➕ إيداع نقدي</button>
                            <button onClick={() => setDrawerType('out')} style={{ height: '44px', borderRadius: '12px', border: \`1px solid \${drawerType === 'out' ? C.danger : C.border}\`, background: drawerType === 'out' ? \`\${C.danger}10\` : 'transparent', color: drawerType === 'out' ? C.danger : C.textSecondary, fontWeight: 700, fontFamily: CAIRO, cursor: 'pointer' }}>➖ سحب نقدي</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <CustomSelect value={selectedTreasury} onChange={v => setSelectedTreasury(v)} options={treasuries.map(t => ({ value: t.id, label: t.name }))} placeholder={t('اختر الخزنة للتأثير المحاسبي')} />
                            <div>
                                <label style={LS}>المبلغ <span style={{ color: C.danger }}>*</span></label>
                                <input type="number" min="0" value={drawerAmount} onChange={e => setDrawerAmount(e.target.value ? Number(e.target.value) : '')} style={{ ...IS, fontFamily: OUTFIT, fontSize: '18px', fontWeight: 700 }} />
                            </div>
                            <div>
                                <label style={LS}>السبب / ملاحظات <span style={{ color: C.danger }}>*</span></label>
                                <input value={drawerNotes} onChange={e => setDrawerNotes(e.target.value)} style={IS} />
                            </div>
                        </div>
                        <button onClick={handleDrawerOperation} disabled={drawerAmount === '' || !drawerNotes || !selectedTreasury || shiftLoading} style={{ ...BTN_PRIMARY(drawerAmount === '' || !drawerNotes || !selectedTreasury || shiftLoading, false), width: '100%', height: '48px', borderRadius: '12px', marginTop: '24px', fontSize: '15px' }}>
                            {shiftLoading ? <Loader2 size={18} className="animate-spin" /> : 'تنفيذ'}
                        </button>
                    </div>
                </div>
            )}
            
            <style>{\`@keyframes spin\`;
`;

content = content.replace("<style>{`@keyframes spin", modals);

fs.writeFileSync('src/app/pos/page.tsx', content);
console.log('Done patching POS page.');
