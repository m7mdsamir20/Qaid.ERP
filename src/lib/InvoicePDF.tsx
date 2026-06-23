'use client';
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';
import { getCurrencySymbol } from '@/lib/currency';

let fontsRegistered = false;
function ensureFonts() {
    if (fontsRegistered) return;
    fontsRegistered = true;
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    Font.register({
        family: 'Cairo',
        fonts: [
            { src: `${base}/fonts/Cairo-Regular.ttf`, fontWeight: 400 },
            { src: `${base}/fonts/Cairo-Bold.ttf`, fontWeight: 700 },
            { src: `${base}/fonts/Cairo-Black.ttf`, fontWeight: 900 },
        ],
    });
}

const TITLES: Record<string, string> = {
    sale: 'فاتورة مبيعات', purchase: 'فاتورة مشتريات',
    sale_return: 'مرتجع مبيعات', 'sale-return': 'مرتجع مبيعات',
    purchase_return: 'مرتجع مشتريات', 'purchase-return': 'مرتجع مشتريات',
};
const PREFIXES: Record<string, string> = {
    sale: 'SAL', purchase: 'PUR',
    sale_return: 'SLR', 'sale-return': 'SLR',
    purchase_return: 'PRR', 'purchase-return': 'PRR',
};

function n(v: number) { return v.toLocaleString('en-US'); }
function fmtBal(val: number, isSale: boolean, sym: string) {
    const abs = Math.abs(val).toLocaleString('en-US');
    const s = isSale ? (val > 0 ? ' (عليه)' : val < 0 ? ' (له)' : '') : (val < 0 ? ' (له)' : val > 0 ? ' (لنا)' : '');
    return `${abs} ${sym}${s}`;
}

const LG = '#999';
const s = StyleSheet.create({
    page: { fontFamily: 'Cairo', fontSize: 10, backgroundColor: '#fff', paddingHorizontal: 22, paddingVertical: 16 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: '#111', paddingBottom: 8, marginBottom: 6 },
    hLeft: { flex: 1.2 },
    hCenter: { flex: 1, alignItems: 'center' },
    hRight: { flex: 1.2, alignItems: 'flex-end' },
    coName: { fontSize: 19, fontWeight: 900, color: '#111', textAlign: 'right' },
    coDetail: { fontSize: 8.5, color: '#444', marginTop: 1.5, textAlign: 'right' },
    titleBox: { fontSize: 13, fontWeight: 900, backgroundColor: '#f5f5f5', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 4, borderWidth: 1, borderColor: '#ccc', textAlign: 'center' },
    invNum: { fontSize: 12, fontWeight: 700, marginTop: 5, textAlign: 'center' },
    invDate: { fontSize: 9, color: '#555', marginTop: 2, textAlign: 'center' },
    logo: { maxHeight: 70, maxWidth: 120, objectFit: 'contain' },
    infoWrap: { flexDirection: 'row', gap: 6, marginBottom: 5 },
    infoBox: { flex: 1, borderWidth: 1, borderColor: '#333', borderRadius: 3 },
    infoTitle: { backgroundColor: '#f5f5f5', paddingHorizontal: 8, paddingVertical: 3, fontWeight: 900, fontSize: 9, borderBottomWidth: 1, borderBottomColor: '#333', textAlign: 'right' },
    infoBody: { paddingHorizontal: 8, paddingVertical: 4 },
    infoRow: { flexDirection: 'row', marginBottom: 2.5 },
    infoKey: { color: '#666', width: 70, fontSize: 8.5, textAlign: 'right' },
    infoVal: { color: '#111', fontWeight: 700, fontSize: 8.5, flex: 1, textAlign: 'right' },
    table: { borderWidth: 1, borderColor: LG },
    thead: { flexDirection: 'row', backgroundColor: '#f0f0f0', borderBottomWidth: 1, borderBottomColor: LG },
    th: { paddingVertical: 4, paddingHorizontal: 2, fontSize: 8.5, fontWeight: 900, textAlign: 'center', borderRightWidth: 1, borderRightColor: LG },
    trow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e8e8e8' },
    td: { paddingVertical: 3, paddingHorizontal: 3, fontSize: 8.5, textAlign: 'center', borderRightWidth: 1, borderRightColor: '#ddd' },
    totalsWrap: { marginTop: 8, alignItems: 'flex-start' },
    totalsTable: { width: 285, borderWidth: 1, borderColor: LG },
    tRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: LG, minHeight: 27, alignItems: 'center' },
    tLbl: { flex: 1, paddingHorizontal: 8, paddingVertical: 2, fontSize: 10.5, color: '#444', textAlign: 'right' },
    tVal: { width: 95, paddingHorizontal: 8, paddingVertical: 2, fontSize: 10.5, fontWeight: 700, textAlign: 'left' },
    tMain: { flexDirection: 'row', backgroundColor: '#f2f2f2', borderBottomWidth: 1, borderBottomColor: LG, minHeight: 29, alignItems: 'center' },
    tMainLbl: { flex: 1, paddingHorizontal: 8, paddingVertical: 2, fontSize: 11.5, fontWeight: 900, textAlign: 'right' },
    tMainVal: { width: 95, paddingHorizontal: 8, paddingVertical: 2, fontSize: 11.5, fontWeight: 900, textAlign: 'left' },
    footer: { paddingTop: 25, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    sigBox: { width: 185, alignItems: 'center' },
    sigLbl: { fontSize: 9, fontWeight: 900, marginBottom: 20, textAlign: 'center' },
    sigLine: { borderTopWidth: 1.5, borderTopColor: '#111', paddingTop: 4, fontSize: 8, color: '#444', width: '100%', textAlign: 'center' },
});

interface Props { invoice: any; company: any; type: string; partyBalance?: number | null; }

function InvoicePDF({ invoice, company, type, partyBalance }: Props) {
    const sym = getCurrencySymbol(company?.currency || 'EGP');
    const isSale = type.startsWith('sale');
    const party = isSale ? (invoice.customer || invoice.supplier || null) : (invoice.supplier || invoice.customer || null);
    const partyName = party?.name || (isSale ? 'عميل نقدي' : 'مورد نقدي');
    const partyLabel = isSale ? 'العميل' : 'المورد';
    const lines: any[] = Array.isArray(invoice.lines) ? invoice.lines : [];
    const subtotal = lines.reduce((s: number, l: any) => s + Number(l.total || (Number(l.quantity || 0) * Number(l.price || 0))), 0);
    const discount = Number(invoice.discount || 0);
    const total = Number(invoice.total || subtotal - discount);
    const paid = Number(invoice.paidAmount || 0);
    const remaining = Math.max(0, total - paid);
    const invoiceNum = String(invoice.invoiceNumber || 1).padStart(5, '0');
    const prefix = PREFIXES[type] || 'INV';
    const title = TITLES[type] || 'فاتورة';
    const date = new Date(invoice.date || new Date()).toLocaleDateString('en-GB');
    const isServices = company?.businessType?.toUpperCase() === 'SERVICES';
    const hasPrevBal = partyBalance !== null && partyBalance !== undefined;
    const prevBal = isSale ? (invoice.customerPrevBalance ?? (Number(partyBalance) - (total - paid))) : (invoice.supplierPrevBalance ?? (Number(partyBalance) - (paid - total)));
    const finalBal = isSale ? (invoice.customerNewBalance ?? Number(partyBalance)) : (invoice.supplierNewBalance ?? Number(partyBalance));
    const addrParts = [company?.addressRegion, company?.addressCity, company?.addressDistrict].filter(Boolean);

    const wNum = '5%'; const wName = isServices ? '55%' : '40%'; const wUnit = '10%'; const wQty = '10%'; const wPrice = '15%'; const wTotal = '15%';

    return (
        <Document>
            <Page size="A4" style={s.page}>
                <View style={s.header}>
                    <View style={s.hLeft}>
                        <Text style={s.coName}>{company?.name || ''}</Text>
                        {addrParts.length > 0 && <Text style={s.coDetail}>{addrParts.join(' - ')}</Text>}
                        {company?.phone && <Text style={s.coDetail}>الهاتف: {company.phone}</Text>}
                        {company?.taxNumber && <Text style={s.coDetail}>رقم ضريبي: {company.taxNumber}</Text>}
                    </View>
                    <View style={s.hCenter}>
                        <Text style={s.titleBox}>{title}</Text>
                        <Text style={s.invNum}>{prefix}-{invoiceNum}</Text>
                        <Text style={s.invDate}>{date}</Text>
                    </View>
                    <View style={s.hRight}>
                        {company?.logo ? <Image src={company.logo} style={s.logo} /> : <Text> </Text>}
                    </View>
                </View>

                <View style={s.infoWrap}>
                    <View style={s.infoBox}>
                        <Text style={s.infoTitle}>إلى</Text>
                        <View style={s.infoBody}>
                            <View style={s.infoRow}><Text style={s.infoKey}>{partyLabel}:</Text><Text style={s.infoVal}>{partyName}</Text></View>
                            {party?.phone && <View style={s.infoRow}><Text style={s.infoKey}>الهاتف:</Text><Text style={s.infoVal}>{party.phone}</Text></View>}
                        </View>
                    </View>
                    <View style={s.infoBox}>
                        <Text style={s.infoTitle}>بيانات الفاتورة</Text>
                        <View style={s.infoBody}>
                            <View style={s.infoRow}><Text style={s.infoKey}>رقم الفاتورة:</Text><Text style={s.infoVal}>{prefix}-{invoiceNum}</Text></View>
                            <View style={s.infoRow}><Text style={s.infoKey}>التاريخ:</Text><Text style={s.infoVal}>{date}</Text></View>
                            {invoice.notes && !/تم التحويل من عرض سعر/.test(invoice.notes) && <View style={s.infoRow}><Text style={s.infoKey}>ملاحظات:</Text><Text style={s.infoVal}>{invoice.notes}</Text></View>}
                        </View>
                    </View>
                </View>

                <View style={s.table}>
                    <View style={s.thead}>
                        <Text style={[s.th, { width: wNum }]}>م</Text>
                        <Text style={[s.th, { width: wName, textAlign: 'right' }]}>{isServices ? 'الخدمة' : 'الصنف'}</Text>
                        {!isServices && <Text style={[s.th, { width: wUnit }]}>الوحدة</Text>}
                        <Text style={[s.th, { width: wQty }]}>الكمية</Text>
                        <Text style={[s.th, { width: wPrice }]}>السعر</Text>
                        <Text style={[s.th, { width: wTotal, borderRightWidth: 0 }]}>الإجمالي</Text>
                    </View>
                    {lines.length === 0
                        ? <View style={{ padding: 15, alignItems: 'center' }}><Text style={{ color: '#999' }}>لا توجد بنود</Text></View>
                        : lines.map((l: any, i: number) => {
                            const name = l.item?.name || l.itemName || l.name || 'صنف';
                            const unit = l.item?.unit?.name || l.unit?.name || '—';
                            const qty = Number(l.quantity || 0);
                            const price = Number(l.price || 0);
                            const lineTotal = Number(l.total || qty * price);
                            return (
                                <View key={i} style={s.trow}>
                                    <Text style={[s.td, { width: wNum }]}>{i + 1}</Text>
                                    <View style={[s.td, { width: wName, alignItems: 'flex-end' }]}>
                                        <Text style={{ fontWeight: 700, fontSize: 9, textAlign: 'right' }}>{name}</Text>
                                        {l.description ? <Text style={{ fontSize: 7.5, color: '#555' }}>{l.description}</Text> : null}
                                    </View>
                                    {!isServices && <Text style={[s.td, { width: wUnit }]}>{unit}</Text>}
                                    <Text style={[s.td, { width: wQty, fontWeight: 700 }]}>{n(qty)}</Text>
                                    <Text style={[s.td, { width: wPrice }]}>{n(price)} {sym}</Text>
                                    <Text style={[s.td, { width: wTotal, fontWeight: 700, borderRightWidth: 0 }]}>{n(lineTotal)} {sym}</Text>
                                </View>
                            );
                        })}
                </View>

                <View style={s.totalsWrap}>
                    <View style={s.totalsTable}>
                        {discount > 0 && <View style={s.tRow}><Text style={s.tLbl}>الإجمالي قبل الخصم</Text><Text style={s.tVal}>{n(subtotal)} {sym}</Text></View>}
                        {discount > 0 && <View style={s.tRow}><Text style={[s.tLbl, { color: '#d32f2f' }]}>الخصم</Text><Text style={[s.tVal, { color: '#d32f2f' }]}>- {n(discount)} {sym}</Text></View>}
                        <View style={s.tMain}><Text style={s.tMainLbl}>إجمالي الفاتورة</Text><Text style={s.tMainVal}>{n(total)} {sym}</Text></View>
                        <View style={s.tRow}><Text style={s.tLbl}>المبلغ المدفوع</Text><Text style={s.tVal}>{n(paid)} {sym}</Text></View>
                        <View style={s.tRow}><Text style={s.tLbl}>المبلغ المتبقي</Text><Text style={s.tVal}>{n(remaining)} {sym}</Text></View>
                        {hasPrevBal && <>
                            <View style={s.tRow}><Text style={s.tLbl}>الرصيد السابق لـ {partyLabel}</Text><Text style={s.tVal}>{fmtBal(prevBal, isSale, sym)}</Text></View>
                            <View style={s.tRow}><Text style={s.tLbl}>صافي تأثير الفاتورة</Text><Text style={s.tVal}>{total - paid > 0 ? '+' : ''}{n(total - paid)} {sym}</Text></View>
                            <View style={s.tMain}><Text style={s.tMainLbl}>إجمالي رصيد {partyLabel} الحالي</Text><Text style={s.tMainVal}>{fmtBal(finalBal, isSale, sym)}</Text></View>
                        </>}
                    </View>
                </View>

                <View style={{ flexGrow: 1 }} />

                <View style={s.footer}>
                    <View style={s.sigBox}><Text style={s.sigLbl}>توقيع المستلم</Text><Text style={s.sigLine}>الاسم والتوقيع</Text></View>
                    <Text style={{ fontSize: 9, color: '#aaa', fontWeight: 600 }}>شكراً لتعاملكم معنا</Text>
                    <View style={s.sigBox}><Text style={s.sigLbl}>توقيع المسؤول</Text><Text style={s.sigLine}>الختم والتوقيع</Text></View>
                </View>
            </Page>
        </Document>
    );
}

export async function generateInvoicePDFBlob(invoice: any, company: any, type: string, partyBalance?: number | null): Promise<Blob> {
    ensureFonts();
    const { pdf } = await import('@react-pdf/renderer');
    const el = React.createElement(InvoicePDF, { invoice, company, type, partyBalance });
    return pdf(el as any).toBlob();
}
