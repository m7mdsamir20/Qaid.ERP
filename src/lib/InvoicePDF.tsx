'use client';
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';
import { getCurrencySymbol } from '@/lib/currency';
import { generateZatcaTLV } from '@/lib/printInvoices';

/* ── Font registration ──────────────────────────────────────────── */
let _fontsReady = false;
function ensureFonts() {
    if (_fontsReady) return;
    _fontsReady = true;
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    Font.register({
        family: 'Cairo',
        fonts: [
            { src: `${base}/fonts/Cairo-Regular.ttf`, fontWeight: 400 },
            { src: `${base}/fonts/Cairo-Bold.ttf`,    fontWeight: 700 },
            { src: `${base}/fonts/Cairo-Black.ttf`,   fontWeight: 900 },
        ],
    });
}

/* ── Lookup tables ─────────────────────────────────────────────── */
const TITLES: Record<string, string> = {
    sale: 'فاتورة مبيعات', purchase: 'فاتورة مشتريات',
    'sale-return': 'مرتجع مبيعات', 'purchase-return': 'مرتجع مشتريات',
    sale_return: 'مرتجع مبيعات', purchase_return: 'مرتجع مشتريات',
};
const TITLES_EN: Record<string, string> = {
    sale: 'Sales Invoice', purchase: 'Purchase Invoice',
    'sale-return': 'Sales Return', 'purchase-return': 'Purchase Return',
    sale_return: 'Sales Return', purchase_return: 'Purchase Return',
};
const PREFIXES: Record<string, string> = {
    sale: 'SAL', purchase: 'PUR',
    'sale-return': 'SLR', 'purchase-return': 'PRR',
    sale_return: 'SLR', purchase_return: 'PRR',
};

/* ── StyleSheet ────────────────────────────────────────────────── */
// Px→pt: 1px = 0.75pt (96dpi)
// Page padding: 4mm V × 8mm H → 11pt × 23pt

const BORDER_DARK  = '#111';
const BORDER_MID   = '#333';
const BORDER_LIGHT = '#999';

const s = StyleSheet.create({
    page: {
        fontFamily: 'Cairo', fontSize: 8, backgroundColor: '#fff',
        paddingHorizontal: 23, paddingVertical: 11,
    },

    /* ── Header ── */
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingBottom: 5, borderBottomWidth: 2, borderBottomColor: BORDER_DARK,
    },
    hLeft:   { flex: 1.2, alignItems: 'flex-start' },
    hCenter: { flex: 1,   alignItems: 'center' },
    hRight:  { flex: 1.2, alignItems: 'flex-end' },

    logo:        { maxHeight: 60, maxWidth: 113, objectFit: 'contain' },
    qrImg:       { width: 60, height: 60 },
    coNameEG:    { fontSize: 16, fontWeight: 900, color: BORDER_DARK, textAlign: 'right' },
    coNameSmall: { fontSize: 12, fontWeight: 900, color: BORDER_DARK, textAlign: 'right' },
    coLine:      { fontSize: 7.5, color: '#444', marginTop: 2, textAlign: 'right' },
    titleBox:    {
        fontSize: 13, fontWeight: 900, color: BORDER_DARK,
        backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#ccc',
        borderRadius: 4, paddingHorizontal: 10, paddingVertical: 2, textAlign: 'center',
    },
    titleBoxEn:  { fontSize: 8.5, fontWeight: 700, color: '#555', marginTop: 1, textAlign: 'center' },
    zatcaNote:   { fontSize: 7.5, color: '#888', marginTop: 2, textAlign: 'center' },
    invNum:      { fontSize: 10, color: '#333', marginTop: 4, fontWeight: 700, textAlign: 'center' },
    invDate:     { fontSize: 8,  color: '#555', marginTop: 2, textAlign: 'center' },
    poNum:       {
        fontSize: 7.5, color: '#444', marginTop: 3,
        backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#ddd',
        borderRadius: 3, paddingHorizontal: 6, paddingVertical: 2, textAlign: 'center',
    },

    /* ── Info wrap ── */
    infoWrap:  { flexDirection: 'row', gap: 8, marginTop: 6, marginBottom: 5 },
    infoBox:   { flex: 1, borderWidth: 1, borderColor: BORDER_MID, borderRadius: 4 },
    infoTitle: {
        backgroundColor: '#f5f5f5', paddingHorizontal: 8, paddingVertical: 3,
        fontWeight: 900, fontSize: 7.5, borderBottomWidth: 1, borderBottomColor: BORDER_MID,
        textAlign: 'right',
    },
    infoBody: { paddingHorizontal: 8, paddingVertical: 4 },
    /* LTR PDF: [iv LEFT flex:1] [ik RIGHT minWidth:53]  =  RTL visual: [ik RIGHT] [iv LEFT] */
    infoRow:  { flexDirection: 'row', marginBottom: 2 },
    iv:       { flex: 1, fontSize: 7.5, fontWeight: 800, color: BORDER_DARK, textAlign: 'right' },
    ik:       { minWidth: 53, fontSize: 7.5, color: '#666', textAlign: 'right' },

    /* ── Table ── */
    table: { borderWidth: 1, borderColor: BORDER_LIGHT },
    thead: { flexDirection: 'row', backgroundColor: '#f0f0f0', borderBottomWidth: 1, borderBottomColor: BORDER_LIGHT },
    trow:  { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: BORDER_LIGHT },
    th:    { paddingVertical: 3, paddingHorizontal: 2, fontSize: 7.5, fontWeight: 900, color: BORDER_DARK, textAlign: 'center', borderRightWidth: 1, borderRightColor: BORDER_LIGHT },
    td:    { paddingVertical: 2.5, paddingHorizontal: 2, fontSize: 7.5, color: '#1a1a1a', textAlign: 'center', borderRightWidth: 1, borderRightColor: BORDER_LIGHT },

    /* ── Notes ── */
    notesBox: {
        borderWidth: 1.5, borderColor: '#ccc', borderRadius: 6,
        paddingHorizontal: 8, paddingVertical: 6,
        fontSize: 8, color: '#555', marginTop: 6, marginBottom: 4, textAlign: 'right',
    },

    /* ── EG totals (320px=240pt, font-size:13px=10pt)
       HTML label: width:60% text-align:right color:#444 padding:2px 10px
       HTML value: width:40% text-align:left  font-weight:700 padding:2px 10px
       LTR PDF:    [value LEFT] [label RIGHT]
    ── */
    egWrap:   { marginTop: 8, alignItems: 'flex-start' },
    egTable:  { width: 280, borderWidth: 1, borderColor: BORDER_DARK },
    eRow:     { flexDirection: 'row', minHeight: 22, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: BORDER_LIGHT },
    eRowMain: { flexDirection: 'row', minHeight: 22, alignItems: 'center', backgroundColor: '#f2f2f2', borderBottomWidth: 1, borderBottomColor: BORDER_MID },
    eVal:     { width: 108, paddingHorizontal: 7, paddingVertical: 2, fontSize: 9.5, fontWeight: 700, textAlign: 'left', borderRightWidth: 1, borderRightColor: BORDER_LIGHT },
    eValMain: { width: 108, paddingHorizontal: 7, paddingVertical: 2, fontSize: 9.5, fontWeight: 900, textAlign: 'left', borderRightWidth: 1, borderRightColor: BORDER_MID },
    eLbl:     { flex: 1, paddingHorizontal: 7, paddingVertical: 2, fontSize: 9.5, color: '#444', textAlign: 'right' },
    eLblMain: { flex: 1, paddingHorizontal: 7, paddingVertical: 2, fontSize: 9.5, fontWeight: 900, color: BORDER_DARK, textAlign: 'right' },

    /* ── SA / Services totals (340px=255pt)
       HTML label: text-align:right font-weight:700 + English sub
       HTML value: width:120px=90pt text-align:center font-weight:900
       LTR PDF:    [value LEFT ~90pt] [label RIGHT flex:1]
    ── */
    saWrap:   { marginTop: 10, alignItems: 'flex-start' },
    saTable:  { width: 270, borderWidth: 1.5, borderColor: BORDER_MID, backgroundColor: '#fff' },
    sRow:     { flexDirection: 'row', alignItems: 'stretch', borderBottomWidth: 1, borderBottomColor: '#ccc' },
    sRowMain: { flexDirection: 'row', alignItems: 'stretch', backgroundColor: '#f0f0f0', borderTopWidth: 1.5, borderTopColor: BORDER_DARK, borderBottomWidth: 1, borderBottomColor: BORDER_MID },
    sVal:     { width: 90, paddingHorizontal: 6, paddingVertical: 5, fontSize: 9, fontWeight: 900, textAlign: 'center', borderRightWidth: 1, borderRightColor: '#ccc' },
    sValMain: { width: 90, paddingHorizontal: 6, paddingVertical: 6, fontSize: 11, fontWeight: 900, textAlign: 'center', borderRightWidth: 1, borderRightColor: BORDER_MID, color: BORDER_DARK },
    sLblCell: { flex: 1, paddingHorizontal: 6, paddingVertical: 4, justifyContent: 'center' },
    enSub:    { fontSize: 6.5, color: '#555', marginTop: 1 },

    /* ── Footer ── */
    footer:   { marginTop: 'auto', paddingTop: 22, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    sigBox:   { width: 165, alignItems: 'center' },
    sigLbl:   { fontSize: 8, fontWeight: 900, color: BORDER_DARK, marginBottom: 18, textAlign: 'center' },
    sigLine:  { borderTopWidth: 1.5, borderTopColor: BORDER_DARK, paddingTop: 4, fontSize: 7.5, color: '#444', fontWeight: 700, width: '100%', textAlign: 'center' },
    thankYou: { fontSize: 8, color: '#aaa', fontWeight: 700, marginBottom: 5 },
});

/* ── Component ────────────────────────────────────────────────── */
interface Props { invoice: any; company: any; type: string; partyBalance?: number | null; }

function InvoicePDF({ invoice, company, type, partyBalance: pb }: Props) {
    const sym            = getCurrencySymbol(company?.currency || 'EGP');
    const country        = (company?.countryCode || 'EG').toUpperCase();
    const isServicesComp = company?.businessType?.toUpperCase() === 'SERVICES';
    const isTrading      = company?.businessType?.toUpperCase() === 'TRADING';
    const isSaudi        = country === 'SA';
    const isEgypt        = country === 'EG';
    const isBilingual    = country !== 'EG' || isServicesComp;
    const isSale         = type === 'sale' || type === 'sale-return' || type === 'sale_return';

    const rawLines  = invoice?.lines || invoice?.items || [];
    const lines: any[] = Array.isArray(rawLines) ? rawLines : [];
    const isServicesLine = isServicesComp || lines.some((l: any) => l.item?.businessType?.toUpperCase() === 'SERVICES');

    const party        = isSale ? (invoice.customer || invoice.supplier || null) : (invoice.supplier || invoice.customer || null);
    const partyName    = party?.name || (isSale ? 'عميل نقدي' : 'مورد نقدي');
    const partyLabel   = isSale ? 'العميل' : 'المورد';
    const partyLabelEn = isSale ? 'Customer' : 'Supplier';

    const subtotal  = lines.reduce((s: number, l: any) => s + Number(l.total || (Number(l.quantity||0)*Number(l.price||0)) || 0), 0);
    const discount  = Number(invoice?.discount || 0);
    const total     = Number(invoice?.total || subtotal - discount);
    const paid      = Number(invoice?.paidAmount || 0);
    const remaining = Math.max(0, total - paid);

    const invoiceTaxRate   = Number(invoice?.taxRate || 0);
    const invoiceTaxAmount = Number(invoice?.taxAmount || 0);
    const taxInclusive     = invoice?.taxInclusive || false;
    const showTax          = invoiceTaxRate > 0 || invoiceTaxAmount > 0;
    const showDiscount     = discount > 0;
    const displayTax       = invoiceTaxAmount > 0 ? invoiceTaxAmount
        : parseFloat(lines.reduce((a: number, l: any) => a + Number(l.quantity||0)*Number(l.price||0)*invoiceTaxRate/100, 0).toFixed(2));

    const invoiceDate = new Date(invoice?.date || new Date());
    const date        = invoiceDate.toLocaleDateString('en-GB');
    const dateISO     = invoiceDate.toISOString();
    const invoiceNum  = String(invoice?.invoiceNumber || 1).padStart(5, '0');

    // Title — mirrors HTML logic exactly
    const showServicesTitle = !isTrading || isServicesLine;
    const invoiceTitle      = showServicesTitle ? (isSale ? 'فاتورة خدمات' : 'فاتورة مشتريات خدمات') : (TITLES[type] || 'فاتورة');
    const invoiceTitleEn    = showServicesTitle ? (isSale ? 'Service Invoice' : 'Purchase Service Invoice') : (TITLES_EN[type] || '');
    const prefix            = isServicesLine ? 'SRV' : (PREFIXES[type] || 'INV');

    // ZATCA QR (Saudi)
    const zatcaQR = isSaudi ? generateZatcaTLV(company?.name || '', company?.taxNumber || '000000000000000', dateISO, total.toFixed(2), displayTax.toFixed(2)) : '';
    const qrUrl   = zatcaQR ? `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(zatcaQR)}` : '';

    // Balance — mirrors HTML logic exactly
    const hasPrevBal = pb != null || invoice?.customerPrevBalance != null || invoice?.supplierPrevBalance != null;
    const effect  = total - paid;
    const prevBal = isSale
        ? (invoice?.customerPrevBalance ?? (Number(pb) - effect))
        : (invoice?.supplierPrevBalance ?? (Number(pb) - (paid - total)));
    const finalBal = isSale
        ? (invoice?.customerNewBalance ?? Number(pb))
        : (invoice?.supplierNewBalance ?? Number(pb));
    const fmtBal = (v: number) => {
        const abs = Math.abs(v).toLocaleString('en-US');
        const sfx = isSale ? (v > 0 ? ' (عليه)' : v < 0 ? ' (له)' : '') : (v < 0 ? ' (له)' : v > 0 ? ' (لنا)' : '');
        return `${abs} ${sym}${sfx}`;
    };

    const cleanNotes = (invoice?.notes || '').replace(/\(تم التحويل من عرض سعر رقم: \d+\)/g, '').trim();

    const co = {
        name:   company?.name || '',
        nameEn: company?.nameEn || '',
        addr:   [company?.addressRegion, company?.addressCity, company?.addressDistrict, company?.addressStreet].filter(Boolean) as string[],
        phone:  company?.phone || '',
        tax:    company?.taxNumber || '',
        cr:     company?.commercialRegister || '',
        logo:   company?.logo || '',
    };

    const n = (v: number) => v.toLocaleString('en-US');
    const useSaudiTotals = isSaudi || isServicesComp;

    // Column widths — LTR PDF = reversed RTL visual
    const W = {
        total:   isSaudi ? '11%' : '14%',
        taxAmt:  '8%',
        taxPct:  '6%',
        taxable: '10%',
        price:   '10%',
        qty:     '7%',
        unit:    '8%',
        name: (() => {
            if (isSaudi && showTax && !isServicesLine) return '30%';
            if (isSaudi && showTax &&  isServicesLine) return '38%';
            if (isSaudi && !isServicesLine)            return '49%';
            if (isSaudi &&  isServicesLine)            return '57%';
            if (!isServicesLine)                       return '46%';
            return '59%';
        })(),
        num: '5%',
    };

    return (
        <Document>
            <Page size="A4" style={s.page}>

                {/* ══ HEADER ══
                    RTL HTML: [logo-block flex:1.2 RIGHT] [center flex:1] [co-block flex:1.2 LEFT]
                    LTR PDF:  [hLeft = co-block]           [hCenter]       [hRight = logo-block]

                    EG:  hLeft=logo   hRight=company name+addr+phone+tax+cr
                    SA:  hLeft=QR     hRight=logo (or company name if no logo)
                    Other: hLeft=logo hRight=company name+addr (smaller)
                */}
                <View style={s.header}>
                    <View style={s.hLeft}>
                        {isSaudi
                            ? (qrUrl ? <Image src={qrUrl} style={s.qrImg} /> : null)
                            : (co.logo ? <Image src={co.logo} style={s.logo} /> : null)
                        }
                    </View>
                    <View style={s.hCenter}>
                        <Text style={s.titleBox}>{invoiceTitle}</Text>
                        {isBilingual && <Text style={s.titleBoxEn}>{invoiceTitleEn}</Text>}
                        {isSaudi && <Text style={s.zatcaNote}>فاتورة ضريبية مبسطة / Simplified Tax Invoice</Text>}
                        <Text style={s.invNum}>{prefix}-{invoiceNum}</Text>
                        <Text style={s.invDate}>{date}</Text>
                        {invoice?.customerPONumber
                            ? <Text style={s.poNum}>{isBilingual ? 'PO: ' : 'رقم الطلب: '}{invoice.customerPONumber}</Text>
                            : null}
                    </View>
                    <View style={s.hRight}>
                        {isSaudi
                            ? (co.logo
                                ? <Image src={co.logo} style={s.logo} />
                                : <Text style={s.coNameSmall}>{co.name}</Text>)
                            : isEgypt
                                ? <>
                                    <Text style={s.coNameEG}>{co.name}</Text>
                                    {co.addr.length > 0 && <Text style={s.coLine}>{co.addr.join(' - ')}</Text>}
                                    {co.phone && <Text style={s.coLine}>الهاتف: {co.phone}</Text>}
                                    {co.tax   && <Text style={s.coLine}>رقم ضريبي: {co.tax}</Text>}
                                    {co.cr    && <Text style={s.coLine}>سجل تجاري: {co.cr}</Text>}
                                  </>
                                : <>
                                    <Text style={s.coNameSmall}>{co.name}</Text>
                                    {co.addr.length > 0 && <Text style={s.coLine}>{co.addr.join(' - ')}</Text>}
                                    {(co.phone || co.tax || co.cr) && (
                                        <Text style={s.coLine}>
                                            {[co.phone && `الهاتف: ${co.phone}`, co.tax && `رقم ضريبي: ${co.tax}`, co.cr && `سجل تجاري: ${co.cr}`].filter(Boolean).join(' | ')}
                                        </Text>
                                    )}
                                  </>
                        }
                    </View>
                </View>

                {/* ══ INFO BOXES ══ */}
                <View style={s.infoWrap}>
                    {/* SA only: "من" box */}
                    {isSaudi && (
                        <View style={s.infoBox}>
                            <Text style={s.infoTitle}>من / From</Text>
                            <View style={s.infoBody}>
                                <View style={s.infoRow}>
                                    <Text style={s.iv}>{co.name}{co.nameEn ? ` / ${co.nameEn}` : ''}</Text>
                                    <Text style={s.ik}>الشركة / Company:</Text>
                                </View>
                                {co.addr.map((a, i) => (
                                    <View key={i} style={s.infoRow}>
                                        <Text style={s.iv}>{a}</Text>
                                        <Text style={s.ik}>العنوان:</Text>
                                    </View>
                                ))}
                                {co.phone && <View style={s.infoRow}><Text style={s.iv}>{co.phone}</Text><Text style={s.ik}>الهاتف / Phone:</Text></View>}
                                {co.tax   && <View style={s.infoRow}><Text style={s.iv}>{co.tax}</Text><Text style={s.ik}>الرقم الضريبي / VAT No:</Text></View>}
                                {co.cr    && <View style={s.infoRow}><Text style={s.iv}>{co.cr}</Text><Text style={s.ik}>السجل التجاري / C.R:</Text></View>}
                            </View>
                        </View>
                    )}

                    {/* "إلى" box — always */}
                    <View style={s.infoBox}>
                        <Text style={s.infoTitle}>{isBilingual ? 'إلى / To' : 'إلى'}</Text>
                        <View style={s.infoBody}>
                            <View style={s.infoRow}>
                                <Text style={s.iv}>{partyName}</Text>
                                <Text style={s.ik}>{isBilingual ? `${partyLabel} / ${partyLabelEn}` : partyLabel}:</Text>
                            </View>
                            {party?.phone && (
                                <View style={s.infoRow}>
                                    <Text style={s.iv}>{party.phone}</Text>
                                    <Text style={s.ik}>{isBilingual ? 'الهاتف / Phone' : 'الهاتف'}:</Text>
                                </View>
                            )}
                            {(() => {
                                const pa = [party?.addressRegion, party?.addressCity, party?.addressDistrict, party?.addressStreet].filter(Boolean) as string[];
                                if (!pa.length) return null;
                                return (
                                    <View style={s.infoRow}>
                                        <Text style={s.iv}>{pa.join('، ')}</Text>
                                        <Text style={s.ik}>{isBilingual ? 'العنوان / Address' : 'العنوان'}:</Text>
                                    </View>
                                );
                            })()}
                            {party?.taxNumber && (
                                <View style={s.infoRow}>
                                    <Text style={s.iv}>{party.taxNumber}</Text>
                                    <Text style={s.ik}>{isBilingual ? 'الرقم الضريبي / VAT No.' : 'الرقم الضريبي'}:</Text>
                                </View>
                            )}
                            {party?.commercialRegister && (
                                <View style={s.infoRow}>
                                    <Text style={s.iv}>{party.commercialRegister}</Text>
                                    <Text style={s.ik}>{isBilingual ? 'السجل التجاري / C.R.' : 'السجل التجاري'}:</Text>
                                </View>
                            )}
                        </View>
                    </View>
                </View>

                {/* ══ TABLE ══
                    RTL HTML cols (right→left): م | صنف | [وحدة] | كمية | سعر | [خاضع] | [ن.ضريبة] | [ق.ضريبة] | إجمالي
                    LTR PDF  cols (left→right): إجمالي | [ق.ضريبة] | [ن.ضريبة] | [خاضع] | سعر | كمية | [وحدة] | صنف | م
                */}
                <View style={s.table}>
                    <View style={s.thead}>
                        <Text style={[s.th, { width: W.total }]}>{isBilingual ? 'الإجمالي\nTotal' : 'الإجمالي'}</Text>
                        {showTax && isSaudi && <Text style={[s.th, { width: W.taxAmt }]}>{'ق.ضريبة\nTax Amt'}</Text>}
                        {showTax && isSaudi && <Text style={[s.th, { width: W.taxPct }]}>{'ن.ضريبة\nTax %'}</Text>}
                        {isSaudi             && <Text style={[s.th, { width: W.taxable }]}>{'الخاضع\nTaxable'}</Text>}
                        <Text style={[s.th, { width: W.price }]}>{isBilingual ? 'السعر\nPrice' : 'السعر'}</Text>
                        <Text style={[s.th, { width: W.qty   }]}>{isBilingual ? 'الكمية\nQty'   : 'الكمية'}</Text>
                        {!isServicesLine && <Text style={[s.th, { width: W.unit }]}>{isBilingual ? 'الوحدة\nUnit' : 'الوحدة'}</Text>}
                        <Text style={[s.th, { width: W.name, textAlign: 'right' }]}>
                            {isServicesLine
                                ? (isBilingual ? 'الخدمة / الوصف\nService / Description' : 'الخدمة')
                                : (isBilingual ? 'الصنف\nItem' : 'الصنف')}
                        </Text>
                        <Text style={[s.th, { width: W.num, borderRightWidth: 0 }]}>{isBilingual ? 'م\n#' : 'م'}</Text>
                    </View>

                    {lines.length === 0
                        ? <View style={{ padding: 12, alignItems: 'center' }}><Text style={{ color: '#999' }}>لا توجد بنود في هذه الفاتورة</Text></View>
                        : lines.map((l: any, i: number) => {
                            const unit        = l.item?.unit?.name || l.unit?.name || l.unit || '—';
                            const name        = l.item?.name || l.itemName || l.name || 'صنف غير معروف';
                            const desc        = l.description || '';
                            const qty         = Number(l.quantity || 0);
                            const price       = Number(l.price || 0);
                            const lineBase    = qty * price;
                            const lineTaxRate = Number(l.taxRate || 0) || invoiceTaxRate;
                            const lineTaxAmt  = Number(l.taxAmount || 0) || (taxInclusive ? 0 : parseFloat((lineBase * lineTaxRate / 100).toFixed(2)));
                            const lineTotal   = taxInclusive ? lineBase : lineBase + lineTaxAmt;
                            const isLast      = i === lines.length - 1;
                            return (
                                <View key={i} style={[s.trow, isLast ? { borderBottomWidth: 0 } : {}]}>
                                    <Text style={[s.td, { width: W.total, fontWeight: 700 }]}>{n(lineTotal)} {sym}</Text>
                                    {showTax && isSaudi && <Text style={[s.td, { width: W.taxAmt }]}>{n(lineTaxAmt)} {sym}</Text>}
                                    {showTax && isSaudi && <Text style={[s.td, { width: W.taxPct }]}>{lineTaxRate}%</Text>}
                                    {isSaudi             && <Text style={[s.td, { width: W.taxable }]}>{n(lineBase)} {sym}</Text>}
                                    <Text style={[s.td, { width: W.price }]}>{n(price)} {sym}</Text>
                                    <Text style={[s.td, { width: W.qty, fontWeight: 700 }]}>{n(qty)}</Text>
                                    {!isServicesLine && <Text style={[s.td, { width: W.unit }]}>{unit}</Text>}
                                    <View style={[s.td, { width: W.name, alignItems: 'flex-end' }]}>
                                        <Text style={{ fontWeight: 700, fontSize: 8, textAlign: 'right' }}>{name}</Text>
                                        {desc ? <Text style={{ fontSize: 7, color: '#444', marginTop: 1 }}>{desc}</Text> : null}
                                    </View>
                                    <Text style={[s.td, { width: W.num, borderRightWidth: 0 }]}>{i + 1}</Text>
                                </View>
                            );
                        })}
                </View>

                {/* ══ NOTES ══ */}
                {cleanNotes ? (
                    <View style={s.notesBox}>
                        <Text><Text style={{ fontWeight: 700 }}>{isBilingual ? 'ملاحظات / Notes' : 'ملاحظات'}: </Text>{cleanNotes}</Text>
                    </View>
                ) : null}

                {/* ══ TOTALS ══ */}
                {useSaudiTotals ? (
                    /* SA / Services bilingual totals — left-aligned
                       LTR PDF: [value LEFT 90pt] [bilingual label RIGHT flex:1]
                    */
                    <View style={s.saWrap}>
                        <View style={s.saTable}>
                            <View style={s.sRow}>
                                <Text style={s.sVal}>{n(subtotal)} {sym}</Text>
                                <View style={s.sLblCell}>
                                    <Text style={{ fontWeight: 700, fontSize: 9, textAlign: 'right' }}>الإجمالي غير شامل الضريبة</Text>
                                    <Text style={[s.enSub, { textAlign: 'right' }]}>Total (Excluding VAT)</Text>
                                </View>
                            </View>
                            <View style={s.sRow}>
                                <Text style={s.sVal}>{n(discount)} {sym}</Text>
                                <View style={s.sLblCell}>
                                    <Text style={{ fontWeight: 700, fontSize: 9, textAlign: 'right' }}>مجموع الخصومات</Text>
                                    <Text style={[s.enSub, { textAlign: 'right' }]}>Total Discounts</Text>
                                </View>
                            </View>
                            <View style={s.sRow}>
                                <Text style={s.sVal}>{n(subtotal - discount)} {sym}</Text>
                                <View style={s.sLblCell}>
                                    <Text style={{ fontWeight: 700, fontSize: 9, textAlign: 'right' }}>الإجمالي الخاضع للضريبة</Text>
                                    <Text style={[s.enSub, { textAlign: 'right' }]}>Total Taxable Amount</Text>
                                </View>
                            </View>
                            <View style={s.sRow}>
                                <Text style={s.sVal}>{n(displayTax)} {sym}</Text>
                                <View style={s.sLblCell}>
                                    <Text style={{ fontWeight: 700, fontSize: 9, textAlign: 'right' }}>
                                        {'مجموع ضريبة القيمة المضافة'}{invoiceTaxRate > 0 ? ` (${invoiceTaxRate}%)` : ''}
                                    </Text>
                                    <Text style={[s.enSub, { textAlign: 'right' }]}>Total VAT</Text>
                                </View>
                            </View>
                            <View style={s.sRowMain}>
                                <Text style={s.sValMain}>{n(total)} {sym}</Text>
                                <View style={[s.sLblCell, { backgroundColor: '#f0f0f0' }]}>
                                    <Text style={{ fontWeight: 900, fontSize: 10, color: BORDER_DARK, textAlign: 'right' }}>إجمالي المبلغ المستحق</Text>
                                    <Text style={[s.enSub, { fontWeight: 900, textAlign: 'right' }]}>Total Amount Due</Text>
                                </View>
                            </View>
                            {!(isServicesLine && paid === 0) && <>
                                <View style={s.sRow}>
                                    <Text style={s.sVal}>{n(paid)} {sym}</Text>
                                    <View style={s.sLblCell}>
                                        <Text style={{ fontWeight: 700, fontSize: 9, textAlign: 'right' }}>المبلغ المدفوع</Text>
                                        <Text style={[s.enSub, { textAlign: 'right' }]}>Amount Paid</Text>
                                    </View>
                                </View>
                                <View style={[s.sRow, { borderBottomWidth: 0 }]}>
                                    <Text style={s.sVal}>{n(remaining)} {sym}</Text>
                                    <View style={s.sLblCell}>
                                        <Text style={{ fontWeight: 700, fontSize: 9, textAlign: 'right' }}>المتبقي المستحق</Text>
                                        <Text style={[s.enSub, { textAlign: 'right' }]}>Remaining Amount</Text>
                                    </View>
                                </View>
                            </>}
                        </View>
                    </View>
                ) : (
                    /* EG simple totals — left-aligned
                       HTML: border:1px solid #111, font-size:13px=9.75pt≈10pt
                       LTR PDF: [value LEFT 40%] [label RIGHT 60%]
                    */
                    <View style={s.egWrap}>
                        <View style={s.egTable}>
                            <View style={s.eRow}>
                                <Text style={s.eVal}>{n(subtotal)} {sym}</Text>
                                <Text style={s.eLbl}>الإجمالي قبل الخصم والضريبة</Text>
                            </View>
                            {showDiscount && (
                                <View style={s.eRow}>
                                    <Text style={[s.eVal, { color: '#d32f2f' }]}>{n(discount)} {sym}</Text>
                                    <Text style={s.eLbl}>الخصم</Text>
                                </View>
                            )}
                            {showTax && (
                                <View style={s.eRow}>
                                    <Text style={s.eVal}>{n(displayTax)} {sym}</Text>
                                    <Text style={s.eLbl}>إجمالي الضريبة</Text>
                                </View>
                            )}
                            <View style={s.eRowMain}>
                                <Text style={s.eValMain}>{n(total)} {sym}</Text>
                                <Text style={s.eLblMain}>إجمالي الفاتورة</Text>
                            </View>
                            <View style={s.eRow}>
                                <Text style={s.eVal}>{n(paid)} {sym}</Text>
                                <Text style={s.eLbl}>المبلغ المدفوع</Text>
                            </View>
                            <View style={[s.eRow, !hasPrevBal ? { borderBottomWidth: 0 } : {}]}>
                                <Text style={s.eVal}>{n(remaining)} {sym}</Text>
                                <Text style={s.eLbl}>المبلغ المتبقي</Text>
                            </View>
                            {hasPrevBal && <>
                                <View style={s.eRow}>
                                    <Text style={s.eVal}>{fmtBal(prevBal)}</Text>
                                    <Text style={s.eLbl}>الرصيد السابق لـ {partyLabel}</Text>
                                </View>
                                <View style={s.eRow}>
                                    <Text style={s.eVal}>{effect > 0 ? '+' : ''}{n(effect)} {sym}</Text>
                                    <Text style={s.eLbl}>صافي تأثير الفاتورة</Text>
                                </View>
                                <View style={[s.eRowMain, { borderBottomWidth: 0 }]}>
                                    <Text style={s.eValMain}>{fmtBal(finalBal)}</Text>
                                    <Text style={s.eLblMain}>إجمالي رصيد {partyLabel} الحالي</Text>
                                </View>
                            </>}
                        </View>
                    </View>
                )}

                {/* ══ FOOTER ══
                    RTL HTML: first child (RIGHT) = توقيع المستلم | middle = شكراً | last (LEFT) = توقيع المسؤول
                    LTR PDF:  first (LEFT) = توقيع المسؤول | middle = شكراً | last (RIGHT) = توقيع المستلم
                */}
                <View style={s.footer}>
                    <View style={s.sigBox}>
                        <Text style={s.sigLbl}>{isBilingual ? 'توقيع المسؤول / Authorized Signature' : 'توقيع المسؤول'}</Text>
                        <Text style={s.sigLine}>{isBilingual ? 'الختم والتوقيع / Stamp & Signature' : 'الختم والتوقيع'}</Text>
                    </View>
                    <Text style={s.thankYou}>شكراً لتعاملكم معنا</Text>
                    <View style={s.sigBox}>
                        <Text style={s.sigLbl}>{isBilingual ? 'توقيع المستلم / Recipient Signature' : 'توقيع المستلم'}</Text>
                        <Text style={s.sigLine}>{isBilingual ? 'الاسم والتوقيع / Name & Signature' : 'الاسم والتوقيع'}</Text>
                    </View>
                </View>

            </Page>
        </Document>
    );
}

/* ── Export ────────────────────────────────────────────────────── */
export async function generateInvoicePDFBlob(
    invoice: any,
    company: any,
    type: string,
    partyBalance?: number | null,
): Promise<Blob> {
    ensureFonts();
    const { pdf } = await import('@react-pdf/renderer');
    const el = React.createElement(InvoicePDF, { invoice, company, type, partyBalance });
    return (pdf as any)(el).toBlob();
}
