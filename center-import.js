const fs = require('fs');

const file = 'src/app/settings/_tabs/DatabaseTab.tsx';
let code = fs.readFileSync(file, 'utf8');

// The original UI structure for Import Excel in DatabaseTab:
/*
<div key={item.id} className="mobile-setting-row" style={{ display: 'flex', alignItems: 'center', borderBottom: i < arr.length - 1 ? \`1px solid \${C.border}\` : 'none' }}>
    <div className="mobile-setting-label" style={{ width: '220px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 20px', borderInlineStart: \`1px solid \${C.border}\`, background: 'rgba(255,255,255,0.01)' }}>
        <div style={{ color: item.color }}>{item.icon}</div>
        <span style={{ fontSize: '13px', fontWeight: 600, color: C.textSecondary, fontFamily: CAIRO }}>{item.label}</span>
    </div>
    <div className="mobile-setting-value" style={{ flex: 1, padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <span style={{ fontSize: '12px', color: C.textSecondary, fontFamily: CAIRO }}>{item.desc}</span>
        <button className="action-btn"
            onClick={() => { setImportType(item.id as any); setShowImportModal(true); setImportStep(1); }}
            style={{ height: '36px', padding: '0 18px', borderRadius: '10px', border: \`1px solid \${item.color}30\`, background: \`\${item.color}10\`, color: item.color, fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, fontFamily: CAIRO }}>
            <FileSpreadsheet size={13} /> {t('فتح معالج الاستيراد')}
        </button>
    </div>
</div>
*/

// Replace with centered column layout
const oldRowStr = `<div key={item.id} className="mobile-setting-row" style={{ display: 'flex', alignItems: 'center', borderBottom: i < arr.length - 1 ? \`1px solid \${C.border}\` : 'none' }}>
                        <div className="mobile-setting-label" style={{ width: '220px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 20px', borderInlineStart: \`1px solid \${C.border}\`, background: 'rgba(255,255,255,0.01)' }}>
                            <div style={{ color: item.color }}>{item.icon}</div>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: C.textSecondary, fontFamily: CAIRO }}>{item.label}</span>
                        </div>
                        <div className="mobile-setting-value" style={{ flex: 1, padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                            <span style={{ fontSize: '12px', color: C.textSecondary, fontFamily: CAIRO }}>{item.desc}</span>
                            <button className="action-btn"
                                onClick={() => { setImportType(item.id as any); setShowImportModal(true); setImportStep(1); }}
                                style={{ height: '36px', padding: '0 18px', borderRadius: '10px', border: \`1px solid \${item.color}30\`, background: \`\${item.color}10\`, color: item.color, fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, fontFamily: CAIRO }}>
                                <FileSpreadsheet size={13} /> {t('فتح معالج الاستيراد')}
                            </button>
                        </div>
                    </div>`;

const newRowStr = `<div key={item.id} className="mobile-setting-row" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '24px', borderBottom: i < arr.length - 1 ? \`1px solid \${C.border}\` : 'none', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: item.color }}>
                            {item.icon}
                            <span style={{ fontSize: '15px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{item.label}</span>
                        </div>
                        <span style={{ fontSize: '13px', color: '#64748b', fontFamily: CAIRO, maxWidth: '300px' }}>{item.desc}</span>
                        <button className="action-btn"
                            onClick={() => { setImportType(item.id as any); setShowImportModal(true); setImportStep(1); }}
                            style={{ height: '40px', padding: '0 24px', marginTop: '8px', borderRadius: '12px', border: \`1px solid \${item.color}40\`, background: \`\${item.color}15\`, color: item.color, fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: CAIRO }}>
                            <FileSpreadsheet size={15} /> {t('فتح معالج الاستيراد')}
                        </button>
                    </div>`;

code = code.replace(oldRowStr, newRowStr);
fs.writeFileSync(file, code);
console.log('Import UI centered');
