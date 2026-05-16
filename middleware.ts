import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export const config = {
  matcher: ['/api/:path*'],
};

function clientIp(req: NextRequest) {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

let cachedJoin: Ratelimit | undefined;
let cachedCreate: Ratelimit | undefined;
let cachedApi: Ratelimit | undefined;

function isRedisConfigured() {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

function getLimiters() {
  if (!isRedisConfigured()) {
    return { join: undefined, create: undefined, api: undefined };
  }
  if (!cachedJoin) {
    const redis = Redis.fromEnv();
    cachedJoin = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(40, '1 m'),
      prefix: 'bd:ratelimit:join',
    });
    cachedCreate = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(15, '1 m'),
      prefix: 'bd:ratelimit:create',
    });
    cachedApi = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(200, '1 m'),
      prefix: 'bd:ratelimit:api',
    });
  }
  return {
    join: cachedJoin,
    create: cachedCreate,
    api: cachedApi,
  };
}

export async function middleware(req: NextRequest) {
  const { join, create, api } = getLimiters();
  if (!join || !create || !api) {
    return NextResponse.next();
  }

  const ip = clientIp(req);
  const path = req.nextUrl.pathname;
  const method = req.method;

  if (path === '/api/participants/join' && method === 'POST') {
    const { success } = await join.limit(ip);
    if (!success) {
      return NextResponse.json(
        {
          error: 'アクセスが集中しています。少し待ってから再度お試しください。',
          code: 'RATE_LIMIT',
        },
        { status: 429, headers: { 'Retry-After': '60' } },
      );
    }
    return NextResponse.next();
  }

  if (path === '/api/session/create' && method === 'POST') {
    const { success } = await create.limit(ip);
    if (!success) {
      return NextResponse.json(
        {
          error: '作成リクエストが多すぎます。しばらくしてから再度お試しください。',
          code: 'RATE_LIMIT',
        },
        { status: 429, headers: { 'Retry-After': '60' } },
      );
    }
    return NextResponse.next();
  }

  // ポーリング・同期用の読み取り系 GET と check-complete は同一 IP から短間隔で呼ばれるため
  // 汎用 API 枠（200/分/パス）に載せると 429 で画面が固まる。POST の非課金系のみ除外。
  if (method === 'GET' &&
      (path.startsWith('/api/session/') ||
        path === '/api/round/status' ||
        path === '/api/participants/me')) {
    return NextResponse.next();
  }
  if (method === 'POST' && path === '/api/session/check-complete') {
    return NextResponse.next();
  }

  // セッション進行の重要操作（1 クリック単位だが、CDN/共有 IP や 429 余韻で失敗しないよう汎用枠から除外）
  if (
    method === 'POST' &&
    (path === '/api/round/start' ||
      path === '/api/round/finish' ||
      path === '/api/truths/upsert' ||
      path === '/api/distillery/grade' ||
      path === '/api/distillery/reject-submission' ||
      path === '/api/round-result/click-next' ||
      path === '/api/round-result/start-next')
  ) {
    return NextResponse.next();
  }

  const { success } = await api.limit(`${ip}:${method}:${path}`);
  if (!success) {
    return NextResponse.json(
      { error: 'リクエストが多すぎます。しばらくしてから再度お試しください。', code: 'RATE_LIMIT' },
      { status: 429, headers: { 'Retry-After': '30' } },
    );
  }

  return NextResponse.next();
}
