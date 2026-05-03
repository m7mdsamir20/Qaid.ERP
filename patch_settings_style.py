import re

with open('src/app/settings/_tabs/RestaurantTab.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove the old ECR IP and Port inputs block
content = re.sub(
    r"<div className=\"grid grid-cols-1 md:grid-cols-2 gap-6 mb-6\">\s*<div className=\"space-y-2\">[\s\S]*?<\/div>\s*<\/div>\s*<div style=\{\{ background: C\.card, border: `1px solid \$\{C\.border\}`",
    "<div style={{ background: C.card, border: `1px solid ${C.border}`",
    content
)

# 2. Add the IP and Port to the mapped fields inside the Card block
target_map = """{[
                            { label: t('طابعة المطبخ'), key: 'kitchenPrinterName' },
                            { label: t('طابعة الفاتورة'), key: 'receiptPrinterName' },
                        ].map((f, i, arr) => ("""

replacement_map = """{[
                            { label: t('IP ماكينة الدفع (ECR)'), key: 'paymentTerminalIp', desc: t('اتركها فارغة لإلغاء الربط الآلي'), placeholder: '192.168.1.50' },
                            { label: t('منفذ الماكينة (Port)'), key: 'paymentTerminalPort', placeholder: '5000' },
                            { label: t('طابعة المطبخ'), key: 'kitchenPrinterName', isPrinter: true },
                            { label: t('طابعة الفاتورة'), key: 'receiptPrinterName', isPrinter: true },
                        ].map((f, i, arr) => ("""

content = content.replace(target_map, replacement_map)

# Update the rendering of the inputs to support the new fields
target_render = """{isEditMode ? (
                                        availablePrinters.length > 0 ? (
                                            <div style={{ padding: '8px 0' }}>
                                                <CustomSelect
                                                    value={(form as any)[f.key] || ''}
                                                    onChange={val => set(f.key as any, val)}
                                                    options={[
                                                        { value: '', label: t('— الطابعة الافتراضية —') },
                                                        ...availablePrinters.map(p => ({ value: p, label: p }))
                                                    ]}
                                                />
                                            </div>
                                        ) : (
                                            <input style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: '13px', color: C.textPrimary, padding: '14px 0', boxSizing: 'border-box', fontWeight: 700, fontFamily: CAIRO }} placeholder={t('اسم الطابعة')} value={(form as any)[f.key]} onChange={e => set(f.key as any, e.target.value)} />
                                        )
                                    ) : ("""

replacement_render = """{isEditMode ? (
                                        f.isPrinter && availablePrinters.length > 0 ? (
                                            <div style={{ padding: '8px 0' }}>
                                                <CustomSelect
                                                    value={(form as any)[f.key] || ''}
                                                    onChange={val => set(f.key as any, val)}
                                                    options={[
                                                        { value: '', label: t('— الطابعة الافتراضية —') },
                                                        ...availablePrinters.map(p => ({ value: p, label: p }))
                                                    ]}
                                                />
                                            </div>
                                        ) : (
                                            <div style={{ position: 'relative', width: '100%' }}>
                                                <input style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: '13px', color: C.textPrimary, padding: '14px 0', boxSizing: 'border-box', fontWeight: 700, fontFamily: CAIRO }} placeholder={f.placeholder || t('اسم الطابعة')} value={(form as any)[f.key]} onChange={e => set(f.key as any, e.target.value)} />
                                                {f.desc && <div style={{ fontSize: '10px', color: C.textMuted, position: 'absolute', top: '14px', left: 0, pointerEvents: 'none' }}>{f.desc}</div>}
                                            </div>
                                        )
                                    ) : ("""

content = content.replace(target_render, replacement_render)


# 3. Update the receiptFooter textarea design
target_textarea = """<textarea
                                        value={form.receiptFooter}
                                        onChange={e => set('receiptFooter', e.target.value)}
                                        rows={3}
                                        placeholder={t('مثال: شكراً لزيارتكم - يسعدنا خدمتكم دائماً')}
                                        style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: C.textPrimary, fontFamily: CAIRO, resize: 'vertical', outline: 'none', lineHeight: '1.6', boxSizing: 'border-box' }}
                                    />"""

replacement_textarea = """<textarea
                                        value={form.receiptFooter}
                                        onChange={e => set('receiptFooter', e.target.value)}
                                        rows={3}
                                        placeholder={t('مثال: شكراً لزيارتكم - يسعدنا خدمتكم دائماً')}
                                        style={{ width: '100%', background: 'transparent', border: 'none', padding: '10px 0', fontSize: '13px', color: C.textPrimary, fontFamily: CAIRO, resize: 'vertical', outline: 'none', lineHeight: '1.6', boxSizing: 'border-box', fontWeight: 600 }}
                                    />"""

content = content.replace(target_textarea, replacement_textarea)


with open('src/app/settings/_tabs/RestaurantTab.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
