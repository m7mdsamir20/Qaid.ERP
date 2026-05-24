const fs = require('fs');

function fixPlanStatus() {
    const file = 'src/app/installments/page.tsx';
    let code = fs.readFileSync(file, 'utf8');

    code = code.replace(
        "p.status === 'completed' ? (",
        "p.status === 'cancelled' ? (\n                                                            <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: '30px', background: 'rgba(239, 68, 68, 0.12)', color: '#fb7185', border: '1px solid rgba(239, 68, 68, 0.22)', fontSize: '10px', fontWeight: 600, gap: '4px', alignItems: 'center' }}>\n                                                                <X size={10} /> {t('ملغاة')}\n                                                            </span>\n                                                        ) : p.status === 'completed' ? ("
    );

    fs.writeFileSync(file, code);
}

fixPlanStatus();
console.log('Fixed Plan Status');
