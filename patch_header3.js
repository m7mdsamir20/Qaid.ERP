const fs = require('fs');
let content = fs.readFileSync('src/app/pos/page.tsx', 'utf8');

content = content.replace(/const \[showDrawerModal, setShowDrawerModal\] = useState\(false\);\n    const \[showSearchInput, setShowSearchInput\] = useState\(false\);/, 
`    const [showDrawerModal, setShowDrawerModal] = useState(false);
    const [showSearchInput, setShowSearchInput] = useState(false);
    const [showBranchModal, setShowBranchModal] = useState(false);
    const [branches, setBranches] = useState<any[]>([]);
    const [selectedBranch, setSelectedBranch] = useState<any>(null);`);

content = content.replace(/fetch\('\/api\/settings'\), fetch\('\/api\/restaurant\/shifts\?status=open'\)/, 
`fetch('/api/settings'), fetch('/api/restaurant/shifts?status=open'), fetch('/api/branches')`);

content = content.replace(/const \[cats, itms, tbls, mods, drvs, custs, treas, settings, shiftsResData\] = await Promise\.all\(\[catRes\.json\(\), itemRes\.json\(\), tableRes\.json\(\), modRes\.json\(\), driverRes\.json\(\), custRes\.json\(\), treasRes\.json\(\), settingsRes\.json\(\), shiftRes\.json\(\)\]\);/, 
`const [cats, itms, tbls, mods, drvs, custs, treas, settings, shiftsResData, branchesData] = await Promise.all([catRes.json(), itemRes.json(), tableRes.json(), modRes.json(), driverRes.json(), custRes.json(), treasRes.json(), settingsRes.json(), shiftRes.json(), branchRes.json()]);`);

content = content.replace(/const \[catRes, itemRes, tableRes, modRes, driverRes, custRes, treasRes, settingsRes, shiftRes\] = await Promise\.all\(/, 
`const [catRes, itemRes, tableRes, modRes, driverRes, custRes, treasRes, settingsRes, shiftRes, branchRes] = await Promise.all(`);

content = content.replace(/setRestaurantSettings\(settings\.restaurantSettings \|\| \{\}\);/, 
`setRestaurantSettings(settings.restaurantSettings || {});
            const brArr = Array.isArray(branchesData) ? branchesData : [];
            setBranches(brArr);
            if (brArr.length > 0) setSelectedBranch(brArr[0]);`);

const oldHeaderRegex = /\{\/\* Header المنيو \(New Design\) \*\/\}[\s\S]*?\{\/\* التصنيفات \*\/\}/;
const newHeader = `{/* Header المنيو (New Design) */}
                    <div style={{ padding: '16px 20px', background: C.card, borderBottom: \`1px solid \${C.border}\`, display: 'flex', gap: '12px', alignItems: 'center' }}>
                        
                        {/* Start/End Shift */}
                        {currentShift ? (
                            <button onClick={() => setShowEndShift(true)} style={{ height: 40, padding: '0 16px', borderRadius: '10px', border: '1px solid #ef444430', background: '#ef444410', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, fontFamily: CAIRO }}>
                                <LogOut size={16} /> {t('إنهاء')}
                            </button>
                        ) : (
                            <button onClick={() => setShowStartShift(true)} style={{ height: 40, padding: '0 16px', borderRadius: '10px', border: \`1px solid \${C.primary}30\`, background: \`\${C.primary}10\`, color: C.primary, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, fontFamily: CAIRO }}>
                                <User size={16} /> {t('بدء الوردية')}
                            </button>
                        )}

                        {/* Refresh */}
                        <button onClick={load} style={{ width: 40, height: 40, borderRadius: '10px', border: \`1px solid \${C.border}\`, background: C.card, color: C.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="تحديث">
                            <RefreshCw size={15} />
                        </button>

                        {/* Drawer Ops */}
                        <button onClick={() => setShowDrawerModal(true)} style={{ width: 40, height: 40, borderRadius: '10px', border: \`1px solid \${C.border}\`, background: C.card, color: C.textPrimary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="درج الكاشير">
                            <Wallet size={16} color={'#f59e0b'} />
                        </button>
                        
                        {/* Branch Selector Icon */}
                        <button onClick={() => setShowBranchModal(true)} style={{ width: 40, height: 40, borderRadius: '10px', border: \`1px solid \${C.border}\`, background: C.card, color: C.textPrimary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="الفرع">
                            <Store size={16} color={C.primary} />
                        </button>

                        <div style={{ flex: 1 }}></div>
                    </div>

                    {/* التصنيفات */}`;

content = content.replace(oldHeaderRegex, newHeader);

const modalsMarker = '{/* --- Modals --- */}';
const branchModal = `{/* --- Modals --- */}
            {/* Modal: Branches */}
            {showBranchModal && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', fontFamily: CAIRO }}>
                    <div style={{ background: C.bg, width: '400px', borderRadius: '16px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: C.textPrimary, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Store size={20} color={C.primary} />
                                الفروع
                            </h3>
                            <button onClick={() => setShowBranchModal(false)} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer' }}><X size={20} /></button>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {branches.map(br => (
                                <button key={br.id} onClick={() => { setSelectedBranch(br); setShowBranchModal(false); }} style={{ padding: '16px', borderRadius: '12px', border: \`1px solid \${selectedBranch?.id === br.id ? C.primary : C.border}\`, background: selectedBranch?.id === br.id ? \`\${C.primary}10\` : C.card, color: selectedBranch?.id === br.id ? C.primary : C.textPrimary, display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', textAlign: 'start' }}>
                                    <Store size={20} />
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '15px' }}>{br.name}</div>
                                        <div style={{ fontSize: '12px', color: C.textSecondary, marginTop: '2px' }}>{br.address || 'بدون عنوان'}</div>
                                    </div>
                                </button>
                            ))}
                            {branches.length === 0 && (
                                <div style={{ padding: '20px', textAlign: 'center', color: C.textSecondary, fontSize: '14px' }}>لا توجد فروع متاحة</div>
                            )}
                        </div>
                    </div>
                </div>
            )}`;
content = content.replace(modalsMarker, branchModal);

fs.writeFileSync('src/app/pos/page.tsx', content);
