'use client';
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';
import { getCurrencySymbol } from '@/lib/currency';

/* ─── Font registration ─────────────────────────────────────────── */
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

/* ─── Constants matching generateA4HTML ────────────────────────── */
const TITLES: Record<string, string> = {
    sale: 'فاتورة مبيعات',         purchase: 'فاتورة مشتريات',
    sale_return: 'مرتجع مبيعات',   'sale-return': 'مرتجع مبيعات',
    purchase_return: 'مرتجع مشتريات', 'purchase-return': 'مرتجع مشتريات',
};
const PREFIXES: Record<string, string> = {
    sale: 'SAL',  purchase: 'PUR',
    sale_return: 'SLR',  'sale-return': 'SLR',
    purchase_return: 'PRR', 'purchase-return': 'PRR',
};

/* ─── Helpers ───────────────────────────────────────────────────── */
const n = (v: number) => v.toLocaleString('en-US');
function fmtBal(val: number, isSale: boolean, sym: string) {
    const abs = Math.abs(val).toLocaleString('en-US');
    const s = isSale
        ? (val > 0 ? ' (عليه)' : val < 0 ? ' (له)' : '')
        : (val < 0 ? ' (له)' : val > 0 ? ' (لنا)' : '');
    return `${abs} ${sym}${s}`;
}

/* ─── Colours matching HTML template ───────────────────────────── */
const BORDER_DARK  = '#111';
const BORDER_MID   = '#333';
const BORDER_LIGHT = '#999';
const BG_HEAD      = '#f0f0f0';
const BG_TOTAL_ROW = '#f2f2f2';
const TEXT_MUTED   = '#444';
const TEXT_LABEL   = '#666';

/* ─── Styles ────────────────────────────────────────────────────── */
// Page padding: 4mm V × 8mm H  →  ~11pt × ~23pt
const s = StyleSheet.create({
    page: {
        fontFamily: 'Cairo', fontSize: 8, backgroundColor: '#fff',
        paddingHorizontal: 23, paddingVertical: 11,
    },

    /* Header – 3 columns, matching .logo-block | .header-center | .co-block */
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        borderBottomWidth: 2, borderBottomColor: BORDER_DARK,
        paddingBottom: 6, marginBottom: 6,
    },
    hLogo: { flex: 1.2, alignItems: 'flex-start' },   // LEFT  → logo
    hCenter: { flex: 1, alignItems: 'center' },         // CENTER → title/num/date
    hCo: { flex: 1.2, alignItems: 'flex-end' },         // RIGHT → company info
    logo: { maxHeight: 57, maxWidth: 98, objectFit: 'contain' },

    coName:   { fontSize: 17, fontWeight: 900, color: BORDER_DARK, textAlign: 'right' },
    coLine:   { fontSize: 8,  color: TEXT_MUTED, marginTop: 2, textAlign: 'right' },

    titleBox: {
        fontSize: 13, fontWeight: 900, color: BORDER_DARK,
        backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#ccc',
        borderRadius: 4, paddingHorizontal: 10, paddingVertical: 2,
        textAlign: 'center',
    },
    invNum:  { fontSize: 10, fontWeight: 700, color: '#333', marginTop: 4, textAlign: 'center' },
    invDate: { fontSize: 8.5, color: '#555', marginTop: 2, textAlign: 'center' },

    /* Info section – single "إلى" box */
    infoBox: {
        borderWidth: 1, borderColor: BORDER_MID, borderRadius: 3,
        marginTop: 5, marginBottom: 4,
    },
    infoTitle: {
        backgroundColor: '#f5f5f5', paddingHorizontal: 8, paddingVertical: 3,
        fontWeight: 900, fontSize: 8, borderBottomWidth: 1, borderBottomColor: BORDER_MID,
        textAlign: 'right',
    },
    infoBody: { paddingHorizontal: 8, paddingVertical: 4 },
    infoRow:  { flexDirection: 'row', marginBottom: 2 },
    // In LTR PDF we put value first (LEFT) then label (RIGHT) = RTL visual
    iv: { flex: 1, fontSize: 8, fontWeight: 700, color: BORDER_DARK, textAlign: 'right' },
    ik: { minWidth: 55, fontSize: 8, color: TEXT_LABEL, textAlign: 'right' },

    /* Table */
    table:  { borderWidth: 1, borderColor: BORDER_LIGHT },
    thead:  { flexDirection: 'row', backgroundColor: BG_HEAD, borderBottomWidth: 1, borderBottomColor: BORDER_LIGHT },
    trow:   { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: BORDER_LIGHT },
    th: {
        paddingVertical: 4, paddingHorizontal: 2,
        fontSize: 8, fontWeight: 900, color: BORDER_DARK,
        textAlign: 'center', borderRightWidth: 1, borderRightColor: BORDER_LIGHT,
    },
    td: {
        paddingVertical: 3, paddingHorizontal: 2,
        fontSize: 8, color: '#1a1a1a',
        textAlign: 'center', borderRightWidth: 1, borderRightColor: BORDER_LIGHT,
    },

    /* Totals table – width:320px in HTML, LEFT-aligned on page */
    /* In LTR PDF: value column LEFT, label column RIGHT (mirrors RTL HTML) */
    totalsWrap:  { marginTop: 8, alignItems: 'flex-start' },
    totalsTable: { width: 240, borderWidth: 1, borderColor: BORDER_DARK },
    tRow: {
        flexDirection: 'row', minHeight: 24, alignItems: 'center',
        borderBottomWidth: 1, borderBottomColor: BORDER_LIGHT,
    },
    tRowMain: {
        flexDirection: 'row', minHeight: 26, alignItems: 'center',
        backgroundColor: BG_TOTAL_ROW, borderBottomWidth: 1, borderBottomColor: BORDER_MID,
    },
    // value cell (LEFT, 40% width)
    tVal:     { width: 90, paddingHorizontal: 8, paddingVertical: 2, fontSize: 9, fontWeight: 700, textAlign: 'left', borderRightWidth: 1, borderRightColor: BORDER_LIGHT },
    tValMain: { width: 90, paddingHorizontal: 8, paddingVertical: 2, fontSize: 10, fontWeight: 900, textAlign: 'left', borderRightWidth: 1, borderRightColor: BORDER_MID },
    // label cell (RIGHT, 60% flex)
    tLbl:     { flex: 1, paddingHorizontal: 8, paddingVertical: 2, fontSize: 9, color: TEXT_MUTED, textAlign: 'right' },
    tLblMain: { flex: 1, paddingHorizontal: 8, paddingVertical: 2, fontSize: 10, fontWeight: 900, textAlign: 'right' },

    /* Footer – matches HTML: [المستلم RTL-right] [شكراً] [المسؤول RTL-left] */
    footer: { marginTop: 'auto', paddingTop: 22, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    sigBox: { width: 150, alignItems: 'center' },
    sigLbl: { fontSize: 8.5, fontWeight: 900, color: BORDER_DARK, marginBottom: 18, textAlign: 'center' },
    sigLine: { borderTopWidth: 1.5, borderTopColor: BORDER_DARK, paddingTop: 4, fontSize: 7.5, color: TEXT_MUTED, fontWeight: 700, width: '100%', textAlign: 'center' },
});

/* ─── Component ─────────────────────────────────────────────────── */
interface Props { invoice: any; company: any; type: string; partyBalance?: number | null; }

function InvoicePDF({ invoice, company, type, partyBalance }: Props) {
    const sym        = getCurrencySymbol(company?.currency || 'EGP');
    const isSale     = type === 'sale' || type === 'sale-return' || type === 'sale_return';
    const isServices = company?.businessType?.toUpperCase() === 'SERVICES';
    const party      = isSale
        ? (invoice.customer || invoice.supplier || null)
        : (invoice.supplier || invoice.customer || null);
    const partyName  = party?.name || (isSale ? 'عميل نقدي' : 'مورد نقدي');
    const partyLabel = isSale ? 'العميل' : 'المورد';

    const lines: any[]  = Array.isArray(invoice.lines) ? invoice.lines : [];
    const subtotal       = lines.reduce((a: number, l: any) => a + Number(l.total || (Number(l.quantity || 0) * Number(l.price || 0))), 0);
    const discount       = Number(invoice.discount || 0);
    const taxRate        = Number(invoice.taxRate || 0);
    const taxAmount      = Number(invoice.taxAmount || 0);
    const displayTax     = taxAmount > 0 ? taxAmount : parseFloat(lines.reduce((a: number, l: any) => a + Number(l.quantity || 0) * Number(l.price || 0) * taxRate / 100, 0).toFixed(2));
    const showTax        = taxRate > 0 || taxAmount > 0;
    const total          = Number(invoice.total || subtotal - discount);
    const paid           = Number(invoice.paidAmount || 0);
    const remaining      = Math.max(0, total - paid);

    const invoiceNum = String(invoice.invoiceNumber || 1).padStart(5, '0');
    const prefix     = PREFIXES[type] || 'INV';
    const title      = TITLES[type] || 'فاتورة';
    const date       = new Date(invoice.date || new Date()).toLocaleDateString('en-GB');

    const hasPrevBal = partyBalance !== null && partyBalance !== undefined;
    const effect     = total - paid;
    const prevBal    = isSale
        ? (invoice.customerPrevBalance ?? (Number(partyBalance) - effect))
        : (invoice.supplierPrevBalance ?? (Number(partyBalance) - (paid - total)));
    const finalBal   = isSale
        ? (invoice.customerNewBalance ?? Number(partyBalance))
        : (invoice.supplierNewBalance ?? Number(partyBalance));

    const addrParts  = [company?.addressRegion, company?.addressCity, company?.addressDistrict, company?.addressStreet].filter(Boolean) as string[];
    const itemLabel  = isServices ? 'الخدمة' : 'الصنف';

    /*
     * Table column widths — reversed order from RTL HTML:
     * HTML RTL (right→left): م | الصنف | [وحدة] | كمية | سعر | إجمالي
     * PDF LTR  (left→right): إجمالي | سعر | كمية | [وحدة] | الصنف | م
     */
    const wTotal = '12%';
    const wPrice = '13%';
    const wQty   = '8%';
    const wUnit  = '10%';
    const wName  = isServices ? '62%' : (isServices ? '62%' : '47%');
    const wNum   = '5%';

    return (
        <Document>
            <Page size="A4" style={s.page}>

                {/* ── HEADER ── */}
                <View style={s.header}>
                    {/* LEFT: Logo (= co-block in RTL HTML, text-align:left) */}
                    <View style={s.hLogo}>
                        {company?.logo
                            ? <Image src={company.logo} style={s.logo} />
                            : <Text> </Text>}
                    </View>

                    {/* CENTER: Title, invoice number, date */}
                    <View style={s.hCenter}>
                        <Text style={s.titleBox}>{title}</Text>
                        <Text style={s.invNum}>{prefix}-{invoiceNum}</Text>
                        <Text style={s.invDate}>{date}</Text>
                    </View>

                    {/* RIGHT: Company info (= logo-block in RTL HTML, text-align:right) */}
                    <View style={s.hCo}>
                        <Text style={s.coName}>{company?.name || ''}</Text>
                        {addrParts.length > 0 && <Text style={s.coLine}>{addrParts.join(' - ')}</Text>}
                        {company?.phone    && <Text style={s.coLine}>الهاتف: {company.phone}</Text>}
                        {company?.taxNumber && <Text style={s.coLine}>رقم ضريبي: {company.taxNumber}</Text>}
                        {company?.commercialRegister && <Text style={s.coLine}>سجل تجاري: {company.commercialRegister}</Text>}
                    </View>
                </View>

                {/* ── INFO BOX "إلى" ── */}
                <View style={s.infoBox}>
                    <Text style={s.infoTitle}>إلى</Text>
                    <View style={s.infoBody}>
                        {/* value LEFT, label RIGHT (mirrors RTL: label right, value left) */}
                        <View style={s.infoRow}>
                            <Text style={s.iv}>{partyName}</Text>
                            <Text style={s.ik}>{partyLabel}:</Text>
                        </View>
                        {party?.phone && (
                            <View style={s.infoRow}>
                                <Text style={s.iv}>{party.phone}</Text>
                                <Text style={s.ik}>الهاتف:</Text>
                            </View>
                        )}
                        {invoice.notes && !/تم التحويل من عرض سعر/.test(invoice.notes) && (
                            <View style={s.infoRow}>
                                <Text style={s.iv}>{invoice.notes}</Text>
                                <Text style={s.ik}>ملاحظات:</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* ── TABLE ── */}
                {/* LTR order = reversed RTL: إجمالي | سعر | كمية | [وحدة] | صنف | م */}
                <View style={s.table}>
                    <View style={s.thead}>
                        <Text style={[s.th, { width: wTotal }]}>الإجمالي</Text>
                        <Text style={[s.th, { width: wPrice  }]}>السعر</Text>
                        <Text style={[s.th, { width: wQty   }]}>الكمية</Text>
                        {!isServices && <Text style={[s.th, { width: wUnit }]}>الوحدة</Text>}
                        <Text style={[s.th, { width: wName, textAlign: 'right' }]}>{itemLabel}</Text>
                        <Text style={[s.th, { width: wNum, borderRightWidth: 0 }]}>م</Text>
                    </View>

                    {lines.length === 0
                        ? <View style={{ padding: 12, alignItems: 'center' }}>
                              <Text style={{ color: '#999' }}>لا توجد بنود</Text>
                          </View>
                        : lines.map((l: any, i: number) => {
                              const name      = l.item?.name || l.itemName || l.name || 'صنف';
                              const unit      = l.item?.unit?.name || l.unit?.name || '—';
                              const qty       = Number(l.quantity || 0);
                              const price     = Number(l.price || 0);
                              const lineTotal = Number(l.total || qty * price);
                              return (
                                  <View key={i} style={s.trow}>
                                      <Text style={[s.td, { width: wTotal, fontWeight: 700 }]}>{n(lineTotal)} {sym}</Text>
                                      <Text style={[s.td, { width: wPrice  }]}>{n(price)} {sym}</Text>
                                      <Text style={[s.td, { width: wQty,  fontWeight: 700 }]}>{n(qty)}</Text>
                                      {!isServices && <Text style={[s.td, { width: wUnit }]}>{unit}</Text>}
                                      <View style={[s.td, { width: wName, alignItems: 'flex-end' }]}>
                                          <Text style={{ fontWeight: 700, fontSize: 8.5, textAlign: 'right' }}>{name}</Text>
                                          {l.description
                                              ? <Text style={{ fontSize: 7, color: '#555' }}>{l.description}</Text>
                                              : null}
                                      </View>
                                      <Text style={[s.td, { width: wNum, borderRightWidth: 0 }]}>{i + 1}</Text>
                                  </View>
                              );
                          })}
                </View>

                {/* ── TOTALS ── */}
                {/* LEFT-aligned on page; inside: value LEFT (40%) | label RIGHT (60%) */}
                <View style={s.totalsWrap}>
                    <View style={s.totalsTable}>

                        {/* الإجمالي قبل الخصم والضريبة — always shown */}
                        <View style={s.tRow}>
                            <Text style={s.tVal}>{n(subtotal)} {sym}</Text>
                            <Text style={s.tLbl}>الإجمالي قبل الخصم والضريبة</Text>
                        </View>

                        {discount > 0 && (
                            <View style={s.tRow}>
                                <Text style={[s.tVal, { color: '#d32f2f' }]}>{n(discount)} {sym}</Text>
                                <Text style={s.tLbl}>الخصم</Text>
                            </View>
                        )}

                        {showTax && (
                            <View style={s.tRow}>
                                <Text style={s.tVal}>{n(displayTax)} {sym}</Text>
                                <Text style={s.tLbl}>إجمالي الضريبة</Text>
                            </View>
                        )}

                        {/* إجمالي الفاتورة — bold + background */}
                        <View style={s.tRowMain}>
                            <Text style={s.tValMain}>{n(total)} {sym}</Text>
                            <Text style={s.tLblMain}>إجمالي الفاتورة</Text>
                        </View>

                        <View style={s.tRow}>
                            <Text style={s.tVal}>{n(paid)} {sym}</Text>
                            <Text style={s.tLbl}>المبلغ المدفوع</Text>
                        </View>

                        <View style={s.tRow}>
                            <Text style={s.tVal}>{n(remaining)} {sym}</Text>
                            <Text style={s.tLbl}>المبلغ المتبقي</Text>
                        </View>

                        {hasPrevBal && <>
                            <View style={s.tRow}>
                                <Text style={s.tVal}>{fmtBal(prevBal, isSale, sym)}</Text>
                                <Text style={s.tLbl}>الرصيد السابق لـ {partyLabel}</Text>
                            </View>
                            <View style={s.tRow}>
                                <Text style={s.tVal}>{effect > 0 ? '+' : ''}{n(effect)} {sym}</Text>
                                <Text style={s.tLbl}>صافي تأثير الفاتورة</Text>
                            </View>
                            <View style={s.tRowMain}>
                                <Text style={s.tValMain}>{fmtBal(finalBal, isSale, sym)}</Text>
                                <Text style={s.tLblMain}>إجمالي رصيد {partyLabel} الحالي</Text>
                            </View>
                        </>}
                    </View>
                </View>

                {/* ── FOOTER ── */}
                {/*
                  HTML RTL order: [توقيع المستلم] [شكراً] [توقيع المسؤول]
                  RTL visual:      RIGHT=المستلم    CENTER   LEFT=المسؤول
                  PDF LTR order:  [توقيع المسؤول] [شكراً] [توقيع المستلم]
                */}
                <View style={s.footer}>
                    <View style={s.sigBox}>
                        <Text style={s.sigLbl}>توقيع المسؤول</Text>
                        <Text style={s.sigLine}>الختم والتوقيع</Text>
                    </View>
                    <Text style={{ fontSize: 8.5, color: '#aaa', fontWeight: 600 }}>شكراً لتعاملكم معنا</Text>
                    <View style={s.sigBox}>
                        <Text style={s.sigLbl}>توقيع المستلم</Text>
                        <Text style={s.sigLine}>الاسم والتوقيع</Text>
                    </View>
                </View>

            </Page>
        </Document>
    );
}

/* ─── Export ─────────────────────────────────────────────────────── */
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
