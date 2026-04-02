export function printBarcode(item: { code: string; name: string; sellPrice: number }) {
    // We use a free Barcode API generator
    const barcodeUrl = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(item.code)}&scale=3&height=10&includetext`;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert("يرجى السماح بالنوافذ المنبثقة (Pop-ups) للطباعة");
        return;
    }

    const html = `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
            <meta charset="UTF-8">
            <title>طباعة باركود - ${item.name}</title>
            <style>
                @page { size: 50mm 30mm; margin: 0; }
                body {
                    margin: 0; padding: 0;
                    display: flex; flex-direction: column;
                    align-items: center; justify-content: center;
                    width: 50mm; height: 30mm;
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background: #fff;
                    overflow: hidden;
                }
                .title {
                    font-size: 10px;
                    font-weight: bold;
                    margin: 2px 0;
                    text-align: center;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    max-width: 95%;
                }
                .price {
                    font-size: 12px;
                    font-weight: 800;
                    margin: 0;
                }
                .barcode-img {
                    max-width: 90%;
                    max-height: 14mm;
                    margin-top: 2px;
                }
                @media print {
                    body { box-sizing: border-box; }
                }
            </style>
        </head>
        <body>
            <div class="title">${item.name}</div>
            <div class="price">${item.sellPrice.toLocaleString('en-US')} ج.م</div>
            <img class="barcode-img" src="${barcodeUrl}" alt="${item.code}" onload="window.print(); setTimeout(() => window.close(), 500);" />
        </body>
        </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
}

