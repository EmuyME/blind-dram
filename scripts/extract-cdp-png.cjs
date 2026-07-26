const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '.tmp-preview');
fs.mkdirSync(outDir, { recursive: true });

function extractDataUrl(obj) {
  if (typeof obj === 'string' && obj.startsWith('data:image')) return obj;
  if (!obj || typeof obj !== 'object') return null;
  for (const v of Object.values(obj)) {
    const found = extractDataUrl(v);
    if (found) return found;
  }
  return null;
}

const logPath = process.argv[2];
const label = process.argv[3] || 'crop';
const j = JSON.parse(fs.readFileSync(logPath, 'utf8'));
const dataUrl = extractDataUrl(j);
if (!dataUrl) {
  console.error('no data url found');
  process.exit(1);
}
const b64 = dataUrl.split(',')[1];
const out = path.join(outDir, `${label}.png`);
fs.writeFileSync(out, Buffer.from(b64, 'base64'));
console.log('wrote', out, fs.statSync(out).size);
