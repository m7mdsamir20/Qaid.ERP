import { getCurrencySymbol, formatMoney } from './currency';
import QRCode from 'qrcode';

export interface CompanyInfo {
    name?: string;
    nameEn?: string;
    phone?: string;
    currency?: string;
    countryCode?: string;
    // ... (rest of interface continues)
    email?: string;
    taxNumber?: string;
    commercialRegister?: string;
    addressRegion?: string;
    addressCity?: string;
    addressDistrict?: string;
    addressStreet?: string;
    website?: string;
    logo?: string;
    branchName?: string;
    businessType?: string;
}

type InvoiceType = 'sale' | 'purchase' | 'sale-return' | 'purchase-return' | 'sales-order' | 'purchase-order';
type VoucherType = 'receipt' | 'payment';

const TITLES: Record<InvoiceType, string> = {
    'sale': 'فاتورة مبيعات',
    'purchase': 'فاتورة مشتريات',
    'sale-return': 'مرتجع مبيعات',
    'purchase-return': 'مرتجع مشتريات',
    'sales-order': 'أمر بيع',
    'purchase-order': 'أمر شراء',
};

const TITLES_EN: Record<InvoiceType, string> = {
    'sale': 'Sales Invoice',
    'purchase': 'Purchase Invoice',
    'sale-return': 'Sales Return',
    'purchase-return': 'Purchase Return',
    'sales-order': 'Sales Order',
    'purchase-order': 'Purchase Order',
};

const PREFIXES: Record<InvoiceType, string> = {
    'sale': 'SAL',
    'purchase': 'PUR',
    'sale-return': 'SLR',
    'purchase-return': 'PRR',
    'sales-order': 'SO',
    'purchase-order': 'PO',
};

// ═══════════════════════════════════════════════
//  ZATCA QR Code TLV Generator (Saudi Arabia)
// ═══════════════════════════════════════════════
export function generateZatcaTLV(sellerName: string, vatNumber: string, timestamp: string, totalWithVat: string, vatAmount: string): string {
    const encoder = new TextEncoder();
    const tlvBuffers: Uint8Array[] = [];
    const values = [sellerName, vatNumber, timestamp, totalWithVat, vatAmount];
    values.forEach((val, idx) => {
        const tag = idx + 1;
        const encoded = encoder.encode(val);
        const len = encoded.length;
        const buf = new Uint8Array(2 + len);
        buf[0] = tag;
        buf[1] = len;
        buf.set(encoded, 2);
        tlvBuffers.push(buf);
    });
    const totalLen = tlvBuffers.reduce((s, b) => s + b.length, 0);
    const result = new Uint8Array(totalLen);
    let offset = 0;
    tlvBuffers.forEach(buf => { result.set(buf, offset); offset += buf.length; });
    // Convert to base64
    let binary = '';
    result.forEach(byte => binary += String.fromCharCode(byte));
    return btoa(binary);
}

export function generateQRSVG(data: string, width = 80, height = 80): string {
    if (!data) return '';
    try {
        const qr = QRCode.create(data);
        const size = qr.modules.size;
        const dataArr = qr.modules.data;
        let rects = '';
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (dataArr[r * size + c]) {
                    rects += `<rect x="${c}" y="${r}" width="1.02" height="1.02" fill="#000000"/>`;
                }
            }
        }
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${width}" height="${height}" style="width:${width}px;height:${height}px;display:inline-block;"><rect width="${size}" height="${size}" fill="#ffffff"/>${rects}</svg>`;
    } catch (e) {
        console.error('Failed to generate QR SVG:', e);
        return '';
    }
}

// ═══════════════════════════════════════════════
//  Inline QR Code Script (no external API)
//  Draws a QR code on <canvas id="zatca-qr"> from its data-qr attribute
// ═══════════════════════════════════════════════
export const ZATCA_QR_INLINE_SCRIPT = `
<script>
(function(){
  // Minimal QR Code generator (alphanumeric/byte mode, error correction L)
  // Based on qr.js - MIT license - condensed for inline use
  function generateQR(data){
    var PAD0=0xEC,PAD1=0x11;
    function _getUTF8Length(s){var l=0;for(var i=0;i<s.length;i++){var c=s.charCodeAt(i);if(c<=0x7F)l++;else if(c<=0x7FF)l+=2;else if(c<=0xFFFF)l+=3;else l+=4;}return l;}
    var QRMode={MODE_8BIT_BYTE:4};
    var QRErrorCorrectLevel={L:1};
    function QR8BitByte(d){this.data=d;}
    QR8BitByte.prototype={getLength:function(){return _getUTF8Length(this.data);},write:function(buf){for(var i=0;i<this.data.length;i++){var c=this.data.charCodeAt(i);if(c<=0x7F){buf.put(c,8);}else if(c<=0x7FF){buf.put(0xC0|(c>>6),8);buf.put(0x80|(c&0x3F),8);}else if(c<=0xFFFF){buf.put(0xE0|(c>>12),8);buf.put(0x80|((c>>6)&0x3F),8);buf.put(0x80|(c&0x3F),8);}}}};
    function QRBitBuffer(){this.buffer=[];this.length=0;}
    QRBitBuffer.prototype={get:function(i){return((this.buffer[Math.floor(i/8)]>>>(7-i%8))&1)==1;},put:function(n,l){for(var i=0;i<l;i++)this.putBit(((n>>>(l-i-1))&1)==1);},getLengthInBits:function(){return this.length;},putBit:function(b){if(this.length%8==0)this.buffer.push(0);if(b)this.buffer[Math.floor(this.length/8)]|=(0x80>>>(this.length%8));this.length++;}};
    function QRPolynomial(n,s){if(typeof n.length=='undefined')throw n.length+'/'+s;var o=0;while(o<n.length&&n[o]==0)o++;this.num=new Array(n.length-o+s);for(var i=0;i<n.length-o;i++)this.num[i]=n[i+o];}
    QRPolynomial.prototype={get:function(i){return this.num[i];},getLength:function(){return this.num.length;},multiply:function(e){var n=new Array(this.getLength()+e.getLength()-1);for(var i=0;i<this.getLength();i++)for(var j=0;j<e.getLength();j++)n[i+j]^=QRMath.gexp(QRMath.glog(this.get(i))+QRMath.glog(e.get(j)));return new QRPolynomial(n,0);},mod:function(e){if(this.getLength()-e.getLength()<0)return this;var r=QRMath.glog(this.get(0))-QRMath.glog(e.get(0));var n=new Array(this.getLength());for(var i=0;i<this.getLength();i++)n[i]=this.get(i);for(var i=0;i<e.getLength();i++)n[i]^=QRMath.gexp(QRMath.glog(e.get(i))+r);return new QRPolynomial(n,0).mod(e);}};
    var QRMath={glog:function(n){if(n<1)throw'glog('+n+')';return QRMath.LOG_TABLE[n];},gexp:function(n){while(n<0)n+=255;while(n>=256)n-=255;return QRMath.EXP_TABLE[n];},EXP_TABLE:new Array(256),LOG_TABLE:new Array(256)};
    for(var i=0;i<8;i++)QRMath.EXP_TABLE[i]=1<<i;
    for(var i=8;i<256;i++)QRMath.EXP_TABLE[i]=QRMath.EXP_TABLE[i-4]^QRMath.EXP_TABLE[i-5]^QRMath.EXP_TABLE[i-6]^QRMath.EXP_TABLE[i-8];
    for(var i=0;i<255;i++)QRMath.LOG_TABLE[QRMath.EXP_TABLE[i]]=i;
    var QRUtil={PATTERN_POSITION_TABLE:[[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50],[6,30,54],[6,32,58],[6,34,62],[6,26,46,66],[6,26,48,70],[6,26,50,74],[6,30,54,78],[6,30,56,82],[6,30,58,86],[6,34,62,90],[6,28,50,72,94],[6,26,50,74,98],[6,30,54,78,102],[6,28,54,80,106],[6,32,58,84,110],[6,30,58,86,114],[6,34,62,90,118],[6,26,50,74,98,122],[6,30,54,78,102,126],[6,26,52,78,104,130],[6,30,56,82,108,134],[6,34,60,86,112,138],[6,30,58,86,114,142],[6,34,62,90,118,146],[6,30,54,78,102,126,150],[6,24,50,76,102,128,154],[6,28,54,80,106,132,158],[6,32,58,84,110,136,162],[6,26,54,82,110,138,166],[6,30,58,86,114,142,170]],G15:(1<<10)|(1<<8)|(1<<5)|(1<<4)|(1<<2)|(1<<1)|(1<<0),G18:(1<<12)|(1<<11)|(1<<10)|(1<<9)|(1<<8)|(1<<5)|(1<<2)|(1<<0),G15_MASK:(1<<14)|(1<<12)|(1<<10)|(1<<4)|(1<<1),getBCHTypeInfo:function(d){var d2=d<<10;while(QRUtil.getBCHDigit(d2)-QRUtil.getBCHDigit(QRUtil.G15)>=0)d2^=(QRUtil.G15<<(QRUtil.getBCHDigit(d2)-QRUtil.getBCHDigit(QRUtil.G15)));return((d<<10)|d2)^QRUtil.G15_MASK;},getBCHTypeNumber:function(d){var d2=d<<12;while(QRUtil.getBCHDigit(d2)-QRUtil.getBCHDigit(QRUtil.G18)>=0)d2^=(QRUtil.G18<<(QRUtil.getBCHDigit(d2)-QRUtil.getBCHDigit(QRUtil.G18)));return(d<<12)|d2;},getBCHDigit:function(d){var digit=0;while(d!=0){digit++;d>>>=1;}return digit;},getPatternPosition:function(t){return QRUtil.PATTERN_POSITION_TABLE[t-1];},getMask:function(m,i,j){switch(m){case 0:return(i+j)%2==0;case 1:return i%2==0;case 2:return j%3==0;case 3:return(i+j)%3==0;case 4:return(Math.floor(i/2)+Math.floor(j/3))%2==0;case 5:return(i*j)%2+(i*j)%3==0;case 6:return((i*j)%2+(i*j)%3)%2==0;case 7:return((i*j)%3+(i+j)%2)%2==0;default:throw'bad mask:'+m;}},getErrorCorrectPolynomial:function(l){var a=new QRPolynomial([1],0);for(var i=0;i<l;i++)a=a.multiply(new QRPolynomial([1,QRMath.gexp(i)],0));return a;},getLengthInBits:function(mode,type){return(type>=1&&type<=9)?8:(type<=26)?16:16;},getLostPoint:function(qr){var mc=qr.getModuleCount(),lp=0;for(var r=0;r<mc;r++)for(var c=0;c<mc;c++){var sameCount=0,dark=qr.isDark(r,c);for(var dr=-1;dr<=1;dr++){if(r+dr<0||mc<=r+dr)continue;for(var dc=-1;dc<=1;dc++){if(c+dc<0||mc<=c+dc)continue;if(dr==0&&dc==0)continue;if(dark==qr.isDark(r+dr,c+dc))sameCount++;}}if(sameCount>5)lp+=(3+sameCount-5);}for(var r=0;r<mc-1;r++)for(var c=0;c<mc-1;c++){var count=0;if(qr.isDark(r,c))count++;if(qr.isDark(r+1,c))count++;if(qr.isDark(r,c+1))count++;if(qr.isDark(r+1,c+1))count++;if(count==0||count==4)lp+=3;}for(var r=0;r<mc;r++)for(var c=0;c<mc-6;c++)if(qr.isDark(r,c)&&!qr.isDark(r,c+1)&&qr.isDark(r,c+2)&&qr.isDark(r,c+3)&&qr.isDark(r,c+4)&&!qr.isDark(r,c+5)&&qr.isDark(r,c+6))lp+=40;for(var c=0;c<mc;c++)for(var r=0;r<mc-6;r++)if(qr.isDark(r,c)&&!qr.isDark(r+1,c)&&qr.isDark(r+2,c)&&qr.isDark(r+3,c)&&qr.isDark(r+4,c)&&!qr.isDark(r+5,c)&&qr.isDark(r+6,c))lp+=40;var dc=0;for(var c=0;c<mc;c++)for(var r=0;r<mc;r++)if(qr.isDark(r,c))dc++;var ratio=Math.abs(100*dc/mc/mc-50)/5;lp+=ratio*10;return lp;}};
    var RS_BLOCK_TABLE=[[1,26,19],[1,26,16],[1,26,13],[1,26,9],[1,44,34],[1,44,28],[1,44,22],[1,44,16],[1,70,55],[1,70,44],[2,35,17],[2,35,13],[1,100,80],[2,50,32],[2,50,24],[4,25,9],[1,134,108],[2,67,43],[2,33,15,2,34,16],[2,33,11,2,34,12],[2,86,68],[4,43,27],[4,43,19],[4,43,15],[2,98,78],[4,49,31],[2,32,14,4,33,15],[4,39,13,1,40,14],[2,121,97],[2,60,38,2,61,39],[4,40,18,2,41,19],[4,40,14,2,41,15],[2,146,116],[3,58,36,2,59,37],[4,36,16,4,37,17],[4,36,12,4,37,13],[2,86,68,2,87,69],[4,69,43,1,70,44],[6,43,19,2,44,20],[6,43,15,2,44,16],[4,101,81],[1,80,50,4,81,51],[4,50,22,4,51,23],[3,36,12,8,37,13],[2,116,92,2,117,93],[6,58,36,2,59,37],[4,46,20,6,47,21],[7,42,14,4,43,15],[4,133,107],[8,59,37,1,60,38],[8,44,20,4,45,21],[12,33,11,4,34,12],[3,145,115,1,146,116],[4,64,40,5,65,41],[11,36,16,5,37,17],[11,36,12,5,37,13],[5,109,87,1,110,88],[5,65,41,5,66,42],[5,54,24,7,55,25],[11,36,12,7,37,13],[5,122,98,1,123,99],[7,73,45,3,74,46],[15,43,19,2,44,20],[3,45,15,13,46,16],[1,135,107,5,136,108],[10,74,46,1,75,47],[1,50,22,15,51,23],[2,42,14,17,43,15],[5,150,120,1,151,121],[9,69,43,4,70,44],[17,50,22,1,51,23],[2,42,14,19,43,15],[3,141,113,4,142,114],[3,70,44,11,71,45],[17,47,21,4,48,22],[9,39,13,16,40,14],[3,135,107,5,136,108],[3,67,41,13,68,42],[15,54,24,5,55,25],[15,43,15,10,44,16],[4,144,116,4,145,117],[17,68,42],[17,50,22,6,51,23],[19,46,16,6,47,17],[2,139,111,7,140,112],[17,74,46],[7,54,24,16,55,25],[34,37,13],[4,151,121,5,152,122],[4,75,47,14,76,48],[11,54,24,14,55,25],[16,45,15,14,46,16],[6,147,117,4,148,118],[6,73,45,14,74,46],[11,54,24,16,55,25],[30,46,16,2,47,17],[8,132,106,4,133,107],[8,75,47,13,76,48],[7,54,24,22,55,25],[22,45,15,13,46,16],[10,142,114,2,143,115],[19,74,46,4,75,47],[28,50,22,6,51,23],[33,46,16,4,47,17],[8,152,122,4,153,123],[22,73,45,3,74,46],[8,53,23,26,54,24],[12,45,15,28,46,16],[3,147,117,10,148,118],[3,73,45,23,74,46],[4,54,24,31,55,25],[11,45,15,31,46,16],[7,146,116,7,147,117],[21,73,45,7,74,46],[1,53,23,37,54,24],[19,45,15,26,46,16],[5,145,115,10,146,116],[19,75,47,10,76,48],[15,54,24,25,55,25],[23,45,15,25,46,16],[13,145,115,3,146,116],[2,74,46,29,75,47],[42,54,24,1,55,25],[23,45,15,28,46,16],[17,145,115],[10,74,46,23,75,47],[10,54,24,35,55,25],[19,45,15,35,46,16],[17,145,115,1,146,116],[14,74,46,21,75,47],[29,54,24,19,55,25],[11,45,15,46,46,16],[13,145,115,6,146,116],[14,74,46,23,75,47],[44,54,24,7,55,25],[59,46,16,1,47,17],[12,151,121,7,152,122],[12,75,47,26,76,48],[39,54,24,14,55,25],[22,45,15,41,46,16],[6,151,121,14,152,122],[6,75,47,34,76,48],[46,54,24,10,55,25],[2,45,15,64,46,16],[17,152,122,4,153,123],[29,74,46,14,75,47],[49,54,24,10,55,25],[24,45,15,46,46,16],[4,152,122,18,153,123],[13,74,46,32,75,47],[48,54,24,14,55,25],[42,45,15,32,46,16],[20,147,117,4,148,118],[40,75,47,7,76,48],[43,54,24,22,55,25],[10,45,15,67,46,16],[19,148,118,6,149,119],[18,75,47,31,76,48],[34,54,24,34,55,25],[20,45,15,61,46,16]];
    function QRRSBlock(tc,dc){this.totalCount=tc;this.dataCount=dc;}
    QRRSBlock.getRSBlocks=function(t,e){var rsBlock=RS_BLOCK_TABLE[(t-1)*4+(e==1?0:e==0?1:e==3?2:3)];if(!rsBlock)throw'bad rs block @ typeNumber:'+t+'/errorCorrectLevel:'+e;var length=rsBlock.length/3,list=[];for(var i=0;i<length;i++){var count=rsBlock[i*3+0],totalCount=rsBlock[i*3+1],dataCount=rsBlock[i*3+2];for(var j=0;j<count;j++)list.push(new QRRSBlock(totalCount,dataCount));}return list;};
    function QRCodeModel(typeNumber,errorCorrectLevel){this.typeNumber=typeNumber;this.errorCorrectLevel=errorCorrectLevel;this.modules=null;this.moduleCount=0;this.dataCache=null;this.dataList=[];}
    QRCodeModel.prototype={addData:function(d){this.dataList.push(new QR8BitByte(d));this.dataCache=null;},isDark:function(r,c){if(r<0||this.moduleCount<=r||c<0||this.moduleCount<=c)throw r+','+c;return this.modules[r][c];},getModuleCount:function(){return this.moduleCount;},make:function(){this.makeImpl(false,this.getBestMaskPattern());},makeImpl:function(test,maskPattern){this.moduleCount=this.typeNumber*4+17;this.modules=new Array(this.moduleCount);for(var r=0;r<this.moduleCount;r++){this.modules[r]=new Array(this.moduleCount);for(var c=0;c<this.moduleCount;c++)this.modules[r][c]=null;}this.setupPositionProbePattern(0,0);this.setupPositionProbePattern(this.moduleCount-7,0);this.setupPositionProbePattern(0,this.moduleCount-7);this.setupPositionAdjustPattern();this.setupTimingPattern();this.setupTypeInfo(test,maskPattern);if(this.typeNumber>=7)this.setupTypeNumber(test);if(this.dataCache==null)this.dataCache=QRCodeModel.createData(this.typeNumber,this.errorCorrectLevel,this.dataList);this.mapData(this.dataCache,maskPattern);},setupPositionProbePattern:function(row,col){for(var r=-1;r<=7;r++){if(row+r<=-1||this.moduleCount<=row+r)continue;for(var c=-1;c<=7;c++){if(col+c<=-1||this.moduleCount<=col+c)continue;if((0<=r&&r<=6&&(c==0||c==6))||(0<=c&&c<=6&&(r==0||r==6))||(2<=r&&r<=4&&2<=c&&c<=4))this.modules[row+r][col+c]=true;else this.modules[row+r][col+c]=false;}}},getBestMaskPattern:function(){var minLostPoint=0,pattern=0;for(var i=0;i<8;i++){this.makeImpl(true,i);var lostPoint=QRUtil.getLostPoint(this);if(i==0||minLostPoint>lostPoint){minLostPoint=lostPoint;pattern=i;}}return pattern;},setupTimingPattern:function(){for(var r=8;r<this.moduleCount-8;r++){if(this.modules[r][6]!=null)continue;this.modules[r][6]=(r%2==0);}for(var c=8;c<this.moduleCount-8;c++){if(this.modules[6][c]!=null)continue;this.modules[6][c]=(c%2==0);}},setupPositionAdjustPattern:function(){var pos=QRUtil.getPatternPosition(this.typeNumber);for(var i=0;i<pos.length;i++)for(var j=0;j<pos.length;j++){var row=pos[i],col=pos[j];if(this.modules[row][col]!=null)continue;for(var r=-2;r<=2;r++)for(var c=-2;c<=2;c++)if(r==-2||r==2||c==-2||c==2||(r==0&&c==0))this.modules[row+r][col+c]=true;else this.modules[row+r][col+c]=false;}},setupTypeNumber:function(test){var bits=QRUtil.getBCHTypeNumber(this.typeNumber);for(var i=0;i<18;i++){var mod=(!test&&((bits>>i)&1)==1);this.modules[Math.floor(i/3)][i%3+this.moduleCount-8-3]=mod;}for(var i=0;i<18;i++){var mod=(!test&&((bits>>i)&1)==1);this.modules[i%3+this.moduleCount-8-3][Math.floor(i/3)]=mod;}},setupTypeInfo:function(test,maskPattern){var data=(1<<3)|maskPattern;var bits=QRUtil.getBCHTypeInfo(data);for(var i=0;i<15;i++){var mod=(!test&&((bits>>i)&1)==1);if(i<6)this.modules[i][8]=mod;else if(i<8)this.modules[i+1][8]=mod;else this.modules[this.moduleCount-15+i][8]=mod;}for(var i=0;i<15;i++){var mod=(!test&&((bits>>i)&1)==1);if(i<8)this.modules[8][this.moduleCount-i-1]=mod;else if(i<9)this.modules[8][15-i-1+1]=mod;else this.modules[8][15-i-1]=mod;}this.modules[this.moduleCount-8][8]=(!test);},mapData:function(data,maskPattern){var inc=-1,row=this.moduleCount-1,bitIndex=7,byteIndex=0;for(var col=this.moduleCount-1;col>0;col-=2){if(col==6)col--;while(true){for(var c=0;c<2;c++){if(this.modules[row][col-c]==null){var dark=false;if(byteIndex<data.length)dark=(((data[byteIndex]>>>bitIndex)&1)==1);if(QRUtil.getMask(maskPattern,row,col-c))dark=!dark;this.modules[row][col-c]=dark;bitIndex--;if(bitIndex==-1){byteIndex++;bitIndex=7;}}}row+=inc;if(row<0||this.moduleCount<=row){row-=inc;inc=-inc;break;}}}}};
    QRCodeModel.createData=function(typeNumber,errorCorrectLevel,dataList){var rsBlocks=QRRSBlock.getRSBlocks(typeNumber,errorCorrectLevel);var buffer=new QRBitBuffer();for(var i=0;i<dataList.length;i++){var data=dataList[i];buffer.put(QRMode.MODE_8BIT_BYTE,4);buffer.put(data.getLength(),QRUtil.getLengthInBits(QRMode.MODE_8BIT_BYTE,typeNumber));data.write(buffer);}var totalDataCount=0;for(var i=0;i<rsBlocks.length;i++)totalDataCount+=rsBlocks[i].dataCount;if(buffer.getLengthInBits()>totalDataCount*8)throw'code length overflow.('+buffer.getLengthInBits()+'>'+totalDataCount*8+')';if(buffer.getLengthInBits()+4<=totalDataCount*8)buffer.put(0,4);while(buffer.getLengthInBits()%8!=0)buffer.putBit(false);while(true){if(buffer.getLengthInBits()>=totalDataCount*8)break;buffer.put(PAD0,8);if(buffer.getLengthInBits()>=totalDataCount*8)break;buffer.put(PAD1,8);}return QRCodeModel.createBytes(buffer,rsBlocks);};
    QRCodeModel.createBytes=function(buffer,rsBlocks){var offset=0,maxDcCount=0,maxEcCount=0,dcdata=new Array(rsBlocks.length),ecdata=new Array(rsBlocks.length);for(var r=0;r<rsBlocks.length;r++){var dcCount=rsBlocks[r].dataCount,ecCount=rsBlocks[r].totalCount-dcCount;maxDcCount=Math.max(maxDcCount,dcCount);maxEcCount=Math.max(maxEcCount,ecCount);dcdata[r]=new Array(dcCount);for(var i=0;i<dcdata[r].length;i++)dcdata[r][i]=0xff&buffer.buffer[i+offset];offset+=dcCount;var rsPoly=QRUtil.getErrorCorrectPolynomial(ecCount);var rawPoly=new QRPolynomial(dcdata[r],rsPoly.getLength()-1);var modPoly=rawPoly.mod(rsPoly);ecdata[r]=new Array(rsPoly.getLength()-1);for(var i=0;i<ecdata[r].length;i++){var modIndex=i+modPoly.getLength()-ecdata[r].length;ecdata[r][i]=(modIndex>=0)?modPoly.get(modIndex):0;}}var totalCodeCount=0;for(var i=0;i<rsBlocks.length;i++)totalCodeCount+=rsBlocks[i].totalCount;var data=new Array(totalCodeCount);var index=0;for(var i=0;i<maxDcCount;i++)for(var r=0;r<rsBlocks.length;r++)if(i<dcdata[r].length)data[index++]=dcdata[r][i];for(var i=0;i<maxEcCount;i++)for(var r=0;r<rsBlocks.length;r++)if(i<ecdata[r].length)data[index++]=ecdata[r][i];return data;};

    // Find appropriate type number for the data
    function getTypeNumber(data) {
      for (var t = 1; t <= 40; t++) {
        try {
          var qr = new QRCodeModel(t, QRErrorCorrectLevel.L);
          qr.addData(data);
          qr.make();
          return t;
        } catch (e) { continue; }
      }
      return 10;
    }

    // Draw QR on canvas
    var canvas = document.getElementById('zatca-qr');
    if (canvas) {
      var qrData = canvas.getAttribute('data-qr');
      if (qrData) {
        try {
          var typeNum = getTypeNumber(qrData);
          var qr = new QRCodeModel(typeNum, QRErrorCorrectLevel.L);
          qr.addData(qrData);
          qr.make();
          var mc = qr.getModuleCount();
          var size = 80;
          var cellSize = size / mc;
          var ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, size, size);
          ctx.fillStyle = '#000000';
          for (var r = 0; r < mc; r++) {
            for (var c = 0; c < mc; c++) {
              if (qr.isDark(r, c)) {
                ctx.fillRect(c * cellSize, r * cellSize, cellSize + 0.5, cellSize + 0.5);
              }
            }
          }
        } catch (e) {
          // Fallback: show text
          var ctx = canvas.getContext('2d');
          ctx.fillStyle = '#fff';
          ctx.fillRect(0,0,80,80);
          ctx.fillStyle = '#999';
          ctx.font = '10px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('QR Error', 40, 44);
        }
      }
    }
})();
<\\/script>`;

// ═══════════════════════════════════════════════
//  A4 INVOICE (مبيعات / مشتريات / مرتجعات)
// ═══════════════════════════════════════════════
export function generateA4HTML(
    invoice: any,
    type: InvoiceType,
    company: CompanyInfo = {},
    options: {
        terms?: string;
        showSignature?: boolean;
        showStamp?: boolean;
        partyBalance?: number;
        forDownload?: boolean; // إذا true لا يتم تشغيل window.print تلقائياً
        noAutoPrint?: boolean; // لصفحات الطباعة المستقلة
    } = {}
): string {
    const sym = getCurrencySymbol(company.currency || 'EGP');
    const country = (company.countryCode || 'EG').toUpperCase();
    const isServicesCompany = company.businessType?.toUpperCase() === 'SERVICES';
    const isSaudi = country === 'SA';
    const isBilingual = country !== 'EG' || isServicesCompany; // كل الدول العربية ماعدا مصر + شركات الخدمات
    const addrLabels = {
        region: isBilingual ? 'المنطقة / Region' : 'المنطقة',
        city: isBilingual ? 'المدينة / City' : 'المدينة',
        district: isBilingual ? 'الحي / District' : 'الحي',
        street: isBilingual ? 'الشارع / Street' : 'الشارع',
    };
    const co = {
        name: company.name || 'اسم الشركة',
        nameEn: company.nameEn || '',
        addrLines: [
            company.addressRegion ? { label: addrLabels.region, value: company.addressRegion } : null,
            company.addressCity ? { label: addrLabels.city, value: company.addressCity } : null,
            company.addressDistrict ? { label: addrLabels.district, value: company.addressDistrict } : null,
            company.addressStreet ? { label: addrLabels.street, value: company.addressStreet } : null,
        ].filter(Boolean) as { label: string; value: string }[],
        phone: company.phone || '',
        email: company.email || '',
        tax: company.taxNumber || '',
        cr: company.commercialRegister || '',
        website: company.website || '',
        logo: company.logo || '',
        branch: company.branchName || '',
    };

    const title = TITLES[type];
    const titleEn = TITLES_EN[type];
    const prefix = PREFIXES[type];
    const isReturn = type.includes('return');
    const isSale = type === 'sale' || type === 'sale-return' || type === 'sales-order';
    const isTrading = company.businessType?.toUpperCase() === 'TRADING';

    // Try all possible ways to find the party name and details
    const party = isSale
        ? (invoice.customer || invoice.supplier || invoice.Contact || null)
        : (invoice.supplier || invoice.customer || invoice.Contact || null);

    const partyName = party?.name || (isSale ? 'عميل نقدي' : 'مورد نقدي');
    const partyLabel = isSale ? 'العميل' : 'المورد';
    const partyLabelEn = isSale ? 'Customer' : 'Supplier';

    // Ensure lines is always an array and try to find it in common properties
    const rawLines = invoice.lines || invoice.InvoiceLine || invoice.items || [];
    const lines = Array.isArray(rawLines) ? rawLines : [];

    // Recalculate subtotal from lines to be sure
    const subtotal = lines.reduce((s: number, l: any) => s + Number(l.total || (Number(l.quantity || 0) * Number(l.price || 0)) || 0), 0);
    const discount = Number(invoice.discount || 0);
    const total = Number(invoice.total || subtotal - discount);
    const paid = Number(invoice.paidAmount || 0);
    const remaining = Math.max(0, total - paid);
    const partyBalance = options.partyBalance ?? null;

    const invoiceDate = new Date(invoice.date || new Date());
    const date = invoiceDate.toLocaleDateString('en-ZA');
    const dateEn = '';
    const dateISO = invoiceDate.toISOString();

    const invoiceNum = String(invoice.invoiceNumber || invoice.orderNumber || 1).padStart(5, '0');

    // تحديد ما إذا كان النشاط خدمياً
    const isServicesLine = isServicesCompany || lines.some((l: any) => l.item?.businessType?.toUpperCase() === 'SERVICES');

    // ضريبة على مستوى الفاتورة
    const invoiceTaxRate = Number(invoice.taxRate || 0);
    const invoiceTaxAmount = Number(invoice.taxAmount || 0);
    const taxInclusive = invoice.taxInclusive || false;

    // ZATCA QR Code for Saudi Arabia (only if country is SA and valid tax number exists)
    const totalTaxAmount = invoiceTaxAmount > 0 ? invoiceTaxAmount
        : parseFloat(lines.reduce((acc: number, l: any) => acc + (Number(l.quantity || 0) * Number(l.price || 0) * invoiceTaxRate / 100), 0).toFixed(2));
    const cleanTaxNumber = (co.tax || '').replace(/,/g, '').trim();
    const hasValidTax = !!(isSaudi && cleanTaxNumber.length > 0);
    const zatcaQR = hasValidTax ? generateZatcaTLV(
        co.name,
        cleanTaxNumber,
        dateISO,
        total.toFixed(2),
        totalTaxAmount.toFixed(2)
    ) : '';

    // Bilingual helper
    const bl = (ar: string, en: string) => isBilingual ? `${ar}<br><span style="font-size:100%;color:#555;font-family:sans-serif">${en}</span>` : ar;
    const blInline = (ar: string, en: string) => isBilingual ? `${ar} / <span style="font-size:100%;font-family:sans-serif">${en}</span>` : ar;

    const tableStyle = 'bordered'; // Hardcoded default
    const tableBorder = '1px solid #999';
    const cellBorder = '1px solid #999';
    const rowBorder = '1px solid #999';

    const isA5 = false; // Default A4
    const paperW = '210mm';
    const paperH = 'auto';

    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"/>
<title>${isServicesLine ? 'SRV' : prefix}-${invoiceNum}</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root {
    --base-font: ${isA5 ? '9px' : '11px'};
    --header-name: ${isA5 ? '16px' : '21px'};
    --title-font: ${isA5 ? '13px' : '17px'};
    --logo-h: ${isA5 ? '45px' : '75px'};
    --page-padding: ${isA5 ? '3mm 5mm' : '4mm 8mm'};
}
body{font-family:'Cairo',sans-serif;color:#111;font-size:var(--base-font);background:#fff;direction:rtl}
.page{width:100%; max-width: 850px; min-height: 282mm; margin:0 auto;padding:var(--page-padding);display:flex;flex-direction:column; background: #fff;}
@media print {
    @page { 
        size: ${isA5 ? 'A5 portrait' : 'A4 portrait'}; 
        margin: 5mm; 
    }
    body { background: #fff; -webkit-print-color-adjust: exact; }
    .page { 
        box-shadow: none; 
        margin: 0; 
        width: 100% !important; 
        max-width: none !important; 
        padding: 0 !important;
        min-height: auto !important;
    }
}

/* ── HEADER ── */
.header{display:flex;justify-content:space-between;align-items:center;padding-bottom:6px;border-bottom:2px solid #111;margin-bottom:0px}
.co-block{flex:1;text-align:right}
.co-name{font-size:var(--header-name);font-weight:900;color:#111;margin-bottom:1px}
.co-name-en{font-size:${isA5 ? '8.5px' : '9.5px'};color:#444;line-height:1.4;margin-bottom:1px}
.co-line{font-size:${isA5 ? '8.5px' : '9.5px'};color:#444;line-height:1.4}
.header-center{flex:1;text-align:center}
.inv-title{font-size:var(--title-font);font-weight:900;color:#111;background:#f5f5f5;padding:2px 14px;border-radius:6px;display:inline-block;border:1px solid #ccc}
.inv-title-en{font-size:${isA5 ? '9px' : '11px'};font-weight:700;color:#555;margin-top:1px;font-family:sans-serif}
.inv-num{font-size:${isA5 ? '9.5px' : '11px'};color:#333;margin-top:2px;font-family:monospace;font-weight:700}
.logo-block{flex:1;text-align:left}
.logo-block img{max-height:var(--logo-h);max-width:130px;object-fit:contain}

/* ── TABLES ── */
.info-wrap{display:flex;gap:${isA5 ? '5px' : '8px'};margin-top:${isA5 ? '2px' : '6px'};margin-bottom:5px}
.info-box{flex:1;border:1px solid #333;border-radius:4px;overflow:hidden;background:#fff}
.info-title{background:#f5f5f5;padding:${isA5 ? '2px 6px' : '3px 8px'};font-weight:900;font-size:${isA5 ? '9px' : '10px'};border-bottom:1px solid #333}
.info-body{padding:${isA5 ? '2px 6px' : '4px 8px'}; display: grid; grid-template-columns: 1fr; gap: 2px 15px;}
.info-row{font-size:${isA5 ? '8.5px' : '9.5px'};margin-bottom:${isA5 ? '0px' : '1px'};display:flex;gap:4px}
.ik{color:#666;min-width:${isA5 ? '55px' : '70px'};flex-shrink:0}
.iv{color:#111;font-weight:800}

table{width:100%;border-collapse:collapse;border:${tableBorder}}
thead{background:#f0f0f0; color: #111;}
thead th{padding:${isA5 ? '4px 3px' : '7px 4px'};font-size:${isA5 ? '8.5px' : '10px'};font-weight:900;color:#111;text-align:center;border:${tableBorder};line-height:1.4;white-space:nowrap}
tbody td{padding:${isA5 ? '4px 3px' : '7px 4px'};font-size:${isA5 ? '8.5px' : '10px'};color:#1a1a1a;text-align:center;border-left:${cellBorder};border-right:${cellBorder};vertical-align:middle;line-height:1.4;white-space:nowrap}
tbody tr{border-bottom:${rowBorder}; background: #fff;}
tbody tr:nth-child(even){background: #fff;}
.item-name{font-weight:800;font-size:10px}

.bottom-wrap{display:flex;justify-content:space-between;align-items:flex-start;gap:6px;margin-top:3px}
.totals{min-width:${isA5 ? '180px' : '260px'};border:1px solid #333;border-radius:6px;overflow:hidden;background:#fff}
.t-row{display:flex;justify-content:space-between;padding:${isA5 ? '2px 6px' : '4px 10px'};border-bottom:1px solid #ddd;font-size:${isA5 ? '8.5px' : '10px'}}
.t-main{background:#f0f0f0;color:#111;font-weight:900;border-bottom:1px solid #333;font-size:${isA5 ? '10px' : '12px'}}
.t-subtotal{background:#f9fafb;color:#111;font-weight:700}

.footer{margin-top:5px;padding-top:4px;border-top:1px dashed #ccc}
.footer-inner{display:flex;justify-content:space-between;align-items:flex-end}
.sig-box{text-align:center;min-width:${isA5 ? '100px' : '130px'}}
.sig-label{font-size:${isA5 ? '8.5px' : '9.5px'};font-weight:800;color:#333;margin-bottom:${isA5 ? '15px' : '22px'}}
.sig-line{border-top:1px solid #111;padding-top:2px;font-size:${isA5 ? '8.5px' : '9.5px'};font-weight:800}
.qr-box{text-align:center;padding:4px}
.qr-box canvas{display:block;margin:0 auto}
.qr-label{font-size:10px;color:#666;margin-top:2px}
.en-sub{font-size:100%;color:#555;font-family:sans-serif}
@media screen{.page{min-height:100vh}}
</style>
</head>
<body>
<div class="page">
<div class="header">
    <div class="logo-block" style="flex:1.2; text-align:right">
        ${isSaudi
            ? (co.logo ? `<img src="${co.logo}" style="max-height:80px; max-width:150px; object-fit:contain" alt=""/>` : `<span style="font-size:16px;font-weight:900;">${co.name}</span>`)
            : (country === 'EG'
                ? `<div style="text-align:right;">
                     <div style="font-size:22px; font-weight:900; color:#000;">${co.name}</div>
                     <div style="font-size:10px; color:#444; margin-top:3px;">${co.addrLines.map(a => a.value).join(' - ')}</div>
                     ${co.phone ? `<div style="font-size:11px; color:#555; margin-top:2px;">الهاتف: ${co.phone}</div>` : ''}
                     ${co.tax ? `<div style="font-size:11px; color:#555;">رقم ضريبي: ${co.tax}</div>` : ''}
                     ${co.cr ? `<div style="font-size:11px; color:#555;">سجل تجاري: ${co.cr}</div>` : ''}
                   </div>`
                : `<div style="font-size:16px; font-weight:900; margin-bottom:4px; color:#111;">${co.name}</div>
                   <div style="font-size:11px; color:#444; margin-bottom:2px;">${co.addrLines.map(a => a.value).join(' - ')}</div>
                   <div style="font-size:11px; color:#444;">
                      ${co.phone ? `الهاتف: &rlm;${co.phone}` : ''}
                      ${co.tax ? ` ${co.phone ? '| ' : ''}رقم ضريبي: &rlm;${co.tax}` : ''}
                      ${co.cr ? ` ${(co.phone || co.tax) ? '| ' : ''}سجل تجاري: &rlm;${co.cr}` : ''}
                   </div>`
            )
        }
    </div>
    <div class="header-center" style="flex:1; text-align:center">
        <div class="inv-title">${!isTrading || isServicesLine ? (isSale ? 'فاتورة خدمات' : 'فاتورة مشتريات خدمات') : title}</div>
        ${isBilingual ? `<div class="inv-title-en">${!isTrading || isServicesLine ? (isSale ? 'Service Invoice' : 'Purchase Service Invoice') : titleEn}</div>` : ''}
        ${isSaudi ? `<div style="font-size:10px;color:#888;margin-top:2px">فاتورة ضريبية مبسطة / Simplified Tax Invoice</div>` : ''}
        <div class="inv-num" style="margin-top:6px; font-size:13px;">${isServicesLine ? 'SRV' : prefix}-${invoiceNum}</div>
        <div style="font-size:11px; color:#555; margin-top:2px;">${date}</div>
        ${invoice.customerPONumber ? `<div style="font-size:10px; color:#444; margin-top:3px; font-family:monospace; direction:ltr; background:#f5f5f5; border:1px solid #ddd; border-radius:4px; padding:2px 8px; display:inline-block;">${isBilingual ? 'PO: ' : 'رقم الطلب: '}${invoice.customerPONumber}</div>` : ''}
    </div>
    <div class="co-block" style="flex:1.2; text-align:left">
        ${hasValidTax ? generateQRSVG(zatcaQR, 80, 80) : ''}
    </div>
</div>

<div class="info-wrap">
    <!-- بيانات البائع -->
    ${isSaudi ? `
    <div class="info-box">
        <div class="info-title">${blInline('من', 'From')}</div>
        <div class="info-body">
            <div class="info-row"><span class="ik">${blInline('الشركة', 'Company')}:</span><span class="iv">${co.name}${co.nameEn ? ` / ${co.nameEn}` : ''}</span></div>
            ${isBilingual
                ? co.addrLines.map(a => `<div class="info-row"><span class="ik">${a.label}:</span><span class="iv">${a.value}</span></div>`).join('')
                : co.addrLines.length > 0 ? `<div class="info-row"><span class="ik">العنوان:</span><span class="iv">${co.addrLines.map(a => a.value).join('، ')}</span></div>` : ''
            }
            ${co.phone ? `<div class="info-row"><span class="ik">${blInline('الهاتف', 'Phone')}:</span><span class="iv">&rlm;${co.phone}</span></div>` : ''}
            ${co.tax ? `<div class="info-row"><span class="ik">${blInline('الرقم الضريبي', 'VAT No')}:</span><span class="iv">&rlm;${co.tax}</span></div>` : ''}
            ${co.cr ? `<div class="info-row"><span class="ik">${blInline('السجل التجاري', 'C.R')}:</span><span class="iv">&rlm;${co.cr}</span></div>` : ''}
        </div>
    </div>
    ` : ''}

    <!-- بيانات الطرف -->
    <div class="info-box">
        <div class="info-title">${blInline('إلى', 'To')}</div>
        <div class="info-body">
            <div class="info-row"><span class="ik">${blInline(partyLabel, partyLabelEn)}:</span><span class="iv">${partyName}</span></div>
            ${party?.phone ? `<div class="info-row"><span class="ik">${blInline('الهاتف', 'Phone')}:</span><span class="iv">${party.phone}</span></div>` : ''}
            ${(() => {
            const parts = [party?.addressRegion, party?.addressCity, party?.addressDistrict, party?.addressStreet].filter(Boolean) as string[];
            if (!parts.length) return '';
            if (!isBilingual) return `<div class="info-row"><span class="ik">العنوان:</span><span class="iv">${parts.join('، ')}</span></div>`;
            return ([
                party?.addressRegion ? { label: blInline('المنطقة', 'Region'), value: party.addressRegion } : null,
                party?.addressCity ? { label: blInline('المدينة', 'City'), value: party.addressCity } : null,
                party?.addressDistrict ? { label: blInline('الحي', 'District'), value: party.addressDistrict } : null,
                party?.addressStreet ? { label: blInline('الشارع', 'Street'), value: party.addressStreet } : null,
            ].filter(Boolean) as { label: string; value: string }[]).map(a => `<div class="info-row"><span class="ik">${a.label}:</span><span class="iv">${a.value}</span></div>`).join('');
        })()}
            ${party?.taxNumber ? `<div class="info-row"><span class="ik">${blInline('الرقم الضريبي', 'VAT No.')}:</span><span class="iv">${party.taxNumber}</span></div>` : ''}
            ${party?.commercialRegister ? `<div class="info-row"><span class="ik">${blInline('السجل التجاري', 'C.R.')}:</span><span class="iv">${party.commercialRegister}</span></div>` : ''}
        </div>
    </div>


</div>

<table style="margin-top: 0px;">
    <thead>
        <tr>
            <th style="width:5%">${bl('م', '#')}</th>
            <th style="width:45%;text-align:right">${isServicesLine ? bl('الخدمة / الوصف', 'Service / Description') : bl('الصنف', 'Item')}</th>
            ${!isServicesLine ? `<th style="width:10%">${bl('الوحدة', 'Unit')}</th>` : ''}
            <th style="width:10%">${bl('الكمية', 'Qty')}</th>
            <th style="width:10%">${bl('السعر', 'Price')}</th>
            ${isSaudi ? `<th style="width:12%">${bl('المبلغ الخاضع للضريبة', 'Taxable Amount')}</th>` : ''}
            ${invoiceTaxRate > 0 ? `
                <th style="width:8%">${bl('نسبة الضريبة', 'Tax %')}</th>
            ` : ''}
            ${invoiceTaxRate > 0 ? `
                <th style="width:10%">${bl('قيمة الضريبة', 'Tax Amt')}</th>
            ` : ''}
            <th style="width:10%">${bl('الإجمالي', 'Total')}</th>
        </tr>
    </thead>
    <tbody>
        ${lines.length === 0 ? '<tr><td colspan="10" style="padding:20px;color:#999">لا توجد بنود في هذه الفاتورة</td></tr>' : lines.map((l: any, i: number) => {
            const unit = l.item?.unit?.name || l.unit?.name || l.unit || '—';
            const name = l.item?.name || l.itemName || l.name || 'صنف غير معروف';
            const desc = l.description || '';
            const qty = Number(l.quantity || 0);
            const price = Number(l.price || 0);
            const lineBase = qty * price;
            // per-line tax: use line's own taxAmount if set, otherwise distribute invoice tax rate
            const lineTaxRate = Number(l.taxRate || 0) || invoiceTaxRate;
            const lineTaxAmount = Number(l.taxAmount || 0) || (taxInclusive ? 0 : parseFloat((lineBase * lineTaxRate / 100).toFixed(2)));
            const lineTotal = taxInclusive ? lineBase : lineBase + lineTaxAmount;

            return `<tr>
                <td>${i + 1}</td>
                <td style="text-align:right">
                    <div class="item-name">${name}</div>
                    ${desc ? `<div style="font-size:11px;color:#444;margin-top:2px;font-weight:700">${desc}</div>` : ''}
                </td>
                ${!isServicesLine ? `<td>${unit}</td>` : ''}
                <td><strong>${qty.toLocaleString('en-US')}</strong></td>
                <td>${price.toLocaleString('en-US')} ${sym}</td>
                ${isSaudi ? `<td>${lineBase.toLocaleString('en-US')} ${sym}</td>` : ''}
                ${invoiceTaxRate > 0 ? `
                    <td>${lineTaxRate}%</td>
                ` : ''}
                ${invoiceTaxRate > 0 ? `
                    <td>${lineTaxAmount.toLocaleString('en-US')} ${sym}</td>
                ` : ''}
                <td><strong>${lineTotal.toLocaleString('en-US')} ${sym}</strong></td>
            </tr>`;
        }).join('')}
    </tbody>
</table>

<div class="bottom-wrap" style="flex-direction: column; gap: 0;">
    ${(() => {
            const cleanNotes = (invoice.notes || '').replace(/\(تم التحويل من عرض سعر رقم: \d+\)/g, '').trim();
            if (!cleanNotes) return '';
            return `
    <div style="border:1.5px solid #ccc;padding:10px;font-size:11px;color:#555;border-radius:8px;margin-bottom:10px; width:100%">
        <strong>${blInline('ملاحظات', 'Notes')}: </strong>${cleanNotes}
    </div>`;
        })()}
    ${(isSaudi || isServicesCompany) ? `
    <div style="width: 100%; text-align: left; margin-top: 10px; clear: both; display: block;">
        <table style="width: 340px; display: inline-table; border-collapse: collapse; border: 1.5px solid #333; background: #fff; line-height: 1.4;">
            <tbody>
                <tr>
                    <td style="text-align:right; border: 1px solid #ccc; padding: 6px;">
                        <div style="font-weight:700;">الإجمالي غير شامل الضريبة</div>
                        <div style="color:#555; font-size:90%; font-family: sans-serif;">Total (Excluding VAT)</div>
                    </td>
                    <td style="text-align:center; font-weight:900; border: 1px solid #ccc; padding: 6px; width: 120px;">${subtotal.toLocaleString('en-US')} ${sym}</td>
                </tr>
                <tr>
                    <td style="text-align:right; border: 1px solid #ccc; padding: 6px;">
                        <div style="font-weight:700;">مجموع الخصومات</div>
                        <div style="color:#555; font-size:90%; font-family: sans-serif;">Total Discounts</div>
                    </td>
                    <td style="text-align:center; font-weight:900; border: 1px solid #ccc; padding: 6px;">${discount.toLocaleString('en-US')} ${sym}</td>
                </tr>
                <tr>
                    <td style="text-align:right; border: 1px solid #ccc; padding: 6px;">
                        <div style="font-weight:700;">الإجمالي الخاضع للضريبة</div>
                        <div style="color:#555; font-size:90%; font-family: sans-serif;">Total Taxable Amount</div>
                    </td>
                    <td style="text-align:center; font-weight:900; border: 1px solid #ccc; padding: 6px;">${(subtotal - discount).toLocaleString('en-US')} ${sym}</td>
                </tr>
                ${(() => {
                const displayTax = invoiceTaxAmount > 0 ? invoiceTaxAmount
                    : parseFloat(lines.reduce((acc: number, l: any) => acc + (Number(l.quantity || 0) * Number(l.price || 0) * invoiceTaxRate / 100), 0).toFixed(2));
                return `
                <tr>
                    <td style="text-align:right; border: 1px solid #ccc; padding: 6px;">
                        <div style="font-weight:700;">مجموع ضريبة القيمة المضافة ${invoiceTaxRate > 0 ? `(${invoiceTaxRate}%)` : ''}</div>
                        <div style="color:#555; font-size:90%; font-family: sans-serif;">Total VAT</div>
                    </td>
                    <td style="text-align:center; font-weight:900; border: 1px solid #ccc; padding: 6px;">${displayTax.toLocaleString('en-US')} ${sym}</td>
                </tr>`;
            })()}
                <tr style="background:#f0f0f0; border-top: 1.5px solid #111;">
                    <td style="text-align:right; border: 1px solid #ccc; padding: 8px;">
                        <div style="font-weight:900; color:#111;">إجمالي المبلغ المستحق</div>
                        <div style="font-weight:900; color:#444; font-size:90%; font-family: sans-serif;">Total Amount Due</div>
                    </td>
                    <td style="text-align:center; font-weight:950; font-size:14px; color:#111; border: 1px solid #ccc; padding: 8px;">${total.toLocaleString('en-US')} ${sym}</td>
                </tr>
                ${(isServicesLine && paid === 0) ? '' : `
                <tr>
                    <td style="text-align:right; border: 1px solid #ccc; padding: 6px;">
                        <div style="font-weight:700;">المبلغ المدفوع</div>
                        <div style="color:#555; font-size:90%; font-family: sans-serif;">Amount Paid</div>
                    </td>
                    <td style="text-align:center; font-weight:900; color:#111; border: 1px solid #ccc; padding: 6px;">${paid.toLocaleString('en-US')} ${sym}</td>
                </tr>
                <tr>
                    <td style="text-align:right; border: 1px solid #ccc; padding: 6px;">
                        <div style="font-weight:700;">المتبقي المستحق</div>
                        <div style="color:#555; font-size:90%; font-family: sans-serif;">Remaining Amount</div>
                    </td>
                    <td style="text-align:center; font-weight:900; color:#111; border: 1px solid #ccc; padding: 6px;">${remaining.toLocaleString('en-US')} ${sym}</td>
                </tr>
                `}
            </tbody>
        </table>
    </div>
    ` : `
    <!-- Summary Section (For EG and others) -->
    <div style="width: 100%; text-align: left; margin-top: 8px; clear: both; display: block;">
        <div style="width: 320px; display: inline-block; vertical-align: top;">
            ${(() => {
            const showDiscount = discount > 0;
            const showTax = invoiceTaxRate > 0 || invoiceTaxAmount > 0;

            const prevBal = isSale
                ? (invoice.customerPrevBalance ?? (Number(partyBalance) - (total - paid)))
                : (invoice.supplierPrevBalance ?? (Number(partyBalance) - (paid - total)));

            const finalBal = isSale
                ? (invoice.customerNewBalance ?? Number(partyBalance))
                : (invoice.supplierNewBalance ?? Number(partyBalance));

            const effect = total - paid;
            const formatBal = (val: number) => {
                const abs = Math.abs(val).toLocaleString('en-US');
                const suffix = isSale ? (val > 0 ? ' (عليه)' : val < 0 ? ' (له)' : '') : (val < 0 ? ' (له)' : val > 0 ? ' (لنا)' : '');
                return `${abs} ${sym}${suffix}`;
            };

            const displayTax = invoiceTaxAmount > 0 ? invoiceTaxAmount
                : parseFloat(lines.reduce((acc: number, l: any) => acc + (Number(l.quantity || 0) * Number(l.price || 0) * invoiceTaxRate / 100), 0).toFixed(2));

            return `
                <table style="width:100%; border-collapse:collapse; border: 1px solid #111; font-size: 13px; line-height: 1.4;">
                    <tbody>
                        <tr>
                            <td style="width:60%; text-align:right; font-weight:500; border: 1px solid #999; padding: 6px 10px; color: #444;">الإجمالي قبل الخصم والضريبة</td>
                            <td style="width:40%; text-align:left; font-weight:700; border: 1px solid #999; padding: 6px 10px;">${subtotal.toLocaleString('en-US')} ${sym}</td>
                        </tr>
                        ${showDiscount ? `<tr><td style="text-align:right; font-weight:500; border: 1px solid #999; padding: 6px 10px; color: #444;">الخصم</td><td style="text-align:left; font-weight:700; border: 1px solid #999; padding: 6px 10px; color: #d32f2f;">${discount.toLocaleString('en-US')} ${sym}</td></tr>` : ''}
                        ${showTax ? `<tr><td style="text-align:right; font-weight:500; border: 1px solid #999; padding: 6px 10px; color: #444;">إجمالي الضريبة</td><td style="text-align:left; font-weight:700; border: 1px solid #999; padding: 6px 10px;">${displayTax.toLocaleString('en-US')} ${sym}</td></tr>` : ''}
                        <tr style="background:#f2f2f2;"><td style="text-align:right; font-weight:900; border: 1px solid #999; padding: 6px 10px; color: #000;">إجمالي الفاتورة</td><td style="text-align:left; font-weight:900; border: 1px solid #999; padding: 6px 10px; color: #000;">${total.toLocaleString('en-US')} ${sym}</td></tr>
                        <tr><td style="text-align:right; font-weight:500; border: 1px solid #999; padding: 6px 10px; color: #444;">المبلغ المدفوع</td><td style="text-align:left; font-weight:700; border: 1px solid #999; padding: 6px 10px;">${paid.toLocaleString('en-US')} ${sym}</td></tr>
                        <tr><td style="text-align:right; font-weight:500; border: 1px solid #999; padding: 6px 10px; color: #444;">المبلغ المتبقي</td><td style="text-align:left; font-weight:700; border: 1px solid #999; padding: 6px 10px;">${remaining.toLocaleString('en-US')} ${sym}</td></tr>
                        ${(partyBalance !== null || invoice.customerPrevBalance !== null || invoice.supplierPrevBalance !== null) ? `
                        <tr><td style="text-align:right; font-weight:500; border: 1px solid #999; padding: 6px 10px; color: #444;">الرصيد السابق لـ ${partyLabel}</td><td style="text-align:left; font-weight:700; border: 1px solid #999; padding: 6px 10px;">${formatBal(prevBal)}</td></tr>
                        <tr><td style="text-align:right; font-weight:500; border: 1px solid #999; padding: 6px 10px; color: #444;">صافي تأثير الفاتورة</td><td style="text-align:left; font-weight:700; border: 1px solid #999; padding: 6px 10px; direction: ltr;">${effect > 0 ? '+' : ''}${effect.toLocaleString('en-US')} ${sym}</td></tr>
                        <tr style="background:#f2f2f2;"><td style="text-align:right; font-weight:900; border: 1px solid #999; padding: 6px 10px; color: #000;">إجمالي رصيد ${partyLabel} الحالي</td><td style="text-align:left; font-weight:900; border: 1px solid #999; padding: 6px 10px; color: #000;">${formatBal(finalBal)}</td></tr>
                        ` : ''}
                    </tbody>
                </table>`;
        })()}
        </div>
    </div>
    `}

    <!-- Final Footer (Signatures) - Applies to both Saudi and regular -->
    <div class="footer" style="margin-top: auto; padding-top: 30px; border-top: none; width: 100%;">
        <div class="footer-inner" style="display: flex; justify-content: space-between; align-items: flex-end; width: 100%;">
            <div style="text-align: center; width: 220px;">
                <div style="font-weight: 900; font-size: 10.5px; margin-bottom: 25px; color: #000;">${blInline('توقيع المستلم', 'Recipient Signature')}</div>
                <div style="border-top: 1.5px solid #111; padding-top: 5px; font-size: 8.5px; color: #444; font-weight: 600;">${blInline('الاسم والتوقيع', 'Name & Signature')}</div>
            </div>
            <div style="text-align: center; color: #aaa; font-size: 9.5px; margin-bottom: 5px; font-weight: 600;">
                شكراً لتعاملكم معنا
            </div>
            <div style="text-align: center; width: 220px;">
                <div style="font-weight: 900; font-size: 10.5px; margin-bottom: 25px; color: #000;">${blInline('توقيع المسؤول', 'Authorized Signature')}</div>
                <div style="border-top: 1.5px solid #111; padding-top: 5px; font-size: 8.5px; color: #444; font-weight: 600;">${blInline('الختم والتوقيع', 'Stamp & Signature')}</div>
            </div>
        </div>
    </div>
</div>
${options.noAutoPrint ? '' : (isSaudi ? `
<script>
window.onload = () => { setTimeout(() => window.print(), 500); };
</script>` : '<script>window.onload=()=>setTimeout(()=>window.print(),400);</script>')}
</body>
</html>`;

    return html;
}

// ── Print (opens new tab + auto-print) ──────────────────────────────────────
export function printA4Invoice(
    invoice: any,
    type: InvoiceType,
    company: CompanyInfo = {},
    options: { terms?: string; showSignature?: boolean; showStamp?: boolean; partyBalance?: number } = {}
) {
    const html = generateA4HTML(invoice, type, company, options);
    const win = window.open('', '_blank');
    if (win) { 
        win.document.write(html); 
        const match = html.match(/<title>(.*?)<\/title>/i);
        if (match && match[1]) win.document.title = match[1].trim();
        win.document.close(); 
    }
}


export function generateThermalVoucherHTML(voucher: any, type: VoucherType, company: CompanyInfo = {}, options: { noAutoPrint?: boolean; isA5?: boolean } = {}): string {
    const sym = getCurrencySymbol(company.currency || 'EGP');
    const country = (company.countryCode || 'EG').toUpperCase();
    const isBilingual = country !== 'EG';
    const isA5 = options.isA5 || false;

    const co = {
        name: company.name || 'اسم الشركة',
        nameEn: company.nameEn || '',
        addr: [company.addressRegion, company.addressCity, company.addressDistrict, company.addressStreet].filter(Boolean).join(' - '),
        phone: company.phone || '',
        logo: company.logo || '',
        tax: company.taxNumber || '',
    };

    const isReceipt = type === 'receipt';
    const title = isReceipt ? 'سند قبض' : 'سند صرف';
    const titleEn = isReceipt ? 'Receipt Voucher' : 'Payment Voucher';
    const vNum = String(voucher.voucherNumber || 1).padStart(5, '0');
    const date = new Date(voucher.date || new Date()).toLocaleDateString('en-ZA');

    const bl = (ar: string, en: string) => isBilingual ? `${ar}<br><span style="font-size:100%;color:#555;font-family:sans-serif">${en}</span>` : ar;
    const blInline = (ar: string, en: string) => isBilingual ? `${ar} / <span style="font-size:100%;font-family:sans-serif">${en}</span>` : ar;

    return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"/>
<title>${title} - ${vNum}</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet">
<style>
    *{margin:0;padding:0;box-sizing:border-box}
    :root {
        --base-font: ${isA5 ? '9px' : '11px'};
        --header-name: ${isA5 ? '16px' : '21px'};
        --title-font: ${isA5 ? '13px' : '17px'};
        --logo-h: ${isA5 ? '45px' : '75px'};
        --page-padding: ${isA5 ? '3mm 5mm' : '4mm 8mm'};
    }
    body{font-family:'Cairo',sans-serif;color:#111;font-size:var(--base-font);background:#fff;direction:rtl}
    .page{width:100%; max-width: 850px; min-height: 282mm; margin:0 auto;padding:var(--page-padding);display:flex;flex-direction:column; background: #fff;}
    
    .header{display:flex;justify-content:space-between;align-items:center;padding-bottom:10px;border-bottom:2px solid #111;margin-bottom:20px}
    .co-block{flex:1;text-align:right}
    .co-name{font-size:var(--header-name);font-weight:900;color:#111;margin-bottom:1px}
    .co-line{font-size:${isA5 ? '8.5px' : '10px'};color:#444;line-height:1.4}
    .header-center{flex:1;text-align:center}
    .inv-title{font-size:var(--title-font);font-weight:900;color:#111;background:#f5f5f5;padding:2px 14px;border-radius:6px;display:inline-block;border:1px solid #ccc}
    .inv-num{font-size:${isA5 ? '10px' : '13px'};color:#333;font-family:monospace;font-weight:700;margin-top:6px}
    .logo-block{flex:1;text-align:left}
    .logo-block img{max-height:var(--logo-h);max-width:150px;object-fit:contain}
    
    .amount-box{margin-top:20px;border:2px solid #111;padding:15px;border-radius:10px;text-align:center;background:#fcfcfc}
    .amount-label{font-size:12px;font-weight:900;margin-bottom:5px}
    .amount-val{font-size:24px;font-weight:900;color:#111;font-family:monospace}
    
    .info-wrap{margin-top:20px;border:1px solid #333;border-radius:8px;overflow:hidden}
    .info-row{display:flex;border-bottom:1px solid #333}
    .info-row:last-child{border-bottom:none}
    .ik{width:${isA5 ? '130px' : '180px'};background:#f5f5f5;padding:10px;font-weight:900;border-left:1px solid #333; font-size:${isA5 ? '9px' : '10.5px'}}
    .iv{flex:1;padding:10px;font-weight:800; font-size:${isA5 ? '9.5px' : '11.5px'}}
    
    .footer{margin-top: auto; padding-top: 30px; border-top: none; width: 100%;}
    .footer-inner{display:flex;justify-content:space-between;align-items:flex-end; width: 100%;}
    .sig-box{text-align:center;width:${isA5 ? '120px' : '220px'}}
    .sig-label{font-size:10.5px;font-weight:900;color:#000;margin-bottom:25px}
    .sig-line{border-top:1.5px solid #111;padding-top:5px;font-size:8.5px;color:#444;font-weight:600}

    @media screen { .page { min-height: 100vh; } }
    @media print {
        @page { size: ${isA5 ? 'A5 portrait' : 'A4 portrait'}; margin: 5mm; }
        body { background: #fff; -webkit-print-color-adjust: exact; }
        .page { min-height: auto !important; width: 100% !important; max-width: none !important; padding: 0 !important; margin: 0 !important; box-shadow: none; }
    }
</style>
</head>
<body>
<div class="page">
    <div class="header">
        <div class="co-block">
            <div class="co-name">${co.name}</div>
            <div class="co-line">${co.addr}</div>
            ${co.phone ? `<div class="co-line">الهاتف: ${co.phone}</div>` : ''}
            ${co.tax ? `<div class="co-line">رقم ضريبي: ${co.tax}</div>` : ''}
        </div>
        <div class="header-center">
            <div class="inv-title">${blInline(title, titleEn)}</div>
            <div class="inv-num">VCH-${vNum}</div>
            <div style="font-size:11px; color:#555; margin-top:2px;">${date}</div>
        </div>
        <div class="logo-block">
            ${co.logo ? `<img src="${co.logo}" alt=""/>` : ''}
        </div>
    </div>

    <div class="amount-box">
        <div class="amount-label">${blInline('المبلغ', 'Amount')}</div>
        <div class="amount-val">${Number(voucher.amount).toLocaleString()} ${sym}</div>
    </div>

    <div class="info-wrap">
        <div class="info-row"><div class="ik">${blInline(isReceipt ? 'استلمنا من السيد' : 'صرف بـأمر السيد', isReceipt ? 'Received From' : 'Payable To')}</div><div class="iv">${voucher.customer?.name || voucher.supplier?.name || '—'}</div></div>
        <div class="info-row"><div class="ik">${blInline('طريقة الدفع', 'Payment method')}</div><div class="iv">${blInline(voucher.paymentType === 'bank' ? 'تحويل بنكي' : 'نقداً', voucher.paymentType === 'bank' ? 'Bank Transfer' : 'Cash')}</div></div>
        <div class="info-row"><div class="ik">${blInline('وذلك عن / البيان', 'Being For / Desc.')}</div><div class="iv">${voucher.description || '—'}</div></div>
        ${voucher.treasury ? `<div class="info-row"><div class="ik">${blInline('الحساب المتأثر', 'Account')}</div><div class="iv">${voucher.treasury.name}</div></div>` : ''}
    </div>

    <div class="footer">
        <div class="footer-inner">
            <div class="sig-box">
                <div class="sig-label">${blInline('توقيع المقر بما فيه', 'Signature')}</div>
                <div class="sig-line">${blInline('الاسم والتوقيع', 'Name & Signature')}</div>
            </div>
            <div style="text-align: center; color: #aaa; font-size: 9.5px; margin-bottom: 5px; font-weight: 600;">
                شكراً لتعاملكم معنا
            </div>
            <div class="sig-box">
                <div class="sig-label">${blInline('توقيع المحاسب', 'Authorized')}</div>
                <div class="sig-line">${blInline('الختم والتوقيع', 'Stamp & Signature')}</div>
            </div>
        </div>
    </div>
</div>
${options.noAutoPrint ? '' : '<script>window.onload=()=>setTimeout(()=>window.print(),400);</script>'}
</body>
</html>`;
}



export function printThermalVoucher(voucher: any, type: VoucherType, company: CompanyInfo = {}) {
    const html = generateThermalVoucherHTML(voucher, type, company);
    const win = window.open('', '_blank');
    if (win) { 
        win.document.write(html); 
        const match = html.match(/<title>(.*?)<\/title>/i);
        if (match && match[1]) win.document.title = match[1].trim();
        win.document.close(); 
    }
}


export function printSaleInvoice(inv: any, cust: any, num: number, form: any, co: CompanyInfo = {}) {
    printA4Invoice({ ...inv, customer: cust, invoiceNumber: num, notes: inv.notes || form.notes }, 'sale', co);
}

export function printReturnInvoice(inv: any, cust: any, num: number, form: any, co: CompanyInfo = {}) {
    printA4Invoice({ ...inv, customer: cust, invoiceNumber: num, notes: inv.notes || form.notes }, 'sale-return', co);
}

export function printPurchaseInvoice(inv: any, supp: any, num: number, form: any, co: CompanyInfo = {}) {
    printA4Invoice({ ...inv, supplier: supp, invoiceNumber: num, notes: inv.notes || form.notes }, 'purchase', co);
}

export function printInvoice(inv: any, type: InvoiceType, sym: string = 'ج.م') {
    printA4Invoice(inv, type, { currency: sym === 'ج.م' ? 'EGP' : 'USD' });
}

// ═══════════════════════════════════════════════
//  A4 QUOTATION (عرض سعر)
// ═══════════════════════════════════════════════
export function generateQuotationHTML(
    quotation: any,
    company: CompanyInfo = {},
    options: {
        terms?: string;
        noAutoPrint?: boolean;
    } = {}
): string {
    const sym = getCurrencySymbol(company.currency || 'EGP');
    const country = (company.countryCode || 'EG').toUpperCase();
    const isBilingual = country !== 'EG';
    const isSaudi = country === 'SA';

    const qAddrLabels = {
        region: isBilingual ? 'المنطقة / Region' : 'المنطقة',
        city: isBilingual ? 'المدينة / City' : 'المدينة',
        district: isBilingual ? 'الحي / District' : 'الحي',
        street: isBilingual ? 'الشارع / Street' : 'الشارع',
    };
    const co = {
        name: company.name || 'اسم الشركة',
        nameEn: company.nameEn || '',
        addrLines: [
            company.addressRegion ? { label: qAddrLabels.region, value: company.addressRegion } : null,
            company.addressCity ? { label: qAddrLabels.city, value: company.addressCity } : null,
            company.addressDistrict ? { label: qAddrLabels.district, value: company.addressDistrict } : null,
            company.addressStreet ? { label: qAddrLabels.street, value: company.addressStreet } : null,
        ].filter(Boolean) as { label: string; value: string }[],
        phone: company.phone || '',
        email: company.email || '',
        tax: company.taxNumber || '',
        cr: company.commercialRegister || '',
        logo: company.logo || '',
        branch: company.branchName || '',
    };

    const title = 'عرض سعر';
    const titleEn = 'Price Quotation';
    const lines = quotation.lines || [];
    const subtotal = Number(quotation.subtotal || 0);
    const taxAmt = Number(quotation.taxAmount || 0);
    const total = Number(quotation.total || subtotal + taxAmt);
    const date = new Date(quotation.date || new Date()).toLocaleDateString('en-ZA');
    const dateISO = new Date(quotation.date || new Date()).toISOString();
    const quoNum = String(quotation.quotationNumber || quotation.orderNumber || 1).padStart(5, '0');

    // ZATCA QR Code for Saudi Arabia (only if country is SA and valid tax number exists)
    const cleanTaxNumber = (co.tax || '').replace(/,/g, '').trim();
    const hasValidTax = !!(isSaudi && cleanTaxNumber.length > 0);
    const zatcaQR = hasValidTax ? generateZatcaTLV(
        co.name,
        cleanTaxNumber,
        dateISO,
        total.toFixed(2),
        taxAmt.toFixed(2)
    ) : '';

    const bl = (ar: string, en: string) => isBilingual ? `${ar}<br><span style="font-size:100%;color:#555;font-family:sans-serif">${en}</span>` : ar;
    const blInline = (ar: string, en: string) => isBilingual ? `${ar} / <span style="font-size:100%;font-family:sans-serif">${en}</span>` : ar;

    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"/>
<title>عرض سعر - ${quoNum}</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Cairo',sans-serif;color:#111;font-size:11px;background:#fff;direction:rtl}
.page{width:100%;margin:0 auto;padding:4mm 8mm;display:flex;flex-direction:column;gap:5px}
.header{display:flex;justify-content:space-between;align-items:center;padding-bottom:6px;border-bottom:2px solid #111;margin-bottom:0px}
.co-block{flex:1;text-align:right}
.co-name{font-size:var(--header-name);font-weight:900;color:#111;margin-bottom:1px}
.co-name-en{font-size:10px;color:#444;line-height:1.4;margin-bottom:1px}
.co-line{font-size:10px;color:#444;line-height:1.4}
.header-center{flex:1;text-align:center}
.inv-title{font-size:17px;font-weight:900;color:#111;background:#f5f5f5;padding:2px 14px;border-radius:6px;display:inline-block;border:1px solid #ccc}
.inv-title-en{font-size:11px;font-weight:700;color:#555;margin-top:1px;font-family:sans-serif}
.inv-num{font-size:11px;color:#333;margin-top:2px;font-family:monospace;font-weight:700}
.logo-block{flex:1;text-align:left}
.logo-block img{max-height:80px;max-width:150px;object-fit:contain}
.info-wrap{display:flex;gap:8px;margin-top:6px;margin-bottom:5px}
.info-box{flex:1;border:1px solid #333;border-radius:4px;overflow:hidden;background:#fff}
.info-title{background:#f5f5f5;padding:3px 8px;font-weight:900;font-size:10px;border-bottom:1px solid #333}
.info-body{padding:4px 8px; display: grid; grid-template-columns: 1fr; gap: 2px 15px;}
.info-row{font-size:9.5px;margin-bottom:1px;display:flex;gap:4px}
.ik{color:#666;min-width:70px;flex-shrink:0}
.iv{color:#111;font-weight:800}
table{width:100%;border-collapse:collapse;border:1px solid #999;margin-top:5px}
thead{background:#f0f0f0}
thead th{padding:4px 3px;font-size:10px;font-weight:900;color:#111;text-align:center;border:1px solid #999;white-space:nowrap}
tbody td{padding:3px 4px;font-size:10px;color:#1a1a1a;text-align:center;border:1px solid #999;vertical-align:middle;white-space:nowrap}
.summary-wrap{width: 100%; text-align: left; margin-top: 8px; clear: both;}
.totals{width: 310px; display: inline-block; text-align: right; border: 1px solid #999; border-radius: 0; overflow: hidden}
.t-row{display:flex;justify-content:space-between;padding:2px 10px;border-bottom:1px solid #999;font-size:13px; height: 30px; align-items: center;}
.t-main{background:#f2f2f2;color:#111;font-weight:900;border-bottom:1px solid #999}
.notes{margin-top:10px;padding:8px 10px;border:1px dashed #ccc;border-radius:8px;font-size:10.5px}
.footer{margin-top: 15px; padding-top: 10px; border-top: 1px dashed #ccc;}
.footer-inner{display:flex;justify-content:space-between;align-items:flex-end}
.sig-box{text-align:center;min-width:130px}
.sig-label{font-size:9.5px;font-weight:800;color:#333;margin-bottom:22px}
.sig-line{font-size:9.5px;font-weight:800; color: #555}
@media screen{.page{min-height:100vh}}
@media print{@page{size:auto;margin:6mm 8mm}html,body{width:100%}.page{min-height:0 !important;width:100%;padding:0}}
</style>
</head>
<body>
<div class="page">
    <div class="header">
        <div class="logo-block" style="flex:1.2; text-align:right">
            ${isSaudi
                ? `<div style="text-align:right;">
                     <div style="font-size:22px; font-weight:900; color:#000;">${co.name}</div>
                     <div style="font-size:10px; color:#444; margin-top:3px;">${co.addrLines.map(a => a.value).join(' - ')}</div>
                     ${co.phone ? `<div style="font-size:11px; color:#555; margin-top:2px;">الهاتف: ${co.phone}</div>` : ''}
                     ${co.tax ? `<div style="font-size:11px; color:#555;">رقم ضريبي: ${co.tax}</div>` : ''}
                     ${co.cr ? `<div style="font-size:11px; color:#555;">سجل تجاري: ${co.cr}</div>` : ''}
                   </div>`
                : (country === 'EG'
                    ? `<div style="text-align:right;">
                         <div style="font-size:22px; font-weight:900; color:#000;">${co.name}</div>
                         <div style="font-size:10px; color:#444; margin-top:3px;">${co.addrLines.map(a => a.value).join(' - ')}</div>
                         ${co.phone ? `<div style="font-size:11px; color:#555; margin-top:2px;">الهاتف: ${co.phone}</div>` : ''}
                         ${co.tax ? `<div style="font-size:11px; color:#555;">رقم ضريبي: ${co.tax}</div>` : ''}
                         ${co.cr ? `<div style="font-size:11px; color:#555;">سجل تجاري: ${co.cr}</div>` : ''}
                       </div>`
                    : `<div>
                         <span class="co-name">${co.name}</span>${co.nameEn ? `<span style="color:#999;font-size:13px;margin:0 4px">/</span><span class="co-name-en">${co.nameEn}</span>` : ''}
                       </div>
                       <div class="co-line">${co.addrLines.map(a => a.value).join(' - ')}</div>
                       <div class="co-line">
                           ${co.phone ? `الهاتف: ${co.phone}` : ''}
                           ${co.tax ? ` ${co.phone ? '| ' : ''}${blInline('الرقم الضريبي', 'VAT No.')}: <strong>${co.tax}</strong>` : ''}
                       </div>`
                )
            }
        </div>
        <div class="header-center">
            <div class="inv-title">${title}</div>
            ${isBilingual ? `<div class="inv-title-en">${titleEn}</div>` : ''}
            ${isSaudi ? `<div style="font-size:10px;color:#888;margin-top:2px">عرض سعر ضريبي / Tax Quotation</div>` : ''}
            <div class="inv-num" style="margin-top:6px; font-size:13px;">QUO-${quoNum}</div>
            <div style="font-size:11px; color:#555; margin-top:2px;">${date}</div>
        </div>
        <div class="co-block" style="flex:1.2; text-align:left">
            ${hasValidTax ? generateQRSVG(zatcaQR, 80, 80) : ''}
        </div>
    </div>

    <div class="info-wrap">
        <!-- بيانات البائع -->
        ${isSaudi ? `
        <div class="info-box">
            <div class="info-title">${blInline('من', 'From')}</div>
            <div class="info-body">
                <div class="info-row"><span class="ik">${blInline('الشركة', 'Company')}:</span><span class="iv">${co.name}${co.nameEn ? ` / ${co.nameEn}` : ''}</span></div>
                ${isBilingual
                    ? co.addrLines.map(a => `<div class="info-row"><span class="ik">${a.label}:</span><span class="iv">${a.value}</span></div>`).join('')
                    : co.addrLines.length > 0 ? `<div class="info-row"><span class="ik">العنوان:</span><span class="iv">${co.addrLines.map(a => a.value).join('، ')}</span></div>` : ''
                }
                ${co.phone ? `<div class="info-row"><span class="ik">${blInline('الهاتف', 'Phone')}:</span><span class="iv">&rlm;${co.phone}</span></div>` : ''}
                ${co.tax ? `<div class="info-row"><span class="ik">${blInline('الرقم الضريبي', 'VAT No')}:</span><span class="iv">&rlm;${co.tax}</span></div>` : ''}
                ${co.cr ? `<div class="info-row"><span class="ik">${blInline('السجل التجاري', 'C.R')}:</span><span class="iv">&rlm;${co.cr}</span></div>` : ''}
            </div>
        </div>
        ` : ''}

        <div class="info-box">
            <div class="info-title">${blInline('بيانات العميل', 'Customer Info')}</div>
            <div class="info-body">
                <div class="info-row"><span class="ik">${blInline('العميل', 'Customer')}:</span><span class="iv">${quotation.customer?.name || 'عميل نقدي'}</span></div>
                ${quotation.customer?.phone ? `<div class="info-row"><span class="ik">${blInline('الهاتف', 'Phone')}:</span><span class="iv">${quotation.customer.phone}</span></div>` : ''}
                ${quotation.customer?.taxNumber ? `<div class="info-row"><span class="ik">${blInline('الرقم الضريبي', 'VAT No.')}:</span><span class="iv">${quotation.customer.taxNumber}</span></div>` : ''}
                ${(() => {
                    const parts = [quotation.customer?.addressRegion, quotation.customer?.addressCity, quotation.customer?.addressDistrict, quotation.customer?.addressStreet].filter(Boolean) as string[];
                    if (!parts.length) return '';
                    return `<div class="info-row"><span class="ik">${blInline('العنوان', 'Address')}:</span><span class="iv">${parts.join('، ')}</span></div>`;
                })()}
            </div>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th style="width:5%">${bl('م', '#')}</th>
                <th style="width:35%;text-align:right">${company.businessType?.toUpperCase() === 'SERVICES' ? bl('الخدمة', 'Service') : bl('الصنف', 'Item')}</th>
                <th style="width:8%">${bl('الوحدة', 'Unit')}</th>
                <th style="width:8%">${bl('الكمية', 'Qty')}</th>
                <th style="width:12%">${bl('السعر', 'Price')}</th>
                ${Number(quotation.taxRate || 0) > 0 ? `
                    <th style="width:8%">${bl('نسبة الضريبة', 'Tax %')}</th>
                    <th style="width:10%">${bl('قيمة الضريبة', 'Tax Amt')}</th>
                ` : ''}
                <th style="width:15%">${bl('الإجمالي', 'Total')}</th>
            </tr>
        </thead>
        <tbody>
            ${lines.map((l: any, i: number) => {
            const lineTaxRate = Number(l.taxRate || 0) || Number(quotation.taxRate || 0);
            const lineBase = Number(l.quantity || 0) * Number(l.price || 0);
            const lineTaxAmt = (lineBase * lineTaxRate) / 100;
            // الحساب الصحيح: السعر الأساسي + مبلغ الضريبة
            const lineTotal = lineBase + lineTaxAmt;

            return `
            <tr>
                <td>${i + 1}</td>
                <td style="text-align:right">
                    <div style="font-weight:800">${l.item?.name || l.itemName || ''}</div>
                    ${l.description ? `<div style="font-size:10px;color:#444;margin-top:2px">${l.description}</div>` : ''}
                </td>
                <td>${l.item?.unit?.name || l.unit?.name || l.unit || '—'}</td>
                <td><strong>${Number(l.quantity).toLocaleString('en-US')}</strong></td>
                <td>${Number(l.price).toLocaleString('en-US')} ${sym}</td>
                ${Number(quotation.taxRate || 0) > 0 ? `
                    <td>${lineTaxRate}%</td>
                    <td>${lineTaxAmt.toLocaleString('en-US')} ${sym}</td>
                ` : ''}
                <td><strong>${lineTotal.toLocaleString('en-US')} ${sym}</strong></td>
            </tr>`;
        }).join('')}
        </tbody>
    </table>

    <div class="summary-wrap" style="display: flex; flex-direction: column; align-items: flex-end; width: 100%;">
        ${isSaudi ? `
        <table style="width: 340px; display: inline-table; border-collapse: collapse; border: 1.5px solid #333; background: #fff; line-height: 1.4; margin-top: 10px;">
            <tbody>
                <tr>
                    <td style="text-align:right; border: 1px solid #ccc; padding: 6px;">
                        <div style="font-weight:700;">الإجمالي غير شامل الضريبة</div>
                        <div style="color:#555; font-size:90%; font-family: sans-serif;">Total (Excluding VAT)</div>
                    </td>
                    <td style="text-align:center; font-weight:900; border: 1px solid #ccc; padding: 6px; width: 120px;">${subtotal.toLocaleString('en-US')} ${sym}</td>
                </tr>
                ${Number(quotation.discount || 0) > 0 ? `
                <tr>
                    <td style="text-align:right; border: 1px solid #ccc; padding: 6px;">
                        <div style="font-weight:700;">مجموع الخصومات</div>
                        <div style="color:#555; font-size:90%; font-family: sans-serif;">Total Discounts</div>
                    </td>
                    <td style="text-align:center; font-weight:900; border: 1px solid #ccc; padding: 6px;">${Number(quotation.discount).toLocaleString('en-US')} ${sym}</td>
                </tr>` : ''}
                <tr>
                    <td style="text-align:right; border: 1px solid #ccc; padding: 6px;">
                        <div style="font-weight:700;">الإجمالي الخاضع للضريبة</div>
                        <div style="color:#555; font-size:90%; font-family: sans-serif;">Total Taxable Amount</div>
                    </td>
                    <td style="text-align:center; font-weight:900; border: 1px solid #ccc; padding: 6px;">${(subtotal - Number(quotation.discount || 0)).toLocaleString('en-US')} ${sym}</td>
                </tr>
                ${taxAmt > 0 ? `
                <tr>
                    <td style="text-align:right; border: 1px solid #ccc; padding: 6px;">
                        <div style="font-weight:700;">مجموع ضريبة القيمة المضافة (${quotation.taxRate}%)</div>
                        <div style="color:#555; font-size:90%; font-family: sans-serif;">Total VAT</div>
                    </td>
                    <td style="text-align:center; font-weight:900; border: 1px solid #ccc; padding: 6px;">${taxAmt.toLocaleString('en-US')} ${sym}</td>
                </tr>` : ''}
                <tr style="background:#f0f0f0; border-top: 1.5px solid #111;">
                    <td style="text-align:right; border: 1px solid #ccc; padding: 8px;">
                        <div style="font-weight:900; color:#111;">إجمالي المبلغ المستحق</div>
                        <div style="font-weight:900; color:#444; font-size:90%; font-family: sans-serif;">Total Amount Due</div>
                    </td>
                    <td style="text-align:center; font-weight:950; font-size:14px; color:#111; border: 1px solid #ccc; padding: 8px;">${total.toLocaleString('en-US')} ${sym}</td>
                </tr>
            </tbody>
        </table>
        ` : `
        <div class="totals">
            <div class="t-row">
                <span>${blInline('المجموع الفرعي', 'Subtotal')}:</span>
                <span>${subtotal.toLocaleString('en-US')} ${sym}</span>
            </div>
            ${Number(quotation.discount || 0) > 0 ? `
            <div class="t-row">
                <span>${blInline('الخصم', 'Discount')}:</span>
                <span>${Number(quotation.discount).toLocaleString('en-US')} ${sym}</span>
            </div>` : ''}
            ${taxAmt > 0 ? `
            <div class="t-row">
                <span>${blInline('الضريبة', 'VAT')} (${quotation.taxRate}%):</span>
                <span>${taxAmt.toLocaleString('en-US')} ${sym}</span>
            </div>` : ''}
            <div class="t-row t-main">
                <span>${blInline('الإجمالي النهائي', 'Total')}:</span>
                <span>${total.toLocaleString('en-US')} ${sym}</span>
            </div>
        </div>
        `}
    </div>

    ${options.terms || quotation.notes ? `
    <div class="notes">
        <div style="font-weight:800;text-decoration:underline;margin-bottom:8px">${blInline('ملاحظات وشروط إضافية', 'Additional Terms')}:</div>
        <div>${options.terms || quotation.notes}</div>
    </div>` : ''}

    <div class="footer" style="margin-top: auto; padding-top: 30px; border-top: none; width: 100%;">
        <div class="footer-inner" style="display: flex; justify-content: space-between; align-items: flex-end; width: 100%;">
            <div style="text-align: center; width: 220px;">
                <div style="font-weight: 900; font-size: 10.5px; margin-bottom: 25px; color: #000;">${blInline('توقيع المستلم', 'Recipient Signature')}</div>
                <div style="border-top: 1.5px solid #111; padding-top: 5px; font-size: 8.5px; color: #444; font-weight: 600;">${blInline('الاسم والتوقيع', 'Name & Signature')}</div>
            </div>
            <div style="text-align: center; color: #aaa; font-size: 9.5px; margin-bottom: 5px; font-weight: 600;">
                شكراً لتعاملكم معنا
            </div>
            <div style="text-align: center; width: 220px;">
                <div style="font-weight: 900; font-size: 10.5px; margin-bottom: 25px; color: #000;">${blInline('توقيع المسؤول', 'Authorized Signature')}</div>
                <div style="border-top: 1.5px solid #111; padding-top: 5px; font-size: 8.5px; color: #444; font-weight: 600;">${blInline('الختم والتوقيع', 'Stamp & Signature')}</div>
            </div>
        </div>
    </div>
</div>
${options.noAutoPrint ? '' : '<script>window.onload=()=>setTimeout(()=>window.print(),400);</script>'}
</body>
</html>`;

    return html;
}

export function printQuotation(
    quotation: any,
    company: CompanyInfo = {},
    options: { terms?: string } = {}
) {
    const html = generateQuotationHTML(quotation, company, options);
    const printWin = window.open('', '_blank');
    if (printWin) {
        printWin.document.write(html);
        const match = html.match(/<title>(.*?)<\/title>/i);
        if (match && match[1]) printWin.document.title = match[1].trim();
        printWin.document.close();
    }
}

// ═══════════════════════════════════════════════
//  A4 INSTALLMENT PLAN (جدول أقساط)
// ═══════════════════════════════════════════════
// ═══════════════════════════════════════════════
//  A4 INSTALLMENT PLAN (جدول أقساط)
// ═══════════════════════════════════════════════
export function generateInstallmentPlanHTML(plan: any, company: CompanyInfo = {}, options: { noAutoPrint?: boolean; isA5?: boolean } = {}): string {
    const sym = getCurrencySymbol(company.currency || 'EGP');
    const country = (company.countryCode || 'EG').toUpperCase();
    const isBilingual = country !== 'EG';
    const isA5 = options.isA5 || false;

    const co = {
        name: company.name || 'اسم الشركة',
        nameEn: company.nameEn || '',
        addr: [company.addressRegion, company.addressCity, company.addressDistrict, company.addressStreet].filter(Boolean).join(' - '),
        phone: company.phone || '',
        logo: company.logo || '',
        tax: company.taxNumber || '',
    };

    const date = new Date(plan.startDate || new Date()).toLocaleDateString('en-ZA');
    const planNum = String(plan.planNumber || 1).padStart(5, '0');

    const bl = (ar: string, en: string) => isBilingual ? `${ar}<br><span style="font-size:100%;color:#555;font-family:sans-serif">${en}</span>` : ar;
    const blInline = (ar: string, en: string) => isBilingual ? `${ar} / <span style="font-size:100%;font-family:sans-serif">${en}</span>` : ar;

    const statusMap: Record<string, string> = {
        paid: 'مدفوع',
        partial: 'جزئي',
        pending: 'قادم',
        overdue: 'متأخر',
        cancelled: 'ملغى'
    };

    const tableBorder = '1.5px solid #111';
    const cellBorder = '1px solid #999';

    return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"/>
<title>جدول أقساط - ${planNum}</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet">
<style>
    *{margin:0;padding:0;box-sizing:border-box}
    :root {
        --base-font: ${isA5 ? '9px' : '11px'};
        --header-name: ${isA5 ? '16px' : '21px'};
        --title-font: ${isA5 ? '13px' : '17px'};
        --logo-h: ${isA5 ? '45px' : '75px'};
        --page-padding: ${isA5 ? '3mm 5mm' : '4mm 8mm'};
    }
    body{font-family:'Cairo',sans-serif;color:#111;font-size:var(--base-font);background:#fff;direction:rtl}
    .page{width:100%; max-width: 850px; min-height: 282mm; margin:0 auto;padding:var(--page-padding);display:flex;flex-direction:column; background: #fff;}
    
    .header{display:flex;justify-content:space-between;align-items:center;padding-bottom:6px;border-bottom:2px solid #111;margin-bottom:0px}
    .co-block{flex:1;text-align:right}
    .co-name{font-size:var(--header-name);font-weight:900;color:#111;margin-bottom:1px}
    .co-line{font-size:${isA5 ? '8.5px' : '10px'};color:#444;line-height:1.4}
    .header-center{flex:1;text-align:center}
    .inv-title{font-size:var(--title-font);font-weight:900;color:#111;background:#f5f5f5;padding:2px 14px;border-radius:6px;display:inline-block;border:1px solid #ccc}
    .inv-num{font-size:${isA5 ? '10px' : '13px'};color:#333;font-family:monospace;font-weight:700;margin-top:6px}
    .logo-block{flex:1;text-align:left}
    .logo-block img{max-height:var(--logo-h);max-width:150px;object-fit:contain}
    
    .info-wrap{display:flex;gap:${isA5 ? '5px' : '8px'};margin-top:${isA5 ? '2px' : '6px'};margin-bottom:5px}
    .info-box{flex:1;border:1px solid #333;border-radius:4px;overflow:hidden;background:#fff}
    .info-title{background:#f5f5f5;padding:${isA5 ? '2px 6px' : '3px 8px'};font-weight:900;font-size:${isA5 ? '9px' : '10px'};border-bottom:1px solid #333}
    .info-body{padding:${isA5 ? '2px 6px' : '4px 8px'}; display: grid; grid-template-columns: 1fr; gap: 2px 15px;}
    .info-row{font-size:${isA5 ? '8.5px' : '9.5px'};margin-bottom:${isA5 ? '0px' : '1px'};display:flex;gap:4px}
    .ik{color:#666;min-width:${isA5 ? '60px' : '80px'}; flex-shrink: 0;}
    .iv{color:#111;font-weight:800}
    
    table{width:100%;border-collapse:collapse;border:${tableBorder};margin-top:6px}
    thead th{background:#f0f0f0;padding:${isA5 ? '4px' : '6px'};font-size:${isA5 ? '8.5px' : '10px'};font-weight:900;border:${cellBorder}; color:#000}
    tbody td{padding:${isA5 ? '3px' : '5px'};font-size:${isA5 ? '8.5px' : '10px'};border:${cellBorder};text-align:center;font-weight:700; color:#111}
    .status-paid{color:#10b981} .status-overdue{color:#ef4444}
    
    .footer{margin-top: auto; padding-top: 30px; border-top: none; width: 100%;}
    .footer-inner{display:flex;justify-content:space-between;align-items:flex-end; width: 100%;}
    .sig-box{text-align:center;width:${isA5 ? '150px' : '220px'}}
    .sig-label{font-size:${isA5 ? '9px' : '10.5px'};font-weight:900;color:#000;margin-bottom:${isA5 ? '15px' : '25px'}}
    .sig-line{border-top:1.5px solid #111;padding-top:5px;font-size:${isA5 ? '8px' : '8.5px'};color:#444;font-weight:600}

    @media screen { .page { min-height: 100vh; } }
    @media print {
        @page { 
            size: ${isA5 ? 'A5 portrait' : 'A4 portrait'}; 
            margin: 5mm; 
        }
        body { background: #fff; -webkit-print-color-adjust: exact; }
        .page { 
            min-height: auto !important; 
            width: 100% !important; 
            max-width: none !important; 
            padding: 0 !important; 
            margin: 0 !important;
            box-shadow: none;
        }
    }
</style>
</head>
<body>
<div class="page">
    <div class="header">
        <div class="co-block">
            <div class="co-name">${co.name}</div>
            <div class="co-line">${co.addr}</div>
            ${co.phone ? `<div class="co-line">الهاتف: ${co.phone}</div>` : ''}
            ${co.tax ? `<div class="co-line">رقم ضريبي: ${co.tax}</div>` : ''}
        </div>
        <div class="header-center">
            <div class="inv-title">${blInline('جدول استحقاق الأقساط', 'Installment Schedule')}</div>
            <div class="inv-num">PLAN-${planNum}</div>
            <div style="font-size:11px; color:#555; margin-top:2px;">${date}</div>
        </div>
        <div class="logo-block">
            ${co.logo ? `<img src="${co.logo}" alt=""/>` : ''}
        </div>
    </div>

    <div class="info-wrap">
        <div class="info-box">
            <div class="info-title">${blInline('بيانات العميل والعقد', 'Contract Details')}</div>
            <div class="info-body">
                <div class="info-row"><span class="ik">${blInline('العميل', 'Customer')}:</span><span class="iv">${plan.customer?.name}</span></div>
                <div class="info-row"><span class="ik">${blInline('المنتج', 'Product')}:</span><span class="iv">${plan.productName}</span></div>
                <div class="info-row"><span class="ik">${blInline('إجمالي المبلغ', 'Grand Total')}:</span><span class="iv">${(plan.grandTotal || 0).toLocaleString()} ${sym}</span></div>
                <div class="info-row"><span class="ik">${blInline('مبلغ القسط', 'Monthly')}:</span><span class="iv">${(plan.installmentAmount || 0).toLocaleString()} ${sym}</span></div>
            </div>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th style="width:15%">${bl('كود القسط', 'Inst. Code')}</th>
                <th style="width:15%">${bl('تاريخ الاستحقاق', 'Due Date')}</th>
                <th style="width:15%">${bl('مبلغ القسط', 'Amount')}</th>
                <th style="width:15%">${bl('المدفوع', 'Paid')}</th>
                <th style="width:15%">${bl('المتبقي', 'Remaining')}</th>
                <th style="width:25%">${bl('الحالة', 'Status')}</th>
            </tr>
        </thead>
        <tbody>
            ${(plan.installments || []).map((i: any) => {
        const isOverdue = i.status !== 'paid' && i.status !== 'cancelled' && new Date(i.dueDate) < new Date();
        const statusTxt = isOverdue ? 'متأخر' : (statusMap[i.status] || i.status);
        const statusClass = isOverdue ? 'status-overdue' : (i.status === 'paid' ? 'status-paid' : '');
        const instCode = `INST-${planNum}-${String(i.installmentNo).padStart(2, '0')}`;

        return `
            <tr>
                <td style="font-family:monospace; color:#5286ed;">${instCode}</td>
                <td style="font-family:sans-serif">${new Date(i.dueDate).toLocaleDateString('en-ZA')}</td>
                <td>${Number(i.amount).toLocaleString()} ${sym}</td>
                <td>${Number(i.paidAmount || 0).toLocaleString()} ${sym}</td>
                <td>${Number(i.remaining || 0).toLocaleString()} ${sym}</td>
                <td class="${statusClass}">${statusTxt}</td>
            </tr>`;
    }).join('')}
        </tbody>
    </table>

    <div class="footer">
        <div class="footer-inner">
            <div class="sig-box">
                <div class="sig-label">${blInline('توقيع العميل', 'Customer Signature')}</div>
                <div class="sig-line">${blInline('الاسم والتوقيع', 'Name & Signature')}</div>
            </div>
            <div style="text-align: center; color: #aaa; font-size: 9.5px; margin-bottom: 5px; font-weight: 600;">
                شكراً لتعاملكم معنا
            </div>
            <div class="sig-box">
                <div class="sig-label">${blInline('توقيع المسؤول', 'Authorized Signature')}</div>
                <div class="sig-line">${blInline('الختم والتوقيع', 'Stamp & Signature')}</div>
            </div>
        </div>
    </div>
</div>
${options.noAutoPrint ? '' : '<script>window.onload=()=>setTimeout(()=>window.print(),400);</script>'}
</body>
</html>`;
}

// ═══════════════════════════════════════════════
//  GENERAL REPORTS (المحرك الموحد للتقارير)
// ═══════════════════════════════════════════════
export function generateReportHTML(
    title: string,
    content: string,
    company: CompanyInfo = {},
    options: {
        noAutoPrint?: boolean;
        isA5?: boolean;
        subtitle?: string;
        dateFrom?: string;
        dateTo?: string;
        generatedBy?: string;
        lang?: 'ar' | 'en';
        metadata?: Array<{ label: string; value: string | number }>;
        summary?: Array<{ label: string; value: string | number; isTotal?: boolean }>;
    } = {}
): string {
    const lang = options.lang || 'ar';
    const isRtl = lang === 'ar';
    const dir = isRtl ? 'rtl' : 'ltr';
    const firstColAlign = isRtl ? 'right' : 'left';
    const currencyCode = company.currency || 'EGP';
    const isA5 = options.isA5 || false;

    const co = {
        name: company.name || '',
        logo: company.logo || '',
    };

    const now = new Date();
    const printDateStr = now.toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' });
    const printTimeStr = now.toLocaleTimeString(isRtl ? 'ar-EG' : 'en-GB', { hour: '2-digit', minute: '2-digit' });

    const baseFont  = isA5 ? '9px'  : '11px';
    const titleFont = isA5 ? '13px' : '14px';
    const logoH     = isA5 ? '50px' : '65px';

    const lbl = {
        printDate : isRtl ? 'تاريخ الطباعة:' : 'Print Date:',
        period    : isRtl ? 'الفترة:'        : 'Period:',
        from      : isRtl ? 'من: '           : 'From: ',
        to        : isRtl ? ' — إلى: '       : ' — To: ',
        by        : isRtl ? 'بواسطة:'        : 'By:',
        note      : isRtl ? 'ملاحظة:'        : 'Note:',
        footer    : isRtl ? 'طُبع بواسطة نظام ERP' : 'Printed via ERP System',
    };

    return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="UTF-8"/>
<title>${title}</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Cairo',sans-serif;direction:${dir};background:#fff;color:#000;font-size:${baseFont};line-height:1.4}
.page{width:100%;max-width:900px;margin:0 auto;padding:8mm 10mm;background:#fff;display:flex;flex-direction:column}

/* ── Header: logo only ── */
.rpt-header{display:flex;justify-content:center;align-items:center;padding-bottom:10px;border-bottom:2px solid #000;margin-bottom:10px}
.rpt-logo img{max-height:${logoH};max-width:140px;object-fit:contain}
.rpt-logo-text{font-size:18px;font-weight:900;color:#000;text-align:center}

/* ── Report info block ── */
.rpt-info{border:1px solid #ccc;border-radius:4px;padding:8px 12px;margin-bottom:10px;background:#f9f9f9}
.rpt-info-title{font-size:${titleFont};font-weight:900;color:#000;text-align:center;margin-bottom:6px;padding-bottom:6px;border-bottom:1px solid #ddd}
.rpt-info-rows{display:flex;flex-wrap:wrap;gap:4px 24px}
.rpt-info-row{display:flex;align-items:center;gap:4px;font-size:10.5px}
.rpt-info-lbl{font-weight:700;color:#444}
.rpt-info-val{color:#000;font-weight:600}

/* ── Metadata grid ── */
.meta-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:1px;margin-bottom:10px;border:1px solid #ccc;border-radius:4px;overflow:hidden;background:#ccc}
.meta-item{display:flex;align-items:center;background:#fff}
.meta-label{padding:5px 10px;font-weight:700;font-size:10px;color:#444;background:#f5f5f5;border-${isRtl ? 'left' : 'right'}:1px solid #ccc;white-space:nowrap;min-width:120px}
.meta-value{padding:5px 10px;font-weight:600;font-size:10.5px;flex:1;color:#000}

/* ── Table ── */
.report-content{flex:1}
table{width:100%;border-collapse:collapse;border:1px solid #999;margin-top:8px;font-size:10.5px}
thead th{background:#e8e8e8!important;padding:7px 9px;font-size:10px;font-weight:900;color:#000;text-align:center;border:1px solid #bbb;white-space:nowrap;-webkit-print-color-adjust:exact;print-color-adjust:exact}
thead th:first-child{text-align:${firstColAlign}}
tbody td{padding:5px 9px;font-size:10.5px;color:#000;text-align:center;border:1px solid #ddd;vertical-align:middle;line-height:1.3}
tbody td:first-child{text-align:${firstColAlign};font-weight:600}
tbody tr:nth-child(even){background:#f5f5f5!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
tfoot td{background:#e8e8e8!important;font-weight:900;font-size:11px;color:#000!important;border:1px solid #bbb;padding:6px 9px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
tfoot td:first-child{text-align:${firstColAlign}}

/* ── Summary ── */
.summary-section{margin-top:12px;padding-top:8px;border-top:1px solid #999;page-break-inside:avoid}
.summary-row{display:flex;justify-content:space-between;align-items:center;padding:3px 0;font-size:11px;color:#000}
.summary-row.total{font-weight:900;font-size:12px;border-top:2px solid #000;margin-top:4px;padding-top:4px}
.summary-lbl{font-weight:600;color:#333}
.summary-val{font-weight:700;color:#000}

/* ── Footer ── */
.footer{margin-top:14px;padding-top:8px;border-top:1px dotted #ccc;font-size:9px;color:#555;display:flex;justify-content:space-between}

@media print{
  @page{size:A4 landscape;margin:6mm 8mm}
  body{
    font-size:10px;
    background: #fff !important;
    width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    display: block !important;
  }
  .page{
    padding:0 !important;
    width: 95% !important;
    max-width: 270mm !important;
    margin: 0 auto !important;
    min-height:0 !important;
    display: block !important;
  }
  thead{display:table-header-group}
  tfoot{display:table-footer-group}
  tbody tr{page-break-inside:avoid}
  table{page-break-inside:auto}
  .summary-section{page-break-inside:avoid}
  .meta-grid{page-break-inside:avoid}
  .rpt-info{page-break-inside:avoid}
}
</style>
</head>
<body>
<div class="page">

  <div class="rpt-header">
    <div class="rpt-logo">${co.logo ? `<img src="${co.logo}" alt=""/>` : `<div class="rpt-logo-text">${co.name}</div>`}</div>
  </div>

  <div class="rpt-info">
    <div class="rpt-info-title">${title}</div>
    <div class="rpt-info-rows">
      <div class="rpt-info-row"><span class="rpt-info-lbl">${lbl.printDate}</span><span class="rpt-info-val">${printDateStr} — ${printTimeStr}</span></div>
      ${(options.dateFrom || options.dateTo) ? `<div class="rpt-info-row"><span class="rpt-info-lbl">${lbl.period}</span><span class="rpt-info-val">${options.dateFrom ? lbl.from + options.dateFrom : ''}${options.dateTo ? lbl.to + options.dateTo : ''}</span></div>` : ''}
      ${options.generatedBy ? `<div class="rpt-info-row"><span class="rpt-info-lbl">${lbl.by}</span><span class="rpt-info-val">${options.generatedBy}</span></div>` : ''}
      ${options.subtitle ? `<div class="rpt-info-row"><span class="rpt-info-lbl">${lbl.note}</span><span class="rpt-info-val">${options.subtitle}</span></div>` : ''}
    </div>
  </div>

  ${(options.metadata && options.metadata.length > 0) ? `
  <div class="meta-grid">
    ${options.metadata.map(m => `<div class="meta-item"><div class="meta-label">${m.label}</div><div class="meta-value">${m.value}</div></div>`).join('')}
  </div>` : ''}

  <div class="report-content">${content}</div>

  ${(options.summary && options.summary.length > 0) ? `
  <div class="summary-section">
    ${options.summary.map(s => `
    <div class="summary-row${s.isTotal ? ' total' : ''}">
      <span class="summary-lbl">${s.label}</span>
      <span class="summary-val">${typeof s.value === 'number' ? formatMoney(s.value, currencyCode, lang) : s.value}</span>
    </div>`).join('')}
  </div>` : ''}

  <div class="footer">
    <span>${lbl.footer}</span>
    <span>${options.generatedBy || ''}</span>
    <span>${printDateStr} ${printTimeStr}</span>
  </div>

</div>
${options.noAutoPrint ? '' : '<script>window.onload=()=>setTimeout(()=>window.print(),550);</script>'}
</body>
</html>`;
}

export function printInstallmentPlan(plan: any, company: CompanyInfo = {}) {
    const html = generateInstallmentPlanHTML(plan, company);
    const win = window.open('', '_blank');
    if (win) { 
        win.document.write(html); 
        const match = html.match(/<title>(.*?)<\/title>/i);
        if (match && match[1]) win.document.title = match[1].trim();
        win.document.close(); 
    }
}
