const fs = require('fs');
let content = fs.readFileSync('src/app/pos/page.tsx', 'utf-8');

// 1. Insert getAppMarkupPercent and useEffect before addToCart
const addToCartTarget = '    const addToCart = (item: any) => {';
if (content.includes(addToCartTarget) && !content.includes('getAppMarkupPercent')) {
    const injection = `    const getAppMarkupPercent = useCallback(() => {
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

    const addToCart = (item: any) => {`;
    
    content = content.replace(addToCartTarget, injection);
}

// 2. Fix addToCart unitPrice
const unitPriceTarget = 'unitPrice: item.sellPrice ?? item.price ?? 0,';
if (content.includes(unitPriceTarget)) {
    content = content.replace(unitPriceTarget, 'unitPrice: (item.sellPrice ?? item.price ?? 0) * (1 + currentMarkup / 100),');
}

// 3. Fix filteredItems.map
const filteredItemPriceTarget = '{fMoneyJSX(item.sellPrice ?? item.price ?? 0)}';
if (content.includes(filteredItemPriceTarget)) {
    content = content.replace(filteredItemPriceTarget, '{fMoneyJSX((item.sellPrice ?? item.price ?? 0) * (1 + currentMarkup / 100))}');
}

// 4. Fix variants display
const variantPriceTarget = '{fMoneyJSX(v.sellPrice)}';
if (content.includes(variantPriceTarget)) {
    content = content.replace(variantPriceTarget, '{fMoneyJSX((v.sellPrice || 0) * (1 + currentMarkup / 100))}');
}

// 5. Fix modifiers modal click
const modifierClickTarget = 'handleModifierToggle(mod.name, opt.name, opt.extraPrice, mod.multiSelect)';
if (content.includes(modifierClickTarget)) {
    content = content.replace(modifierClickTarget, 'handleModifierToggle(mod.name, opt.name, opt.extraPrice * (1 + currentMarkup / 100), mod.multiSelect)');
}

// 6. Fix modifiers modal display
const modifierDisplayTarget = '{opt.extraPrice > 0 && <span style={{ fontFamily: OUTFIT, fontWeight: 700, fontSize: \'11px\' }}>+{fMoneyJSX(opt.extraPrice)}</span>}';
if (content.includes(modifierDisplayTarget)) {
    content = content.replace(modifierDisplayTarget, '{opt.extraPrice > 0 && <span style={{ fontFamily: OUTFIT, fontWeight: 700, fontSize: \'11px\' }}>+{fMoneyJSX(opt.extraPrice * (1 + currentMarkup / 100))}</span>}');
}

fs.writeFileSync('src/app/pos/page.tsx', content, 'utf-8');
console.log('Modified successfully.');
