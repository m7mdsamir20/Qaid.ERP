const fs = require('fs');
const file = 'src/app/pos/page.tsx';
let lines = fs.readFileSync(file, 'utf8').split('\n');

// ===== CHANGE 1: Add Tag, Utensils to imports (line 10, 0-indexed=9) =====
const importLineIdx = lines.findIndex(l => l.includes('Wallet, Store'));
if (importLineIdx === -1) { console.error('FAIL: Could not find import line'); process.exit(1); }
lines[importLineIdx] = lines[importLineIdx].replace('Wallet, Store', 'Wallet, Store, Tag, Utensils');
console.log('✓ Change 1: Added Tag, Utensils imports at line', importLineIdx + 1);

// ===== CHANGE 2: Replace showAddCustomer state with new modal states (line 79) =====
const stateLineIdx = lines.findIndex(l => l.includes('const [showAddCustomer, setShowAddCustomer] = useState(false)'));
if (stateLineIdx === -1) { console.error('FAIL: Could not find showAddCustomer state'); process.exit(1); }
lines[stateLineIdx] = [
    '    const [showOrderTypeModal, setShowOrderTypeModal] = useState(false);',
    '    const [showCustomerModal, setShowCustomerModal] = useState(false);',
    '    const [showOffersModal, setShowOffersModal] = useState(false);',
    '    const [customerSearchQuery, setCustomerSearchQuery] = useState(\'\');',
    '    const [searchedCustomerObj, setSearchedCustomerObj] = useState<any>(null);',
    '    const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);',
].join('\n');
console.log('✓ Change 2: Replaced state declarations at line', stateLineIdx + 1);

// ===== CHANGE 3: Replace ORDER_TYPES grid + table/customer/delivery section with nothing =====
// Find the start: line with 'repeat(4,1fr)' ORDER_TYPES grid (line 693)
const orderTypesGridIdx = lines.findIndex((l, i) => i > 680 && l.includes("display: 'grid', gridTemplateColumns: 'repeat(4,1fr)'"));
if (orderTypesGridIdx === -1) { console.error('FAIL: Could not find ORDER_TYPES grid'); process.exit(1); }
// Find the end: the closing </div> of the top cart section, which is the line with just </div> before the السلة comment
const cartCommentIdx = lines.findIndex((l, i) => i > orderTypesGridIdx && l.includes('{/* السلة */}'));
if (cartCommentIdx === -1) { console.error('FAIL: Could not find cart comment'); process.exit(1); }
// The </div> that closes the top section is at cartCommentIdx - 2 (there's a blank line before cart comment)
// We need to remove from orderTypesGridIdx to the </div> that closes the top cart section
// Looking at original: line 761 is </div> closing the top section, line 762 is blank, line 763 is {/* السلة */}
const closingDivIdx = cartCommentIdx - 2; // line 761 (0-indexed=760)
// Remove from orderTypesGridIdx (inclusive) to closingDivIdx (inclusive)
const removeCount3 = closingDivIdx - orderTypesGridIdx + 1;
lines.splice(orderTypesGridIdx, removeCount3);
console.log('✓ Change 3: Removed ORDER_TYPES grid and table/customer/delivery from lines', orderTypesGridIdx + 1, 'to', closingDivIdx + 1, '(' + removeCount3 + ' lines)');

// ===== CHANGE 4: Replace discount/coupon section with 3 icon buttons =====
// Find: {/* خصم + ضريبة + خدمة */}
const discountCommentIdx = lines.findIndex(l => l.includes('{/* خصم + ضريبة + خدمة */}'));
if (discountCommentIdx === -1) { console.error('FAIL: Could not find discount comment'); process.exit(1); }
// Find: {/* اختيار الخزنة */}
const treasuryCommentIdx = lines.findIndex((l, i) => i > discountCommentIdx && l.includes('{/* اختيار الخزنة */}'));
if (treasuryCommentIdx === -1) { console.error('FAIL: Could not find treasury comment'); process.exit(1); }

const iconButtons = `                        {/* 3 أيقونات تحت الملاحظات */}
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button onClick={() => setShowOrderTypeModal(true)} style={{ flex: 1, height: '40px', borderRadius: '10px', border: \`1px solid \${C.border}\`, background: C.card, color: C.textPrimary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }} title={t('نوع الطلب')}>
                                <Utensils size={16} /> <span style={{ fontSize: '12px', fontWeight: 600, fontFamily: CAIRO }}>{ORDER_TYPES.find(o => o.value === orderType)?.label || t('نوع الطلب')}</span>
                            </button>
                            <button onClick={() => setShowCustomerModal(true)} style={{ flex: 1, height: '40px', borderRadius: '10px', border: \`1px solid \${selectedCustomer ? C.primary : C.border}\`, background: selectedCustomer ? \`\${C.primary}10\` : C.card, color: selectedCustomer ? C.primary : C.textPrimary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }} title={t('العميل')}>
                                <User size={16} /> <span style={{ fontSize: '12px', fontWeight: 600, fontFamily: CAIRO }}>{selectedCustomer ? customers.find(c => c.id === selectedCustomer)?.name || t('العميل') : t('إضافة عميل')}</span>
                            </button>
                            <button onClick={() => setShowOffersModal(true)} style={{ flex: 1, height: '40px', borderRadius: '10px', border: \`1px solid \${(discount > 0 || appliedCoupon) ? C.primary : C.border}\`, background: (discount > 0 || appliedCoupon) ? \`\${C.primary}10\` : C.card, color: (discount > 0 || appliedCoupon) ? C.primary : C.textPrimary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }} title={t('العروض')}>
                                <Tag size={16} /> <span style={{ fontSize: '12px', fontWeight: 600, fontFamily: CAIRO }}>{t('العروض')}</span>
                            </button>
                        </div>

`;

// Remove from discountCommentIdx to treasuryCommentIdx (exclusive)
const removeCount4 = treasuryCommentIdx - discountCommentIdx;
lines.splice(discountCommentIdx, removeCount4, ...iconButtons.split('\n'));
console.log('✓ Change 4: Replaced discount/coupon with 3 icon buttons');

// ===== CHANGE 5: Replace old Add Customer modal with 3 new modals =====
const addCustModalCommentIdx = lines.findIndex(l => l.includes('{/* Add Customer Modal */}'));
if (addCustModalCommentIdx === -1) { console.error('FAIL: Could not find Add Customer Modal comment'); process.exit(1); }
// Find the closing of this modal: search for the closing )}\r\n after it
// The modal ends with:  )}  (line 1187 originally)
// Find the next modal or comment after it
const startShiftCommentIdx = lines.findIndex((l, i) => i > addCustModalCommentIdx && l.includes('{/* Start Shift Modal */}'));
if (startShiftCommentIdx === -1) { console.error('FAIL: Could not find Start Shift Modal comment'); process.exit(1); }

const newModals = `            {/* Order Type Modal */}
            {showOrderTypeModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: C.card, border: \`1px solid \${C.border}\`, borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: C.textPrimary, fontFamily: CAIRO }}>{t('تحديد نوع الطلب')}</h2>
                            <button onClick={() => setShowOrderTypeModal(false)} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer' }}><X size={18} /></button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '6px' }}>
                            {ORDER_TYPES.map(ot => {
                                const Icon = ot.icon;
                                return (
                                    <button key={ot.value} onClick={() => { setOrderType(ot.value); setSelectedTable(''); }}
                                        style={{ padding: '8px 4px', borderRadius: '10px', border: \`1px solid \${orderType === ot.value ? ot.color + '60' : C.border}\`, background: orderType === ot.value ? ot.color + '15' : 'transparent', color: orderType === ot.value ? ot.color : C.textMuted, fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', transition: 'all 0.2s', fontFamily: CAIRO }}>
                                        <Icon size={16} />
                                        {ot.label}
                                    </button>
                                );
                            })}
                        </div>
                        {orderType === 'dine-in' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '11px', color: C.textSecondary, fontWeight: 600 }}>{t('الطاولة')}</label>
                                <CustomSelect value={selectedTable} onChange={v => setSelectedTable(v)} options={tables.filter(t => t.status === 'available' || t.id === selectedTable).map(tbl => ({ value: tbl.id, label: \`\${tbl.name} (\${tbl.capacity})\` }))} placeholder={t('— اختر الطاولة —')} />
                            </div>
                        )}
                        {orderType === 'delivery' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <CustomSelect value={selectedDriver} onChange={v => setSelectedDriver(v)} options={drivers.map(drv => ({ value: drv.id, label: drv.name }))} placeholder={t('— اختر السائق —')} />
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                                    <div style={{ position: 'relative' }}>
                                        <User size={13} style={{ position: 'absolute', insetInlineStart: '10px', top: '50%', transform: 'translateY(-50%)', color: C.textMuted }} />
                                        <input value={deliveryName} onChange={e => setDeliveryName(e.target.value)} placeholder={t('اسم العميل')} style={{ ...IS, height: '36px', fontSize: '12px', paddingInlineStart: '30px' }} />
                                    </div>
                                    <div style={{ position: 'relative' }}>
                                        <Phone size={13} style={{ position: 'absolute', insetInlineStart: '10px', top: '50%', transform: 'translateY(-50%)', color: C.textMuted }} />
                                        <input value={deliveryPhone} onChange={e => setDeliveryPhone(e.target.value)} placeholder={t('رقم الهاتف')} style={{ ...IS, height: '36px', fontSize: '12px', paddingInlineStart: '30px', fontFamily: OUTFIT }} />
                                    </div>
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <MapPin size={13} style={{ position: 'absolute', insetInlineStart: '10px', top: '50%', transform: 'translateY(-50%)', color: C.textMuted }} />
                                    <input value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} placeholder={t('عنوان التوصيل')} style={{ ...IS, height: '36px', fontSize: '12px', paddingInlineStart: '30px' }} />
                                </div>
                            </div>
                        )}
                        <button onClick={() => setShowOrderTypeModal(false)} style={{ ...BTN_PRIMARY(false, false), height: '44px', borderRadius: '12px' }}>{t('تم')}</button>
                    </div>
                </div>
            )}

            {/* Customer Search / Add Modal */}
            {showCustomerModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: C.card, border: \`1px solid \${C.border}\`, borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: C.textPrimary, fontFamily: CAIRO }}>{t('البحث عن عميل')}</h2>
                            <button onClick={() => { setShowCustomerModal(false); setShowNewCustomerForm(false); setSearchedCustomerObj(null); setCustomerSearchQuery(''); }} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer' }}><X size={18} /></button>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input value={customerSearchQuery} onChange={e => setCustomerSearchQuery(e.target.value)} placeholder={t('رقم الهاتف أو الاسم')} style={{ ...IS, height: '42px', flex: 1 }} />
                            <button onClick={() => {
                                const found = customers.find((c: any) => (c.phone && c.phone === customerSearchQuery) || c.name.includes(customerSearchQuery));
                                if (found) { setSearchedCustomerObj(found); setShowNewCustomerForm(false); }
                                else { setSearchedCustomerObj(null); setShowNewCustomerForm(true); }
                            }} style={{ ...BTN_PRIMARY(false, false), width: '60px', height: '42px', borderRadius: '10px' }}><Search size={18} /></button>
                        </div>

                        {searchedCustomerObj && (
                            <div style={{ padding: '16px', borderRadius: '12px', border: \`1px solid \${C.primary}50\`, background: \`\${C.primary}10\`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontWeight: 700, color: C.textPrimary, fontFamily: CAIRO }}>{searchedCustomerObj.name}</div>
                                    <div style={{ fontSize: '12px', color: C.textSecondary }}>{searchedCustomerObj.phone}</div>
                                </div>
                                <button onClick={() => { setSelectedCustomer(searchedCustomerObj.id); setShowCustomerModal(false); setShowNewCustomerForm(false); setSearchedCustomerObj(null); setCustomerSearchQuery(''); }} style={{ ...BTN_PRIMARY(false, false), padding: '6px 12px', borderRadius: '8px', fontSize: '12px', height: 'auto' }}>{t('اختيار')}</button>
                            </div>
                        )}

                        {showNewCustomerForm && (
                            <form onSubmit={async (e: any) => {
                                e.preventDefault();
                                const name = (e.currentTarget.elements.namedItem('cName') as HTMLInputElement).value;
                                const phone = (e.currentTarget.elements.namedItem('cPhone') as HTMLInputElement).value;
                                if (!name) return;
                                setSubmitting(true);
                                try {
                                    const res = await fetch('/api/customers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, phone }) });
                                    if (res.ok) {
                                        const newCust = await res.json();
                                        setCustomers((prev: any) => [...prev, newCust]);
                                        setSelectedCustomer(newCust.id);
                                        setShowCustomerModal(false);
                                        setShowNewCustomerForm(false);
                                        setCustomerSearchQuery('');
                                    }
                                } catch {}
                                finally { setSubmitting(false); }
                            }} style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderTop: \`1px dashed \${C.border}\`, paddingTop: '16px' }}>
                                <div style={{ fontSize: '12px', color: C.danger, fontWeight: 700, fontFamily: CAIRO, textAlign: 'center' }}>{t('لم يتم العثور على العميل! إضافة كعميل جديد:')}</div>
                                <div>
                                    <label style={LS}>{t('الاسم')} <span style={{ color: C.danger }}>*</span></label>
                                    <input name="cName" required style={{ ...IS, height: '42px' }} autoFocus />
                                </div>
                                <div>
                                    <label style={LS}>{t('رقم الهاتف')}</label>
                                    <input name="cPhone" defaultValue={customerSearchQuery} style={{ ...IS, height: '42px', direction: 'ltr', textAlign: 'end' }} />
                                </div>
                                <button type="submit" disabled={submitting} style={{ ...BTN_PRIMARY(submitting, false), height: '44px', borderRadius: '12px' }}>
                                    {submitting ? <Loader2 size={16} className="animate-spin" /> : t('إضافة واختيار')}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* Offers Modal */}
            {showOffersModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: C.card, border: \`1px solid \${C.border}\`, borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: C.textPrimary, fontFamily: CAIRO }}>{t('العروض والخصومات')}</h2>
                            <button onClick={() => setShowOffersModal(false)} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer' }}><X size={18} /></button>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <label style={{ fontSize: '12px', color: C.textSecondary, fontWeight: 600, whiteSpace: 'nowrap' }}>{t('خصم مبلغ')}</label>
                            <input type="number" min="0" value={discount || ''} onChange={e => setDiscount(Number(e.target.value))} placeholder="0" style={{ ...IS, height: '36px', fontSize: '12px', fontFamily: OUTFIT, flex: 1 }} />
                            
                            {hasTax && (
                                <>
                                    <label style={{ fontSize: '12px', color: C.textSecondary, fontWeight: 600, whiteSpace: 'nowrap' }}>{t('ضريبة %')}</label>
                                    <input type="number" min="0" max="100" value={taxRate || ''} onChange={e => setTaxRate(Number(e.target.value))} placeholder="0" style={{ ...IS, height: '36px', fontSize: '12px', fontFamily: OUTFIT, width: '50px' }} />
                                </>
                            )}
                            
                            {hasServiceCharge && orderType === 'dine-in' && (
                                <>
                                    <label style={{ fontSize: '12px', color: C.textSecondary, fontWeight: 600, whiteSpace: 'nowrap' }}>{t('خدمة %')}</label>
                                    <input type="number" min="0" max="100" value={serviceChargeRate || ''} onChange={e => setServiceChargeRate(Number(e.target.value))} placeholder="0" style={{ ...IS, height: '36px', fontSize: '12px', fontFamily: OUTFIT, width: '50px' }} />
                                </>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} placeholder={t('كود الخصم (كوبون)')} style={{ ...IS, height: '36px', fontSize: '12px', fontFamily: OUTFIT, flex: 1, border: couponError ? \`1px solid \${C.dangerBorder}\` : appliedCoupon ? \`1px solid \${C.primary}50\` : \`1px solid \${C.border}\` }} disabled={!!appliedCoupon || couponLoading} />
                            
                            {!appliedCoupon ? (
                                <button onClick={handleApplyCoupon} disabled={!couponCode || couponLoading || cart.length === 0} style={{ height: '36px', padding: '0 12px', borderRadius: '10px', border: 'none', background: couponCode && cart.length > 0 ? C.primary : \`\${C.primary}40\`, color: '#fff', fontSize: '12px', fontWeight: 700, fontFamily: CAIRO, cursor: couponCode && cart.length > 0 ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: '6px', transition: '0.2s' }}>
                                    {couponLoading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : t('تطبيق')}
                                </button>
                            ) : (
                                <button onClick={() => { setAppliedCoupon(null); setCouponCode(''); setCouponError(''); }} style={{ height: '36px', width: '36px', borderRadius: '10px', border: \`1px solid \${C.dangerBorder}\`, background: C.dangerBg, color: C.danger, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                        {couponError && <div style={{ fontSize: '11px', color: C.danger, fontFamily: CAIRO, marginTop: '-6px' }}>{couponError}</div>}
                        {appliedCoupon && (
                            <div style={{ fontSize: '11px', color: C.primary, fontFamily: CAIRO, marginTop: '-6px', fontWeight: 600 }}>
                                {t('تم تطبيق خصم الكوبون:')} {fMoney(appliedCoupon.discount)}
                            </div>
                        )}
                        <button onClick={() => setShowOffersModal(false)} style={{ ...BTN_PRIMARY(false, false), height: '44px', borderRadius: '12px', marginTop: '8px' }}>{t('تم')}</button>
                    </div>
                </div>
            )}

`;

// Remove from addCustModalCommentIdx to startShiftCommentIdx (exclusive)
const removeCount5 = startShiftCommentIdx - addCustModalCommentIdx;
lines.splice(addCustModalCommentIdx, removeCount5, ...newModals.split('\n'));
console.log('✓ Change 5: Replaced Add Customer modal with 3 new modals');

// ===== VERIFICATION =====
const result = lines.join('\n');
const opens = (result.match(/\{/g) || []).length;
const closes = (result.match(/\}/g) || []).length;
console.log('\nBrace check: opens=' + opens + ' closes=' + closes + ' diff=' + (opens - closes));

// Check for remaining showAddCustomer references
const remaining = result.match(/showAddCustomer/g);
if (remaining) {
    console.warn('⚠ Warning: Found ' + remaining.length + ' remaining showAddCustomer references');
} else {
    console.log('✓ No remaining showAddCustomer references');
}

fs.writeFileSync(file, result, 'utf8');
console.log('\n✅ All changes applied successfully!');
