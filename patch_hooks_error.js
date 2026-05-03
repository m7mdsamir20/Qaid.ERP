const fs = require('fs');

let content = fs.readFileSync('src/app/pos/page.tsx', 'utf-8');

// Find the early return blocks
const earlyReturns = `    if (status === 'loading') {
        return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f172a', color: C.textPrimary }}><Loader2 size={48} style={{ animation: 'spin 1s linear infinite' }} /></div>;
    }

    if (status === 'unauthenticated' || !isRestaurants || !hasPosPerm) {
        return (
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f172a', gap: '16px', fontFamily: CAIRO }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                    <Shield size={40} />
                </div>
                <h2 style={{ fontSize: '24px', fontWeight: 800, color: C.textPrimary, margin: 0 }}>{t('غير مصرح لك بالدخول')}</h2>
                <p style={{ fontSize: '15px', color: C.textSecondary, margin: 0 }}>{t('لا تملك الصلاحيات الكافية أو أن نوع نشاطك التجاري لا يدعم نقاط البيع.')}</p>
                <button onClick={() => window.location.href = '/'} style={{ padding: '12px 32px', borderRadius: '12px', border: 'none', background: C.primary, color: '#fff', fontSize: '15px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO, marginTop: '16px' }}>{t('العودة للرئيسية')}</button>
            </div>
        );
    }`;

// Remove them from their original place
if (content.includes(earlyReturns)) {
    content = content.replace(earlyReturns, '');
} else {
    console.log("Could not find early returns exactly, trying regex...");
    const regex = /    if \(status === 'loading'\) \{[\s\S]*?<\/div>\s*\);\s*\}/;
    const match = content.match(regex);
    if (match) {
        content = content.replace(regex, '');
    } else {
        console.log("Could not find early returns block!");
        process.exit(1);
    }
}

// Insert right before the main return
const targetReturn = '    return (\n        <>\n            <div dir={isRtl ? \'rtl\' : \'ltr\'} style={{ display: \'flex\', height: \'100vh\', width: \'100vw\', overflow: \'hidden\'';

if (content.includes(targetReturn)) {
    content = content.replace(targetReturn, earlyReturns + '\n\n' + targetReturn);
    fs.writeFileSync('src/app/pos/page.tsx', content, 'utf-8');
    console.log('Fixed React hook rule violation.');
} else {
    // try a simpler match
    const simplerReturn = '    return (\n        <>\n            <div dir={isRtl ? \'rtl\' : \'ltr\'}';
    if (content.includes(simplerReturn)) {
        content = content.replace(simplerReturn, earlyReturns + '\n\n' + simplerReturn);
        fs.writeFileSync('src/app/pos/page.tsx', content, 'utf-8');
        console.log('Fixed React hook rule violation (fallback).');
    } else {
        console.log('Could not find main return statement!');
    }
}
