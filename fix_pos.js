const fs = require('fs');
let content = fs.readFileSync('src/app/pos/page.tsx', 'utf8');

const oldStr = `    const calculateCartItemTotal = (item: CartItem) => {
        let modsTotal = 0;
        if (item.modifiers) {
            Object.values(item.modifiers).forEach((arr: any) => {
                arr.forEach((o: any) => modsTotal += (o.price || 0));
             }
        return (item.unitPrice + modsTotal) * item.quantity;
    };  }
        } catch {} finally { setShiftLoading(false); }
    };

    return (item.unitPrice + modsTotal) * item.quantity;
    };`;

const newStr = `    const calculateCartItemTotal = (item: CartItem) => {
        let modsTotal = 0;
        if (item.modifiers) {
            Object.values(item.modifiers).forEach((arr: any) => {
                arr.forEach((o: any) => modsTotal += (o.price || 0));
            });
        }
        return (item.unitPrice + modsTotal) * item.quantity;
    };`;

content = content.replace(oldStr, newStr);
fs.writeFileSync('src/app/pos/page.tsx', content);
console.log('Fixed syntax error');
