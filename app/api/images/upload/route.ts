// POST /api/images/upload
import { NextRequest } from 'next/server';
import { successResponse, errorResponse, generateUUID } from '@/lib/api-utils';
import { supabase } from '@/lib/supabase';
import { verifyParticipantToken } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type');
    
    let participantToken: string;
    let imageBase64: string | null = null;
    let fileType: string | null = null;
    let file: File | null = null;
    let sampleId: string | null = null;

    // FormData形式（従来の方式）またはJSON形式（Base64）の両方に対応
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
      // JSON形式（Base64）
      const body = await request.json();
      participantToken = body.participant_token;
      imageBase64 = body.image_base64;
      fileType = body.file_type;
      sampleId = body.sample_id || null; // sample_idはオプショナル（Presenterの場合は不要）

      if (!imageBase64 || !fileType) {
        return errorResponse('image_base64とfile_typeが必要です', 'MISSING_PARAMETER', 400);
      }
    }

    if (!participantToken) {
      return errorResponse('participant_tokenが必要です', 'MISSING_PARAMETER', 400);
    }

    // Participant認証
    const participant = await verifyParticipantToken(participantToken);
    if (!participant) {
      return errorResponse('認証トークンが不正です', 'UNAUTHORIZED', 401);
    }

    // ファイル形式チェック
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(fileType)) {
      return errorResponse('画像ファイル（JPEG、PNG、WebP）のみアップロードできます', 'INVALID_FILE_TYPE', 400);
    }

    let fileBuffer: Buffer;
    let sessionId: string;

    if (file) {
      // FormData形式の場合
      // ファイルサイズチェック（10MB以下）
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        return errorResponse('ファイルサイズは10MB以下である必要があります', 'FILE_TOO_LARGE', 400);
      }

      // Sample取得（sample_idが指定されている場合）
      if (sampleId) {
        const { data: sample, error: sampleError } = await supabase
          .from('samples')
          .select('id, session_id')
          .eq('id', sampleId)
          .single();

        if (sampleError || !sample) {
          return errorResponse('Sampleが見つかりません', 'SAMPLE_NOT_FOUND', 404);
        }
        sessionId = sample.session_id;
      } else {
        // sample_idが指定されていない場合、participantからsession_idを取得
        sessionId = participant.session_id;
      }

      fileBuffer = Buffer.from(await file.arrayBuffer());
    } else {
      // Base64形式の場合
      if (!imageBase64) {
        return errorResponse('image_base64が必要です', 'MISSING_PARAMETER', 400);
      }
      // Base64デコード
      if (!imageBase64) {
        return errorResponse('image_base64が必要です', 'MISSING_PARAMETER', 400);
      }
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      fileBuffer = Buffer.from(base64Data, 'base64');

      // ファイルサイズチェック（10MB以下）
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (fileBuffer.length > maxSize) {
        return errorResponse('ファイルサイズは10MB以下である必要があります', 'FILE_TOO_LARGE', 400);
      }

      // sample_idが指定されていない場合、participantからsession_idを取得
      if (!sampleId) {
        sessionId = participant.session_id;
      } else {
        const { data: sample, error: sampleError } = await supabase
          .from('samples')
          .select('id, session_id')
          .eq('id', sampleId)
          .single();

        if (sampleError || !sample) {
          return errorResponse('Sampleが見つかりません', 'SAMPLE_NOT_FOUND', 404);
        }
        sessionId = sample.session_id;
      }
    }

    // ファイル名を生成（session_id/participant_id/uuid.extension）
    const extension = fileType.split('/')[1] || 'jpg';
    const fileName = `${sessionId}/${participant.id}/${generateUUID()}.${extension}`;
    const bucket = 'bottle-images';

    // Supabase Storageにアップロード
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, fileBuffer, {
        contentType: fileType,
        upsert: false, // 同じファイル名が存在する場合はエラー
      });

    if (uploadError) {
      console.error('Image upload error:', uploadError);
      return errorResponse(`画像のアップロードに失敗しました: ${uploadError.message}`, 'UPLOAD_ERROR', 500);
    }

    // 公開URLを取得
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    if (!urlData?.publicUrl) {
      return errorResponse('画像URLの取得に失敗しました', 'URL_ERROR', 500);
    }

    return successResponse({
      public_url: urlData.publicUrl,
      path: fileName,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
