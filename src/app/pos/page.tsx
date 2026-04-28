'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from '@/lib/i18n';
import { THEME, C, CAIRO, OUTFIT, IS, LS, BTN_PRIMARY } from '@/constants/theme';
import { useCurrency } from '@/hooks/useCurrency';
import {
    ShoppingCart, Search, Plus, Minus, X, Printer, Check, ChevronRight,
    UtensilsCrossed, Truck, Package, Wifi, Table2, Loader2, RefreshCw,
    AlertCircle, Clock, ChevronsRight, LogOut, User, Power, Home, Phone, MapPin, Receipt, ChefHat, Wallet, Store, Tag, Utensils
} from 'lucide-react';
import CustomSelect from '@/components/CustomSelect';

const ORDER_TYPES = [
    { value: 'dine-in',  label: 'صالة',    icon: Table2,   color: '#6366f1' },
    { value: 'takeaway', label: 'تيك أواي', icon: Package,  color: '#f59e0b' },
    { value: 'delivery', label: 'توصيل',    icon: Truck,    color: '#10b981' },
    { value: 'online',   label: 'أونلاين',  icon: Wifi,     color: '#3b82f6' },
];

const playBeep = () => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.type = 'sine';
        
        osc.frequency.setValueAtTime(1000, ctx.currentTime); // High pitch like a scanner
        gainNode.gain.setValueAtTime(0.2, ctx.currentTime); // Medium volume as requested
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.1);
    } catch (e) {
        // ignore if audio is not supported or blocked by browser policy
    }
};

interface CartItem {
    itemId: string;
    itemName: string;
    unitPrice: number;
    quantity: number;
    discount: number;
    notes: string;
    modifiers?: any; // To store selected modifiers
}

export default function POSPage() {
    const { t, lang } = useTranslation();
    const isRtl = lang === 'ar';
    const { fMoney, symbol: cSymbol } = useCurrency();

    // Data
    const [categories, setCategories] = useState<any[]>([]);
    const [items, setItems] = useState<any[]>([]);
    const [tables, setTables] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [modifiers, setModifiers] = useState<any[]>([]);
    const [drivers, setDrivers] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [treasuries, setTreasuries] = useState<any[]>([]);
    const [restaurantSettings, setRestaurantSettings] = useState<any>({});
    
    // Modifiers Modal
    const [activeModifierCartIndex, setActiveModifierCartIndex] = useState<number | null>(null);
    const [tempModifiers, setTempModifiers] = useState<any>({});

    // Split Payment Modal
    const [showSplitPayment, setShowSplitPayment] = useState(false);
    const [splitAmounts, setSplitAmounts] = useState({ cash: 0, card: 0 });
    const [showOrderTypeModal, setShowOrderTypeModal] = useState(false);
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [showOffersModal, setShowOffersModal] = useState(false);
    const [customerSearchQuery, setCustomerSearchQuery] = useState('');
    const [searchedCustomerObj, setSearchedCustomerObj] = useState<any>(null);
    const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);

    // Open Orders Modal
    const [showOpenOrders, setShowOpenOrders] = useState(false);
    const [openOrders, setOpenOrders] = useState<any[]>([]);
    const [payingOrder, setPayingOrder] = useState<any>(null);

    // Filters
    const [selectedCategory, setSelectedCategory] = useState('');
    const [search, setSearch] = useState('');

    // Order
    const [cart, setCart] = useState<CartItem[]>([]);
    const [orderType, setOrderType] = useState('dine-in');
    const [selectedTable, setSelectedTable] = useState('');
    const [selectedDriver, setSelectedDriver] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState('');
    const [selectedTreasury, setSelectedTreasury] = useState('');
    const [deliveryName, setDeliveryName] = useState('');
    const [deliveryPhone, setDeliveryPhone] = useState('');
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [orderNotes, setOrderNotes] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [discount, setDiscount] = useState(0);
    const [hasTax, setHasTax] = useState(false);
    const [taxRate, setTaxRate] = useState(0);
    const [hasServiceCharge, setHasServiceCharge] = useState(false);
    const [serviceChargeRate, setServiceChargeRate] = useState(0);
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
    const [couponError, setCouponError] = useState('');
    const [couponLoading, setCouponLoading] = useState(false);
    const [step, setStep] = useState<'cart' | 'payment'>('cart');
    const [currentShift, setCurrentShift] = useState<any>(null);
    const [showStartShift, setShowStartShift] = useState(false);
    const [showUnpaidWarning, setShowUnpaidWarning] = useState(false);
    const [shiftReportData, setShiftReportData] = useState<any>(null);
    const [showEndShift, setShowEndShift] = useState(false);
        const [showDrawerModal, setShowDrawerModal] = useState(false);
    const [showSearchInput, setShowSearchInput] = useState(false);
    const [showBranchModal, setShowBranchModal] = useState(false);
    const [branches, setBranches] = useState<any[]>([]);
    const [selectedBranch, setSelectedBranch] = useState<any>(null);
    
    const [drawerAmount, setDrawerAmount] = useState<number | ''>('');
    const [drawerNotes, setDrawerNotes] = useState('');
    const [drawerType, setDrawerType] = useState<'in' | 'out'>('in');
    
    const [shiftOpeningBalance, setShiftOpeningBalance] = useState<number | ''>('');
    const [shiftClosingBalance, setShiftClosingBalance] = useState<number | ''>('');
    const [shiftNotes, setShiftNotes] = useState('');
    const [shiftLoading, setShiftLoading] = useState(false);


    const searchRef = useRef<HTMLInputElement>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [catRes, itemRes, tableRes, modRes, driverRes, custRes, treasRes, settingsRes, shiftRes, branchRes] = await Promise.all([
                fetch('/api/categories'),
                fetch('/api/items?all=true'),
                fetch('/api/restaurant/tables'),
                fetch('/api/restaurant/modifiers'),
                fetch('/api/drivers'),
                fetch('/api/customers'),
                fetch('/api/treasuries'),
                fetch('/api/settings'), fetch('/api/restaurant/shifts?status=open'), fetch('/api/branches')
            ]);
            const [cats, itms, tbls, mods, drvs, custs, treas, settings, shiftsResData, branchesData] = await Promise.all([catRes.json(), itemRes.json(), tableRes.json(), modRes.json(), driverRes.json(), custRes.json(), treasRes.json(), settingsRes.json(), shiftRes.json(), branchRes.json()]);
            setCategories(Array.isArray(cats) ? cats : []);
            setItems(Array.isArray(itms) ? itms : (itms.items || []));
            setTables(Array.isArray(tbls) ? tbls : []);
            setModifiers(Array.isArray(mods) ? mods : []);
            setDrivers(Array.isArray(drvs) ? drvs.filter((d: any) => d.status === 'available') : []);
            setCustomers(Array.isArray(custs) ? custs : []);
            setTreasuries(Array.isArray(treas) ? treas : []);
            setRestaurantSettings(settings.restaurantSettings || {});
            const brArr = Array.isArray(branchesData) ? branchesData : [];
            setBranches(brArr);
            if (brArr.length > 0) setSelectedBranch(brArr[0]);
            if (Array.isArray(shiftsResData) && shiftsResData.length > 0) setCurrentShift(shiftsResData[0]); else setCurrentShift(null);
            
            if (settings.company?.taxSettings) {
                try {
                    const ts = typeof settings.company.taxSettings === 'string' ? JSON.parse(settings.company.taxSettings) : settings.company.taxSettings;
                    setHasTax(ts.enabled ?? false);
                    if (ts.enabled) setTaxRate(ts.rate ?? 0);
                    setHasServiceCharge(ts.hasServiceCharge ?? false);
                    if (ts.hasServiceCharge) setServiceChargeRate(ts.serviceChargeRate ?? 0);
                } catch(e) {}
            }
        } finally {
            setLoading(false);
        }
    }, []);

    // Variants Modal
    const [activeVariantItem, setActiveVariantItem] = useState<any>(null);

    useEffect(() => { load(); }, [load]);

    const filteredItems = items.filter(item => {
        if (item.isPosEligible === false) return false;
        if (item.type === 'raw') return false;
        if (item.parentId) return false; // Hide variants from main grid
        const matchCat = !selectedCategory || item.categoryId === selectedCategory;
        const matchSearch = !search || item.name?.toLowerCase().includes(search.toLowerCase());
        return matchCat && matchSearch;
    });

    const handleItemClick = (item: any) => {
        if (item.variants && item.variants.length > 0) {
            setActiveVariantItem(item);
        } else {
            addToCart(item);
        }
    };

    const addToCart = (item: any) => {
        playBeep();
        setCart(prev => {
            const existing = prev.find(c => c.itemId === item.id);
            if (existing) {
                return prev.map(c => c.itemId === item.id ? { ...c, quantity: c.quantity + 1 } : c);
            }
            return [...prev, {
                itemId: item.id,
                itemName: item.name,
                unitPrice: item.sellPrice ?? item.price ?? 0,
                quantity: 1,
                discount: 0,
                notes: '',
            }];
        });
    };

    const clearCart = () => { 
        setCart([]); 
        setPaymentMethod('cash');
        setDiscount(0);
        setCouponCode('');
        setAppliedCoupon(null);
        setOrderNotes('');
        setStep('cart');
        setSelectedTable(''); 
        setSelectedCustomer(''); 
        setDeliveryName(''); 
        setDeliveryPhone(''); 
        setDeliveryAddress(''); 
    };

    const updateQty = (itemId: string, delta: number) => {
        setCart(prev => prev.map(c => c.itemId === itemId
            ? { ...c, quantity: Math.max(0, c.quantity + delta) }
            : c
        ).filter(c => c.quantity > 0));
    };

    const removeFromCart = (itemId: string) => setCart(prev => prev.filter(c => c.itemId !== itemId));

    const openModifiersModal = (index: number) => {
        setActiveModifierCartIndex(index);
        setTempModifiers(cart[index].modifiers || {});
    };

    const handleModifierToggle = (modName: string, optName: string, extraPrice: number, isMulti: boolean) => {
        setTempModifiers((prev: any) => {
            const next = { ...prev };
            if (!next[modName]) next[modName] = [];
            
            const existingIdx = next[modName].findIndex((o: any) => o.name === optName);
            if (existingIdx >= 0) {
                next[modName] = next[modName].filter((o: any) => o.name !== optName);
                if (next[modName].length === 0) delete next[modName];
            } else {
                if (!isMulti) next[modName] = [{ name: optName, price: extraPrice }];
                else next[modName].push({ name: optName, price: extraPrice });
            }
            return next;
        });
    };

    const saveModifiers = () => {
        if (activeModifierCartIndex !== null) {
            setCart(prev => prev.map((c, i) => i === activeModifierCartIndex ? { ...c, modifiers: tempModifiers } : c));
        }
        setActiveModifierCartIndex(null);
    };

    const calculateCartItemTotal = (item: CartItem) => {
        let modsTotal = 0;
        if (item.modifiers) {
            Object.values(item.modifiers).forEach((arr: any) => {
                arr.forEach((o: any) => modsTotal += (o.price || 0));
            });
        }
        return (item.unitPrice + modsTotal) * item.quantity;
    };
    const subtotal = cart.reduce((s, c) => s + calculateCartItemTotal(c), 0);
    const couponDiscount = appliedCoupon ? appliedCoupon.discount : 0;
    const baseForTax = Math.max(0, subtotal - discount - couponDiscount);
    const taxAmount = hasTax && taxRate > 0 ? Math.round(baseForTax * taxRate / 100) : 0;
    const serviceAmount = hasServiceCharge && orderType === 'dine-in' && serviceChargeRate > 0 ? Math.round(baseForTax * serviceChargeRate / 100) : 0;
    const total = Math.max(0, baseForTax + taxAmount + serviceAmount);
    const cartCount = cart.reduce((s, c) => s + c.quantity, 0);

    const handleApplyCoupon = async () => {
        if (!couponCode) return;
        setCouponLoading(true);
        setCouponError('');
        try {
            const res = await fetch(`/api/coupons/validate?code=${encodeURIComponent(couponCode)}&subtotal=${subtotal}`);
            const data = await res.json();
            if (data.valid) {
                setAppliedCoupon({ ...data.coupon, discount: data.discount });
                setSuccessMsg('تم تطبيق الكوبون بنجاح');
                setTimeout(() => setSuccessMsg(''), 3000);
            } else {
                setCouponError(data.error || 'كود غير صحيح');
            }
        } catch (e) {
            setCouponError('خطأ في التحقق من الكوبون');
        } finally {
            setCouponLoading(false);
        }
    };
    
    // Recalculate coupon discount when subtotal changes
    useEffect(() => {
        if (appliedCoupon && subtotal > 0) {
            handleApplyCoupon();
        } else if (subtotal === 0) {
            setAppliedCoupon(null);
            setCouponCode('');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [subtotal]);

    const printReceipt = (orderData: any, lines: CartItem[], finalTotal: number, finalDiscount: number) => {
        const html = `
            <html dir="rtl">
            <head>
                <title>فاتورة كاشير</title>
                <style>
                    body { font-family: sans-serif; width: 300px; margin: 0 auto; padding: 20px; font-size: 14px; }
                    .header { text-align: center; margin-bottom: 20px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
                    .line { display: flex; justify-content: space-between; margin-bottom: 5px; }
                    .total { border-top: 1px dashed #000; padding-top: 10px; margin-top: 10px; font-weight: bold; font-size: 16px; }
                    .footer { text-align: center; margin-top: 20px; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2>فاتورة مطعم</h2>
                    <p>نوع الطلب: ${orderType === 'dine-in' ? 'صالة' : orderType === 'takeaway' ? 'تيك أواي' : 'توصيل'}</p>
                    <p>التاريخ: ${new Date().toLocaleString('ar-EG')}</p>
                </div>
                <div class="items">
                    ${lines.map(l => `
                        <div class="line">
                            <span>${l.itemName} (x${l.quantity})</span>
                            <span>${l.unitPrice * l.quantity}</span>
                        </div>
                        ${l.modifiers ? Object.values(l.modifiers).flat().map((m: any) => `
                            <div class="line" style="font-size: 12px; color: #555;">
                                <span>- ${m.name}</span>
                                <span>${m.price || 0}</span>
                            </div>
                        `).join('') : ''}
                    `).join('')}
                </div>
                <div class="total">
                    ${finalDiscount > 0 ? `<div class="line"><span>خصم:</span><span>${finalDiscount}</span></div>` : ''}
                    ${orderData.serviceAmount > 0 ? `<div class="line"><span>رسوم الخدمة:</span><span>${orderData.serviceAmount}</span></div>` : ''}
                    ${orderData.taxAmount > 0 ? `<div class="line"><span>الضريبة:</span><span>${orderData.taxAmount}</span></div>` : ''}
                    <div class="line"><span>الإجمالي:</span><span>${finalTotal}</span></div>
                </div>
                <div class="footer">
                    <p>شكراً لزيارتكم!</p>
                </div>
            </body>
            </html>
        `;

        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '-10000px';
        iframe.style.bottom = '-10000px';
        document.body.appendChild(iframe);
        
        iframe.contentDocument?.open();
        iframe.contentDocument?.write(html);
        iframe.contentDocument?.close();
        
        setTimeout(() => {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            setTimeout(() => document.body.removeChild(iframe), 1000);
        }, 500);
    };

    const printOpenOrderCheck = (order: any) => {
        const linesForPrint = order.lines?.map((l: any) => {
            const item = items.find(i => i.id === l.itemId);
            let parsedMods = null;
            if (l.modifiers) {
                try { parsedMods = typeof l.modifiers === 'string' ? JSON.parse(l.modifiers) : l.modifiers; } catch(e){}
            }
            return {
                itemName: item?.name || 'صنف غير معروف',
                quantity: l.quantity,
                unitPrice: l.price,
                modifiers: parsedMods ? { main: parsedMods } : undefined
            };
        }) || [];
        printReceipt({ ...order, type: order.type }, linesForPrint, order.total, order.discount);
    };

    const fetchOpenOrders = async () => {
        try {
            const res = await fetch('/api/restaurant/orders');
            if (res.ok) {
                const data = await res.json();
                setOpenOrders(data.filter((o: any) => o.status !== 'delivered' && o.status !== 'cancelled'));
            }
        } catch {}
    };

    const payOpenOrder = async (order: any) => {
        if (!selectedTreasury) {
            alert('يجب اختيار الخزنة أولاً!');
            return;
        }
        try {
            const res = await fetch('/api/restaurant/orders', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: order.id,
                    action: 'pay_and_close',
                    paymentMethod,
                    treasuryId: selectedTreasury
                })
            });
            if (res.ok) {
                setSuccessMsg('تم محاسبة الطاولة وإخلائها بنجاح');
                setPayingOrder(null);
                setShowOpenOrders(false);
                load();
                setTimeout(() => setSuccessMsg(''), 3000);
            } else {
                const d = await res.json();
                alert(d.error || 'فشل في المحاسبة');
            }
        } catch(e) {}
    };

    const handleInitialSubmit = () => {
        if (cart.length === 0) { setErrorMsg('السلة فارغة'); return; }
        
        const isPostPay = orderType === 'dine-in' && restaurantSettings.dineInPaymentPolicy === 'post-pay';
        
        if (orderType === 'dine-in' && !selectedTable) { setErrorMsg('اختر الطاولة أولاً'); return; }
        if (!isPostPay && !selectedTreasury && paymentMethod !== 'mixed') { setErrorMsg('اختر الخزنة أولاً'); return; }
        
        if (!isPostPay && paymentMethod === 'mixed') {
            setSplitAmounts({ cash: total / 2, card: total / 2 });
            setShowSplitPayment(true);
        } else {
            handleSubmit();
        }
    };

    const handleSubmit = async (isSplit = false) => {
        setSubmitting(true);
        setErrorMsg('');
        
        // append split details to notes if split payment
        let finalNotes = orderNotes;
        if (isSplit) {
            finalNotes += `\n[تقسيم الفاتورة: نقدي ${splitAmounts.cash} | شبكة ${splitAmounts.card}]`;
        }

        try {
            const paymentsArray: any[] = [];
            if (isSplit) {
                if (splitAmounts.cash > 0) paymentsArray.push({ amount: splitAmounts.cash, paymentMethod: 'cash', treasuryId: selectedTreasury || null });
                if (splitAmounts.card > 0) paymentsArray.push({ amount: splitAmounts.card, paymentMethod: 'card', treasuryId: selectedTreasury || null });
            } else if (total > 0) {
                paymentsArray.push({ amount: total, paymentMethod, treasuryId: selectedTreasury || null });
            }

            const res = await fetch('/api/restaurant/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: orderType,
                    tableId: selectedTable || null,
                    driverId: selectedDriver || null,
                    customerId: selectedCustomer || null,
                    deliveryName,
                    deliveryPhone,
                    deliveryAddress,
                    notes: finalNotes.trim(),
                    subtotal,
                    discount,
                    couponCode: appliedCoupon?.code || null,
                    couponDiscount: appliedCoupon?.discount || 0,
                    taxAmount,
                    serviceAmount,
                    total,
                    paymentMethod,
                    paidAmount: (orderType === 'dine-in' && restaurantSettings.dineInPaymentPolicy === 'post-pay') ? 0 : total,
                    payments: paymentsArray,
                    lines: cart.map(c => ({ ...c })),
                }),
            });
            if (!res.ok) { const d = await res.json(); setErrorMsg(d.error || 'فشل'); setSubmitting(false); return; }
            
            const isPostPay = orderType === 'dine-in' && restaurantSettings.dineInPaymentPolicy === 'post-pay';
            
            if (!isPostPay) {
                // Print Receipt only if paid (pre-pay or other types)
                printReceipt(await res.json(), cart, total, discount);
            }

            setSuccessMsg(isPostPay ? '✅ تم إرسال الطلب للمطبخ (طاولة مفتوحة)' : '✅ تم حفظ الطلب وإرساله للمطبخ');
            clearCart();
            setShowSplitPayment(false);
            load();
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch { setErrorMsg('حدث خطأ'); }
        finally { setSubmitting(false); }
    };

    const handleStartShift = async () => {
        if (shiftOpeningBalance === '') return;
        setShiftLoading(true);
        try {
            const res = await fetch('/api/restaurant/shifts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ openingBalance: Number(shiftOpeningBalance), notes: shiftNotes }) });
            if (res.ok) {
                const shift = await res.json();
                setCurrentShift(shift);
                setShowStartShift(false);
                setSuccessMsg('تم بدء الوردية بنجاح');
                setTimeout(() => setSuccessMsg(''), 3000);
            }
        } catch {} finally { setShiftLoading(false); }
    };

    const handleEndShift = async () => {
        if (shiftClosingBalance === '' || !currentShift) return;
        setShiftLoading(true);
        try {
            const res = await fetch('/api/restaurant/shifts', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: currentShift.id, closingBalance: Number(shiftClosingBalance), notes: shiftNotes }) });
            if (res.ok) {
                const data = await res.json();
                setCurrentShift(null);
                setShowEndShift(false);
                setSuccessMsg('تم إنهاء الوردية بنجاح. الفارق: ' + fMoney(data.difference));
                setTimeout(() => setSuccessMsg(''), 5000);
            }
        } catch {} finally { setShiftLoading(false); }
    };

    const handleDrawerOperation = async () => {
        if (!drawerAmount || !currentShift || !selectedTreasury) {
            setErrorMsg('تأكد من اختيار الخزنة وإدخال المبلغ');
            setTimeout(() => setErrorMsg(''), 3000);
            return;
        }
        setShiftLoading(true);
        try {
            const res = await fetch('/api/restaurant/shifts/drawer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shiftId: currentShift.id, treasuryId: selectedTreasury, type: drawerType, amount: drawerAmount, notes: drawerNotes }) });
            if (res.ok) {
                setShowDrawerModal(false);
                setDrawerAmount('');
                setDrawerNotes('');
                setSuccessMsg(drawerType === 'in' ? 'تم إضافة المبلغ للدرج' : 'تم سحب المبلغ من الدرج');
                setTimeout(() => setSuccessMsg(''), 3000);
            }
        } catch {} finally { setShiftLoading(false); }
    };

    return (
        <>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', fontFamily: CAIRO, background: C.bg }}>

                {/* --- Locked Overlay --- */}
                {!currentShift && !loading && (
                    <div style={{ position: 'absolute', inset: 0, zIndex: 50, background: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button onClick={() => window.location.href='/'} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '12px 24px', borderRadius: '10px', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontFamily: CAIRO }}>
                                    <LogOut size={18} /> عودة للنظام
                                </button>
                                <button onClick={() => setShowStartShift(true)} style={{ background: C.primary, color: 'white', border: 'none', padding: '12px 32px', borderRadius: '10px', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.3)', fontFamily: CAIRO }}>
                                    <Power size={18} /> ابدأ العمل
                                </button>
                            </div>
                            <p style={{ marginTop: '16px', color: 'white', fontWeight: 700, fontSize: '16px', fontFamily: CAIRO }}>لم يتم بدء العمل بعد</p>
                            <p style={{ marginTop: '4px', color: '#e5e7eb', fontSize: '13px', fontFamily: CAIRO }}>قم بالبدء لرؤية المنتجات أو إنشاء طلب</p>
                        </div>
                    </div>
                )}
                
                {/* ══ الجانب الأيسر: المنيو ══ */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderInlineEnd: `1px solid ${C.border}` }}>

                    {/* Header المنيو (New Design) */}
                    <div style={{ padding: '10px 20px', background: C.card, borderBottom: `1px solid ${C.border}`, display: 'flex', gap: '12px', alignItems: 'center' }}>
                        
                        {/* Exit System */}
                        <button onClick={() => window.location.href='/'} style={{ width: 40, height: 40, borderRadius: '10px', border: 'none', background: `${C.danger}15`, color: C.danger, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="الخروج للنظام">
                            <LogOut size={18} />
                        </button>

                        <div style={{ flex: 1 }}></div>

                        {/* Search */}
                        {showSearchInput ? (
                            <div style={{ position: 'relative', width: '250px', display: 'flex', alignItems: 'center' }}>
                                <Search size={16} style={{ position: 'absolute', insetInlineStart: '12px', color: C.textMuted }} />
                                <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder={t('ابحث عن صنف...')} style={{ ...IS, paddingInlineStart: '36px', paddingInlineEnd: '36px', height: '40px', fontSize: '13px', width: '100%' }} />
                                <button onClick={() => { setSearch(''); setShowSearchInput(false); }} style={{ position: 'absolute', insetInlineEnd: '8px', background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer' }}><X size={16} /></button>
                            </div>
                        ) : (
                            <button onClick={() => setShowSearchInput(true)} style={{ width: 40, height: 40, borderRadius: '10px', border: `1px solid ${C.border}`, background: C.card, color: C.textPrimary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={t('بحث')}>
                                <Search size={16} />
                            </button>
                        )}

                        {/* Drawer Ops */}
                        <button onClick={() => setShowDrawerModal(true)} style={{ width: 40, height: 40, borderRadius: '10px', border: `1px solid ${C.border}`, background: C.card, color: C.textPrimary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={t('درج الكاشير')}>
                            <Wallet size={16} color={'#f59e0b'} />
                        </button>
                        
                        {/* Branch Selector Icon */}
                        <button onClick={() => setShowBranchModal(true)} style={{ width: 40, height: 40, borderRadius: '10px', border: `1px solid ${C.border}`, background: C.card, color: C.textPrimary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={t('الفرع')}>
                            <Store size={16} color={C.primary} />
                        </button>

                        {/* End Shift */}
                        {currentShift && (
                            <button onClick={() => { if (cart.length > 0) setShowUnpaidWarning(true); else setShowEndShift(true); }} style={{ height: 40, padding: '0 24px', borderRadius: '10px', border: 'none', background: '#1e1b4b', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 700, fontFamily: CAIRO }}>
                                نهاية العمل <Power size={18} />
                            </button>
                        )}
                    </div>

                    {/* التصنيفات */}
                    <div style={{ display: 'flex', gap: '8px', padding: '12px 20px', overflowX: 'auto', background: C.card, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
                        <button onClick={() => setSelectedCategory('')}
                            style={{ padding: '6px 16px', borderRadius: '20px', border: `1px solid ${!selectedCategory ? C.primary : C.border}`, background: !selectedCategory ? `${C.primary}15` : 'transparent', color: !selectedCategory ? C.primary : C.textSecondary, fontSize: '12.5px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s', fontFamily: CAIRO }}>
                            الكل
                        </button>
                        {categories.filter(cat => items.some(item => item.categoryId === cat.id && item.isPosEligible !== false && item.type !== 'raw' && !item.parentId)).map(cat => (
                            <button key={cat.id} onClick={() => setSelectedCategory(cat.id)}
                                style={{ padding: '6px 16px', borderRadius: '20px', border: `1px solid ${selectedCategory === cat.id ? C.primary : C.border}`, background: selectedCategory === cat.id ? `${C.primary}15` : 'transparent', color: selectedCategory === cat.id ? C.primary : C.textSecondary, fontSize: '12.5px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s', fontFamily: CAIRO }}>
                                {cat.name}
                            </button>
                        ))}
                    </div>

                    {/* الأصناف */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
                        {loading ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: C.textMuted }}>
                                <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
                            </div>
                        ) : filteredItems.length === 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', color: C.textMuted, gap: '12px' }}>
                                <UtensilsCrossed size={40} style={{ opacity: 0.3 }} />
                                <p style={{ margin: 0, fontSize: '14px' }}>{t('لا توجد أصناف')}</p>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px' }}>
                                {filteredItems.map(item => {
                                    const inCart = cart.find(c => c.itemId === item.id);
                                    return (
                                        <button key={item.id} onClick={() => handleItemClick(item)}
                                            style={{ background: inCart ? `${C.primary}10` : C.card, border: `1px solid ${inCart ? C.primary + '40' : C.border}`, borderRadius: '16px', padding: '16px 12px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s', position: 'relative', fontFamily: CAIRO }}
                                            onMouseEnter={e => { if (!inCart) e.currentTarget.style.borderColor = C.primary + '60'; }}
                                            onMouseLeave={e => { if (!inCart) e.currentTarget.style.borderColor = C.border; }}>
                                            {inCart && (
                                                <div style={{ position: 'absolute', top: '8px', insetInlineEnd: '8px', width: '20px', height: '20px', borderRadius: '50%', background: C.primary, color: '#fff', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: OUTFIT }}>
                                                    {inCart.quantity}
                                                </div>
                                            )}
                                            <div style={{ fontSize: '36px', marginBottom: '10px', display: 'flex', justifyContent: 'center', width: '100%' }}>
                                                {item.imageUrl ? <img src={item.imageUrl} style={{ width: '100%', height: 80, borderRadius: '12px', objectFit: 'cover' }} /> : '🍽️'}
                                            </div>
                                            <p style={{ margin: '0 0 6px', fontSize: '12.5px', fontWeight: 700, color: C.textPrimary, lineHeight: 1.3 }}>{item.name}</p>
                                            <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: C.primary, fontFamily: OUTFIT }}>{fMoney(item.sellPrice ?? item.price ?? 0)}</p>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* ══ الجانب الأيمن: الفاتورة ══ */}
                <div style={{ width: '380px', display: 'flex', flexDirection: 'column', background: C.card, flexShrink: 0 }}>

                    {/* نوع الطلب */}
                    <div style={{ padding: '16px', borderBottom: `1px solid ${C.border}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, fontFamily: CAIRO }}>{t('الطلب الحالي')}</h3>
                            <button onClick={() => { fetchOpenOrders(); setShowOpenOrders(true); }} style={{ padding: '6px 10px', borderRadius: '8px', background: `${C.primary}15`, color: C.primary, fontSize: '12px', border: 'none', cursor: 'pointer', fontWeight: 700, fontFamily: CAIRO, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Clock size={14} /> {t('الطلبات المفتوحة')}
                            </button>
                        </div>
                        </div>

                    {/* السلة */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
                        {cart.length === 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', color: C.textMuted, gap: '12px' }}>
                                <ShoppingCart size={40} style={{ opacity: 0.2 }} />
                                <p style={{ margin: 0, fontSize: '13px' }}>{t('السلة فارغة')}</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {cart.map((item, idx) => (
                                    <div key={idx} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ flex: 1 }}>
                                                <p style={{ margin: '0 0 2px', fontSize: '12.5px', fontWeight: 700, color: C.textPrimary }}>{item.itemName}</p>
                                                <p style={{ margin: 0, fontSize: '12px', color: C.primary, fontFamily: OUTFIT }}>{fMoney(item.unitPrice)} × {item.quantity} = {fMoney(calculateCartItemTotal(item))}</p>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <button onClick={() => updateQty(item.itemId, -1)} style={{ width: 28, height: 28, borderRadius: '8px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textSecondary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Minus size={13} /></button>
                                                <span style={{ minWidth: '20px', textAlign: 'center', fontSize: '13px', fontWeight: 700, fontFamily: OUTFIT, color: C.textPrimary }}>{item.quantity}</span>
                                                <button onClick={() => updateQty(item.itemId, 1)} style={{ width: 28, height: 28, borderRadius: '8px', border: `1px solid ${C.border}`, background: `${C.primary}10`, color: C.primary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={13} /></button>
                                                <button onClick={() => removeFromCart(item.itemId)} style={{ width: 28, height: 28, borderRadius: '8px', border: `1px solid ${C.dangerBorder}`, background: C.dangerBg, color: C.danger, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={13} /></button>
                                            </div>
                                        </div>
                                        {modifiers.length > 0 && (
                                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', borderTop: `1px dashed ${C.border}`, paddingTop: '8px' }}>
                                                <button onClick={() => openModifiersModal(idx)} style={{ padding: '4px 8px', borderRadius: '6px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textSecondary, fontSize: '11px', cursor: 'pointer', fontFamily: CAIRO, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <Plus size={12} /> {t('إضافات وتعديلات')}
                                                </button>
                                                {item.modifiers && Object.entries(item.modifiers).map(([modName, opts]: any) => (
                                                    opts.map((o: any, i: number) => (
                                                        <div key={`${modName}-${i}`} style={{ background: `${C.primary}10`, border: `1px solid ${C.primary}30`, borderRadius: '6px', padding: '2px 6px', fontSize: '10px', color: C.primary, fontFamily: CAIRO }}>
                                                            {o.name} {o.price > 0 && `(+${o.price})`}
                                                        </div>
                                                    ))
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* الإجمالي والدفع */}
                    <div style={{ padding: '16px', borderTop: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {/* ملاحظات */}
                        <input value={orderNotes} onChange={e => setOrderNotes(e.target.value)} placeholder={t('ملاحظات الطلب...')} style={{ ...IS, height: '36px', fontSize: '12px' }} />

                        {/* 3 أيقونات تحت الملاحظات */}
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button onClick={() => setShowOrderTypeModal(true)} style={{ flex: 1, height: '40px', borderRadius: '10px', border: `1px solid ${C.border}`, background: C.card, color: C.textPrimary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }} title={t('نوع الطلب')}>
                                <Utensils size={16} /> <span style={{ fontSize: '12px', fontWeight: 600, fontFamily: CAIRO }}>{ORDER_TYPES.find(o => o.value === orderType)?.label || t('نوع الطلب')}</span>
                            </button>
                            <button onClick={() => setShowCustomerModal(true)} style={{ flex: 1, height: '40px', borderRadius: '10px', border: `1px solid ${selectedCustomer ? C.primary : C.border}`, background: selectedCustomer ? `${C.primary}10` : C.card, color: selectedCustomer ? C.primary : C.textPrimary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }} title={t('العميل')}>
                                <User size={16} /> <span style={{ fontSize: '12px', fontWeight: 600, fontFamily: CAIRO }}>{selectedCustomer ? customers.find(c => c.id === selectedCustomer)?.name || t('العميل') : t('إضافة عميل')}</span>
                            </button>
                            <button onClick={() => setShowOffersModal(true)} style={{ flex: 1, height: '40px', borderRadius: '10px', border: `1px solid ${(discount > 0 || appliedCoupon) ? C.primary : C.border}`, background: (discount > 0 || appliedCoupon) ? `${C.primary}10` : C.card, color: (discount > 0 || appliedCoupon) ? C.primary : C.textPrimary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }} title={t('العروض')}>
                                <Tag size={16} /> <span style={{ fontSize: '12px', fontWeight: 600, fontFamily: CAIRO }}>{t('العروض')}</span>
                            </button>
                        </div>


                        {/* اختيار الخزنة */}
                        {!(orderType === 'dine-in' && restaurantSettings.dineInPaymentPolicy === 'post-pay') && (
                            <CustomSelect
                                value={selectedTreasury}
                                onChange={v => setSelectedTreasury(v)}
                                options={treasuries.map(t => ({ value: t.id, label: t.name }))}
                                placeholder={t('اختر الخزنة')}
                            />
                        )}

                        {/* الإجمالي */}
                        <div style={{ background: `${C.primary}08`, border: `1px solid ${C.primary}20`, borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: C.textSecondary }}>
                                <span>{t('المجموع')}</span>
                                <span style={{ fontFamily: OUTFIT }}>{fMoney(subtotal)}</span>
                            </div>
                            {discount > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: C.danger }}>
                                    <span>{t('خصم')}</span>
                                    <span style={{ fontFamily: OUTFIT }}>- {fMoney(discount)}</span>
                                </div>
                            )}
                            {taxAmount > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#f59e0b' }}>
                                    <span>{t('ضريبة')} ({taxRate}%)</span>
                                    <span style={{ fontFamily: OUTFIT }}>+ {fMoney(taxAmount)}</span>
                                </div>
                            )}
                            {serviceAmount > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#3b82f6' }}>
                                    <span>{t('رسوم خدمة')} ({serviceChargeRate}%)</span>
                                    <span style={{ fontFamily: OUTFIT }}>+ {fMoney(serviceAmount)}</span>
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 700, color: C.textPrimary, borderTop: `1px solid ${C.border}`, paddingTop: '6px', marginTop: '2px' }}>
                                <span>{t('الإجمالي')}</span>
                                <span style={{ fontFamily: OUTFIT, color: C.primary }}>{fMoney(total)}</span>
                            </div>
                        </div>

                        {/* طريقة الدفع */}
                        {!(orderType === 'dine-in' && restaurantSettings.dineInPaymentPolicy === 'post-pay') && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                                {(['cash', 'card', 'mixed'] as const).map(pm => (
                                    <button key={pm} onClick={() => setPaymentMethod(pm)}
                                        style={{ height: '36px', borderRadius: '10px', border: `1px solid ${paymentMethod === pm ? C.primary + '50' : C.border}`, background: paymentMethod === pm ? `${C.primary}12` : 'transparent', color: paymentMethod === pm ? C.primary : C.textSecondary, fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', fontFamily: CAIRO }}>
                                        {pm === 'cash' ? '💵 نقدي' : pm === 'card' ? '💳 شبكة' : '🔀 مختلط'}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* رسائل */}
                        {errorMsg && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: C.dangerBg, border: `1px solid ${C.dangerBorder}`, borderRadius: '10px', padding: '10px 12px', color: C.danger, fontSize: '12.5px', fontWeight: 600 }}>
                                <AlertCircle size={14} /> {errorMsg}
                            </div>
                        )}
                        {successMsg && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: `${C.success}10`, border: `1px solid ${C.success}30`, borderRadius: '10px', padding: '10px 12px', color: C.success, fontSize: '12.5px', fontWeight: 600 }}>
                                <Check size={14} /> {successMsg}
                            </div>
                        )}

                        {/* أزرار */}
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {cart.length > 0 && (
                                <button onClick={clearCart} style={{ height: '48px', padding: '0 16px', borderRadius: '12px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textSecondary, fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: CAIRO }}>
                                    {t('مسح')}
                                </button>
                            )}
                            <button onClick={handleInitialSubmit} disabled={submitting || cart.length === 0}
                                style={{ ...BTN_PRIMARY(submitting || cart.length === 0, false), flex: 1, height: '48px', borderRadius: '12px', fontSize: '14px', gap: '8px' }}>
                                {submitting
                                    ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> {t('جاري الحفظ...')}</>
                                    : (orderType === 'dine-in' && restaurantSettings.dineInPaymentPolicy === 'post-pay')
                                        ? <><ChefHat size={16} /> {t('إرسال للمطبخ (دفع لاحق)')} {cartCount > 0 && `(${cartCount})`}</>
                                        : orderType === 'delivery'
                                            ? <><Truck size={16} /> {t('تأكيد وإرسال للتجهيز')} {cartCount > 0 && `(${cartCount})`}</>
                                            : <><Printer size={16} /> {t('حفظ وطباعة')} {cartCount > 0 && `(${cartCount})`} </>
                                }
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Open Orders Modal */}
            {showOpenOrders && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '600px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: C.textPrimary, fontFamily: CAIRO }}>{t('الطلبات المفتوحة')} (طاولات مشغولة / قيد التجهيز)</h2>
                            <button onClick={() => setShowOpenOrders(false)} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer' }}><X size={18} /></button>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {openOrders.length === 0 ? (
                                <div style={{ textAlign: 'center', color: C.textMuted, padding: '40px', fontSize: '14px', fontFamily: CAIRO }}>
                                    <Clock size={40} style={{ opacity: 0.3, marginBottom: '10px' }} />
                                    <br/>لا توجد طلبات مفتوحة
                                </div>
                            ) : openOrders.map(o => (
                                <div key={o.id} style={{ border: `1px solid ${C.border}`, borderRadius: '12px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: C.bg }}>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '14px', color: C.textPrimary, fontFamily: CAIRO }}>
                                            {o.table?.name ? `طاولة: ${o.table.name}` : `طلب #${o.orderNumber}`} ({ORDER_TYPES.find(t=>t.value===o.type)?.label || o.type})
                                        </div>
                                        <div style={{ fontSize: '12px', color: C.textSecondary, marginTop: '4px', display: 'flex', gap: '12px' }}>
                                            <span>الإجمالي: <b style={{ color: C.textPrimary, fontFamily: OUTFIT }}>{fMoney(o.total)}</b></span>
                                            <span>المتبقي: <b style={{ color: C.danger, fontFamily: OUTFIT }}>{fMoney(o.total - o.paidAmount)}</b></span>
                                        </div>
                                    </div>
                                    {o.total - o.paidAmount > 0 ? (
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button onClick={() => printOpenOrderCheck(o)} style={{ padding: '8px 12px', borderRadius: '8px', border: `1px solid ${C.border}`, background: C.card, color: C.textPrimary, fontSize: '12px', fontWeight: 700, borderStyle: 'solid', cursor: 'pointer', fontFamily: CAIRO, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Printer size={14} /> {t('طباعة الشيك')}
                                            </button>
                                            <button onClick={() => setPayingOrder(o)} style={{ padding: '8px 16px', borderRadius: '8px', background: C.primary, color: '#fff', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: CAIRO }}>
                                                {t('محاسبة وإخلاء')}
                                            </button>
                                        </div>
                                    ) : (
                                        <span style={{ fontSize: '12px', color: C.success, fontWeight: 700, background: `${C.success}20`, padding: '4px 8px', borderRadius: '6px' }}>تم الدفع</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Pay Order Modal */}
            {payingOrder && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px', padding: '24px', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: C.textPrimary, fontFamily: CAIRO }}>{t('دفع وإخلاء الطاولة')}</h2>
                            <button onClick={() => setPayingOrder(null)} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer' }}><X size={18} /></button>
                        </div>
                        
                        <div style={{ textAlign: 'center', padding: '16px', background: `${C.primary}10`, borderRadius: '16px', border: `1px dashed ${C.primary}40` }}>
                            <p style={{ margin: '0 0 4px', fontSize: '13px', color: C.textSecondary, fontWeight: 600 }}>{t('المبلغ المطلوب')}</p>
                            <div style={{ fontSize: '28px', fontWeight: 700, color: C.primary, fontFamily: OUTFIT }}>
                                {fMoney(payingOrder.total - payingOrder.paidAmount)}
                            </div>
                        </div>

                        <div>
                            <label style={{ fontSize: '13px', color: C.textSecondary, marginBottom: '8px', display: 'block', fontWeight: 600 }}>{t('اختر الخزينة:')}</label>
                            <CustomSelect
                                value={selectedTreasury}
                                onChange={v => setSelectedTreasury(v)}
                                options={treasuries.map(t => ({ value: t.id, label: t.name }))}
                                placeholder={t('— اختر الخزنة —')}
                            />
                        </div>

                        <div>
                            <label style={{ fontSize: '13px', color: C.textSecondary, marginBottom: '8px', display: 'block', fontWeight: 600 }}>{t('طريقة الدفع:')}</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {['cash', 'card'].map(m => (
                                    <button key={m} onClick={() => setPaymentMethod(m)} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: `1px solid ${paymentMethod === m ? C.primary : C.border}`, background: paymentMethod === m ? `${C.primary}15` : 'transparent', color: paymentMethod === m ? C.primary : C.textSecondary, fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO, transition: 'all 0.2s' }}>
                                        {m === 'cash' ? t('نقدي') : t('شبكة')}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button onClick={() => payOpenOrder(payingOrder)} style={{ padding: '14px', borderRadius: '16px', background: C.primary, color: '#fff', fontSize: '15px', fontWeight: 700, border: 'none', cursor: 'pointer', marginTop: '8px', fontFamily: CAIRO, boxShadow: `0 8px 16px ${C.primary}40`, transition: 'all 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                            {t('تأكيد الدفع والإخلاء')}
                        </button>
                    </div>
                </div>
            )}

            {/* Variants Selection Modal */}
            {activeVariantItem !== null && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: C.textPrimary, fontFamily: CAIRO }}>{t('اختر المقاس / النوع')} - {activeVariantItem.name}</h2>
                            <button onClick={() => setActiveVariantItem(null)} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer' }}><X size={18} /></button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {activeVariantItem.variants.map((v: any) => (
                                <button key={v.id} onClick={() => {
                                    addToCart({
                                        id: v.id,
                                        name: `${activeVariantItem.name} - ${v.name}`,
                                        sellPrice: v.sellPrice,
                                        price: v.sellPrice
                                    });
                                    setActiveVariantItem(null);
                                }}
                                style={{ padding: '16px', borderRadius: '12px', border: `1px solid ${C.border}`, background: C.inputBg, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s', fontFamily: CAIRO }}>
                                    <span style={{ fontSize: '14px', fontWeight: 600, color: C.textPrimary }}>{v.name}</span>
                                    <span style={{ fontSize: '14px', fontWeight: 700, color: C.primary, fontFamily: OUTFIT }}>{fMoney(v.sellPrice)}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Modifiers Modal */}
            {activeModifierCartIndex !== null && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '460px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: C.textPrimary, fontFamily: CAIRO }}>{t('الإضافات والتعديلات')}</h2>
                            <button onClick={() => setActiveModifierCartIndex(null)} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer' }}><X size={18} /></button>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', paddingRight: '10px' }}>
                            {modifiers.map(mod => (
                                <div key={mod.id}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: C.textPrimary, fontFamily: CAIRO }}>{mod.name}</h3>
                                        {mod.required && <span style={{ fontSize: '10px', color: C.danger, background: C.dangerBg, padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>{t('إجباري')}</span>}
                                        {mod.multiSelect && <span style={{ fontSize: '10px', color: C.primary, background: `${C.primary}15`, padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>{t('متعدد')}</span>}
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                        {mod.options?.map((opt: any) => {
                                            const isSelected = tempModifiers[mod.name]?.some((o: any) => o.name === opt.name);
                                            return (
                                                <button key={opt.id} onClick={() => handleModifierToggle(mod.name, opt.name, opt.extraPrice, mod.multiSelect)}
                                                    style={{ padding: '10px 12px', borderRadius: '10px', border: `1px solid ${isSelected ? C.primary : C.border}`, background: isSelected ? `${C.primary}10` : C.bg, color: isSelected ? C.primary : C.textSecondary, fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: CAIRO }}>
                                                    <span>{opt.name}</span>
                                                    {opt.extraPrice > 0 && <span style={{ fontFamily: OUTFIT, fontWeight: 700, fontSize: '11px' }}>+{fMoney(opt.extraPrice)}</span>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '20px', paddingTop: '20px', borderTop: `1px solid ${C.border}` }}>
                            <button onClick={saveModifiers} style={{ ...BTN_PRIMARY(false, false), flex: 1, height: '44px', borderRadius: '12px' }}>{t('تأكيد الإضافات')}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Split Payment Modal */}
            {showSplitPayment && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: C.textPrimary, fontFamily: CAIRO }}>{t('تقسيم الفاتورة (الدفع المتعدد)')}</h2>
                            <button onClick={() => setShowSplitPayment(false)} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer' }}><X size={18} /></button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ background: `${C.primary}10`, padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
                                <p style={{ margin: 0, fontSize: '12px', color: C.textSecondary, fontFamily: CAIRO }}>المبلغ المطلوب</p>
                                <p style={{ margin: '4px 0 0', fontSize: '20px', fontWeight: 700, color: C.primary, fontFamily: OUTFIT }}>{fMoney(total)}</p>
                            </div>
                            
                            <div>
                                <label style={LS}>المبلغ المدفوع (نقدي) 💵</label>
                                <input type="number" min="0" value={splitAmounts.cash || ''} 
                                    onChange={e => setSplitAmounts({ cash: Number(e.target.value), card: total - Number(e.target.value) })}
                                    style={{ ...IS, fontFamily: OUTFIT, fontSize: '16px', fontWeight: 700 }} 
                                />
                            </div>

                            <div>
                                <label style={LS}>المبلغ المدفوع (شبكة) 💳</label>
                                <input type="number" min="0" value={splitAmounts.card || ''} 
                                    onChange={e => setSplitAmounts({ card: Number(e.target.value), cash: total - Number(e.target.value) })}
                                    style={{ ...IS, fontFamily: OUTFIT, fontSize: '16px', fontWeight: 700 }} 
                                />
                            </div>

                            {splitAmounts.cash + splitAmounts.card !== total && (
                                <div style={{ color: C.danger, fontSize: '12px', textAlign: 'center', fontFamily: CAIRO, fontWeight: 600 }}>
                                    مجموع المبالغ لا يساوي إجمالي الفاتورة!
                                </div>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
                            <button onClick={() => setShowSplitPayment(false)} style={{ flex: 1, height: '44px', borderRadius: '12px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textSecondary, fontWeight: 600, cursor: 'pointer', fontFamily: CAIRO }}>إلغاء</button>
                            <button onClick={() => handleSubmit(true)} disabled={submitting || (splitAmounts.cash + splitAmounts.card !== total)} 
                                style={{ ...BTN_PRIMARY(submitting || (splitAmounts.cash + splitAmounts.card !== total), false), flex: 2, height: '44px', borderRadius: '12px' }}>
                                {submitting ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'تأكيد الدفع وطباعة'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Order Type Modal */}
            {showOrderTypeModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: C.textPrimary, fontFamily: CAIRO }}>{t('تحديد نوع الطلب')}</h2>
                            <button onClick={() => setShowOrderTypeModal(false)} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer' }}><X size={18} /></button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '6px' }}>
                            {ORDER_TYPES.map(ot => {
                                const Icon = ot.icon;
                                return (
                                    <button key={ot.value} onClick={() => { setOrderType(ot.value); setSelectedTable(''); }}
                                        style={{ padding: '8px 4px', borderRadius: '10px', border: `1px solid ${orderType === ot.value ? ot.color + '60' : C.border}`, background: orderType === ot.value ? ot.color + '15' : 'transparent', color: orderType === ot.value ? ot.color : C.textMuted, fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', transition: 'all 0.2s', fontFamily: CAIRO }}>
                                        <Icon size={16} />
                                        {ot.label}
                                    </button>
                                );
                            })}
                        </div>
                        {orderType === 'dine-in' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '11px', color: C.textSecondary, fontWeight: 600 }}>{t('الطاولة')}</label>
                                <CustomSelect value={selectedTable} onChange={v => setSelectedTable(v)} options={tables.filter(t => t.status === 'available' || t.id === selectedTable).map(tbl => ({ value: tbl.id, label: `${tbl.name} (${tbl.capacity})` }))} placeholder={t('— اختر الطاولة —')} />
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
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                            <div style={{ padding: '16px', borderRadius: '12px', border: `1px solid ${C.primary}50`, background: `${C.primary}10`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                            }} style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderTop: `1px dashed ${C.border}`, paddingTop: '16px' }}>
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
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                            <input value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} placeholder={t('كود الخصم (كوبون)')} style={{ ...IS, height: '36px', fontSize: '12px', fontFamily: OUTFIT, flex: 1, border: couponError ? `1px solid ${C.dangerBorder}` : appliedCoupon ? `1px solid ${C.primary}50` : `1px solid ${C.border}` }} disabled={!!appliedCoupon || couponLoading} />
                            
                            {!appliedCoupon ? (
                                <button onClick={handleApplyCoupon} disabled={!couponCode || couponLoading || cart.length === 0} style={{ height: '36px', padding: '0 12px', borderRadius: '10px', border: 'none', background: couponCode && cart.length > 0 ? C.primary : `${C.primary}40`, color: '#fff', fontSize: '12px', fontWeight: 700, fontFamily: CAIRO, cursor: couponCode && cart.length > 0 ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: '6px', transition: '0.2s' }}>
                                    {couponLoading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : t('تطبيق')}
                                </button>
                            ) : (
                                <button onClick={() => { setAppliedCoupon(null); setCouponCode(''); setCouponError(''); }} style={{ height: '36px', width: '36px', borderRadius: '10px', border: `1px solid ${C.dangerBorder}`, background: C.dangerBg, color: C.danger, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
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


            {/* Start Shift Modal */}
            {showStartShift && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '400px' }}>
                        <h2 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: 700, color: C.primary, fontFamily: CAIRO, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <User size={20} /> بدء الوردية
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={LS}>الرصيد الافتتاحي للدرج <span style={{ color: C.danger }}>*</span></label>
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', insetInlineEnd: '16px', top: '50%', transform: 'translateY(-50%)', color: C.textMuted, fontWeight: 700, fontSize: '15px' }}>
                                        {cSymbol || 'ر.س'}
                                    </span>
                                    <input type="text" value={shiftOpeningBalance === '' ? '' : shiftOpeningBalance.toString().split('.').map((p, i) => i === 0 ? p.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : p).join('.')} onChange={e => { const raw = e.target.value.replace(/,/g, ''); if (raw === '') setShiftOpeningBalance(''); else if (!isNaN(Number(raw))) setShiftOpeningBalance(raw as any); }} placeholder="0.00" style={{ ...IS, fontFamily: OUTFIT, fontSize: shiftOpeningBalance === '' ? '15px' : '18px', fontWeight: shiftOpeningBalance === '' ? 500 : 700, textAlign: 'center', paddingInlineStart: '45px', paddingInlineEnd: '45px' }} autoFocus />
                                </div>
                            </div>
                            <div>
                                <label style={LS}>ملاحظات (اختياري)</label>
                                <input value={shiftNotes} onChange={e => setShiftNotes(e.target.value)} style={{ ...IS, textAlign: 'center' }} />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                            <button onClick={handleStartShift} disabled={shiftOpeningBalance === '' || shiftLoading} style={{ ...BTN_PRIMARY(shiftOpeningBalance === '' || shiftLoading, false), flex: 2, height: '48px', borderRadius: '12px', fontSize: '15px' }}>
                                {shiftLoading ? <Loader2 size={18} className="animate-spin" /> : 'بداية العمل'}
                            </button>
                            <button onClick={() => setShowStartShift(false)} style={{ flex: 1, height: '48px', borderRadius: '12px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textSecondary, fontSize: '15px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO }}>{t('إلغاء')}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* End Shift Modal */}
            {showEndShift && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '400px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: C.danger, fontFamily: CAIRO, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <LogOut size={20} /> إنهاء الوردية
                            </h2>
                            <button onClick={() => setShowEndShift(false)} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer' }}><X size={18} /></button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={LS}>الرصيد الفعلي الموجود بالدرج <span style={{ color: C.danger }}>*</span></label>
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', insetInlineEnd: '16px', top: '50%', transform: 'translateY(-50%)', color: C.textMuted, fontWeight: 700, fontSize: '15px' }}>
                                        {cSymbol || 'ر.س'}
                                    </span>
                                    <input type="text" value={shiftClosingBalance === '' ? '' : shiftClosingBalance.toString().split('.').map((p, i) => i === 0 ? p.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : p).join('.')} onChange={e => { const raw = e.target.value.replace(/,/g, ''); if (raw === '') setShiftClosingBalance(''); else if (!isNaN(Number(raw))) setShiftClosingBalance(raw as any); }} placeholder="0.00" style={{ ...IS, fontFamily: OUTFIT, fontSize: shiftClosingBalance === '' ? '15px' : '18px', fontWeight: shiftClosingBalance === '' ? 500 : 700, textAlign: 'center', paddingInlineStart: '45px', paddingInlineEnd: '45px' }} autoFocus />
                                </div>
                            </div>
                            <div>
                                <label style={LS}>ملاحظات العجز/الزيادة (اختياري)</label>
                                <input value={shiftNotes} onChange={e => setShiftNotes(e.target.value)} style={{ ...IS, textAlign: 'center' }} />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                            <button onClick={handleEndShift} disabled={shiftClosingBalance === '' || shiftLoading} style={{ ...BTN_PRIMARY(shiftClosingBalance === '' || shiftLoading, false), flex: 2, height: '48px', borderRadius: '12px', fontSize: '15px', background: C.danger, borderColor: C.dangerBorder }}>
                                {shiftLoading ? <Loader2 size={18} className="animate-spin" /> : 'تأكيد الإنهاء وإصدار التقرير'}
                            </button>
                            <button onClick={() => setShowEndShift(false)} style={{ flex: 1, height: '48px', borderRadius: '12px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textSecondary, fontSize: '15px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO }}>{t('إلغاء')}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Branch Modal */}
            {showBranchModal && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', fontFamily: CAIRO }}>
                    <div style={{ background: C.bg, width: '400px', borderRadius: '16px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: C.textPrimary, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Store size={20} color={C.primary} />
                                الفروع
                            </h3>
                            <button onClick={() => setShowBranchModal(false)} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer' }}><X size={20} /></button>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {branches.map(br => (
                                <button key={br.id} onClick={() => { setSelectedBranch(br); setShowBranchModal(false); }} style={{ padding: '16px', borderRadius: '12px', border: `1px solid ${selectedBranch?.id === br.id ? C.primary : C.border}`, background: selectedBranch?.id === br.id ? `${C.primary}10` : C.card, color: selectedBranch?.id === br.id ? C.primary : C.textPrimary, display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', textAlign: 'start' }}>
                                    <Store size={20} />
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '15px' }}>{br.name}</div>
                                        <div style={{ fontSize: '12px', color: C.textSecondary, marginTop: '2px' }}>{br.address || 'بدون عنوان'}</div>
                                    </div>
                                </button>
                            ))}
                            {branches.length === 0 && (
                                <div style={{ padding: '20px', textAlign: 'center', color: C.textSecondary, fontSize: '14px' }}>لا توجد فروع متاحة</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Drawer Operations Modal */}
            {showDrawerModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '400px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: C.textPrimary, fontFamily: CAIRO, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Wallet size={20} color={'#f59e0b'} /> إدارة الدرج النقدية
                            </h2>
                            <button onClick={() => setShowDrawerModal(false)} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer' }}><X size={18} /></button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                            <button onClick={() => setDrawerType('in')} style={{ height: '44px', borderRadius: '12px', border: `1px solid ${drawerType === 'in' ? C.success : C.border}`, background: drawerType === 'in' ? `${C.success}10` : 'transparent', color: drawerType === 'in' ? C.success : C.textSecondary, fontWeight: 700, fontFamily: CAIRO, cursor: 'pointer' }}>➕ إيداع نقدي</button>
                            <button onClick={() => setDrawerType('out')} style={{ height: '44px', borderRadius: '12px', border: `1px solid ${drawerType === 'out' ? C.danger : C.border}`, background: drawerType === 'out' ? `${C.danger}10` : 'transparent', color: drawerType === 'out' ? C.danger : C.textSecondary, fontWeight: 700, fontFamily: CAIRO, cursor: 'pointer' }}>➖ سحب نقدي</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <CustomSelect value={selectedTreasury} onChange={v => setSelectedTreasury(v)} options={treasuries.map(t => ({ value: t.id, label: t.name }))} placeholder={t('اختر الخزنة للتأثير المحاسبي')} />
                            <div>
                                <label style={LS}>المبلغ <span style={{ color: C.danger }}>*</span></label>
                                <input type="number" min="0" value={drawerAmount} onChange={e => setDrawerAmount(e.target.value ? Number(e.target.value) : '')} style={{ ...IS, fontFamily: OUTFIT, fontSize: '18px', fontWeight: 700 }} />
                            </div>
                            <div>
                                <label style={LS}>السبب / ملاحظات <span style={{ color: C.danger }}>*</span></label>
                                <input value={drawerNotes} onChange={e => setDrawerNotes(e.target.value)} style={IS} />
                            </div>
                        </div>
                        <button onClick={handleDrawerOperation} disabled={drawerAmount === '' || !drawerNotes || !selectedTreasury || shiftLoading} style={{ ...BTN_PRIMARY(drawerAmount === '' || !drawerNotes || !selectedTreasury || shiftLoading, false), width: '100%', height: '48px', borderRadius: '12px', marginTop: '24px', fontSize: '15px' }}>
                            {shiftLoading ? <Loader2 size={18} className="animate-spin" /> : 'تنفيذ'}
                        </button>
                    </div>
                </div>
            )}
            
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </>
    );
}
