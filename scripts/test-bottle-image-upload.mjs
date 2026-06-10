/**
 * ボトル写真アップロード → Truth 保存 → 取得の一連検証
 * Usage: node scripts/test-bottle-image-upload.mjs [imagePath]
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: resolve(root, '.env.local') });

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000';
const DEFAULT_IMAGE =
  'C:/Users/Taichi/.cursor/projects/c-Users-Taichi-CusorApps-blind-dram/assets/c__Users_Taichi_AppData_Roaming_Cursor_User_workspaceStorage_59132d8892bc4a5d3cb114ca0a9f731e_images_12_HP-67e571bd-eae0-4222-a897-521ffab698b4.png';

const imagePath = process.argv[2] || DEFAULT_IMAGE;
const imageBuffer = readFileSync(imagePath);
console.log(`Image: ${imagePath} (${imageBuffer.length} bytes)`);

async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : undefined,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// 1. セッション作成
const created = await api('POST', '/api/session/create', {
  title: 'ボトル写真テスト',
  mode: 'simultaneous',
});
assert(created.json.success, `session/create failed: ${JSON.stringify(created.json)}`);
const { owner_token, join_token } = created.json.data;
console.log('✓ セッション作成');

// 2. 模擬参加者
const mock = await api('POST', '/api/participants/create-mock', {
  join_token,
  display_name: 'Presenter',
  brought_count: 1,
  bottle_labels: ['GlenAllachie 12'],
});
assert(mock.json.data?.participant_token, `create-mock failed: ${JSON.stringify(mock.json)}`);
const participantToken = mock.json.data.participant_token;
const participantId = mock.json.data.participant_id;

const samplesRes = await api('GET', `/api/owner/get-samples?owner_token=${owner_token}`);
const samples = samplesRes.json.data?.samples || [];
const sample = samples.find((s) => s.presenter_participant_id === participantId) || samples[0];
assert(sample?.id, `sample id missing: ${JSON.stringify(samplesRes.json)}`);
const sampleId = sample.id;
console.log('✓ 模擬参加者・サンプル作成');

// 3. 締切 → 開始
await api('POST', '/api/owner/close-registration', { owner_token });
const started = await api('POST', '/api/owner/start-session', { owner_token });
assert(started.json.success, `start-session failed: ${JSON.stringify(started.json)}`);
console.log('✓ セッション開始');

// 4. multipart アップロード
const form = new FormData();
form.append('participant_token', participantToken);
form.append('sample_id', sampleId);
form.append('file', new Blob([imageBuffer], { type: 'image/png' }), 'glenallachie-12.png');

const uploaded = await api('POST', '/api/images/upload', form);
assert(uploaded.json.success, `images/upload failed: ${JSON.stringify(uploaded.json)}`);
const { public_url, path: blobPath } = uploaded.json.data;
assert(public_url?.startsWith('https://'), `invalid public_url: ${public_url}`);
console.log('✓ Vercel Blob アップロード');
console.log(`  URL: ${public_url}`);

// 5. 公開 URL に GET できるか
const imgRes = await fetch(public_url);
assert(imgRes.ok, `public URL GET failed: ${imgRes.status}`);
const ct = imgRes.headers.get('content-type') || '';
assert(ct.includes('image'), `unexpected content-type: ${ct}`);
const downloaded = Buffer.from(await imgRes.arrayBuffer());
assert(downloaded.length > 10000, `downloaded too small: ${downloaded.length}`);
console.log(`✓ 公開 URL 取得 OK (${downloaded.length} bytes, ${ct})`);

// 6. Truth に bottle_image_url を保存
const truth = await api('POST', '/api/truths/upsert', {
  participant_token: participantToken,
  sample_id: sampleId,
  true_distillery: 'GlenAllachie',
  true_age: 12,
  true_region: 'Speyside',
  bottle_image_url: public_url,
});
assert(truth.json.success, `truths/upsert failed: ${JSON.stringify(truth.json)}`);
console.log('✓ Truth 保存（bottle_image_url）');

// 7. round/status から画像 URL が読めるか
const status = await api(
  'GET',
  `/api/round/status?sample_id=${sampleId}&participant_token=${participantToken}`,
);
assert(status.json.success, `round/status failed: ${JSON.stringify(status.json)}`);
const savedUrl = status.json.data?.truth?.bottle_image_url;
assert(savedUrl === public_url, `truth URL mismatch: ${savedUrl}`);
console.log('✓ round/status で bottle_image_url 確認');

// 8. Base64 経路も確認（UI と同じ JSON 形式）
const base64 = `data:image/png;base64,${imageBuffer.toString('base64')}`;
const uploaded2 = await api('POST', '/api/images/upload', {
  participant_token: participantToken,
  sample_id: sampleId,
  image_base64: base64,
  file_type: 'image/png',
});
assert(uploaded2.json.success, `base64 upload failed: ${JSON.stringify(uploaded2.json)}`);
console.log('✓ Base64 経路アップロード OK');

console.log('\n=== ボトル写真保存機能: すべて成功 ===');
