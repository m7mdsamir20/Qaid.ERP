const fs = require('fs');
let content = fs.readFileSync('src/app/pos/page.tsx', 'utf8');

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

                        <div style={{ flex: 1 }}></div>

                        {/* Search */}
                        {showSearchInput ? (
                            <div style={{ position: 'relative', width: '250px', display: 'flex', alignItems: 'center' }}>
                                <Search size={16} style={{ position: 'absolute', insetInlineStart: '12px', color: C.textMuted }} />
                                <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder={t('ابحث عن صنف...')} style={{ ...IS, paddingInlineStart: '36px', paddingInlineEnd: '36px', height: '40px', fontSize: '13px', width: '100%' }} />
                                <button onClick={() => { setSearch(''); setShowSearchInput(false); }} style={{ position: 'absolute', insetInlineEnd: '8px', background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer' }}><X size={16} /></button>
                            </div>
                        ) : (
                            <button onClick={() => setShowSearchInput(true)} style={{ width: 40, height: 40, borderRadius: '10px', border: \`1px solid \${C.border}\`, background: C.card, color: C.textPrimary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={t('بحث')}>
                                <Search size={16} />
                            </button>
                        )}

                        {/* Drawer Ops */}
                        <button onClick={() => setShowDrawerModal(true)} style={{ width: 40, height: 40, borderRadius: '10px', border: \`1px solid \${C.border}\`, background: C.card, color: C.textPrimary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={t('درج الكاشير')}>
                            <Wallet size={16} color={'#f59e0b'} />
                        </button>
                        
                        {/* Branch Selector Icon */}
                        <button onClick={() => setShowBranchModal(true)} style={{ width: 40, height: 40, borderRadius: '10px', border: \`1px solid \${C.border}\`, background: C.card, color: C.textPrimary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={t('الفرع')}>
                            <Store size={16} color={C.primary} />
                        </button>
                    </div>

                    {/* التصنيفات */}`;

content = content.replace(oldHeaderRegex, newHeader);
fs.writeFileSync('src/app/pos/page.tsx', content);
console.log('Fixed!');`;
