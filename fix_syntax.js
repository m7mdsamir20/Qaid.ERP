const fs = require('fs');
const file = 'src/app/pos/page.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace("            )}\r\n      </div>\r\n            )}\r\n", "            )}\r\n");
content = content.replace("            )}\n      </div>\n            )}\n", "            )}\n");
fs.writeFileSync(file, content, 'utf8');
console.log('Fixed syntax error');
