import QRCode from 'qrcode';

export function generateQRSVG(data, width = 80, height = 80) {
    if (!data) return '';
    try {
        const qr = QRCode.create(data);
        const size = qr.modules.size;
        const dataArr = qr.modules.data;
        let rects = '';
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (dataArr[r * size + c]) {
                    rects += `<rect x="${c}" y="${r}" width="1.05" height="1.05" fill="#000000"/>`;
                }
            }
        }
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${width}" height="${height}" style="width:${width}px;height:${height}px;display:inline-block;"><rect width="${size}" height="${size}" fill="#ffffff"/>${rects}</svg>`;
    } catch (e) {
        console.error('Failed to generate QR SVG:', e);
        return '';
    }
}

console.log(generateQRSVG('AQ5TQU1QTEU='));
