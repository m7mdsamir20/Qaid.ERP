const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/app/pos/history/page.tsx');
let content = fs.readFileSync(file, 'utf8');

const theadOld = `                                    <th style={{ padding: '14px 16px', textAlign: isRtl ? 'right' : 'left', fontSize: '12.5px', color: C.textSecondary, fontWeight: 700, fontFamily: CAIRO }}>حالة</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '12.5px', color: C.textSecondary, fontWeight: 700, fontFamily: CAIRO }}>المدفوعات</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '12.5px', color: C.textSecondary, fontWeight: 700, fontFamily: CAIRO }}>المجموع</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '12.5px', color: C.textSecondary, fontWeight: 700, fontFamily: CAIRO }}>اسم أمين الصندوق</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '12.5px', color: C.textSecondary, fontWeight: 700, fontFamily: CAIRO }}>رقم الطاولة</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '12.5px', color: C.textSecondary, fontWeight: 700, fontFamily: CAIRO }}>نوع الخدمة</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '12.5px', color: C.textSecondary, fontWeight: 700, fontFamily: CAIRO }}>المصدر</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '12.5px', color: C.textSecondary, fontWeight: 700, fontFamily: CAIRO }}>العملاء</th>
                                    <th style={{ padding: '14px 16px', textAlign: isRtl ? 'left' : 'right', fontSize: '12.5px', color: C.textSecondary, fontWeight: 700, fontFamily: CAIRO }}>فاتورة</th>`;

const theadNew = `                                    <th style={{ padding: '14px 16px', textAlign: isRtl ? 'right' : 'left', fontSize: '12.5px', color: C.textSecondary, fontWeight: 700, fontFamily: CAIRO }}>فاتورة</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '12.5px', color: C.textSecondary, fontWeight: 700, fontFamily: CAIRO }}>العملاء</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '12.5px', color: C.textSecondary, fontWeight: 700, fontFamily: CAIRO }}>المصدر</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '12.5px', color: C.textSecondary, fontWeight: 700, fontFamily: CAIRO }}>نوع الخدمة</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '12.5px', color: C.textSecondary, fontWeight: 700, fontFamily: CAIRO }}>رقم الطاولة</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '12.5px', color: C.textSecondary, fontWeight: 700, fontFamily: CAIRO }}>اسم أمين الصندوق</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '12.5px', color: C.textSecondary, fontWeight: 700, fontFamily: CAIRO }}>المجموع</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '12.5px', color: C.textSecondary, fontWeight: 700, fontFamily: CAIRO }}>المدفوعات</th>
                                    <th style={{ padding: '14px 16px', textAlign: isRtl ? 'left' : 'right', fontSize: '12.5px', color: C.textSecondary, fontWeight: 700, fontFamily: CAIRO }}>حالة</th>`;

const trOld = `                                            <td style={{ padding: '12px 16px', textAlign: isRtl ? 'right' : 'left' }}>
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', border: \`1px solid \${st.color}50\`, background: C.card, borderRadius: '20px', padding: '4px 12px', fontSize: '12px', fontWeight: 700, color: st.color }}>
                                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: st.color }}></span> {st.label}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: C.textSecondary }}>
                                                    {isPaid ? 'Paid' : 'Unpaid'} 
                                                    {isPaid ? <CheckCircle2 size={16} color="#10b981" /> : <XCircle size={16} color="#ef4444" />}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center', fontFamily: OUTFIT, fontWeight: 700, fontSize: '14px', color: C.textPrimary }}>
                                                {fMoney(order.total)}
                                            </td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', color: C.textSecondary, fontWeight: 600 }}>
                                                {cashierName}
                                            </td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', color: C.textSecondary, fontWeight: 600, fontFamily: OUTFIT }}>
                                                {order.table?.name || '-'}
                                            </td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', color: C.textSecondary, fontWeight: 600 }}>
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                    {TYPE_ICONS[order.type]} {TYPE_LABELS[order.type] ?? order.type}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', color: C.textSecondary }}>
                                                {order.source === 'website' ? 'تطبيق المطعم' : order.source === 'qr' ? 'QR' : 'الكاشير'}
                                            </td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', color: C.textSecondary }}>
                                                {order.deliveryName || order.customerId || 'لا زبون'}
                                            </td>
                                            <td style={{ padding: '12px 16px', textAlign: isRtl ? 'left' : 'right' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: isRtl ? 'flex-end' : 'flex-start' }}>
                                                    <span style={{ fontFamily: OUTFIT, fontWeight: 800, fontSize: '14px', color: C.textPrimary }}>{invoiceNo}</span>
                                                    <span style={{ fontSize: '11px', color: C.textMuted, fontFamily: OUTFIT }}>{formatDate(order.createdAt)}</span>
                                                </div>
                                            </td>`;

const trNew = `                                            <td style={{ padding: '12px 16px', textAlign: isRtl ? 'right' : 'left' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: isRtl ? 'flex-start' : 'flex-end' }}>
                                                    <span style={{ fontFamily: OUTFIT, fontWeight: 800, fontSize: '14px', color: C.textPrimary }}>{invoiceNo}</span>
                                                    <span style={{ fontSize: '11px', color: C.textMuted, fontFamily: OUTFIT }}>{formatDate(order.createdAt)}</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', color: C.textSecondary }}>
                                                {order.deliveryName || order.customerId || 'لا زبون'}
                                            </td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', color: C.textSecondary }}>
                                                {order.source === 'website' ? 'تطبيق المطعم' : order.source === 'qr' ? 'QR' : 'الكاشير'}
                                            </td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', color: C.textSecondary, fontWeight: 600 }}>
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                    {TYPE_ICONS[order.type]} {TYPE_LABELS[order.type] ?? order.type}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', color: C.textSecondary, fontWeight: 600, fontFamily: OUTFIT }}>
                                                {order.table?.name || '-'}
                                            </td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', color: C.textSecondary, fontWeight: 600 }}>
                                                {cashierName}
                                            </td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center', fontFamily: OUTFIT, fontWeight: 700, fontSize: '14px', color: C.textPrimary }}>
                                                {fMoney(order.total)}
                                            </td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: C.textSecondary }}>
                                                    {isPaid ? 'Paid' : 'Unpaid'} 
                                                    {isPaid ? <CheckCircle2 size={16} color="#10b981" /> : <XCircle size={16} color="#ef4444" />}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 16px', textAlign: isRtl ? 'left' : 'right' }}>
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', border: \`1px solid \${st.color}50\`, background: C.card, borderRadius: '20px', padding: '4px 12px', fontSize: '12px', fontWeight: 700, color: st.color }}>
                                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: st.color }}></span> {st.label}
                                                </span>
                                            </td>`;

content = content.replace(theadOld, theadNew);
content = content.replace(trOld, trNew);

fs.writeFileSync(file, content);
console.log('Fixed table column order in POS history.');
