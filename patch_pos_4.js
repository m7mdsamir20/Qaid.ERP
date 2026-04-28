const fs = require('fs');
let c = fs.readFileSync('src/app/pos/page.tsx', 'utf8');

// 1. Add Power and Home icons
if (!c.includes('Power,')) {
    c = c.replace('LogOut, User', 'LogOut, User, Power, Home');
}

// 2. Add state hooks
const stateHookTarget = `    const [showStartShift, setShowStartShift] = useState(false);`;
const newStates = `    const [showStartShift, setShowStartShift] = useState(false);
    const [showUnpaidWarning, setShowUnpaidWarning] = useState(false);
    const [shiftReportData, setShiftReportData] = useState<any>(null);`;
if (!c.includes('showUnpaidWarning')) {
    c = c.replace(stateHookTarget, newStates);
}

// 3. Update the handleEndShiftClick inline
const headerSearchStr = `{/* Start/End Shift */}
                        {currentShift ? (
                            <button onClick={() => setShowEndShift(true)} style={{ height: 40, padding: '0 16px', borderRadius: '10px', border: '1px solid #ef444430', background: '#ef444410', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, fontFamily: CAIRO }}>
                                <LogOut size={16} /> {t('إنهاء')}
                            </button>
                        ) : (
                            <button onClick={() => setShowStartShift(true)} style={{ height: 40, padding: '0 16px', borderRadius: '10px', border: \`1px solid \${C.primary}30\`, background: \`\${C.primary}10\`, color: C.primary, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, fontFamily: CAIRO }}>
                                <User size={16} /> {t('بدء الوردية')}
                            </button>
                        )}`;

const newButtons = `{/* Exit System */}
                        <button onClick={() => window.location.href='/dashboard'} style={{ height: 40, padding: '0 16px', borderRadius: '10px', border: 'none', background: C.danger, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, fontFamily: CAIRO }}>
                            <LogOut size={16} /> النظام
                        </button>

                        {/* Start/End Shift */}
                        {currentShift ? (
                            <button onClick={() => { if (cart.length > 0) setShowUnpaidWarning(true); else setShowEndShift(true); }} style={{ height: 40, padding: '0 24px', borderRadius: '10px', border: 'none', background: '#1e1b4b', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 700, fontFamily: CAIRO }}>
                                نهاية العمل <Power size={18} />
                            </button>
                        ) : (
                            <button onClick={() => setShowStartShift(true)} style={{ height: 40, padding: '0 24px', borderRadius: '10px', border: 'none', background: '#1e1b4b', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 700, fontFamily: CAIRO }}>
                                بدء العمل <Power size={18} />
                            </button>
                        )}`;

if (c.includes(headerSearchStr)) {
    c = c.replace(headerSearchStr, newButtons);
} else {
    console.log('Could not find header buttons to replace');
}

// 5. Add Locked Overlay
const lockedOverlayTarget = `{/* ══ الجانب الأيسر: المنيو ══ */}`;
const newLockedOverlay = `{/* --- Locked Overlay --- */}
                {!currentShift && !loading && (
                    <div style={{ position: 'absolute', inset: 0, zIndex: 50, background: 'rgba(244, 244, 245, 0.5)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ textAlign: 'center' }}>
                            <button onClick={() => setShowStartShift(true)} style={{ background: '#1e1b4b', color: 'white', border: 'none', padding: '16px 48px', borderRadius: '12px', fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)', fontFamily: CAIRO }}>
                                <Power size={24} /> ابدأ العمل
                            </button>
                            <p style={{ marginTop: '16px', color: '#1e1b4b', fontWeight: 700, fontSize: '16px', fontFamily: CAIRO }}>لم يتم بدء العمل بعد</p>
                            <p style={{ marginTop: '4px', color: C.textSecondary, fontSize: '13px', fontFamily: CAIRO }}>قم بالبدء لرؤية المنتجات أو إنشاء طلب</p>
                        </div>
                    </div>
                )}
                
                {/* ══ الجانب الأيسر: المنيو ══ */}`;
if (!c.includes('Locked Overlay')) {
    c = c.replace(lockedOverlayTarget, newLockedOverlay);
}

// 6. Modals
const modalsMarker = `{/* --- Modals --- */}`;
const newModals = `{/* --- Modals --- */}
            {/* Warning Unpaid Modal */}
            {showUnpaidWarning && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', fontFamily: CAIRO }}>
                    <div style={{ background: C.bg, width: '360px', borderRadius: '16px', padding: '32px', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
                        <div style={{ background: '#374151', width: '80px', height: '80px', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}>
                            <AlertCircle size={40} color="white" />
                        </div>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 800, color: C.textPrimary }}>هناك طلبات غير مدفوعة</h3>
                        <p style={{ margin: '0 0 24px 0', fontSize: '15px', color: C.textSecondary, fontWeight: 600 }}>هل تريد إنهاء العمل؟</p>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={() => { setShowUnpaidWarning(false); setShowEndShift(true); }} style={{ flex: 1, padding: '14px', borderRadius: '8px', border: 'none', background: '#f3f4f6', color: '#1f2937', fontWeight: 700, fontSize: '15px', cursor: 'pointer', fontFamily: CAIRO }}>متابعة</button>
                            <button onClick={() => setShowUnpaidWarning(false)} style={{ flex: 1, padding: '14px', borderRadius: '8px', border: 'none', background: '#ef4444', color: 'white', fontWeight: 700, fontSize: '15px', cursor: 'pointer', fontFamily: CAIRO }}>إلغاء</button>
                        </div>
                    </div>
                </div>
            )}`;
if (!c.includes('showUnpaidWarning &&')) {
    c = c.replace(modalsMarker, newModals);
}

// 7. Refactor Start Shift Modal
const startShiftModalTarget = `<h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: C.textPrimary, fontFamily: CAIRO, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <User size={20} /> بدء الوردية
                            </h2>`;
const startShiftModalNew = `<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                                <Wallet size={48} color={C.textPrimary} style={{ marginBottom: '16px' }} />
                                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>كم لديك من النقود في الدرج؟</h2>
                            </div>`;
const oldStartShiftBtn = `<button onClick={handleStartShift} disabled={shiftOpeningBalance === '' || shiftLoading} style={{ ...BTN_PRIMARY(shiftOpeningBalance === '' || shiftLoading, false), width: '100%', height: '48px', borderRadius: '12px', marginTop: '24px', fontSize: '15px' }}>
                            {shiftLoading ? <Loader2 size={18} className="animate-spin" /> : 'بدء الوردية'}
                        </button>`;
const newStartShiftBtn = `<div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                            <button onClick={() => setShowStartShift(false)} style={{ flex: 1, height: '48px', borderRadius: '10px', border: 'none', background: '#1e1b4b', color: 'white', fontSize: '15px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO }}>إلغاء</button>
                            <button onClick={handleStartShift} disabled={shiftOpeningBalance === '' || shiftLoading} style={{ ...BTN_PRIMARY(shiftOpeningBalance === '' || shiftLoading, false), flex: 2, height: '48px', borderRadius: '10px', fontSize: '15px', background: '#3b82f6', border: 'none', fontFamily: CAIRO }}>
                                {shiftLoading ? <Loader2 size={18} className="animate-spin" /> : 'ابدأ العمل'}
                            </button>
                        </div>`;
if (c.includes(startShiftModalTarget)) {
    c = c.replace(startShiftModalTarget, startShiftModalNew);
    c = c.replace(oldStartShiftBtn, newStartShiftBtn);
    
    // Also remove the Close X button for start shift
    c = c.replace(`<button onClick={() => setShowStartShift(false)} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer' }}><X size={18} /></button>`, '');
}

// 8. Refactor End Shift Modal
const endShiftModalTarget = `<h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: C.textPrimary, fontFamily: CAIRO, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <LogOut size={20} /> إنهاء الوردية
                            </h2>`;
const endShiftModalNew = `<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                                <Wallet size={48} color={C.textPrimary} style={{ marginBottom: '16px' }} />
                                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>كم من النقد لديك الآن؟</h2>
                            </div>`;
const oldEndShiftBtn = `<button onClick={handleEndShift} disabled={shiftClosingBalance === '' || shiftLoading} style={{ ...BTN_PRIMARY(shiftClosingBalance === '' || shiftLoading, false), width: '100%', height: '48px', borderRadius: '12px', marginTop: '24px', fontSize: '15px', background: C.danger, borderColor: C.dangerBorder }}>
                            {shiftLoading ? <Loader2 size={18} className="animate-spin" /> : 'تأكيد الإنهاء وإصدار التقرير'}
                        </button>`;
const newEndShiftBtn = `<div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                            <button onClick={() => setShowEndShift(false)} style={{ flex: 1, height: '48px', borderRadius: '10px', border: 'none', background: '#1e1b4b', color: 'white', fontSize: '15px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO }}>إلغاء</button>
                            <button onClick={handleEndShift} disabled={shiftClosingBalance === '' || shiftLoading} style={{ ...BTN_PRIMARY(shiftClosingBalance === '' || shiftLoading, false), flex: 2, height: '48px', borderRadius: '10px', fontSize: '15px', background: '#3b82f6', border: 'none', fontFamily: CAIRO }}>
                                {shiftLoading ? <Loader2 size={18} className="animate-spin" /> : 'نهاية العمل'}
                            </button>
                        </div>`;
if (c.includes(endShiftModalTarget)) {
    c = c.replace(endShiftModalTarget, endShiftModalNew);
    c = c.replace(oldEndShiftBtn, newEndShiftBtn);
    
    // Remove the Close X button for end shift
    c = c.replace(`<button onClick={() => setShowEndShift(false)} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer' }}><X size={18} /></button>`, '');
}

fs.writeFileSync('src/app/pos/page.tsx', c);
console.log('Script completed successfully');
