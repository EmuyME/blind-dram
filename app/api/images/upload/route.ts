// POST /api/images/upload
import { NextRequest } from 'next/server';
import { put } from '@vercel/blob';
import { successResponse, errorResponse, generateUUID } from '@/lib/api-utils';
import { sql } from '@/lib/db';
import { verifyParticipantToken } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type');

    let participantToken: string;
    let imageBase64: string | null = null;
    let fileType: string | null = null;
    let file: File | null = null;
    let sampleId: string | null = null;

    if (contentType?.includes('multipart/form-data')) {
      const formData = await request.formData();
      file = formData.get('file') as File;
      participantToken = formData.get('participant_token') as string;
      sampleId = formData.get('sample_id') as string;

      if (!file) {
        return errorResponse('ファイルが選択されていません', 'MISSING_FILE', 400);
      }
      fileType = file.type;
    } else {
      const body = await request.json();
      participantToken = body.participant_token;
      imageBase64 = body.image_base64;
      fileType = body.file_type;
      sampleId = body.sample_id || null;

      if (!imageBase64 || !fileType) {
        return errorResponse('image_base64とfile_typeが必要です', 'MISSING_PARAMETER', 400);
      }
    }

    if (!participantToken) {
      return errorResponse('participant_tokenが必要です', 'MISSING_PARAMETER', 400);
    }

    const participant = await verifyParticipantToken(participantToken);
    if (!participant) {
      return errorResponse('認証トークンが不正です', 'UNAUTHORIZED', 401);
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!fileType || !allowedTypes.includes(fileType)) {
      return errorResponse('画像ファイル（JPEG、PNG、WebP）のみアップロードできます', 'INVALID_FILE_TYPE', 400);
    }

    let fileBuffer: Buffer;
    let sessionId: string;

    if (file) {
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        return errorResponse('ファイルサイズは10MB以下である必要があります', 'FILE_TOO_LARGE', 400);
      }

      if (sampleId) {
        const sampleRows = await sql`
          SELECT id, session_id FROM samples WHERE id = ${sampleId} LIMIT 1
        `;
        const sample = sampleRows[0] as { id: string; session_id: string };
        if (!sample) {
          return errorResponse('Sampleが見つかりません', 'SAMPLE_NOT_FOUND', 404);
        }
        sessionId = sample.session_id;
      } else {
        sessionId = participant.session_id as string;
      }

      fileBuffer = Buffer.from(await file.arrayBuffer());
    } else {
      if (!imageBase64) {
        return errorResponse('image_base64が必要です', 'MISSING_PARAMETER', 400);
      }
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      fileBuffer = Buffer.from(base64Data, 'base64');

      const maxSize = 10 * 1024 * 1024;
      if (fileBuffer.length > maxSize) {
        return errorResponse('ファイルサイズは10MB以下である必要があります', 'FILE_TOO_LARGE', 400);
      }

      if (!sampleId) {
        sessionId = participant.session_id as string;
      } else {
        const sampleRows = await sql`
          SELECT id, session_id FROM samples WHERE id = ${sampleId} LIMIT 1
        `;
        const sample = sampleRows[0] as { id: string; session_id: string };
        if (!sample) {
          return errorResponse('Sampleが見つかりません', 'SAMPLE_NOT_FOUND', 404);
        }
        sessionId = sample.session_id;
      }
    }

    const extension = fileType.split('/')[1] || 'jpg';
    const path = `bottle-images/${sessionId}/${participant.id}/${generateUUID()}.${extension}`;

    try {
      const blob = await put(path, fileBuffer, {
        access: 'public',
        contentType: fileType,
      });

      return successResponse({
        public_url: blob.url,
        path,
      });
    } catch (uploadError) {
      console.error('Image upload error:', uploadError);
      const message = uploadError instanceof Error ? uploadError.message : String(uploadError);
      return errorResponse(`画像のアップロードに失敗しました: ${message}`, 'UPLOAD_ERROR', 500);
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
