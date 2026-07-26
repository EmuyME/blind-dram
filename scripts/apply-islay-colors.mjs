import fs from 'fs';
import path from 'path';

const root = path.resolve(import.meta.dirname, '..');
const replacements = [
  ['bg-[#C88A2B]', 'bg-bd-accent'],
  ['hover:bg-[#D79A3D]', 'hover:bg-bd-accent-hover'],
  ['text-[#C88A2B]/90', 'text-bd-accent/90'],
  ['text-[#C88A2B]', 'text-bd-accent'],
  ['border-[#C88A2B]', 'border-bd-accent'],
  ['ring-[#C88A2B]', 'ring-bd-accent'],
  ['accent-[#C88A2B]', 'accent-bd-accent'],
  ['text-[#E7C27B]', 'text-bd-accent-dim'],
  ['bg-[#C88A2B]/10', 'bg-bd-accent/10'],
  ['bg-[#C88A2B]/12', 'bg-bd-accent/12'],
  ['bg-[#C88A2B]/15', 'bg-bd-accent/15'],
  ['bg-[#C88A2B]/20', 'bg-bd-accent/20'],
  ['border-[#C88A2B]/25', 'border-bd-accent/25'],
  ['border-[#C88A2B]/30', 'border-bd-accent/30'],
  ['border-[#C88A2B]/35', 'border-bd-accent/35'],
  ['border-[#C88A2B]/40', 'border-bd-accent/40'],
  ['hover:border-[#C88A2B]/50', 'hover:border-bd-accent/50'],
  ['focus:ring-[#C88A2B]/40', 'focus:ring-bd-accent/40'],
  ['focus-visible:ring-[#C88A2B]/60', 'focus-visible:ring-bd-accent/60'],
  ['bg-amber-500/10', 'bg-bd-accent/10'],
  ['border-amber-400/30', 'border-bd-accent/30'],
  ['border-amber-500/30', 'border-bd-accent/30'],
  ['focus:ring-amber-500/50', 'focus:ring-bd-accent/50'],
  ['focus:border-amber-500/50', 'focus:border-bd-accent/50'],
  [
    'bg-amber-500 hover:bg-amber-600 text-black/90',
    'bg-bd-accent hover:bg-bd-accent-hover text-bd-accent-foreground',
  ],
  ["? 'bg-[#C88A2B] text-black/90'", "? 'bg-bd-accent text-bd-accent-foreground'"],
  ['hover:text-[#dba34d]', 'hover:text-bd-accent-hover'],
];

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (['node_modules', '.next', 'design-mocks'].includes(ent.name)) continue;
    if (ent.isDirectory()) walk(p);
    else if (/\.(tsx|ts)$/.test(ent.name)) {
      let c = fs.readFileSync(p, 'utf8');
      const o = c;
      for (const [a, b] of replacements) c = c.split(a).join(b);
      if (c !== o) {
        fs.writeFileSync(p, c);
        console.log('updated', path.relative(root, p));
      }
    }
  }
}

walk(root);
