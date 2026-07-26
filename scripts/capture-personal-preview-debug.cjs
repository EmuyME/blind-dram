/**
 * Capture personal report mock via production pipeline and save crops for visual QA.
 * Usage: node scripts/capture-personal-preview-debug.mjs
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', '.tmp-preview');
const BASE = process.env.BASE_URL || 'http://localhost:3000';

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  await page.goto(`${BASE}/design-mocks/personal-report`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'キャプチャプレビュー' }).click();
  await page.waitForSelector('[role="dialog"] img', { timeout: 60000 });
  // wait for natural size
  await page.waitForFunction(() => {
    const img = document.querySelector('[role="dialog"] img');
    return img && img.naturalWidth > 0;
  });

  const fullPath = path.join(OUT, 'full-capture.png');
  const dataUrl = await page.$eval('[role="dialog"] img', (img) => img.src);
  fs.writeFileSync(fullPath, Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log('full', fullPath, fs.statSync(fullPath).size);

  const crops = await page.evaluate(async () => {
    const img = document.querySelector('[role="dialog"] img');
    await img.decode?.();
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    function cropCss(x, y, cw, ch, label) {
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(cw * 2);
      canvas.height = Math.round(ch * 2);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, x * 2, y * 2, cw * 2, ch * 2, 0, 0, canvas.width, canvas.height);
      return { label, dataUrl: canvas.toDataURL('image/png') };
    }
    // Scan for content regions by sampling — use relative bands of full height
    const cssH = h / 2;
    const cssW = w / 2;
    return {
      meta: { w, h, cssW, cssH },
      crops: [
        cropCss(36, Math.round(cssH * 0.16), cssW - 72, Math.round(cssH * 0.10), '01-result-cards'),
        cropCss(36, Math.round(cssH * 0.28), Math.round(cssW * 0.55), Math.round(cssH * 0.22), '02-bar-chart'),
        cropCss(Math.round(cssW * 0.55), Math.round(cssH * 0.28), Math.round(cssW * 0.42), Math.round(cssH * 0.22), '03-insight-bottles'),
        cropCss(36, Math.round(cssH * 0.55), cssW - 72, Math.round(cssH * 0.08), '04-table-header'),
        cropCss(36, Math.round(cssH * 0.62), cssW - 72, Math.round(cssH * 0.18), '05-table-rows'),
      ],
    };
  });

  fs.writeFileSync(path.join(OUT, 'meta.json'), JSON.stringify(crops.meta, null, 2));
  for (const c of crops.crops) {
    const p = path.join(OUT, `${c.label}.png`);
    fs.writeFileSync(p, Buffer.from(c.dataUrl.split(',')[1], 'base64'));
    console.log('crop', c.label, fs.statSync(p).size);
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
