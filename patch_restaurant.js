const fs = require('fs');
let content = fs.readFileSync('src/app/settings/_tabs/RestaurantTab.tsx', 'utf-8');

// 1. Add fields to RestaurantSettings
content = content.replace(
    'deliveryApps: DeliveryApp[];',
    'deliveryApps: DeliveryApp[];\n    defaultCashTreasuryId: string;\n    defaultCardTreasuryId: string;'
);

content = content.replace(
    'deliveryApps: []',
    'deliveryApps: [],\n    defaultCashTreasuryId: \'\',\n    defaultCardTreasuryId: \'\''
);

// 2. Add treasuries state
content = content.replace(
    'const [availablePrinters, setAvailablePrinters] = useState<string[]>([]);',
    'const [availablePrinters, setAvailablePrinters] = useState<string[]>([]);\n    const [treasuries, setTreasuries] = useState<any[]>([]);'
);

// 3. Fetch treasuries
content = content.replace(
    'loadSettings();',
    'loadSettings();\n        fetch(\'/api/treasuries\').then(res => res.json()).then(data => setTreasuries(Array.isArray(data) ? data : [])).catch(() => {});'
);

// 4. Add UI section
const uiTarget = `{/* ══ تطبيقات التوصيل ══ */}`;
const uiReplacement = `                {/* ══ الخزائن الافتراضية ══ */}
                <div style={{ marginBottom: '24px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: C.primary, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: CAIRO, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        <Monitor size={14} /> {t('الخزائن الافتراضية للكاشير (الدفع)')}
                    </div>
                    <div style={{ background: C.card, border: \`1px solid \${C.border}\`, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px -10px rgba(0,0,0,0.3)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', borderBottom: \`1px solid \${C.border}\` }}>
                            <div style={{ width: '220px', flexShrink: 0, padding: '16px 20px', color: C.textSecondary, borderInlineStart: \`1px solid \${C.border}\`, background: 'rgba(255,255,255,0.01)' }}>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{t('خزنة النقد الافتراضية')}</span>
                            </div>
                            <div style={{ flex: 1, padding: '0 20px' }}>
                                {isEditMode ? (
                                    <div style={{ padding: '8px 0' }}>
                                        <CustomSelect
                                            value={form.defaultCashTreasuryId || ''}
                                            onChange={val => set('defaultCashTreasuryId', val)}
                                            options={[
                                                { value: '', label: t('— اختر الخزنة النقدية —') },
                                                ...treasuries.filter(t => t.type === 'cash').map(t => ({ value: t.id, label: t.name }))
                                            ]}
                                        />
                                    </div>
                                ) : (
                                    <div style={{ fontSize: '13px', fontWeight: 700, color: form.defaultCashTreasuryId ? C.textPrimary : C.textMuted, padding: '14px 0', fontStyle: form.defaultCashTreasuryId ? 'normal' : 'italic', fontFamily: CAIRO }}>
                                        {treasuries.find(t => t.id === form.defaultCashTreasuryId)?.name || t('لم يتم التحديد')}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', borderBottom: 'none' }}>
                            <div style={{ width: '220px', flexShrink: 0, padding: '16px 20px', color: C.textSecondary, borderInlineStart: \`1px solid \${C.border}\`, background: 'rgba(255,255,255,0.01)' }}>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{t('حساب الشبكة الافتراضي')}</span>
                            </div>
                            <div style={{ flex: 1, padding: '0 20px' }}>
                                {isEditMode ? (
                                    <div style={{ padding: '8px 0' }}>
                                        <CustomSelect
                                            value={form.defaultCardTreasuryId || ''}
                                            onChange={val => set('defaultCardTreasuryId', val)}
                                            options={[
                                                { value: '', label: t('— اختر حساب البنك —') },
                                                ...treasuries.filter(t => t.type === 'bank').map(t => ({ value: t.id, label: t.name }))
                                            ]}
                                        />
                                    </div>
                                ) : (
                                    <div style={{ fontSize: '13px', fontWeight: 700, color: form.defaultCardTreasuryId ? C.textPrimary : C.textMuted, padding: '14px 0', fontStyle: form.defaultCardTreasuryId ? 'normal' : 'italic', fontFamily: CAIRO }}>
                                        {treasuries.find(t => t.id === form.defaultCardTreasuryId)?.name || t('لم يتم التحديد')}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ══ تطبيقات التوصيل ══ */}`;

content = content.replace(uiTarget, uiReplacement);

fs.writeFileSync('src/app/settings/_tabs/RestaurantTab.tsx', content, 'utf-8');
console.log('RestaurantTab patched!');
