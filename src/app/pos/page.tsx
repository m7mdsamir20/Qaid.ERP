'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from '@/lib/i18n';
import { THEME, C, CAIRO, OUTFIT, IS, LS, BTN_PRIMARY } from '@/constants/theme';
import { useCurrency } from '@/hooks/useCurrency';
import { useSession } from 'next-auth/react';
import {
    ShoppingCart, Search, Plus, Minus, X, Printer, Check, ChevronRight,
    UtensilsCrossed, Truck, Package, Wifi, Table2, Loader2, RefreshCw,
    AlertCircle, Clock, ChevronsRight, LogOut, User, Power, Home, Phone, MapPin, Receipt, ChefHat, Wallet, Store, Tag, Utensils, CreditCard, Banknote, Monitor, CheckCircle2, XCircle, Shield, Barcode, ShoppingBag, History, RotateCcw, Eye
} from 'lucide-react';
import CustomSelect from '@/components/CustomSelect';
import { generateZatcaTLV } from '@/lib/printInvoices';

const t = (s: string) => s;

const ORDER_TYPES = [
    { value: 'dine-in',  label: t('صالة'),    icon: Table2,   color: '#6366f1' },
    { value: 'takeaway', label: t('تيك أواي'), icon: Package,  color: '#f59e0b' },
    { value: 'delivery', label: t('توصيل'),    icon: Truck,    color: '#10b981' },
    { value: 'online',   label: t('أونلاين'),  icon: Wifi,     color: '#3b82f6' },
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
    const { fMoneyJSX, symbol: cSymbol } = useCurrency();
    const { data: session, status } = useSession();

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
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [splitAmounts, setSplitAmounts] = useState({ cash: 0, card: 0 });
    const [showOrderTypeModal, setShowOrderTypeModal] = useState(false);
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [showOffersModal, setShowOffersModal] = useState(false);
    const [customerSearchQuery, setCustomerSearchQuery] = useState('');
    const [searchedCustomerObj, setSearchedCustomerObj] = useState<any>(null);
    const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
    const [showTerminalLoading, setShowTerminalLoading] = useState(false);
    const [terminalStatusMsg, setTerminalStatusMsg] = useState('');

    // Open Orders Modal
    const [showOpenOrders, setShowOpenOrders] = useState(false);
    const [openOrders, setOpenOrders] = useState<any[]>([]);
    const [suspendedOrders, setSuspendedOrders] = useState<any[]>([]);
    const [payingOrder, setPayingOrder] = useState<any>(null);
    const [cashPaid, setCashPaid] = useState('');

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
    const [deliveryFloor, setDeliveryFloor] = useState('');
    const [deliveryApartment, setDeliveryApartment] = useState('');
    const [deliveryFee, setDeliveryFee] = useState(0);
    const [orderNotes, setOrderNotes] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [discount, setDiscount] = useState(0);
    const [hasTax, setHasTax] = useState(false);
    const [isTaxInclusive, setIsTaxInclusive] = useState(false);
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

    // Today's Orders (retail)
    const [showTodayOrders, setShowTodayOrders] = useState(false);
    const [todayOrders, setTodayOrders] = useState<any[]>([]);
    const [todayOrdersLoading, setTodayOrdersLoading] = useState(false);
    const [selectedOrderDetail, setSelectedOrderDetail] = useState<any>(null);
    // Return flow
    const [returnOrder, setReturnOrder] = useState<any>(null);
    const [returnTreasury, setReturnTreasury] = useState('');
    const [returnLoading, setReturnLoading] = useState(false);

    const searchRef = useRef<HTMLInputElement>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [catRes, itemRes, tableRes, modRes, driverRes, custRes, treasRes, settingsRes, shiftRes, branchRes, ordersRes] = await Promise.all([
                fetch('/api/categories'),
                fetch('/api/items?all=true'),
                fetch('/api/restaurant/tables'),
                fetch('/api/restaurant/modifiers'),
                fetch('/api/drivers'),
                fetch('/api/customers'),
                fetch('/api/treasuries'),
                fetch('/api/settings'), fetch('/api/restaurant/shifts?status=open'), fetch('/api/branches'),
                fetch('/api/restaurant/orders?limit=200')
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
            const bType = (session?.user as any)?.businessType?.toUpperCase();
            if (bType === 'RETAIL') {
                setOrderType('takeaway');
            } else if (settings.restaurantSettings?.defaultOrderType) {
                setOrderType(settings.restaurantSettings.defaultOrderType);
            }
            const brArr = Array.isArray(branchesData) ? branchesData : [];
            setBranches(brArr);
            if (brArr.length > 0) setSelectedBranch(brArr[0]);
            if (Array.isArray(shiftsResData) && shiftsResData.length > 0) setCurrentShift(shiftsResData[0]); else setCurrentShift(null);
            
            const ordersResData = await ordersRes.json();
            if (Array.isArray(ordersResData)) {
                setOpenOrders(ordersResData.filter((o: any) => (o.type === 'dine-in' || o.type === 'delivery') && o.status !== 'cancelled' && (o.total - o.paidAmount > 0)));
            }
            
            if (settings.company?.taxSettings) {
                try {
                    const ts = typeof settings.company.taxSettings === 'string' ? JSON.parse(settings.company.taxSettings) : settings.company.taxSettings;
                    setHasTax(ts.enabled ?? false);
                    if (ts.enabled) {
                        setTaxRate(ts.rate ?? 0);
                        setIsTaxInclusive(ts.isInclusive ?? false);
                    }
                    setHasServiceCharge(ts.hasServiceCharge ?? false);
                    if (ts.hasServiceCharge) setServiceChargeRate(ts.serviceChargeRate ?? 0);
                } catch(e) {}
            }
        } finally {
            setLoading(false);
        }
    }, [session]);

    // Variants Modal
    const [activeVariantItem, setActiveVariantItem] = useState<any>(null);

    const userRole = (session?.user as any)?.role?.toLowerCase();
    const isSuperAdmin = userRole === 'super-admin';
    const isAdmin = userRole === 'admin';
    const businessType = (session?.user as any)?.businessType?.toUpperCase();
    const isRestaurants = businessType === 'RESTAURANTS';
    const isRetail = businessType === 'RETAIL';
    const userPerms = (session?.user as any)?.permissions || {};
    const hasPosPerm = userPerms['/pos']?.view || userRole === 'cashier' || isSuperAdmin || isAdmin;

    const allOrderTypes: any[] = [
        ...ORDER_TYPES.filter(ot => !isRetail || ot.value !== 'dine-in').map(ot => {
            if (isRetail && ot.value === 'takeaway') {
                return { ...ot, label: t('بيع مباشر'), icon: ShoppingBag };
            }
            return ot;
        }),
        ...(restaurantSettings?.deliveryApps?.length > 0 ? [{
            value: 'delivery_app',
            label: t('تطبيقات'),
            icon: Store,
            color: '#ec4899',
            isApp: true
        }] : [])
    ];

    const getCurrentOrderTypeLabel = () => {
        if (orderType.startsWith('app_')) {
            const appId = orderType.replace('app_', '');
            const app = restaurantSettings?.deliveryApps?.find((a: any) => a.id === appId);
            return app ? app.name : t('تطبيق توصيل');
        }
        return allOrderTypes.find(o => o.value === orderType)?.label || t('نوع الطلب');
    };

    useEffect(() => { 
        if (status === 'authenticated' && (isRestaurants || isRetail) && hasPosPerm) {
            load(); 
        }
    }, [load, status, isRestaurants, isRetail, hasPosPerm]);

    useEffect(() => {
        if (isRetail) {
            try {
                const saved = localStorage.getItem('suspended_orders');
                if (saved) setSuspendedOrders(JSON.parse(saved));
            } catch (e) { }
        }
    }, [isRetail]);


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

    // --- Global Barcode Scanner Listener ---
    const barcodeBuffer = useRef('');
    const barcodeTimeout = useRef<NodeJS.Timeout | null>(null);
    const latestItems = useRef(items);
    useEffect(() => { latestItems.current = items; }, [items]);
    const latestHandleItemClick = useRef(handleItemClick);
    useEffect(() => { latestHandleItemClick.current = handleItemClick; }, [handleItemClick]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                if (e.target.type !== 'text' && e.target.type !== 'search') return;
            }

            if (e.key === 'Enter') {
                if (barcodeBuffer.current.length >= 3) {
                    const code = barcodeBuffer.current;
                    const foundItem = latestItems.current.find((i: any) => i.barcode === code || i.code === code);
                    if (foundItem) {
                        latestHandleItemClick.current(foundItem);
                        setSearch('');
                    } else {
                        setErrorMsg(t('لم يتم العثور على صنف بالباركود: ') + code);
                        setTimeout(() => setErrorMsg(''), 3000);
                    }
                }
                barcodeBuffer.current = '';
                if (barcodeTimeout.current) clearTimeout(barcodeTimeout.current);
                return;
            }

            if (e.key.length === 1) {
                barcodeBuffer.current += e.key;
                if (barcodeTimeout.current) clearTimeout(barcodeTimeout.current);
                barcodeTimeout.current = setTimeout(() => {
                    barcodeBuffer.current = ''; 
                }, 100);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            if (barcodeTimeout.current) clearTimeout(barcodeTimeout.current);
        };
    }, []);
    // ---------------------------------------

    const getAppMarkupPercent = useCallback(() => {
        if (!orderType.startsWith('app_')) return 0;
        const appId = orderType.replace('app_', '');
        const app = (restaurantSettings?.deliveryApps || []).find((a: any) => a.id === appId);
        return app ? (Number(app.markupPercent) || 0) : 0;
    }, [orderType, restaurantSettings?.deliveryApps]);

    const currentMarkup = getAppMarkupPercent();
    
    useEffect(() => {
        setCart(prev => {
            const markup = getAppMarkupPercent();
            let changed = false;
            const newCart = prev.map(cItem => {
                const originalItem = items.find(i => i.id === cItem.itemId);
                if (!originalItem) return cItem;
                const basePrice = originalItem.sellPrice ?? originalItem.price ?? 0;
                const newPrice = basePrice * (1 + markup / 100);
                
                const newMods: any = {};
                if (cItem.modifiers) {
                    Object.keys(cItem.modifiers).forEach(modName => {
                        newMods[modName] = cItem.modifiers[modName].map((o: any) => {
                            const originalMod = modifiers.find(m => m.name === modName);
                            const originalOpt = originalMod?.options?.find((opt: any) => opt.name === o.name);
                            const baseExtra = originalOpt ? (originalOpt.extraPrice || 0) : 0;
                            return { ...o, price: baseExtra * (1 + markup / 100) };
                        });
                    });
                }
                
                if (cItem.unitPrice !== newPrice) changed = true;
                
                return {
                    ...cItem,
                    unitPrice: newPrice,
                    modifiers: cItem.modifiers ? newMods : cItem.modifiers
                };
            });
            return changed ? newCart : prev;
        });
    }, [getAppMarkupPercent, items, modifiers]);

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
                unitPrice: (item.sellPrice ?? item.price ?? 0) * (1 + currentMarkup / 100),
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
        setDeliveryFloor('');
        setDeliveryApartment('');
        setDeliveryFee(0);
    };

    const suspendOrder = () => {
        if (cart.length === 0) return;
        const suspSubtotal = cart.reduce((s, c) => s + (c.unitPrice * c.quantity), 0);
        const suspTotal = suspSubtotal - discount;
        const newOrder = {
            id: `susp_${Date.now()}`,
            orderNumber: `${t('معلق')} ${Math.floor(Math.random() * 1000)}`,
            createdAt: new Date().toISOString(),
            cart,
            subtotal: suspSubtotal,
            discount,
            taxAmount: 0,
            total: suspTotal,
            type: 'retail_suspended',
            status: 'suspended'
        };
        const updated = [...suspendedOrders, newOrder];
        setSuspendedOrders(updated);
        localStorage.setItem('suspended_orders', JSON.stringify(updated));
        clearCart();
        setSuccessMsg(t('تم تعليق الفاتورة بنجاح'));
        setTimeout(() => setSuccessMsg(''), 3000);
    };

    const restoreSuspendedOrder = (order: any) => {
        setCart(order.cart);
        setDiscount(order.discount || 0);
        const updated = suspendedOrders.filter(o => o.id !== order.id);
        setSuspendedOrders(updated);
        localStorage.setItem('suspended_orders', JSON.stringify(updated));
        setShowOpenOrders(false);
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
    
    let taxAmount = 0;
    let netTotalForTax = baseForTax;
    
    if (hasTax && taxRate > 0) {
        if (isTaxInclusive) {
            taxAmount = Math.round(baseForTax - (baseForTax / (1 + (taxRate / 100))));
            netTotalForTax = baseForTax - taxAmount;
        } else {
            taxAmount = Math.round(baseForTax * taxRate / 100);
        }
    }
    
    const serviceAmount = hasServiceCharge && orderType === 'dine-in' && serviceChargeRate > 0 ? Math.round(baseForTax * serviceChargeRate / 100) : 0;
    const df = orderType === 'delivery' ? (Number(deliveryFee) || 0) : 0;
    const total = Math.max(0, netTotalForTax + taxAmount + serviceAmount + df);
    const cartCount = cart.reduce((s, c) => s + c.quantity, 0);

    // Broadcast cart updates to Customer Display
    useEffect(() => {
        if (!restaurantSettings.enableCustomerDisplay) return;
        try {
            const bc = new BroadcastChannel('qaid-customer-display');
            bc.postMessage({
                type: 'CART_UPDATE',
                payload: {
                    cart,
                    subtotal,
                    discount,
                    couponDiscount,
                    taxAmount,
                    serviceAmount,
                    deliveryFee: df,
                    total,
                    hasTax,
                    taxRate,
                    isTaxInclusive
                }
            });
            bc.close();
        } catch(e) {}
    }, [cart, subtotal, discount, couponDiscount, taxAmount, serviceAmount, total, hasTax, taxRate, isTaxInclusive, restaurantSettings.enableCustomerDisplay]);

    const handleApplyCoupon = async () => {
        if (!couponCode) return;
        setCouponLoading(true);
        setCouponError('');
        try {
            const res = await fetch(`/api/coupons/validate?code=${encodeURIComponent(couponCode)}&subtotal=${subtotal}`);
            const data = await res.json();
            if (data.valid) {
                setAppliedCoupon({ ...data.coupon, discount: data.discount });
                setSuccessMsg(t('تم تطبيق الكوبون بنجاح'));
                setTimeout(() => setSuccessMsg(''), 3000);
            } else {
                setCouponError(data.error || t('كود غير صحيح'));
            }
        } catch (e) {
            setCouponError(t('خطأ في التحقق من الكوبون'));
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
        const formatMoney = (m: number) => Number(m).toFixed(2);
        const isInclusive = orderData.isTaxInclusive === true;
        const subtotal = isInclusive
            ? finalTotal - (orderData.serviceAmount || 0) - (orderData.deliveryFee || 0) + finalDiscount
            : finalTotal - (orderData.taxAmount || 0) - (orderData.serviceAmount || 0) - (orderData.deliveryFee || 0) + finalDiscount;
        const paidAmount = orderData.paidAmount ?? finalTotal;
        const change = paidAmount > finalTotal ? paidAmount - finalTotal : 0;
        
        const typeLabel = isRetail
            ? (orderData.type === 'delivery' ? t('توصيل') : orderData.type === 'online' ? t('أونلاين') : t('بيع مباشر'))
            : (orderData.type === 'dine-in' ? t('صالة') : 
               orderData.type === 'takeaway' ? t('تيك أواي') : 
               orderData.type === 'delivery' ? t('توصيل') : t('أونلاين'));

        // Use receiptFooter from restaurant settings, fall back to generic message
        const rs = typeof orderData.company?.restaurantSettings === 'string'
            ? JSON.parse(orderData.company.restaurantSettings)
            : (orderData.company?.restaurantSettings || {});
        const customFooter = rs?.receiptFooter || '';
        const footerHtml = customFooter
            ? customFooter.split('\n').map((line: string) => `<p>${line}</p>`).join('')
            : `<p>${t('شكراً لزيارتكم')} ❤️</p>`;

        const html = `
            <!DOCTYPE html>
            <html lang="ar" dir="rtl">
            <head>
                <meta charset="UTF-8">
                <title>Receipt #${orderData.orderNumber}</title>
                <style>
                    @page { margin: 0; }
                    body {
                        font-family: 'Courier New', Courier, monospace;
                        width: 280px;
                        margin: 0 auto;
                        padding: 10px 0;
                        font-size: 13px;
                        color: #000;
                        background: #fff;
                    }
                    .text-center { text-align: center; }
                    .dashed-line { border-top: 1px dashed #000; margin: 10px 0; }
                    .flex-between { display: flex; justify-content: space-between; align-items: flex-start; }
                    .header h2 { margin: 5px 0; font-size: 18px; letter-spacing: 1px; display: flex; align-items: center; justify-content: center; gap: 8px; }
                    .header img { max-width: 40px; max-height: 40px; object-fit: contain; }
                    .header p { margin: 2px 0; font-size: 12px; }
                    .meta-table { width: 100%; border-collapse: collapse; font-size: 13px; margin: 5px 0; }
                    .meta-table td { padding: 3px 0; vertical-align: top; }
                    .meta-table td:first-child { font-weight: bold; width: 95px; white-space: nowrap; }
                    .item { margin-top: 8px; }
                    .item-main { font-weight: bold; }
                    .modifier { font-size: 12px; padding-right: 20px; color: #333; margin-top: 2px; }
                    .totals { margin-top: 10px; }
                    .totals .flex-between { margin: 4px 0; }
                    .grand-total { font-weight: bold; font-size: 15px; margin: 6px 0; }
                    .footer { text-align: center; margin-top: 20px; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="header text-center">
                    ${orderData.company?.name ? `<h2 style="margin: 0 0 6px; font-size: 18px; font-weight: bold; letter-spacing: 1px;">${orderData.company.name}</h2>` : ''}
                    ${orderData.company?.logo ? `
                    <div style="text-align: center; margin: 0; padding: 0;">
                        <img src="${orderData.company.logo}" alt="Logo" style="max-width: 140px; max-height: 140px; object-fit: contain; display: block; margin: 0 auto;"/>
                    </div>
                    ` : ''}
                    ${orderData.company?.phone ? `<p style="margin: 0 0 2px; font-weight: bold;">${orderData.company.phone}</p>` : ''}
                    ${[orderData.company?.addressCity, orderData.company?.addressRegion, orderData.company?.addressDistrict, orderData.company?.addressStreet].filter(Boolean).join(t('، ')) ? `<p style="margin: 2px 0;">${[orderData.company?.addressCity, orderData.company?.addressRegion, orderData.company?.addressDistrict, orderData.company?.addressStreet].filter(Boolean).join(t('، '))}</p>` : ''}
                    ${orderData.company?.taxNumber ? `<p style="margin: 2px 0;">${t('الرقم الضريبي')}: ${orderData.company.taxNumber}</p>` : ''}
                </div>
                
                <div class="dashed-line"></div>
                
                <table class="meta-table">
                    <tr><td>${isRetail ? t('رقم الفاتورة') : t('رقم الطلب')}</td><td>: ${orderData.orderNumber ? orderData.orderNumber.toString().padStart(4, '0') : '----'}</td></tr>
                    ${isRetail ? `
                    <tr><td>${t('نوع الفاتورة')}</td><td>: ${typeLabel}</td></tr>
                    ` : `
                    ${orderData.type === 'dine-in' ? `
                    <tr><td>${t('رقم الطاولة')}</td><td>: ${orderData.table?.name || '-'}</td></tr>
                    ${orderData.guests ? `<tr><td>${t('عدد الأفراد')}</td><td>: ${orderData.guests}</td></tr>` : ''}
                    ` : ''}
                    ${orderData.type === 'takeaway' ? `
                    <tr><td>${t('رقم الانتظار')}</td><td>: ${orderData.queueNumber || (orderData.orderNumber ? orderData.orderNumber.toString().padStart(4, '0') : '----')}</td></tr>
                    ` : ''}
                    `}
                    <tr><td>${t('التاريخ')}</td><td>: ${new Date(orderData.createdAt || Date.now()).toLocaleString('en-GB', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit', hour12:true }).replace('am', t('ص')).replace('pm', t('م')).replace('AM', t('ص')).replace('PM', t('م'))}</td></tr>
                    ${orderData.type !== 'delivery' ? `<tr><td>${isRetail ? t('البائع') : t('الكاشير')}</td><td>: ${orderData.shift?.user?.name || orderData.cashierName || '-'}</td></tr>` : ''}
                </table>
                ${orderData.type === 'delivery' && (orderData.deliveryName || orderData.customer) ? `
                <div class="dashed-line"></div>
                <table class="meta-table">
                    <tr><td>${t('اسم العميل')}</td><td>: ${orderData.deliveryName || orderData.customer?.name || '-'}</td></tr>
                    <tr><td>${t('رقم الهاتف')}</td><td>: ${orderData.deliveryPhone || orderData.customer?.phone || '-'}</td></tr>
                    ${orderData.deliveryAddress || orderData.customer?.address ? `<tr><td>${t('العنوان')}</td><td>: ${orderData.deliveryAddress || orderData.customer?.address}</td></tr>` : ''}
                    ${orderData.driver ? `<tr><td>${t('المندوب')}</td><td>: ${orderData.driver.name}</td></tr>` : ''}
                </table>
                ` : ''}

                <div class="dashed-line"></div>

                <div class="items">
                    ${lines.map((l: any) => {
                        let mods = '';
                        if (l.modifiers) {
                            try {
                                const parsed = typeof l.modifiers === 'string' ? JSON.parse(l.modifiers) : l.modifiers;
                                mods = Object.values(parsed).flat().map((m: any) => `
                                    <div class="flex-between modifier">
                                        <span>+ ${m.name}</span>
                                        <span>${formatMoney(m.price || 0)}</span>
                                    </div>
                                `).join('');
                            } catch(e) {}
                        }
                        const parsedTotal = Number(l.total);
                        const rowTotal = !isNaN(parsedTotal) && parsedTotal !== 0 ? parsedTotal : (Number(l.unitPrice) * l.quantity);
                        return `
                            <div class="item">
                                <div class="flex-between item-main">
                                    <span style="flex: 1; padding-left: 10px;">${l.itemName || t('صنف')} x${l.quantity}</span>
                                    <span>${formatMoney(rowTotal)}</span>
                                </div>
                                ${mods}
                            </div>
                        `;
                    }).join('')}
                </div>

                <div class="dashed-line"></div>

                <div class="totals">
                    <div class="flex-between">
                        <span>${t('الإجمالي الفرعي')}</span>
                        <span>${formatMoney(subtotal)}</span>
                    </div>
                    ${finalDiscount > 0 ? `
                    <div class="flex-between">
                        <span>${t('خصم')}</span>
                        <span>${formatMoney(finalDiscount)}</span>
                    </div>` : ''}
                    ${(() => {
                        if (orderData.serviceAmount > 0) {
                            let rate = '';
                            try {
                                const rs = typeof orderData.company?.restaurantSettings === 'string' ? JSON.parse(orderData.company.restaurantSettings) : orderData.company?.restaurantSettings;
                                if (rs && rs.serviceCharge && rs.serviceCharge.rate) rate = ` (${rs.serviceCharge.rate}%)`;
                            } catch(e) {}
                            return `
                            <div class="flex-between">
                                <span>${t('رسوم الخدمة')}${rate}</span>
                                <span>${formatMoney(orderData.serviceAmount)}</span>
                            </div>`;
                        }
                        return '';
                    })()}
                    ${(() => {
                        if (orderData.taxAmount > 0) {
                            let rate = '';
                            try {
                                const ts = typeof orderData.company?.taxSettings === 'string' ? JSON.parse(orderData.company.taxSettings) : orderData.company?.taxSettings;
                                if (ts && ts.rate) rate = ` (${ts.rate}%)`;
                            } catch(e) {}
                            return `
                            <div class="flex-between">
                                <span>${t('ضريبة القيمة المضافة')}${rate}</span>
                                <span>${formatMoney(orderData.taxAmount)}</span>
                            </div>`;
                        }
                        return '';
                    })()}
                    ${orderData.type === 'delivery' && orderData.deliveryFee > 0 ? `
                    <div class="flex-between">
                        <span>${t('رسوم التوصيل')}</span>
                        <span>${formatMoney(orderData.deliveryFee)}</span>
                    </div>` : ''}
                </div>

                <div class="dashed-line"></div>

                <div class="totals">
                    <div class="flex-between grand-total">
                        <span>${t('الإجمالي')}</span>
                        <span>${formatMoney(finalTotal)}</span>
                    </div>
                    ${(() => {
                        const paidAmount = Number(orderData.paidAmount || 0);
                        const methodStr = { 'cash': t('نقدي'), 'card': t('شبكة'), 'mixed': t('مختلط'), 'bank': t('تحويل بنكي') }[orderData.paymentMethod as string] || orderData.paymentMethod || t('نقدي');
                        if (orderData.type === 'delivery') {
                            if (paidAmount === 0) {
                                return `
                                <div class="flex-between" style="font-size: 14px; margin-top: 6px;">
                                    <span>${t('طريقة الدفع')}</span>
                                    <span>${t('الدفع عند الاستلام')}</span>
                                </div>`;
                            }
                            return `
                                <div class="flex-between" style="font-size: 14px; margin-top: 6px;">
                                    <span>${t('المدفوع')} (${methodStr})</span>
                                    <span>${formatMoney(paidAmount)}</span>
                                </div>
                                <div class="flex-between" style="font-size: 14px; margin-top: 4px;">
                                    <span>${t('المتبقي')}</span>
                                    <span>${formatMoney(Math.max(0, finalTotal - paidAmount))}</span>
                                </div>`;
                        } else {
                            if (paidAmount > 0) {
                                return `
                                <div class="flex-between" style="font-size: 14px; margin-top: 6px;">
                                    <span>${t('المدفوع')} (${methodStr})</span>
                                    <span>${formatMoney(paidAmount)}</span>
                                </div>
                                <div class="flex-between" style="font-size: 14px; margin-top: 4px;">
                                    <span>${t('المتبقي')}</span>
                                    <span>${formatMoney(Math.max(0, finalTotal - paidAmount))}</span>
                                </div>`;
                            }
                            return '';
                        }
                    })()}
                </div>

                <div class="dashed-line"></div>

                <div class="footer">
                    ${footerHtml}
                </div>

                ${orderData.company?.countryCode === 'SA' ? `
                <div style="text-align: center; margin-top: 15px;">
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(generateZatcaTLV(
                        orderData.company.name || '',
                        orderData.company.taxNumber || '000000000000000',
                        new Date(orderData.createdAt || Date.now()).toISOString(),
                        finalTotal.toFixed(2),
                        orderData.taxAmount ? Number(orderData.taxAmount).toFixed(2) : '0.00'
                    ))}" style="width: 120px; height: 120px; display: inline-block;" alt="ZATCA QR" />
                </div>
                ` : ''}
            </body>
            </html>
        `;

        if (typeof window !== 'undefined' && (window as any).electronAPI) {
            (window as any).electronAPI.silentPrint({
                html: html,
                printerName: restaurantSettings.receiptPrinterName,
                copies: 1
            });
            return;
        }

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
                itemName: item?.name || t('صنف غير معروف'),
                quantity: l.quantity,
                unitPrice: l.unitPrice,
                total: l.total,
                modifiers: parsedMods ? { main: parsedMods } : undefined
            };
        }) || [];
        printReceipt({ ...order, type: order.type }, linesForPrint, order.total, order.discount);
    };

    const printKitchenTicket = (orderData: any, lines: CartItem[]) => {
        const title = orderData.type === 'dine-in' ? (orderData.table?.name || t('صالة')) : orderData.type === 'takeaway' ? t('تيك أواي') : orderData.type === 'delivery' ? t('توصيل') : t('أونلاين');
        const html = `
            <!DOCTYPE html>
            <html lang="ar" dir="rtl">
            <head>
                <meta charset="UTF-8">
                <title>${t('بون المطبخ')}</title>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
                    body { font-family: 'Cairo', sans-serif; margin: 0; padding: 10px; width: 80mm; background: #fff; color: #000; }
                    .header { text-align: center; margin-bottom: 15px; border-bottom: 2px dashed #000; padding-bottom: 10px; }
                    .title { font-size: 24px; font-weight: 900; margin: 0 0 5px 0; }
                    .order-num { font-size: 20px; font-weight: bold; margin: 0; }
                    .table-name { font-size: 22px; font-weight: 900; margin: 5px 0; padding: 5px; border: 2px solid #000; display: inline-block; }
                    .date { font-size: 14px; font-weight: bold; margin-top: 5px; }
                    
                    .items { margin-top: 15px; }
                    .item { font-size: 18px; font-weight: 900; margin-bottom: 12px; border-bottom: 1px dashed #ccc; padding-bottom: 8px; }
                    .item-header { display: flex; justify-content: space-between; align-items: flex-start; }
                    .qty { min-width: 35px; font-family: sans-serif; }
                    .name { flex: 1; }
                    
                    .modifier { font-size: 14px; font-weight: bold; color: #333; margin-top: 4px; padding-right: 15px; }
                    .notes { font-size: 14px; font-weight: bold; color: #000; background: #eee; padding: 4px; margin-top: 4px; border-radius: 4px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1 class="title">${t('بون تحضير')}</h1>
                    <p class="order-num">${t('رقم الطلب')}: ${orderData.orderNumber?.toString().padStart(4, '0') || '----'}</p>
                    <div class="table-name">${title}</div>
                    <p class="date">${new Date().toLocaleString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
                </div>
                
                <div class="items">
                    ${lines.map((l: any) => {
                        let modsHtml = '';
                        if (l.modifiers) {
                            try {
                                const parsed = typeof l.modifiers === 'string' ? JSON.parse(l.modifiers) : l.modifiers;
                                modsHtml = Object.values(parsed).flat().map((m: any) => `
                                    <div class="modifier">+ ${m.name}</div>
                                `).join('');
                            } catch(e) {}
                        }
                        return `
                        <div class="item">
                            <div class="item-header">
                                <span class="qty">${l.quantity}x</span>
                                <span class="name">${l.item.name}</span>
                            </div>
                            ${modsHtml}
                            ${l.notes ? `<div class="notes">${t('ملاحظة')}: ${l.notes}</div>` : ''}
                        </div>
                        `;
                    }).join('')}
                </div>
            </body>
            </html>
        `;

        if (typeof window !== 'undefined' && (window as any).electronAPI) {
            (window as any).electronAPI.silentPrint({
                html: html,
                printerName: restaurantSettings.kitchenPrinterName,
                copies: restaurantSettings.kitchenCopyCount || 1
            });
            return;
        }

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

    const fetchOpenOrders = useCallback(async () => {
        try {
            const res = await fetch('/api/restaurant/orders?limit=200');
            if (res.ok) {
                const data = await res.json();
                setOpenOrders(data.filter((o: any) => 
                    o.status !== 'cancelled' && 
                    (o.status === 'pending' || (o.total - o.paidAmount > 0))
                ));
            }
        } catch {}
    }, []);

    useEffect(() => {
        fetchOpenOrders();
        const interval = setInterval(fetchOpenOrders, 15000);
        return () => clearInterval(interval);
    }, [fetchOpenOrders]);

    const fetchTodayOrders = useCallback(async () => {
        setTodayOrdersLoading(true);
        try {
            const res = await fetch('/api/restaurant/orders?limit=500');
            if (res.ok) {
                const data = await res.json();
                const all = Array.isArray(data) ? data : [];
                const today = new Date(); today.setHours(0, 0, 0, 0);
                setTodayOrders(all.filter((o: any) => new Date(o.createdAt) >= today));
            }
        } catch {} finally { setTodayOrdersLoading(false); }
    }, []);

    const handleReturnConfirm = async () => {
        if (!returnOrder || !returnTreasury) return;
        setReturnLoading(true);
        setErrorMsg('');
        try {
            const res = await fetch('/api/restaurant/orders', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: returnOrder.id,
                    action: 'refund',
                    treasuryId: returnTreasury,
                    refundAmount: returnOrder.total,
                })
            });
            const data = await res.json();
            if (res.ok) {
                setReturnOrder(null);
                setReturnTreasury('');
                setSuccessMsg(t('✅ تم إرجاع الطلب وعكس جميع الحركات بنجاح'));
                setTimeout(() => setSuccessMsg(''), 4000);
                fetchTodayOrders();
            } else {
                setErrorMsg(data.error || t('فشل في إرجاع الطلب'));
                setTimeout(() => setErrorMsg(''), 4000);
            }
        } catch {
            setErrorMsg(t('حدث خطأ أثناء الإرجاع'));
        } finally {
            setReturnLoading(false);
        }
    };

    const acceptPendingOrder = async (orderId: string) => {
        try {
            const res = await fetch('/api/restaurant/orders', {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: orderId, status: 'preparing' }),
            });
            if (res.ok) fetchOpenOrders();
        } catch (e) { console.error(e); }
    };

    const rejectPendingOrder = async (orderId: string) => {
        try {
            const res = await fetch('/api/restaurant/orders', {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: orderId, status: 'cancelled' }),
            });
            if (res.ok) fetchOpenOrders();
        } catch (e) { console.error(e); }
    };

    const payOpenOrder = async (order: any) => {
        if (!selectedTreasury) {
            alert(t('يجب اختيار الخزنة أولاً!'));
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
                setSuccessMsg(t('تم محاسبة الطاولة وإخلائها بنجاح'));
                setPayingOrder(null);
                setShowOpenOrders(false);
                load();
                setTimeout(() => setSuccessMsg(''), 3000);
            } else {
                const d = await res.json();
                alert(d.error || t('فشل في المحاسبة'));
            }
        } catch(e) {}
    };

    const handleInitialSubmit = () => {
        if (cart.length === 0) { setErrorMsg(t('السلة فارغة')); return; }
        
        const isPostPay = !isRetail && ((orderType === 'dine-in' && restaurantSettings.dineInPaymentPolicy === 'post-pay') || orderType === 'delivery');
        
        if (!isRetail && orderType === 'dine-in' && restaurantSettings.requireTableForDineIn !== false && !selectedTable) { setErrorMsg(t('اختر الطاولة أولاً')); return; }
        
        if (!isPostPay) {
            setShowPaymentModal(true);
            if (paymentMethod === 'mixed') {
                setSplitAmounts({ cash: total / 2, card: total / 2 });
            }
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
            finalNotes += `\n[${t('تقسيم الفاتورة')}: ${t('نقدي')} ${splitAmounts.cash} | ${t('شبكة')} ${splitAmounts.card}]`;
        }

        if (paymentMethod === 'card' && restaurantSettings?.paymentTerminalIp) {
            try {
                setShowTerminalLoading(true);
                setTerminalStatusMsg(t('جاري الاتصال بماكينة الدفع (ECR). يرجى تمرير البطاقة...'));
                
                if (typeof window !== 'undefined' && (window as any).electronAPI && (window as any).electronAPI.startPayment) {
                    const result = await (window as any).electronAPI.startPayment({
                        amount: total,
                        ip: restaurantSettings.paymentTerminalIp,
                        port: parseInt(restaurantSettings.paymentTerminalPort || '5000')
                    });
                    
                    if (!result.success) {
                        setErrorMsg(result.message || t('فشلت عملية الدفع بالبطاقة'));
                        setSubmitting(false);
                        setShowTerminalLoading(false);
                        return;
                    }
                    
                    finalNotes += `\n[${t('رقم العملية')} (ECR): ${result.transactionId}]`;
                } else {
                    console.warn('Electron API not found, simulating success...');
                    await new Promise(r => setTimeout(r, 1500));
                }
            } catch (err: any) {
                setErrorMsg(t('تعذر الاتصال بالماكينة'));
                setSubmitting(false);
                setShowTerminalLoading(false);
                return;
            } finally {
                setShowTerminalLoading(false);
            }
        }

        try {
            const paymentsArray: any[] = [];
            if (isSplit) {
                if (splitAmounts.cash > 0) paymentsArray.push({ amount: splitAmounts.cash, paymentMethod: 'cash', treasuryId: selectedTreasury || null });
                if (splitAmounts.card > 0) paymentsArray.push({ amount: splitAmounts.card, paymentMethod: 'card', treasuryId: selectedTreasury || null });
            } else if (total > 0) {
                paymentsArray.push({ amount: total, paymentMethod, treasuryId: selectedTreasury || null });
            }

            const finalDeliveryAddress = [
                deliveryAddress.trim(),
                deliveryFloor.trim() ? `${t('طابق')}: ${deliveryFloor.trim()}` : '',
                deliveryApartment.trim() ? `${t('شقة')}: ${deliveryApartment.trim()}` : ''
            ].filter(Boolean).join(' - ');

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
                    deliveryAddress: finalDeliveryAddress,
                    notes: finalNotes.trim(),
                    subtotal,
                    discount,
                    couponCode: appliedCoupon?.code || null,
                    couponDiscount: appliedCoupon?.discount || 0,
                    isTaxInclusive,
                    taxAmount,
                    serviceAmount,
                    deliveryFee: df,
                    total,
                    paymentMethod,
                    paidAmount: ((orderType === 'dine-in' && restaurantSettings.dineInPaymentPolicy === 'post-pay') || orderType === 'delivery') ? 0 : total,
                    payments: paymentsArray,
                    lines: cart.map(c => ({ ...c })),
                }),
            });
            if (!res.ok) { const d = await res.json(); setErrorMsg(d.error || t('فشل')); setSubmitting(false); return; }
            
            const isPostPay = (orderType === 'dine-in' && restaurantSettings.dineInPaymentPolicy === 'post-pay') || orderType === 'delivery';
            
            const savedOrder = await res.json();
            
            if (!isPostPay || orderType === 'delivery') {
                // Print Receipt only if paid (pre-pay or other types) AND always for delivery
                printReceipt({ ...savedOrder, cashierName: (session?.user as any)?.name }, cart, total, discount);
            }
            
            if (!isRetail && restaurantSettings.autoSendToKitchen !== false) {
                setTimeout(() => {
                    printKitchenTicket(savedOrder, cart);
                }, 1000); // Wait 1s after receipt to avoid print dialog overlap
            }
 
            if (restaurantSettings.enableCustomerDisplay) {
                try {
                    const bc = new BroadcastChannel('qaid-customer-display');
                    bc.postMessage({ type: 'ORDER_SUCCESS', payload: { orderNumber: savedOrder.orderNumber } });
                    bc.close();
                } catch (e) {}
            }
 
            setSuccessMsg(isRetail ? t('✅ تم حفظ وطباعة الفاتورة بنجاح') : (isPostPay ? t('✅ تم إرسال الطلب للمطبخ (طاولة مفتوحة)') : t('✅ تم حفظ الطلب وإرساله للمطبخ')));
            clearCart();
            setDeliveryFloor('');
            setDeliveryApartment('');
            setShowPaymentModal(false);
            load();
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch { setErrorMsg(t('حدث خطأ')); }
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
                setSuccessMsg(t('تم بدء الوردية بنجاح'));
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
                setSuccessMsg(t('تم إنهاء الوردية بنجاح. الفارق: ') + fMoneyJSX(data.difference));
                setTimeout(() => setSuccessMsg(''), 5000);
            }
        } catch {} finally { setShiftLoading(false); }
    };
 
    const handleDrawerOperation = async () => {
        if (!drawerAmount || !currentShift || !selectedTreasury) {
            setErrorMsg(t('تأكد من اختيار الخزنة وإدخال المبلغ'));
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
                setSuccessMsg(drawerType === 'in' ? t('تم إضافة المبلغ للدرج') : t('تم سحب المبلغ من الدرج'));
                setTimeout(() => setSuccessMsg(''), 3000);
            }
        } catch {} finally { setShiftLoading(false); }
    };

    if (status === 'loading') {
        return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f172a', color: C.textPrimary }}><Loader2 size={48} style={{ animation: 'spin 1s linear infinite' }} /></div>;
    }

    if (status === 'unauthenticated' || (!isRestaurants && !isRetail) || !hasPosPerm) {
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
    }

    return (
        <>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', fontFamily: CAIRO, background: C.bg }}>

                {/* --- Locked Overlay --- */}
                {!isRetail && !currentShift && !loading && (
                    <div style={{ position: 'absolute', inset: 0, zIndex: 50, background: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button onClick={() => window.location.href='/'} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '12px 24px', borderRadius: '10px', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontFamily: CAIRO }}>
                                    <LogOut size={18} /> {t('عودة للنظام')}
                                </button>
                                <button onClick={() => setShowStartShift(true)} style={{ background: C.primary, color: 'white', border: 'none', padding: '12px 32px', borderRadius: '10px', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.3)', fontFamily: CAIRO }}>
                                    <Power size={18} /> {t('ابدأ العمل')}
                                </button>
                            </div>
                            <p style={{ marginTop: '16px', color: 'white', fontWeight: 700, fontSize: '16px', fontFamily: CAIRO }}>{t('لم يتم بدء العمل بعد')}</p>
                            <p style={{ marginTop: '4px', color: '#e5e7eb', fontSize: '13px', fontFamily: CAIRO }}>{t('قم بالبدء لرؤية المنتجات أو إنشاء طلب')}</p>
                        </div>
                    </div>
                )}
                
                {/* ══ الجانب الأيسر: المنيو ══ */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderInlineEnd: `1px solid ${C.border}` }}>

                    {/* Header المنيو (New Design) */}
                    <div style={{ padding: '10px 20px', background: C.card, borderBottom: `1px solid ${C.border}`, display: 'flex', gap: '12px', alignItems: 'center' }}>
                        
                        {/* Exit System */}
                        <button onClick={() => window.location.href='/'} style={{ width: 40, height: 40, borderRadius: '10px', border: 'none', background: `${C.danger}15`, color: C.danger, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={t('الخروج للنظام')}>
                            <LogOut size={18} />
                        </button>

                        {/* Customer Display Button */}
                        {restaurantSettings.enableCustomerDisplay && (
                            <button onClick={() => window.open('/pos/customer', '_blank', 'width=800,height=600')} style={{ width: 40, height: 40, borderRadius: '10px', border: 'none', background: `${C.primary}15`, color: C.primary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={t('فتح شاشة العميل')}>
                                <Monitor size={18} />
                            </button>
                        )}

                        <div style={{ flex: 1 }}></div>

                        {/* Barcode Scanner Toggle/Status */}
                        <button onClick={() => {
                            setShowSearchInput(true);
                            setTimeout(() => {
                                const el = document.getElementById('pos-search-input');
                                if (el) el.focus();
                            }, 100);
                        }} style={{ width: 40, height: 40, borderRadius: '10px', border: `1px solid ${C.border}`, background: C.card, color: C.textPrimary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={t('الباركود يعمل تلقائياً')}>
                            <Barcode size={18} color={C.teal} />
                        </button>

                        {/* Search */}
                        {showSearchInput ? (
                            <div className="mobile-full" style={{ position: 'relative', width: '250px', display: 'flex', alignItems: 'center' }}>
                                <Search size={16} style={{ position: 'absolute', insetInlineStart: '12px', color: C.textMuted }} />
                                <input id="pos-search-input" autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder={t('ابحث عن صنف...')} style={{ ...IS, paddingInlineStart: '36px', paddingInlineEnd: '36px', height: '40px', fontSize: '13px', width: '100%' }} />
                                <button onClick={() => { setSearch(''); setShowSearchInput(false); }} style={{ position: 'absolute', insetInlineEnd: '8px', background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer' }}><X size={16} /></button>
                            </div>
                        ) : (
                            <button onClick={() => setShowSearchInput(true)} style={{ width: 40, height: 40, borderRadius: '10px', border: `1px solid ${C.border}`, background: C.card, color: C.textPrimary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={t('بحث')}>
                                <Search size={16} />
                            </button>
                        )}

                        {/* Today's Orders (retail) / Drawer (restaurant) */}
                        {isRetail ? (
                            <button onClick={() => { setShowTodayOrders(true); fetchTodayOrders(); }} style={{ width: 40, height: 40, borderRadius: '10px', border: `1px solid ${C.border}`, background: C.card, color: C.textPrimary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={t('سجل الطلبات')}>
                                <History size={16} color={'#10b981'} />
                            </button>
                        ) : (
                            <button onClick={() => setShowDrawerModal(true)} style={{ width: 40, height: 40, borderRadius: '10px', border: `1px solid ${C.border}`, background: C.card, color: C.textPrimary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={t('درج الكاشير')}>
                                <Wallet size={16} color={'#f59e0b'} />
                            </button>
                        )}
                        
                        {/* Branch Selector Icon */}
                        <button onClick={() => setShowBranchModal(true)} style={{ width: 40, height: 40, borderRadius: '10px', border: `1px solid ${C.border}`, background: C.card, color: C.textPrimary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={t('الفرع')}>
                            <Store size={16} color={C.primary} />
                        </button>

                        {/* End Shift */}
                        {!isRetail && currentShift && (
                            <button onClick={() => { if (cart.length > 0) setShowUnpaidWarning(true); else setShowEndShift(true); }} title={t('نهاية العمل')} style={{ width: 40, height: 40, borderRadius: '10px', border: `1px solid ${C.primary}40`, background: `${C.primary}15`, color: C.primary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Power size={18} />
                            </button>
                        )}
                    </div>

                    {/* التصنيفات */}
                    <div style={{ display: 'flex', gap: '8px', padding: '12px 20px', overflowX: 'auto', flexShrink: 0 }}>
                        <button onClick={() => setSelectedCategory('')}
                            style={{ padding: '6px 16px', borderRadius: '20px', border: `1px solid ${!selectedCategory ? C.primary : C.border}`, background: !selectedCategory ? `${C.primary}15` : 'transparent', color: !selectedCategory ? C.primary : C.textSecondary, fontSize: '12.5px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s', fontFamily: CAIRO }}>
                            {t('الكل')}
                        </button>
                        {categories.filter(cat => items.some(item => item.categoryId === cat.id && item.isPosEligible !== false && item.type !== 'raw' && !item.parentId)).map(cat => (
                            <button key={cat.id} onClick={() => setSelectedCategory(cat.id)}
                                style={{ padding: '6px 16px', borderRadius: '20px', border: `1px solid ${selectedCategory === cat.id ? C.primary : C.border}`, background: selectedCategory === cat.id ? `${C.primary}15` : 'transparent', color: selectedCategory === cat.id ? C.primary : C.textSecondary, fontSize: '12.5px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s', fontFamily: CAIRO }}>
                                {cat.name}
                            </button>
                        ))}
                    </div>

                    {/* الأصناف */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '6px 20px 16px' }}>
                        {loading ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: C.textMuted }}>
                                <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
                            </div>
                        ) : filteredItems.length === 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', color: C.textMuted, gap: '12px' }}>
                                {isRetail ? <Package size={40} style={{ opacity: 0.3 }} /> : <UtensilsCrossed size={40} style={{ opacity: 0.3 }} />}
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
                                                {item.imageUrl ? (
                                                    <img src={item.imageUrl} onError={(e) => { e.currentTarget.style.display = 'none'; if(e.currentTarget.parentElement) { const fallback = document.createElement('span'); fallback.innerText = isRetail ? '📦' : '🍽️'; e.currentTarget.parentElement.appendChild(fallback); } }} style={{ width: '100%', height: 80, borderRadius: '12px', objectFit: 'cover' }} />
                                                ) : (isRetail ? '📦' : '🍽️')}
                                            </div>
                                            <p style={{ margin: '0 0 6px', fontSize: '12.5px', fontWeight: 700, color: C.textPrimary, lineHeight: 1.3 }}>{item.name}</p>
                                            <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: C.primary, fontFamily: OUTFIT }}>{fMoneyJSX((item.sellPrice ?? item.price ?? 0) * (1 + currentMarkup / 100))}</p>
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
                    <div style={{ padding: '10px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', minHeight: '60px', boxSizing: 'border-box' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, fontFamily: CAIRO }}>{t('الطلب الحالي')}</h3>
                            <button onClick={() => { if(!isRetail) fetchOpenOrders(); setShowOpenOrders(true); }} style={{ position: 'relative', padding: '6px 10px', borderRadius: '8px', background: `${C.primary}15`, color: C.primary, fontSize: '12px', border: 'none', cursor: 'pointer', fontWeight: 700, fontFamily: CAIRO, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Clock size={16} color={C.primary} />
                                {isRetail ? t('الطلبات المعلقة') : t('الطلبات المفتوحة')}
                                {(isRetail ? suspendedOrders.length : openOrders.length) > 0 && (
                                    <span style={{ position: 'absolute', top: '-6px', insetInlineEnd: '-6px', background: C.danger, color: '#fff', fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '10px', border: `2px solid ${C.card}` }}>
                                        {isRetail ? suspendedOrders.length : openOrders.length}
                                    </span>
                                )}
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
                                                <p style={{ margin: 0, fontSize: '12px', color: C.primary, fontFamily: OUTFIT }}>{fMoneyJSX(item.unitPrice)} × {item.quantity} = {fMoneyJSX(calculateCartItemTotal(item))}</p>
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
                            {!isRetail && (
                                <button onClick={() => setShowOrderTypeModal(true)} style={{ flex: 1, height: '40px', borderRadius: '10px', border: `1px solid ${C.border}`, background: C.card, color: C.textPrimary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }} title={t('نوع الطلب')}>
                                    <Utensils size={16} /> <span style={{ fontSize: '12px', fontWeight: 600, fontFamily: CAIRO }}>{getCurrentOrderTypeLabel()}</span>
                                </button>
                            )}
                            <button onClick={() => setShowCustomerModal(true)} style={{ flex: 1, height: '40px', borderRadius: '10px', border: `1px solid ${selectedCustomer ? C.primary : C.border}`, background: selectedCustomer ? `${C.primary}10` : C.card, color: selectedCustomer ? C.primary : C.textPrimary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }} title={t('العميل')}>
                                <User size={16} /> <span style={{ fontSize: '12px', fontWeight: 600, fontFamily: CAIRO }}>{selectedCustomer ? customers.find(c => c.id === selectedCustomer)?.name || t('العميل') : t('إضافة عميل')}</span>
                            </button>
                            <button onClick={() => setShowOffersModal(true)} style={{ flex: 1, height: '40px', borderRadius: '10px', border: `1px solid ${(discount > 0 || appliedCoupon) ? C.primary : C.border}`, background: (discount > 0 || appliedCoupon) ? `${C.primary}10` : C.card, color: (discount > 0 || appliedCoupon) ? C.primary : C.textPrimary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }} title={t('العروض')}>
                                <Tag size={16} /> <span style={{ fontSize: '12px', fontWeight: 600, fontFamily: CAIRO }}>{t('العروض')}</span>
                            </button>
                        </div>

                        

                        {/* الإجمالي */}
                        <div style={{ background: `${C.primary}08`, border: `1px solid ${C.primary}20`, borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: C.textSecondary }}>
                                <span>{t('المجموع')}</span>
                                <span style={{ fontFamily: OUTFIT }}>{fMoneyJSX(subtotal)}</span>
                            </div>
                            {discount > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: C.danger }}>
                                    <span>{t('خصم')}</span>
                                    <span style={{ fontFamily: OUTFIT }}>- {fMoneyJSX(discount)}</span>
                                </div>
                            )}
                            {taxAmount > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#f59e0b' }}>
                                    <span>{t('ضريبة')} ({taxRate}%) {isTaxInclusive && `(${t('شامل')})`}</span>
                                    <span style={{ fontFamily: OUTFIT }}>{!isTaxInclusive && '+ '}{fMoneyJSX(taxAmount)}</span>
                                </div>
                            )}
                            {serviceAmount > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#3b82f6' }}>
                                    <span>{t('رسوم خدمة')} ({serviceChargeRate}%)</span>
                                    <span style={{ fontFamily: OUTFIT }}>+ {fMoneyJSX(serviceAmount)}</span>
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 700, color: C.textPrimary, borderTop: `1px solid ${C.border}`, paddingTop: '6px', marginTop: '2px' }}>
                                <span>{t('الإجمالي')}</span>
                                <span style={{ fontFamily: OUTFIT, color: C.primary }}>{fMoneyJSX(total)}</span>
                            </div>
                        </div>

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
                            {isRetail && cart.length > 0 && (
                                <button onClick={suspendOrder} style={{ height: '48px', padding: '0 16px', borderRadius: '12px', border: `1px solid ${C.warning}`, background: `${C.warning}15`, color: C.warning, fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: CAIRO, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Clock size={16} /> {t('تعليق')}
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
                            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: C.textPrimary, fontFamily: CAIRO }}>
                                {isRetail ? t('الفواتير المعلقة') : t('الطلبات المفتوحة (طاولات مشغولة / قيد التجهيز)')}
                            </h2>
                            <button onClick={() => setShowOpenOrders(false)} style={{ width: '30px', height: '30px', borderRadius: '6px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }} onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'; }} onMouseLeave={e => { e.currentTarget.style.color = C.textMuted; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = C.border; }}><X size={16} /></button>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {(isRetail ? suspendedOrders : openOrders).length === 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: C.textMuted, padding: '40px', minHeight: '200px', fontSize: '15px', fontFamily: CAIRO }}>
                                    <Clock size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                                    <span style={{ fontWeight: 600 }}>{isRetail ? t('لا توجد فواتير معلقة') : t('لا توجد طلبات مفتوحة')}</span>
                                </div>
                            ) : (isRetail ? suspendedOrders : openOrders).map(o => (
                                <div key={o.id} style={{ border: `1px solid ${o.status === 'pending' ? '#f59e0b50' : C.border}`, borderRadius: '12px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: o.status === 'pending' ? 'rgba(245, 158, 11, 0.05)' : C.bg, flexShrink: 0 }}>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '14px', color: C.textPrimary, fontFamily: CAIRO, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {o.status === 'suspended' && isRetail
                                                ? `${t('فاتورة معلقة')} — ${o.cart?.length || 0} ${t('صنف')}`
                                                : o.table?.name
                                                    ? `${t('طاولة')}: ${o.table.name}`
                                                    : `${t('طلب')} #${o.orderNumber}${o.type && o.type !== 'retail_suspended' ? ` (${allOrderTypes.find(tp => tp.value === o.type)?.label || ''})` : ''}`
                                            }
                                            {o.status === 'pending' && <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '20px', background: '#f59e0b20', color: '#f59e0b', border: '1px solid #f59e0b40', animation: 'pulse 2s infinite' }}>{t('طلب خارجي (بانتظار الموافقة)')}</span>}
                                        </div>
                                        <div style={{ fontSize: '12px', color: C.textSecondary, marginTop: '4px', display: 'flex', gap: '12px' }}>
                                            <span>{t('الإجمالي')}: <b style={{ color: C.textPrimary, fontFamily: OUTFIT }}>{fMoneyJSX(o.total)}</b></span>
                                            {o.status !== 'suspended' && <span>{t('المتبقي')}: <b style={{ color: C.danger, fontFamily: OUTFIT }}>{fMoneyJSX(o.total - (o.paidAmount || 0))}</b></span>}
                                            {o.status === 'suspended' && <span style={{ color: C.textMuted }}>{new Date(o.createdAt).toLocaleTimeString('ar-EG')}</span>}
                                        </div>
                                    </div>
                                    {o.status === 'suspended' ? (
                                        <button onClick={() => restoreSuspendedOrder(o)} style={{ padding: '8px 16px', borderRadius: '8px', background: C.primary, color: '#fff', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: CAIRO }}>
                                            {t('استرجاع للسلة')}
                                        </button>
                                    ) : o.status === 'pending' ? (
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button onClick={() => acceptPendingOrder(o.id)} style={{ padding: '8px 16px', borderRadius: '8px', background: '#10b981', color: '#fff', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: CAIRO, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <CheckCircle2 size={14} /> {t('قبول الطلب')}
                                            </button>
                                            <button onClick={() => rejectPendingOrder(o.id)} style={{ padding: '8px 12px', borderRadius: '8px', background: '#ef4444', color: '#fff', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: CAIRO, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <XCircle size={14} /> {t('رفض')}
                                            </button>
                                        </div>
                                    ) : o.total - o.paidAmount > 0 ? (
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button onClick={() => printOpenOrderCheck(o)} style={{ padding: '8px 12px', borderRadius: '8px', border: `1px solid ${C.border}`, background: C.card, color: C.textPrimary, fontSize: '12px', fontWeight: 700, borderStyle: 'solid', cursor: 'pointer', fontFamily: CAIRO, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Printer size={14} /> {t('طباعة الشيك')}
                                            </button>
                                            <button onClick={() => setPayingOrder(o)} style={{ padding: '8px 16px', borderRadius: '8px', background: C.primary, color: '#fff', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: CAIRO }}>
                                                {t('محاسبة وإخلاء')}
                                            </button>
                                        </div>
                                    ) : (
                                        <span style={{ fontSize: '12px', color: C.success, fontWeight: 700, background: `${C.success}20`, padding: '4px 8px', borderRadius: '6px' }}>{t('تم الدفع')}</span>
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
                            <button onClick={() => { setPayingOrder(null); setCashPaid(''); }} style={{ width: '30px', height: '30px', borderRadius: '6px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }} onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'; }} onMouseLeave={e => { e.currentTarget.style.color = C.textMuted; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = C.border; }}><X size={16} /></button>
                        </div>
                        
                        <div style={{ textAlign: 'center', padding: '16px', background: `${C.primary}10`, borderRadius: '16px', border: `1px dashed ${C.primary}40` }}>
                            <p style={{ margin: '0 0 4px', fontSize: '13px', color: C.textSecondary, fontWeight: 600 }}>{t('المبلغ المطلوب')}</p>
                            <div style={{ fontSize: '28px', fontWeight: 700, color: C.primary, fontFamily: OUTFIT }}>
                                {fMoneyJSX(payingOrder.total - payingOrder.paidAmount)}
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

                        {/* المبلغ المدفوع */}
                        {paymentMethod === 'cash' && (() => {
                            const requiredAmount = payingOrder.total - payingOrder.paidAmount;
                            const paidVal = parseFloat(cashPaid) || 0;
                            const change = paidVal - requiredAmount;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label style={{ fontSize: '13px', color: C.textSecondary, fontWeight: 600 }}>{t('المبلغ المدفوع:')}</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={cashPaid}
                                        onChange={e => setCashPaid(e.target.value)}
                                        placeholder={String(requiredAmount)}
                                        style={{ ...IS, height: '44px', fontSize: '18px', fontWeight: 700, textAlign: 'center', fontFamily: OUTFIT }}
                                        onFocus={e => e.target.select()}
                                    />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '12px', background: change >= 0 && paidVal > 0 ? `${C.success || '#22c55e'}10` : `${C.danger}10`, border: `1px solid ${change >= 0 && paidVal > 0 ? (C.success || '#22c55e') + '30' : C.danger + '30'}` }}>
                                        <span style={{ fontSize: '13px', fontWeight: 600, color: C.textSecondary, fontFamily: CAIRO }}>{t('الباقي:')}</span>
                                        <span style={{ fontSize: '18px', fontWeight: 700, color: change >= 0 ? (C.success || '#22c55e') : C.danger, fontFamily: OUTFIT }}>{paidVal > 0 ? (change >= 0 ? change.toFixed(2) : '0') : '—'}</span>
                                    </div>
                                </div>
                            );
                        })()}

                        <button onClick={() => payOpenOrder(payingOrder)} style={{ padding: '14px', borderRadius: '16px', background: C.primary, color: '#fff', fontSize: '15px', fontWeight: 700, border: 'none', cursor: 'pointer', marginTop: '8px', fontFamily: CAIRO, boxShadow: `0 8px 16px ${C.primary}40`, transition: 'all 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                            {t('دفع')}
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
                            <button onClick={() => setActiveVariantItem(null)} style={{ width: '30px', height: '30px', borderRadius: '6px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }} onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'; }} onMouseLeave={e => { e.currentTarget.style.color = C.textMuted; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = C.border; }}><X size={16} /></button>
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
                                    <span style={{ fontSize: '14px', fontWeight: 700, color: C.primary, fontFamily: OUTFIT }}>{fMoneyJSX((v.sellPrice || 0) * (1 + currentMarkup / 100))}</span>
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
                            <button onClick={() => setActiveModifierCartIndex(null)} style={{ width: '30px', height: '30px', borderRadius: '6px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }} onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'; }} onMouseLeave={e => { e.currentTarget.style.color = C.textMuted; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = C.border; }}><X size={16} /></button>
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
                                                <button key={opt.id} onClick={() => handleModifierToggle(mod.name, opt.name, opt.extraPrice * (1 + currentMarkup / 100), mod.multiSelect)}
                                                    style={{ padding: '10px 12px', borderRadius: '10px', border: `1px solid ${isSelected ? C.primary : C.border}`, background: isSelected ? `${C.primary}10` : C.bg, color: isSelected ? C.primary : C.textSecondary, fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: CAIRO }}>
                                                    <span>{opt.name}</span>
                                                    {opt.extraPrice > 0 && <span style={{ fontFamily: OUTFIT, fontWeight: 700, fontSize: '11px' }}>+{fMoneyJSX(opt.extraPrice * (1 + currentMarkup / 100))}</span>}
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

            {/* Payment Modal */}
            {showPaymentModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: C.textPrimary, fontFamily: CAIRO }}>{t('الدفع وتأكيد الطلب')}</h2>
                            <button onClick={() => setShowPaymentModal(false)} style={{ width: '30px', height: '30px', borderRadius: '6px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }} onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'; }} onMouseLeave={e => { e.currentTarget.style.color = C.textMuted; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = C.border; }}><X size={16} /></button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ background: `${C.primary}10`, padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
                                <p style={{ margin: 0, fontSize: '12px', color: C.textSecondary, fontFamily: CAIRO }}>{t('المبلغ المطلوب')}</p>
                                <p style={{ margin: '4px 0 0', fontSize: '20px', fontWeight: 700, color: C.primary, fontFamily: OUTFIT }}>{fMoneyJSX(total)}</p>
                            </div>

                            <div>
                                <label style={{ fontSize: '13px', color: C.textSecondary, marginBottom: '8px', display: 'block', fontWeight: 600 }}>{t('طريقة الدفع:')}</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {['cash', 'card', 'mixed'].map(m => (
                                        <button key={m} onClick={() => {
                                            setPaymentMethod(m);
                                            if (m === 'mixed') setSplitAmounts({ cash: total / 2, card: total / 2 });
                                        }} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: `1px solid ${paymentMethod === m ? C.primary : C.border}`, background: paymentMethod === m ? `${C.primary}15` : 'transparent', color: paymentMethod === m ? C.primary : C.textSecondary, fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO, transition: 'all 0.2s' }}>
                                            {m === 'cash' ? t('نقدي') : m === 'card' ? t('شبكة') : t('متعدد')}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            {paymentMethod === 'mixed' && (
                                <>
                                    <div>
                                        <label style={LS}>{t('المبلغ المدفوع (نقدي)')}</label>
                                        <input type="number" min="0" value={splitAmounts.cash || ''} 
                                            onChange={e => setSplitAmounts({ cash: Number(e.target.value), card: total - Number(e.target.value) })}
                                            style={{ ...IS, fontFamily: OUTFIT, fontSize: '16px', fontWeight: 700 }} 
                                        />
                                    </div>
                                    <div>
                                        <label style={LS}>{t('المبلغ المدفوع (شبكة)')}</label>
                                        <input type="number" min="0" value={splitAmounts.card || ''} 
                                            onChange={e => setSplitAmounts({ card: Number(e.target.value), cash: total - Number(e.target.value) })}
                                            style={{ ...IS, fontFamily: OUTFIT, fontSize: '16px', fontWeight: 700 }} 
                                        />
                                    </div>
                                    {splitAmounts.cash + splitAmounts.card !== total && (
                                        <div style={{ color: C.danger, fontSize: '12px', textAlign: 'center', fontFamily: CAIRO, fontWeight: 600 }}>
                                            {t('مجموع المبالغ لا يساوي إجمالي الفاتورة!')}
                                        </div>
                                    )}
                                </>
                            )}

                            <div>
                                <label style={{ fontSize: '13px', color: C.textSecondary, marginBottom: '8px', display: 'block', fontWeight: 600 }}>{t('اختر الخزينة:')}</label>
                                <CustomSelect
                                    value={selectedTreasury}
                                    onChange={v => setSelectedTreasury(v)}
                                    options={treasuries.map((t: any) => ({ value: t.id, label: t.name }))}
                                    placeholder={t('— اختر الخزنة —')}
                                />
                            </div>

                        </div>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
                            <button onClick={() => setShowPaymentModal(false)} style={{ flex: 1, height: '44px', borderRadius: '12px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textSecondary, fontWeight: 600, cursor: 'pointer', fontFamily: CAIRO }}>{t('إلغاء')}</button>
                            <button onClick={() => {
                                setShowPaymentModal(false);
                                handleSubmit(paymentMethod === 'mixed');
                            }} disabled={submitting || !selectedTreasury || (paymentMethod === 'mixed' && splitAmounts.cash + splitAmounts.card !== total)} 
                                style={{ ...BTN_PRIMARY(submitting || !selectedTreasury || (paymentMethod === 'mixed' && splitAmounts.cash + splitAmounts.card !== total), false), flex: 2, height: '44px', borderRadius: '12px' }}>
                                {submitting ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : t('تأكيد الدفع وطباعة')}
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
                            <button onClick={() => setShowOrderTypeModal(false)} style={{ width: '30px', height: '30px', borderRadius: '6px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }} onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'; }} onMouseLeave={e => { e.currentTarget.style.color = C.textMuted; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = C.border; }}><X size={16} /></button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '6px' }}>
                            {allOrderTypes.map((ot: any) => {
                                const Icon = ot.icon;
                                const pendingCount = ot.value === 'online' ? openOrders.filter(o => o.status === 'pending').length : 0;
                                const isSelected = ot.value === 'delivery_app' ? orderType.startsWith('app_') : orderType === ot.value;
                                return (
                                    <button key={ot.value} onClick={() => { 
                                            if (ot.value === 'delivery_app') {
                                                const firstApp = restaurantSettings?.deliveryApps?.[0];
                                                if (firstApp) setOrderType('app_' + firstApp.id);
                                            } else {
                                                setOrderType(ot.value); 
                                            }
                                            setSelectedTable(''); 
                                        }}
                                        style={{ position: 'relative', padding: '8px 4px', borderRadius: '10px', border: `1px solid ${isSelected ? ot.color + '60' : C.border}`, background: isSelected ? ot.color + '15' : 'transparent', color: isSelected ? ot.color : C.textMuted, fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', transition: 'all 0.2s', fontFamily: CAIRO }}>
                                        <Icon size={16} />
                                        {ot.label}
                                        {pendingCount > 0 && (
                                            <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#ef4444', color: 'white', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold', border: '2px solid #fff', animation: 'pulse 2s infinite' }}>
                                                {pendingCount}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        {orderType.startsWith('app_') && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '11px', color: C.textSecondary, fontWeight: 600 }}>{t('التطبيق')}</label>
                                <CustomSelect 
                                    value={orderType.replace('app_', '')} 
                                    onChange={v => setOrderType('app_' + v)} 
                                    options={(restaurantSettings?.deliveryApps || []).map((app: any) => ({ value: app.id, label: app.name }))} 
                                    placeholder={t('— اختر التطبيق —')} 
                                />
                            </div>
                        )}
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
                                        <input value={deliveryPhone} onChange={e => {
                                            const val = e.target.value;
                                            setDeliveryPhone(val);
                                            const cust = customers.find(c => c.phone === val);
                                            if (cust) {
                                                if (!deliveryName) setDeliveryName(cust.name);
                                                const custAddress = [cust.addressCity, cust.addressRegion, cust.addressDistrict, cust.addressStreet].filter(Boolean).join(t('، '));
                                                if (!deliveryAddress && custAddress) {
                                                    let addr = custAddress;
                                                    let floor = '';
                                                    let apt = '';
                                                    const floorMatch = custAddress.match(new RegExp(" - " + t('طابق') + ": (.*?)(?: - |$)"));
                                                    if (floorMatch) {
                                                        floor = floorMatch[1];
                                                        addr = addr.replace(floorMatch[0], '');
                                                    }
                                                    const aptMatch = custAddress.match(new RegExp(" - " + t('شقة') + ": (.*?)(?: - |$)"));
                                                    if (aptMatch) {
                                                        apt = aptMatch[1];
                                                        addr = addr.replace(aptMatch[0], '');
                                                    }
                                                    setDeliveryAddress(addr.trim());
                                                    setDeliveryFloor(floor.trim());
                                                    setDeliveryApartment(apt.trim());
                                                }
                                            }
                                        }} placeholder={t('رقم الهاتف')} style={{ ...IS, height: '36px', fontSize: '12px', paddingInlineStart: '30px', fontFamily: OUTFIT }} />
                                    </div>
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <MapPin size={13} style={{ position: 'absolute', insetInlineStart: '10px', top: '50%', transform: 'translateY(-50%)', color: C.textMuted }} />
                                    <input value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} placeholder={t('عنوان التوصيل')} style={{ ...IS, height: '36px', fontSize: '12px', paddingInlineStart: '30px' }} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                                    <input value={deliveryFloor} onChange={e => setDeliveryFloor(e.target.value)} placeholder={t('رقم الطابق')} style={{ ...IS, height: '36px', fontSize: '12px', paddingInlineStart: '10px', fontFamily: OUTFIT }} />
                                    <input value={deliveryApartment} onChange={e => setDeliveryApartment(e.target.value)} placeholder={t('رقم الشقة')} style={{ ...IS, height: '36px', fontSize: '12px', paddingInlineStart: '10px', fontFamily: OUTFIT }} />
                                </div>
                                <div style={{ position: 'relative', marginTop: '6px' }}>
                                    <span style={{ position: 'absolute', insetInlineStart: '10px', top: '50%', transform: 'translateY(-50%)', color: C.textMuted, fontSize: '12px', fontFamily: CAIRO, fontWeight: 600 }}>{t('رسوم التوصيل:')}</span>
                                    <input type="number" min="0" value={deliveryFee || ''} onChange={e => setDeliveryFee(Number(e.target.value))} placeholder="0.00" style={{ ...IS, height: '36px', fontSize: '12px', paddingInlineStart: '90px', fontFamily: OUTFIT, fontWeight: 700, color: C.primary }} />
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
                            <button onClick={() => { setShowCustomerModal(false); setShowNewCustomerForm(false); setSearchedCustomerObj(null); setCustomerSearchQuery(''); }} style={{ width: '30px', height: '30px', borderRadius: '6px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }} onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'; }} onMouseLeave={e => { e.currentTarget.style.color = C.textMuted; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = C.border; }}><X size={16} /></button>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input value={customerSearchQuery} onChange={e => setCustomerSearchQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { const found = customers.find((c: any) => (c.phone && c.phone === customerSearchQuery) || c.name.includes(customerSearchQuery)); if (found) { setSearchedCustomerObj(found); setShowNewCustomerForm(false); } else { setSearchedCustomerObj(null); setShowNewCustomerForm(true); } } }} placeholder={t('رقم الهاتف أو الاسم')} style={{ ...IS, height: '42px', flex: 1 }} autoFocus />
                            <button onClick={() => {
                                const found = customers.find((c: any) => (c.phone && c.phone === customerSearchQuery) || c.name.includes(customerSearchQuery));
                                if (found) { setSearchedCustomerObj(found); setShowNewCustomerForm(false); }
                                else { setSearchedCustomerObj(null); setShowNewCustomerForm(true); }
                            }} style={{ ...BTN_PRIMARY(false, false), width: '42px', height: '42px', borderRadius: '10px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Search size={16} /></button>
                        </div>

                        {searchedCustomerObj && (
                            <div style={{ padding: '16px', borderRadius: '12px', border: `1px solid ${C.primary}50`, background: `${C.primary}10`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontWeight: 700, color: C.textPrimary, fontFamily: CAIRO }}>{searchedCustomerObj.name}</div>
                                    <div style={{ fontSize: '12px', color: C.textSecondary }}>{searchedCustomerObj.phone}</div>
                                </div>
                                <button onClick={() => { setSelectedCustomer(searchedCustomerObj.id); setShowCustomerModal(false); setShowNewCustomerForm(false); setSearchedCustomerObj(null); setCustomerSearchQuery(''); }} style={{ padding: '4px 12px', borderRadius: '6px', fontSize: '11px', height: '26px', background: C.primary, color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer', fontFamily: CAIRO, whiteSpace: 'nowrap' }}>{t('اختيار')}</button>
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
                            <button onClick={() => setShowOffersModal(false)} style={{ width: '30px', height: '30px', borderRadius: '6px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }} onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'; }} onMouseLeave={e => { e.currentTarget.style.color = C.textMuted; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = C.border; }}><X size={16} /></button>
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
                                {t('تم تطبيق خصم الكوبون:')} {fMoneyJSX(appliedCoupon.discount)}
                            </div>
                        )}
                        <button onClick={() => setShowOffersModal(false)} style={{ ...BTN_PRIMARY(false, false), height: '44px', borderRadius: '12px', marginTop: '8px' }}>{t('تم')}</button>
                    </div>
                </div>
            )}

            

            {/* Terminal Loading Modal */}
            {showTerminalLoading && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px', padding: '40px', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', textAlign: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
                        <CreditCard size={48} color={C.primary} className="animate-pulse" />
                        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: C.textPrimary, fontFamily: CAIRO }}>{t('الدفع بالبطاقة')}</h2>
                        <p style={{ margin: 0, fontSize: '15px', color: C.textSecondary, fontFamily: CAIRO }}>{terminalStatusMsg}</p>
                        <div style={{ fontSize: '32px', fontWeight: 900, color: C.textPrimary, fontFamily: OUTFIT, margin: '10px 0' }}>
                            {fMoneyJSX(total)}
                        </div>
                        <Loader2 size={32} color={C.primary} style={{ animation: 'spin 1s linear infinite' }} />
                    </div>
                </div>
            )}

            {/* Start Shift Modal */}
            {showStartShift && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '400px' }}>
                        <h2 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: 700, color: C.primary, fontFamily: CAIRO, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <User size={20} /> {t('بدء الوردية')}
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={LS}>{t('الرصيد الافتتاحي للدرج')} <span style={{ color: C.danger }}>*</span></label>
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', insetInlineEnd: '16px', top: '50%', transform: 'translateY(-50%)', color: C.textMuted, fontWeight: 700, fontSize: '15px' }}>
                                        {cSymbol || t('ر.س')}
                                    </span>
                                    <input type="text" value={shiftOpeningBalance === '' ? '' : shiftOpeningBalance.toString().split('.').map((p, i) => i === 0 ? p.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : p).join('.')} onChange={e => { const raw = e.target.value.replace(/,/g, ''); if (raw === '') setShiftOpeningBalance(''); else if (!isNaN(Number(raw))) setShiftOpeningBalance(raw as any); }} placeholder="0.00" style={{ ...IS, fontFamily: OUTFIT, fontSize: shiftOpeningBalance === '' ? '15px' : '18px', fontWeight: shiftOpeningBalance === '' ? 500 : 700, textAlign: 'center', paddingInlineStart: '45px', paddingInlineEnd: '45px' }} autoFocus />
                                </div>
                            </div>
                            <div>
                                <label style={LS}>{t('ملاحظات (اختياري)')}</label>
                                <input value={shiftNotes} onChange={e => setShiftNotes(e.target.value)} style={{ ...IS, textAlign: 'center' }} />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                            <button onClick={handleStartShift} disabled={shiftOpeningBalance === '' || shiftLoading} style={{ ...BTN_PRIMARY(shiftOpeningBalance === '' || shiftLoading, false), flex: 2, height: '48px', borderRadius: '12px', fontSize: '15px' }}>
                                {shiftLoading ? <Loader2 size={18} className="animate-spin" /> : t('بداية العمل')}
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
                                <LogOut size={20} /> {t('إنهاء الوردية')}
                            </h2>
                            <button onClick={() => setShowEndShift(false)} style={{ width: '30px', height: '30px', borderRadius: '6px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }} onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'; }} onMouseLeave={e => { e.currentTarget.style.color = C.textMuted; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = C.border; }}><X size={16} /></button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={LS}>{t('الرصيد الفعلي الموجود بالدرج')} <span style={{ color: C.danger }}>*</span></label>
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', insetInlineEnd: '16px', top: '50%', transform: 'translateY(-50%)', color: C.textMuted, fontWeight: 700, fontSize: '15px' }}>
                                        {cSymbol || t('ر.س')}
                                    </span>
                                    <input type="text" value={shiftClosingBalance === '' ? '' : shiftClosingBalance.toString().split('.').map((p, i) => i === 0 ? p.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : p).join('.')} onChange={e => { const raw = e.target.value.replace(/,/g, ''); if (raw === '') setShiftClosingBalance(''); else if (!isNaN(Number(raw))) setShiftClosingBalance(raw as any); }} placeholder="0.00" style={{ ...IS, fontFamily: OUTFIT, fontSize: shiftClosingBalance === '' ? '15px' : '18px', fontWeight: shiftClosingBalance === '' ? 500 : 700, textAlign: 'center', paddingInlineStart: '45px', paddingInlineEnd: '45px' }} autoFocus />
                                </div>
                            </div>
                            <div>
                                <label style={LS}>{t('ملاحظات العجز/الزيادة (اختياري)')}</label>
                                <input value={shiftNotes} onChange={e => setShiftNotes(e.target.value)} style={{ ...IS, textAlign: 'center' }} />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                            <button onClick={handleEndShift} disabled={shiftClosingBalance === '' || shiftLoading} style={{ ...BTN_PRIMARY(shiftClosingBalance === '' || shiftLoading, false), flex: 2, height: '48px', borderRadius: '12px', fontSize: '15px', background: C.danger, borderColor: C.dangerBorder }}>
                                {shiftLoading ? <Loader2 size={18} className="animate-spin" /> : t('تأكيد الإنهاء وإصدار التقرير')}
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
                                {t('الفروع')}
                            </h3>
                            <button onClick={() => setShowBranchModal(false)} style={{ width: '30px', height: '30px', borderRadius: '6px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }} onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'; }} onMouseLeave={e => { e.currentTarget.style.color = C.textMuted; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = C.border; }}><X size={16} /></button>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {branches.map(br => (
                                <button key={br.id} onClick={() => { setSelectedBranch(br); setShowBranchModal(false); }} style={{ padding: '16px', borderRadius: '12px', border: `1px solid ${selectedBranch?.id === br.id ? C.primary : C.border}`, background: selectedBranch?.id === br.id ? `${C.primary}10` : C.card, color: selectedBranch?.id === br.id ? C.primary : C.textPrimary, display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', textAlign: 'start' }}>
                                    <Store size={20} />
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '15px' }}>{br.name}</div>
                                        <div style={{ fontSize: '12px', color: C.textSecondary, marginTop: '2px' }}>{br.address || t('بدون عنوان')}</div>
                                    </div>
                                </button>
                            ))}
                            {branches.length === 0 && (
                                <div style={{ padding: '20px', textAlign: 'center', color: C.textSecondary, fontSize: '14px' }}>{t('لا توجد فروع متاحة')}</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Return Confirmation Modal */}
            {returnOrder && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: C.card, border: `1px solid ${C.dangerBorder}`, borderRadius: '20px', width: '100%', maxWidth: '440px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: C.danger, fontFamily: CAIRO, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <RotateCcw size={18} /> {t('تأكيد مرتجع الطلب')}
                            </h2>
                            <button onClick={() => setReturnOrder(null)} style={{ width: '30px', height: '30px', borderRadius: '6px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }} onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'; }} onMouseLeave={e => { e.currentTarget.style.color = C.textMuted; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = C.border; }}><X size={16} /></button>
                        </div>

                        {/* Order Summary */}
                        <div style={{ background: C.dangerBg, border: `1px solid ${C.dangerBorder}`, borderRadius: '12px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                <span style={{ color: C.textSecondary, fontFamily: CAIRO }}>{t('رقم الطلب')}</span>
                                <span style={{ fontWeight: 700, color: C.textPrimary, fontFamily: OUTFIT }}>#{returnOrder.orderNumber?.toString().padStart(4, '0')}</span>
                            </div>
                            {returnOrder.customer?.name && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                    <span style={{ color: C.textSecondary, fontFamily: CAIRO }}>{t('العميل')}</span>
                                    <span style={{ fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>{returnOrder.customer.name}</span>
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', borderTop: `1px dashed ${C.dangerBorder}`, paddingTop: '8px', marginTop: '4px' }}>
                                <span style={{ fontWeight: 700, color: C.textPrimary, fontFamily: CAIRO }}>{t('المبلغ المُسترد')}</span>
                                <span style={{ fontWeight: 800, color: C.danger, fontFamily: OUTFIT }}>{Number(returnOrder.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>

                        {/* Items list */}
                        {returnOrder.lines?.length > 0 && (
                            <div style={{ background: C.bg, borderRadius: '10px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
                                {returnOrder.lines.map((l: any, i: number) => {
                                    const itm = items.find((x: any) => x.id === l.itemId);
                                    return (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                            <span style={{ color: C.textPrimary, fontFamily: CAIRO }}>{itm?.name || l.itemName || t('صنف')}</span>
                                            <span style={{ color: C.textSecondary, fontFamily: OUTFIT }}>{l.quantity} × {Number(l.unitPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Treasury selector */}
                        <div>
                            <label style={{ fontSize: '13px', color: C.textSecondary, marginBottom: '6px', display: 'block', fontWeight: 600, fontFamily: CAIRO }}>
                                {t('الخزينة التي سيُصرف منها المبلغ')} <span style={{ color: C.danger }}>*</span>
                            </label>
                            <CustomSelect
                                value={returnTreasury}
                                onChange={(v: string) => setReturnTreasury(v)}
                                options={treasuries.map((tr: any) => ({ value: tr.id, label: tr.name }))}
                                placeholder={t('— اختر الخزينة —')}
                            />
                        </div>

                        {/* Warning */}
                        <div style={{ background: `${C.warning || '#f59e0b'}10`, border: `1px solid ${C.warning || '#f59e0b'}30`, borderRadius: '10px', padding: '10px 12px', fontSize: '12px', color: C.textSecondary, fontFamily: CAIRO, lineHeight: 1.6 }}>
                            ⚠️ {t('سيتم عكس: المخزون — الخزينة — القيد المحاسبي — وإنشاء فاتورة مرتجع. لا يمكن التراجع.')}
                        </div>

                        {/* Buttons */}
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={() => setReturnOrder(null)} style={{ flex: 1, height: '44px', borderRadius: '12px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textSecondary, fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: CAIRO }}>
                                {t('إلغاء')}
                            </button>
                            <button
                                onClick={handleReturnConfirm}
                                disabled={!returnTreasury || returnLoading}
                                style={{ flex: 2, height: '44px', borderRadius: '12px', border: 'none', background: (!returnTreasury || returnLoading) ? `${C.danger}50` : C.danger, color: '#fff', fontSize: '14px', fontWeight: 700, cursor: (!returnTreasury || returnLoading) ? 'not-allowed' : 'pointer', fontFamily: CAIRO, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' }}
                            >
                                {returnLoading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> {t('جاري الإرجاع...')}</> : <><RotateCcw size={16} /> {t('تأكيد الإرجاع الكامل')}</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Today's Orders Modal — Retail */}
            {showTodayOrders && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '20px', width: '100%', maxWidth: '680px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>

                        {/* Header */}
                        <div style={{ padding: '18px 24px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: C.textPrimary, fontFamily: CAIRO }}>{t('سجل طلبات اليوم')}</h2>
                                <p style={{ margin: '3px 0 0', fontSize: '12px', color: C.textSecondary, fontFamily: CAIRO }}>
                                    {todayOrders.filter((o: any) => o.status !== 'cancelled').length} {t('طلب')}
                                    {' — '}
                                    {t('المبيعات')}: <span style={{ fontFamily: OUTFIT, fontWeight: 700, color: C.primary }}>{todayOrders.filter((o: any) => o.status !== 'cancelled').reduce((s: number, o: any) => s + Number(o.total), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <button onClick={() => fetchTodayOrders()} style={{ width: 36, height: 36, borderRadius: '8px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textSecondary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={t('تحديث')}>
                                    <RefreshCw size={15} />
                                </button>
                                <button onClick={() => { setShowTodayOrders(false); setSelectedOrderDetail(null); }} style={{ width: '30px', height: '30px', borderRadius: '6px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }} onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'; }} onMouseLeave={e => { e.currentTarget.style.color = C.textMuted; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = C.border; }}><X size={16} /></button>
                            </div>
                        </div>

                        {/* Orders Table */}
                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                            {todayOrdersLoading ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px', color: C.textMuted }}>
                                    <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
                                </div>
                            ) : todayOrders.length === 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px', color: C.textMuted, gap: '10px' }}>
                                    <History size={40} style={{ opacity: 0.25 }} />
                                    <p style={{ margin: 0, fontFamily: CAIRO, fontSize: '14px' }}>{t('لا توجد طلبات اليوم')}</p>
                                </div>
                            ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', fontFamily: CAIRO }}>
                                    {/* Table Header */}
                                    <thead>
                                        <tr style={{ background: C.bg, borderBottom: `2px solid ${C.border}` }}>
                                            <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: C.textSecondary, whiteSpace: 'nowrap' }}>#</th>
                                            <th style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, color: C.textSecondary, whiteSpace: 'nowrap' }}>{t('الوقت')}</th>
                                            <th style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, color: C.textSecondary }}>{t('نوع الطلب')}</th>
                                            <th style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, color: C.textSecondary, whiteSpace: 'nowrap' }}>{t('المبلغ')}</th>
                                            <th style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 700, color: C.textSecondary }}>{t('إجراء')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {todayOrders.map((order: any) => {
                                            const isExpanded = selectedOrderDetail?.id === order.id;
                                            const isCancelled = order.status === 'cancelled';
                                            const isReturned = order.status === 'returned';
                                            const isPaid = Number(order.paidAmount) >= Number(order.total) && !isCancelled && !isReturned;
                                            const statusColor = isCancelled ? C.danger : isReturned ? '#8b5cf6' : isPaid ? (C.success || '#22c55e') : '#f59e0b';
                                            const statusLabel = isCancelled ? t('ملغي') : isReturned ? t('مرتجع') : isPaid ? t('مكتمل') : t('جزئي');
                                            const payLabel = order.paymentMethod === 'cash' ? t('نقدي') : order.paymentMethod === 'card' ? t('شبكة') : order.paymentMethod === 'mixed' ? t('مختلط') : '';
                                            const rowBg = isExpanded ? `${C.primary}08` : isCancelled ? `${C.danger}05` : 'transparent';

                                            return (
                                                <>
                                                    {/* Main Row */}
                                                    <tr key={order.id} style={{ background: rowBg, borderBottom: `1px solid ${C.border}`, transition: 'background 0.15s' }}>
                                                        {/* # رقم + حالة */}
                                                        <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                                <span style={{ fontWeight: 700, color: C.textPrimary, fontFamily: OUTFIT }}>
                                                                    {order.orderNumber?.toString().padStart(4, '0')}
                                                                </span>
                                                                <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '8px', fontWeight: 700, background: `${statusColor}20`, color: statusColor, display: 'inline-block', width: 'fit-content' }}>
                                                                    {statusLabel}
                                                                </span>
                                                            </div>
                                                        </td>

                                                        {/* الوقت */}
                                                        <td style={{ padding: '10px 8px', color: C.textSecondary, whiteSpace: 'nowrap', fontFamily: OUTFIT }}>
                                                            {new Date(order.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                                        </td>

                                                        {/* نوع الطلب */}
                                                        <td style={{ padding: '10px 8px' }}>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                                <span style={{ color: C.textPrimary, fontWeight: 600 }}>{order.customer?.name || t('مباشر')}</span>
                                                                {payLabel && <span style={{ fontSize: '10px', color: C.textMuted }}>{payLabel}{order.lines?.length ? ` — ${order.lines.length} ${t('صنف')}` : ''}</span>}
                                                            </div>
                                                        </td>

                                                        {/* المبلغ */}
                                                        <td style={{ padding: '10px 8px', fontWeight: 700, color: C.primary, fontFamily: OUTFIT, whiteSpace: 'nowrap' }}>
                                                            {Number(order.total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </td>

                                                        {/* الإجراءات */}
                                                        <td style={{ padding: '8px 16px' }}>
                                                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', alignItems: 'center' }}>
                                                                <button
                                                                    onClick={() => setSelectedOrderDetail(isExpanded ? null : order)}
                                                                    title={t('تفاصيل')}
                                                                    style={{ width: '30px', height: '28px', borderRadius: '7px', border: `1px solid ${isExpanded ? C.primary : C.border}`, background: isExpanded ? `${C.primary}15` : 'transparent', color: isExpanded ? C.primary : C.textSecondary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                                >
                                                                    <Eye size={13} />
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        const linesForPrint = order.lines?.map((l: any) => {
                                                                            const itm = items.find((i: any) => i.id === l.itemId);
                                                                            let parsedMods = null;
                                                                            if (l.modifiers) { try { parsedMods = typeof l.modifiers === 'string' ? JSON.parse(l.modifiers) : l.modifiers; } catch(e){} }
                                                                            return { itemName: itm?.name || t('صنف'), quantity: l.quantity, unitPrice: l.unitPrice, total: l.total, modifiers: parsedMods ? { main: parsedMods } : undefined };
                                                                        }) || [];
                                                                        printReceipt({ ...order, cashierName: (session?.user as any)?.name }, linesForPrint, Number(order.total), Number(order.discount) || 0);
                                                                    }}
                                                                    title={t('طباعة')}
                                                                    style={{ width: '30px', height: '28px', borderRadius: '7px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textSecondary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                                >
                                                                    <Printer size={13} />
                                                                </button>
                                                                {!isCancelled && !isReturned && (
                                                                    <button
                                                                        onClick={() => { setReturnOrder(order); setReturnTreasury(''); }}
                                                                        title={t('مرتجع')}
                                                                        style={{ width: '30px', height: '28px', borderRadius: '7px', border: `1px solid ${C.dangerBorder}`, background: C.dangerBg, color: C.danger, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                                    >
                                                                        <RotateCcw size={13} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>

                                                    {/* Expanded Details Row */}
                                                    {isExpanded && (
                                                        <tr key={`${order.id}-detail`} style={{ background: `${C.primary}05` }}>
                                                            <td colSpan={5} style={{ padding: '0 16px 12px' }}>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingTop: '8px', borderTop: `1px dashed ${C.border}` }}>
                                                                    {order.lines?.map((l: any, idx: number) => {
                                                                        const itm = items.find((i: any) => i.id === l.itemId);
                                                                        return (
                                                                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', padding: '2px 0' }}>
                                                                                <span style={{ color: C.textPrimary, fontFamily: CAIRO, flex: 1 }}>{itm?.name || l.itemName || t('صنف')}</span>
                                                                                <span style={{ color: C.textSecondary, fontFamily: OUTFIT, marginInlineEnd: '16px' }}>{l.quantity} × {Number(l.unitPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                                                                <span style={{ color: C.primary, fontWeight: 700, fontFamily: OUTFIT, minWidth: '60px', textAlign: 'end' }}>{Number(l.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                    {(Number(order.discount) > 0 || Number(order.taxAmount) > 0 || Number(order.serviceAmount) > 0) && (
                                                                        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '4px', marginTop: '2px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                                            {Number(order.discount) > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: C.danger }}><span style={{ fontFamily: CAIRO }}>{t('خصم')}</span><span style={{ fontFamily: OUTFIT }}>- {Number(order.discount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>}
                                                                            {Number(order.taxAmount) > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#f59e0b' }}><span style={{ fontFamily: CAIRO }}>{t('ضريبة')}</span><span style={{ fontFamily: OUTFIT }}>+ {Number(order.taxAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>}
                                                                            {Number(order.serviceAmount) > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#3b82f6' }}><span style={{ fontFamily: CAIRO }}>{t('رسوم خدمة')}</span><span style={{ fontFamily: OUTFIT }}>+ {Number(order.serviceAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>}
                                                                        </div>
                                                                    )}
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '12px', borderTop: `1px solid ${C.border}`, paddingTop: '4px', marginTop: '2px' }}>
                                                                        <span style={{ fontFamily: CAIRO, color: C.textPrimary }}>{t('الإجمالي')}</span>
                                                                        <span style={{ fontFamily: OUTFIT, color: C.primary }}>{Number(order.total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Footer KPIs */}
                        {!todayOrdersLoading && todayOrders.length > 0 && (
                            <div style={{ padding: '12px 24px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: '0', justifyContent: 'space-around', flexShrink: 0, background: `${C.primary}05`, borderRadius: '0 0 20px 20px' }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '18px', fontWeight: 700, color: C.primary, fontFamily: OUTFIT }}>{todayOrders.filter((o: any) => o.status !== 'cancelled' && Number(o.paidAmount) >= Number(o.total)).length}</div>
                                    <div style={{ fontSize: '11px', color: C.textMuted, fontFamily: CAIRO }}>{t('مكتملة')}</div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '18px', fontWeight: 700, color: C.primary, fontFamily: OUTFIT }}>
                                        {todayOrders.filter((o: any) => o.status !== 'cancelled').reduce((s: number, o: any) => s + Number(o.total), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                    <div style={{ fontSize: '11px', color: C.textMuted, fontFamily: CAIRO }}>{t('إجمالي المبيعات')}</div>
                                </div>
                                {todayOrders.some((o: any) => o.status === 'cancelled') && (
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '18px', fontWeight: 700, color: C.danger, fontFamily: OUTFIT }}>{todayOrders.filter((o: any) => o.status === 'cancelled').length}</div>
                                        <div style={{ fontSize: '11px', color: C.textMuted, fontFamily: CAIRO }}>{t('ملغي')}</div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Drawer Operations Modal */}
            {showDrawerModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '400px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: C.textPrimary, fontFamily: CAIRO }}>
                                {t('إدارة الدرج النقدية')}
                            </h2>
                            <button onClick={() => setShowDrawerModal(false)} style={{ width: '30px', height: '30px', borderRadius: '6px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }} onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'; }} onMouseLeave={e => { e.currentTarget.style.color = C.textMuted; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = C.border; }}><X size={16} /></button>
                        </div>
                        <div style={{ display: 'flex', background: `${C.border}40`, borderRadius: '10px', padding: '4px', marginBottom: '20px' }}>
                            <button onClick={() => setDrawerType('in')} style={{ flex: 1, height: '34px', borderRadius: '8px', border: 'none', background: drawerType === 'in' ? C.success : 'transparent', color: drawerType === 'in' ? '#fff' : C.textSecondary, fontWeight: 700, fontSize: '13px', fontFamily: CAIRO, cursor: 'pointer', transition: 'all 0.2s' }}>{t('إيداع نقدي')}</button>
                            <button onClick={() => setDrawerType('out')} style={{ flex: 1, height: '34px', borderRadius: '8px', border: 'none', background: drawerType === 'out' ? C.danger : 'transparent', color: drawerType === 'out' ? '#fff' : C.textSecondary, fontWeight: 700, fontSize: '13px', fontFamily: CAIRO, cursor: 'pointer', transition: 'all 0.2s' }}>{t('سحب نقدي')}</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '12px', color: C.textSecondary, fontWeight: 600 }}>{t('الخزنة')} <span style={{ color: C.danger }}>*</span></label>
                                <CustomSelect value={selectedTreasury} onChange={v => setSelectedTreasury(v)} options={treasuries.map(t => ({ value: t.id, label: t.name }))} placeholder={t('— اختر الخزنة —')} />
                            </div>
                            <div>
                                <label style={{ ...LS, fontSize: '12px' }}>{t('المبلغ')} <span style={{ color: C.danger }}>*</span></label>
                                <input type="number" min="0" value={drawerAmount} onChange={e => setDrawerAmount(e.target.value ? Number(e.target.value) : '')} style={{ ...IS, height: '40px', fontFamily: OUTFIT, fontSize: '16px', fontWeight: 700 }} />
                            </div>
                            <div>
                                <label style={{ ...LS, fontSize: '12px' }}>{t('السبب / ملاحظات')} <span style={{ color: C.danger }}>*</span></label>
                                <input value={drawerNotes} onChange={e => setDrawerNotes(e.target.value)} style={{ ...IS, height: '40px', fontSize: '13px' }} placeholder={t('أدخل تفاصيل العملية')} />
                            </div>
                        </div>
                        <button onClick={handleDrawerOperation} disabled={drawerAmount === '' || !drawerNotes || !selectedTreasury || shiftLoading} style={{ ...BTN_PRIMARY(drawerAmount === '' || !drawerNotes || !selectedTreasury || shiftLoading, false), width: '100%', height: '48px', borderRadius: '12px', marginTop: '24px', fontSize: '15px' }}>
                            {shiftLoading ? <Loader2 size={18} className="animate-spin" /> : t('تنفيذ')}
                        </button>
                    </div>
                </div>
            )}
            
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </>
    );
}
