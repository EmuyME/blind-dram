/**
 * Replaces fetch('http://127.0.0.1:7242|7243/ingest/...', {...}).catch(...)
 * with agentDebugIngest(payload, 'default'|'alt').
 * Handles balanced { ... } inside JSON.stringify(...) with string/comment skipping (limited).
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(process.cwd(), 'app');

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (['node_modules', '.next'].includes(ent.name)) continue;
      walk(p, acc);
    } else if (/\.(tsx?)$/.test(ent.name)) acc.push(p);
  }
  return acc;
}

/** @param {string} s @param {number} i */
function skipString(s, i) {
  const q = s[i];
  if (q !== "'" && q !== '"' && q !== '`') return i;
  i++;
  while (i < s.length) {
    if (q === '`' && s.slice(i, i + 2) === '${') {
      i += 2;
      let depth = 1;
      while (i < s.length && depth > 0) {
        if (s[i] === '{') depth++;
        else if (s[i] === '}') depth--;
        i++;
      }
      continue;
    }
    if (s[i] === '\\') {
      i += 2;
      continue;
    }
    if (s[i] === q) return i + 1;
    i++;
  }
  return i;
}

/** balanced `{` at start, return index after closing `}` */
function consumeBraceObject(s, start) {
  if (s[start] !== '{') return null;
  let depth = 0;
  let i = start;
  while (i < s.length) {
    const c = s[i];
    if (c === '/' && s[i + 1] === '/') {
      i = s.indexOf('\n', i);
      if (i === -1) return null;
      i++;
      continue;
    }
    if (c === '/' && s[i + 1] === '*') {
      const end = s.indexOf('*/', i + 2);
      if (end === -1) return null;
      i = end + 2;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      i = skipString(s, i);
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return i + 1;
    }
    i++;
  }
  return null;
}

/**
 * @param {string} s
 * @param {number} fetchStart index of 'f' in fetch(
 */
function replaceOneFetch(s, fetchStart) {
  const head = s.slice(fetchStart, fetchStart + 45);
  if (!head.startsWith("fetch('http://127.0.0.1:724") && !head.startsWith('fetch("http://127.0.0.1:724')) {
    return null;
  }
  const variant = head.includes('7242') ? 'alt' : 'default';

  const bodyRe = /body\s*:\s*JSON\.stringify\s*\(/;
  const window = s.slice(fetchStart, Math.min(s.length, fetchStart + 8000));
  const bm = bodyRe.exec(window);
  if (!bm) return null;
  const jsonStartRel = bm.index + bm[0].length;
  const jsonStart = fetchStart + jsonStartRel;
  if (s[jsonStart] !== '{') return null;
  const afterObj = consumeBraceObject(s, jsonStart);
  if (afterObj == null) return null;
  const literal = s.slice(jsonStart, afterObj);
  const tail = s.slice(afterObj);
  const m = tail.match(/^\)\s*\}\s*\)\s*\.catch\s*\(\s*\(\)\s*=>\s*\{\s*\}\s*\)\s*;/);
  if (!m) return null;
  const end = afterObj + m[0].length;
  const call =
    variant === 'alt'
      ? `agentDebugIngest(${literal}, 'alt');`
      : `agentDebugIngest(${literal});`;
  return { replacement: call, end };
}

function stripAgentRegions(s) {
  return s.replace(/\r?\n[ \t]*\/\/ #region agent log\r?\n[\s\S]*?\/\/ #endregion\r?\n?/g, '\n');
}

function stripJsxAgentIife(s) {
  return s.replace(
    /\s*\{\/\* #region agent log \*\/\}\r?\n\s*\{\(\(\) => \{[\s\S]*?return null;\s*\}\)\(\)\}\r?\n\s*\{\/\* #endregion \*\/\}\r?\n?/g,
    '\n',
  );
}

function ensureImport(content) {
  if (!content.includes('agentDebugIngest')) return content;
  if (/from ['"]@\/lib\/agent-debug-ingest['"]/.test(content)) return content;
  const lines = content.split('\n');
  let insertAt = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('import ') || line.startsWith("import'")) {
      insertAt = i + 1;
      continue;
    }
    if (line.startsWith('"use client"') || line.startsWith("'use client'")) {
      insertAt = i + 1;
      continue;
    }
    if (line.trim() === '' && insertAt > 0) continue;
    if (insertAt > 0 && !line.startsWith('import ')) break;
  }
  const imp = `import { agentDebugIngest } from '@/lib/agent-debug-ingest';`;
  if (lines.some((l) => l.includes('agent-debug-ingest'))) return content;
  lines.splice(insertAt, 0, imp);
  return lines.join('\n');
}

function processFile(fp) {
  let s = fs.readFileSync(fp, 'utf8');
  const original = s;
  if (!s.includes('127.0.0.1:724')) return false;

  s = stripAgentRegions(s);
  s = stripJsxAgentIife(s);

  let guard = 0;
  while (guard++ < 500) {
    const i = s.indexOf("fetch('http://127.0.0.1:724");
    const j = s.indexOf('fetch("http://127.0.0.1:724');
    let fetchStart = -1;
    if (i === -1) fetchStart = j;
    else if (j === -1) fetchStart = i;
    else fetchStart = Math.min(i, j);
    if (fetchStart === -1) break;

    const res = replaceOneFetch(s, fetchStart);
    if (!res) {
      console.error('Could not transform fetch at', fp, 'offset', fetchStart);
      console.error('Context:', s.slice(fetchStart, fetchStart + 200));
      process.exit(1);
    }
    s = s.slice(0, fetchStart) + res.replacement + s.slice(res.end);
  }

  if (s.includes('127.0.0.1:724')) {
    console.error('Remaining localhost ingest in', fp);
    process.exit(1);
  }

  s = ensureImport(s);
  if (s !== original) {
    fs.writeFileSync(fp, s);
    return true;
  }
  return false;
}

const files = walk(ROOT);
let n = 0;
for (const f of files) {
  if (processFile(f)) {
    console.log('updated', path.relative(process.cwd(), f));
    n++;
  }
}
console.log('done, files changed:', n);
