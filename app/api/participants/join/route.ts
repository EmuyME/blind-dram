// POST /api/participants/join
import { NextRequest } from 'next/server';
import { successResponse, errorResponse, generateUUID } from '@/lib/api-utils';
import { defaultBottleLabel } from '@/lib/default-bottle-label';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      join_token,
      display_name,
      is_attending,
      brought_count,
      bottle_labels,
      owner_token,
      rejoin_participant_token: existingParticipantTokenRaw,
    } = body;

    // バリデーション
    if (!join_token) {
      return errorResponse('join_tokenが必要です', 'MISSING_PARAMETER', 400);
    }

    if (!display_name || typeof display_name !== 'string' || display_name.trim() === '') {
      return errorResponse('表示名が空です', 'MISSING_DISPLAY_NAME', 400);
    }

    if (typeof is_attending !== 'boolean') {
      return errorResponse('is_attendingが必要です', 'MISSING_PARAMETER', 400);
    }

    if (typeof brought_count !== 'number' || brought_count < 0) {
      return errorResponse('持ち込み本数が不正です', 'INVALID_BOTTLE_COUNT', 400);
    }

    if (!Array.isArray(bottle_labels) || bottle_labels.length !== brought_count) {
      return errorResponse(
        'ボトル数が一致しません。brought_countとbottle_labelsの数が一致している必要があります',
        'INVALID_BOTTLE_COUNT',
        400
      );
    }

    // Session存在確認と状態チェック
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, state, owner_token')
      .eq('join_token', join_token)
      .single();

    if (sessionError || !session) {
      return errorResponse('Sessionが見つかりません', 'SESSION_NOT_FOUND', 404);
    }

    const displayNameTrimmed = display_name.trim();

    // registering 以外は原則参加不可。ただし Owner は owner_token で認証できるため、
    // 参加者としての参加（持ち込み0本のみ）を許可する。
    if (session.state !== 'registering') {
      const isOwner =
        typeof owner_token === 'string' &&
        owner_token.length > 0 &&
        session.owner_token === owner_token;

      if (!isOwner) {
        return errorResponse(
          'Sessionが締切済みです。参加登録はできません',
          'SESSION_CLOSED',
          409
        );
      }

      // 締切後にボトル/サンプルを追加すると順番・進行に影響するため禁止
      if (brought_count !== 0 || (Array.isArray(bottle_labels) && bottle_labels.length > 0)) {
        return errorResponse(
          '締切後に持ち込みボトルを追加することはできません（オーナー参加は0本のみ）',
          'OWNER_LATE_JOIN_REQUIRES_ZERO_BOTTLES',
          400
        );
      }
    }

    const existingToken =
      typeof existingParticipantTokenRaw === 'string' ? existingParticipantTokenRaw.trim() : '';

    let existingParticipant: { id: string } | null = null;
    if (existingToken) {
      const { data: byToken, error: byTokenErr } = await supabase
        .from('participants')
        .select('id')
        .eq('session_id', session.id)
        .eq('participant_token', existingToken)
        .maybeSingle();
      if (byTokenErr) {
        console.error('Participant token lookup error:', byTokenErr);
        return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
      }
      if (byToken) existingParticipant = byToken;
      else {
        return errorResponse(
          '参加登録の更新用トークンが無効です。参加登録ページからやり直してください',
          'INVALID_PARTICIPANT_TOKEN',
          401,
        );
      }
    }

    // 同一セッション内で表示名の重複を禁止（新規登録・他参加者と同名への変更）
    let nameTakenQuery = supabase
      .from('participants')
      .select('id')
      .eq('session_id', session.id)
      .eq('display_name', displayNameTrimmed)
      .limit(1);
    if (existingParticipant) {
      nameTakenQuery = nameTakenQuery.neq('id', existingParticipant.id);
    }
    const { data: nameTakenRows, error: nameTakenErr } = await nameTakenQuery;
    if (nameTakenErr) {
      console.error('Display name conflict check error:', nameTakenErr);
      return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
    }
    if (nameTakenRows && nameTakenRows.length > 0) {
      return errorResponse(
        'この表示名は既に別の参加者が使用しています。別の名前を入力してください',
        'DISPLAY_NAME_TAKEN',
        409,
      );
    }

    const participantToken = generateUUID();

    if (existingParticipant) {
      // 既存参加者の更新（participant_token で特定。表示名の重複ではマージしない）
      const { data: updatedParticipant, error: updateError } = await supabase
        .from('participants')
        .update({
          display_name: displayNameTrimmed,
          is_attending,
          brought_count,
          participant_token: participantToken,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingParticipant.id)
        .select('id')
        .single();

      if (updateError) {
        console.error('Participant update error:', updateError);
        return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
      }

      // 既存参加者が持ち込みボトル数/ラベルを更新した場合、Sampleも同期する
      // NOTE: registering中のみ通るので、基本はpendingのSampleのみを対象にする
      if (brought_count > 0) {
        type ExistingSampleRow = {
          id: string;
          state: string | null;
          sort_order: number | null;
          created_at: string;
        };
        const desiredLabels = bottle_labels.map((l: string) => l.trim());

        const { data: existingSamples, error: samplesFetchError } = await supabase
          .from('samples')
          .select('id, state, sort_order, created_at')
          .eq('session_id', session.id)
          .eq('presenter_participant_id', updatedParticipant.id)
          .order('sort_order')
          .order('created_at')
          .order('id');

        if (samplesFetchError) {
          console.error('Samples fetch error:', samplesFetchError);
          return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
        }

        const samples = (existingSamples || []) as ExistingSampleRow[];
        const nonPending = samples.find((s) => s.state && s.state !== 'pending');
        if (nonPending) {
          return errorResponse(
            '既に進行中のサンプルがあるため、持ち込みボトルの変更はできません',
            'SAMPLES_NOT_EDITABLE',
            409
          );
        }

        // 先頭から必要数だけ更新/追加
        for (let i = 0; i < desiredLabels.length; i++) {
          const label = desiredLabels[i] || defaultBottleLabel(displayNameTrimmed, i);
          const existing = samples[i];
          if (existing) {
            const { error: updateSampleError } = await supabase
              .from('samples')
              .update({
                label,
                sort_order: i,
                state: 'pending',
                presenter_participant_id: updatedParticipant.id,
              })
              .eq('id', existing.id);
            if (updateSampleError) {
              console.error('Sample update error:', updateSampleError);
              return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
            }
          } else {
            const { error: insertSampleError } = await supabase
              .from('samples')
              .insert({
                session_id: session.id,
                label,
                presenter_participant_id: updatedParticipant.id,
                sort_order: i,
                state: 'pending',
              });
            if (insertSampleError) {
              console.error('Sample insert error:', insertSampleError);
              return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
            }
          }
        }

        // 余ったSampleは削除（pendingのみ）
        const extra = samples.slice(desiredLabels.length);
        if (extra.length > 0) {
          const extraIds = extra.map((s) => s.id);
          const { error: deleteError } = await supabase
            .from('samples')
            .delete()
            .in('id', extraIds)
            .eq('session_id', session.id)
            .eq('presenter_participant_id', updatedParticipant.id);
          if (deleteError) {
            console.error('Sample delete error:', deleteError);
            return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
          }
        }
      } else {
        // 0本にした場合は、自分のpendingサンプルを削除
        type ExistingSampleLiteRow = { id: string; state: string | null };
        const { data: existingSamples } = await supabase
          .from('samples')
          .select('id, state')
          .eq('session_id', session.id)
          .eq('presenter_participant_id', updatedParticipant.id);
        const samples = (existingSamples || []) as ExistingSampleLiteRow[];
        const nonPending = samples.find((s) => s.state && s.state !== 'pending');
        if (nonPending) {
          return errorResponse(
            '既に進行中のサンプルがあるため、持ち込みボトルを0本に変更できません',
            'SAMPLES_NOT_EDITABLE',
            409
          );
        }
        if (samples.length > 0) {
          const ids = samples.map((s) => s.id);
          const { error: deleteError } = await supabase
            .from('samples')
            .delete()
            .in('id', ids)
            .eq('session_id', session.id)
            .eq('presenter_participant_id', updatedParticipant.id);
          if (deleteError) {
            console.error('Sample delete error:', deleteError);
            return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
          }
        }
      }

      return successResponse({
        participant_id: updatedParticipant.id,
        participant_token: participantToken,
        session_id: session.id,
      });
    } else {
      // 新規参加者登録
      const { data: newParticipant, error: insertError } = await supabase
        .from('participants')
        .insert({
          session_id: session.id,
          display_name: displayNameTrimmed,
          is_attending,
          brought_count,
          participant_token: participantToken,
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('Participant creation error:', insertError);
        return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
      }

      // Sample自動生成（持ち込み本数分）
      if (brought_count > 0) {
        const samples = bottle_labels.map((label: string, index: number) => ({
          session_id: session.id,
          label: label.trim() || defaultBottleLabel(displayNameTrimmed, index),
          presenter_participant_id: newParticipant.id,
          sort_order: index,
          state: 'pending',
        }));

        const { error: samplesError } = await supabase
          .from('samples')
          .insert(samples);

        if (samplesError) {
          console.error('Sample creation error:', samplesError);
          // Sample作成失敗はログのみ（参加登録は成功とする）
        }
      }


      return successResponse({
        participant_id: newParticipant.id,
        participant_token: participantToken,
        session_id: session.id,
      });
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
