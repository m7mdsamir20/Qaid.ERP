const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
let content = fs.readFileSync(schemaPath, 'utf8');

// Replace standard companyId relation with cascade delete
content = content.replace(/@relation\(fields:\s*\[companyId\],\s*references:\s*\[id\]\)/g, '@relation(fields: [companyId], references: [id], onDelete: Cascade)');

fs.writeFileSync(schemaPath, content);
console.log('Successfully updated schema relations to Cascade!');
