// POST /api/owner/publish-ranking-image — 順位表 PNG を Blob に保存し公開 URL を発行
import { NextRequest } from 'next/server';
import { put } from '@vercel/blob';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { sql } from '@/lib/db';

const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') ?? '';
    let ownerToken: string | null = null;
    let file: File | null = null;
    let pngBase64: string | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      ownerToken = (formData.get('owner_token') as string) || null;
      file = formData.get('file') as File | null;
    } else {
      const body = await request.json();
      ownerToken = body.owner_token ?? null;
      pngBase64 = body.png_base64 ?? null;
    }

    if (!ownerToken) {
      return errorResponse('owner_tokenが必要です', 'MISSING_PARAMETER', 400);
    }

    const sessionRows = await sql<
      {
        id: string;
        state: string;
        join_token: string;
        results_ranking_image_url: string | null;
      }[]
    >`
      SELECT id, state, join_token, results_ranking_image_url
      FROM sessions
      WHERE owner_token = ${ownerToken}
      LIMIT 1
    `;
    const session = sessionRows[0];
    if (!session) {
      return errorResponse('認証トークンが不正です', 'UNAUTHORIZED', 401);
    }

    if (session.state !== 'published') {
      return errorResponse('結果公開後のみ順位表画像のURLを発行できます', 'NOT_PUBLISHED', 403);
    }

    let fileBuffer: Buffer;
    if (file) {
      if (file.size > MAX_BYTES) {
        return errorResponse('ファイルサイズは10MB以下である必要があります', 'FILE_TOO_LARGE', 400);
      }
      const mime = file.type || 'image/png';
      if (!mime.startsWith('image/')) {
        return errorResponse('PNG画像のみアップロードできます', 'INVALID_FILE_TYPE', 400);
      }
      fileBuffer = Buffer.from(await file.arrayBuffer());
    } else if (pngBase64) {
      const base64Data = pngBase64.replace(/^data:image\/\w+;base64,/, '');
      fileBuffer = Buffer.from(base64Data, 'base64');
      if (fileBuffer.length > MAX_BYTES) {
        return errorResponse('ファイルサイズは10MB以下である必要があります', 'FILE_TOO_LARGE', 400);
      }
    } else {
      return errorResponse('file または png_base64 が必要です', 'MISSING_PARAMETER', 400);
    }

    const path = `ranking-images/${session.id}/ranking.png`;
    const blob = await put(path, fileBuffer, {
      access: 'public',
      contentType: 'image/png',
      allowOverwrite: true,
    });

    const updatedAt = new Date().toISOString();
    await sql`
      UPDATE sessions
      SET results_ranking_image_url = ${blob.url},
          results_ranking_image_updated_at = ${updatedAt},
          updated_at = ${updatedAt}
      WHERE id = ${session.id}
    `;

    return successResponse({
      public_url: blob.url,
      join_token: session.join_token,
      updated_at: updatedAt,
    });
  } catch (error) {
    console.error('publish-ranking-image error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return errorResponse(`順位表画像の公開に失敗しました: ${message}`, 'UPLOAD_ERROR', 500);
  }
}
