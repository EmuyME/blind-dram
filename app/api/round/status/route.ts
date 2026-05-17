// GET /api/round/status
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { supabase } from '@/lib/supabase';
import { writeErrorLog } from '@/lib/logger';
import {
  isParticipantManualGradingComplete,
  type ItemGradesMap,
} from '@/lib/scoring-schema';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sampleId = searchParams.get('sample_id');
    const participantToken = searchParams.get('participant_token');

    if (!sampleId) {
      return errorResponse('sample_idが必要です', 'MISSING_PARAMETER', 400);
    }

    // Sample取得
    const { data: sample, error: sampleError } = await supabase
      .from('samples')
      .select('id, state, session_id, presenter_participant_id, label')
      .eq('id', sampleId)
      .single();

    if (sampleError || !sample) {
      return errorResponse('Sampleが見つかりません', 'SAMPLE_NOT_FOUND', 404);
    }

    const { data: sessionRow } = await supabase
      .from('sessions')
      .select('mode, scoring_snapshot, cask_options_snapshot, region_options_snapshot')
      .eq('id', sample.session_id)
      .maybeSingle();
    const sessionMode =
      sessionRow?.mode === 'sequential' || sessionRow?.mode === 'simultaneous'
        ? sessionRow.mode
        : null;

    // Presenter権限チェック（participant_tokenがある場合）
    let isPresenter = false;
    let participant: { id: string } | null = null;
    if (participantToken) {
      const { data: participantData, error: participantError } = await supabase
        .from('participants')
        .select('id')
        .eq('participant_token', participantToken)
        .eq('session_id', sample.session_id)
        .single();

      if (participantError) {
        console.error('[DEBUG] Participant fetch error:', participantError);
      } else {
        participant = participantData || null;
        if (participant && sample.presenter_participant_id === participant.id) {
          isPresenter = true;
        }
      }
    }
    

    // 参加者進捗取得
    const { data: participants, error: participantsError } = await supabase
      .from('participants')
      .select('id, display_name')
      .eq('session_id', sample.session_id)
      .eq('is_attending', true);

    if (participantsError) {
      console.error('Participants fetch error:', participantsError);
      return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
    }

    // 回答状況取得（Presenterの場合は詳細情報も取得、revealed状態の場合は参加者にも自分の回答を返す）
    // 逐次モードでrevealed状態の場合、参加者は自分の回答を見られる
    const isRevealed = sample.state === 'revealed';
    const answerSelect = isPresenter || isRevealed
      ? 'participant_id, status, submitted_at, guessed_cask, guessed_region, guessed_age, guessed_abv, guessed_distillery, guessed_other1, guessed_other2, nose, palate, finish, bottle_image_url'
      : 'participant_id, status, submitted_at';
    const { data: answersData, error: answersError } = await supabase
      .from('answers')
      // 動的 select 文字列（プレゼンター / revealed で列が変わる）
      .select(answerSelect)
      .eq('sample_id', sampleId);

    if (answersError) {
      console.error('[DEBUG] Round status - Answers fetch error:', answersError);
      return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
    }

    const answers =
      ((answersData as unknown) as Array<{
        participant_id: string;
        status: string | null;
        submitted_at: string | null;
        guessed_cask?: string | null;
        guessed_region?: string | null;
        guessed_age?: number | null;
        guessed_abv?: number | null;
        guessed_distillery?: string | null;
        guessed_other1?: string | null;
        guessed_other2?: string | null;
        nose?: unknown;
        palate?: unknown;
        finish?: unknown;
        bottle_image_url?: string | null;
      }>) || [];

    // ログは重要な変更時のみ記録（ポーリングで頻繁に呼ばれるため）
    // console.log('[DEBUG] Round status - Answers fetched:', {
    //   sample_id: sampleId,
    //   is_presenter: isPresenter,
    //   answers_count: answers?.length || 0,
    // });

    // 採点結果取得（Presenterの場合のみ）
    let grades: Array<{
      participant_id: string;
      is_correct: boolean;
      item_grades: ItemGradesMap | null;
    }> = [];
    if (isPresenter) {
      const { data: gradesData, error: gradesError } = await supabase
        .from('distillery_grades')
        .select('participant_id, is_correct, item_grades')
        .eq('sample_id', sampleId);

      if (gradesError) {
        console.error('Grades fetch error:', gradesError);
      } else {
        grades = (gradesData || []) as typeof grades;
      }
    }

    // Truth入力確認（Presenterの場合、またはrevealed状態の場合は詳細情報も取得）
    const truthSelect = isPresenter || isRevealed
      ? 'id, true_cask, true_region, true_age, true_abv, true_distillery, true_other1, true_other2, true_bottler_name, true_distillation_year, true_bottling_year, notes, bottle_image_url'
      : 'id';
    const { data: truthData } = await supabase
      .from('truths')
      .select(truthSelect)
      .eq('sample_id', sampleId)
      .single();

    const truth = (truthData as unknown as null | {
      id: string;
      true_cask?: string | null;
      true_region?: string | null;
      true_age?: number | null;
      true_abv?: number | null;
      true_distillery?: string | null;
      true_other1?: string | null;
      true_other2?: string | null;
      true_bottler_name?: string | null;
      true_distillation_year?: number | null;
      true_bottling_year?: number | null;
      notes?: string | null;
      bottle_image_url?: string | null;
    }) ?? null;

    const participantProgress = (participants || []).map((p) => {
        const answer = answers?.find((a) => a.participant_id === p.id);

        // 回答の状態を取得（回答がない場合は'draft'）
        const answerStatus = answer ? answer.status : 'draft';
        
        // ログは重要な変更時のみ記録（ポーリングで頻繁に呼ばれるため）
        // console.log(`[DEBUG] Round status - Participant ${p.id} (${p.display_name}):`, {
        //   has_answer: !!answer,
        //   answer_status: answer?.status,
        //   final_status: answerStatus,
        // });

        const base = {
          participant_id: p.id,
          display_name: p.display_name,
          status: answerStatus,
          submitted_at: answer?.submitted_at || null,
        };

        // Presenterの場合、またはrevealed状態で自分の回答の場合、回答内容と採点結果を含める
        const isMyAnswer = !isPresenter && participant && p.id === participant.id;
        const shouldIncludeAnswerDetails = isPresenter || (isRevealed && isMyAnswer);
        
        if (shouldIncludeAnswerDetails) {
          const gradeForParticipant = grades.find((g) => g.participant_id === p.id);
          if (answer) {
            // 回答がある場合
            const result = {
              ...base,
              guessed_cask: answer.guessed_cask || null,
              guessed_region: answer.guessed_region || null,
              guessed_age: answer.guessed_age || null,
              guessed_abv: answer.guessed_abv || null,
              guessed_distillery: answer.guessed_distillery || null,
              guessed_other1: answer.guessed_other1 ?? null,
              guessed_other2: answer.guessed_other2 ?? null,
              nose: answer.nose || null,
              palate: answer.palate || null,
              finish: answer.finish || null,
              bottle_image_url: answer.bottle_image_url || null,
              is_correct: gradeForParticipant?.is_correct ?? undefined,
              item_grades: gradeForParticipant?.item_grades ?? undefined,
            };
            // ログは重要な変更時のみ記録（ポーリングで頻繁に呼ばれるため）
            // console.log(`[DEBUG] Participant ${p.id} (${p.display_name}): has_answer=true, status=${answer.status}, guessed_distillery=${answer.guessed_distillery || 'null'}, grade=${gradeForParticipant?.is_correct ?? 'undefined'}`);
            return result;
          } else {
            // 回答がない場合でも採点結果は含める（念のため）
            const result = {
              ...base,
              guessed_cask: null,
              guessed_region: null,
              guessed_age: null,
              guessed_abv: null,
              guessed_distillery: null,
              guessed_other1: null,
              guessed_other2: null,
              nose: null,
              palate: null,
              finish: null,
              bottle_image_url: null,
              is_correct: gradeForParticipant?.is_correct ?? undefined,
              item_grades: gradeForParticipant?.item_grades ?? undefined,
            };
            // ログは重要な変更時のみ記録（ポーリングで頻繁に呼ばれるため）
            // console.log(`[DEBUG] Participant ${p.id} (${p.display_name}): has_answer=false, grade=${gradeForParticipant?.is_correct ?? 'undefined'}`);
            return result;
          }
        }

        return base;
      });

    // ログは重要な変更時のみ記録（ポーリングで頻繁に呼ばれるため）
    // console.log('[DEBUG] Round status - Participant progress:', {
    //   sample_id: sampleId,
    //   total_participants: participants?.length || 0,
    //   filtered_count: participantProgress.length,
    // });

    // プレゼンター以外＝「出題ボトルの他人の回答者」がいるときは、その全員の提出を待つ。
    // プレゼンター以外に出席者がいないときは、他人の提出待ちなし（allSubmitted とみなす）。
    const nonPresenterProgress = participantProgress.filter(
      (p) => p.participant_id !== sample.presenter_participant_id,
    );
    const allSubmitted =
      nonPresenterProgress.length > 0
        ? nonPresenterProgress.every((p) => p.status === 'submitted' || p.status === 'graded')
        : true; // プレゼンター以外に出席者がいない → 提出待ちなし

    const truthEntered = !!truth;

    let allGraded = false;
    if (isPresenter) {
      const gradeByPid = new Map(grades.map((g) => [g.participant_id, g]));
      const submittedForGrading = participantProgress.filter(
        (p) => p.status === 'submitted' || p.status === 'graded',
      );
      const noNonPresenterAttendees = nonPresenterProgress.length === 0;
      // 解答者ゼロかつ提出済み回答がない → 採点対象なし（正解保存のみで Round 進行可）
      if (noNonPresenterAttendees && submittedForGrading.length === 0) {
        allGraded = allSubmitted && truthEntered;
      } else {
        allGraded =
          allSubmitted &&
          submittedForGrading.length > 0 &&
          submittedForGrading.every((p) => {
            const g = gradeByPid.get(p.participant_id);
            return isParticipantManualGradingComplete(
              sessionRow?.scoring_snapshot ?? null,
              g
                ? { is_correct: g.is_correct, item_grades: g.item_grades }
                : null,
            );
          });
      }
    }

    const response: {
      sample_id: string;
      state: string;
      session_mode: typeof sessionMode;
      participant_progress: typeof participantProgress;
      truth_entered: boolean;
      all_submitted: boolean;
      all_graded: boolean;
      presenter_participant_id: string | null;
      label: string | null;
      truth?: {
        true_cask: string | null | undefined;
        true_region: string | null | undefined;
        true_age: number | null | undefined;
        true_abv: number | null | undefined;
        true_distillery: string | null | undefined;
        true_other1: string | null | undefined;
        true_other2: string | null | undefined;
        true_bottler_name: string | null | undefined;
        true_distillation_year: number | null | undefined;
        true_bottling_year: number | null | undefined;
        notes: string | null | undefined;
        bottle_image_url: string | null;
      };
      scoring_snapshot?: unknown;
      cask_options_snapshot?: unknown;
      region_options_snapshot?: unknown;
    } = {
      sample_id: sampleId,
      state: sample.state,
      session_mode: sessionMode,
      participant_progress: participantProgress,
      truth_entered: truthEntered,
      all_submitted: allSubmitted,
      all_graded: allGraded, // 採点完了フラグを追加
      presenter_participant_id: sample.presenter_participant_id, // PresenterのIDを追加
      label: sample.label, // Sampleのラベルを追加
    };
    

    // Presenterの場合、またはrevealed状態の場合はTruth情報も含める
    if ((isPresenter || isRevealed) && truth) {
      response.truth = {
        true_cask: truth.true_cask,
        true_region: truth.true_region,
        true_age: truth.true_age,
        true_abv: truth.true_abv,
        true_distillery: truth.true_distillery,
        true_other1: truth.true_other1,
        true_other2: truth.true_other2,
        true_bottler_name: truth.true_bottler_name,
        true_distillation_year: truth.true_distillation_year,
        true_bottling_year: truth.true_bottling_year,
        notes: truth.notes,
        bottle_image_url: truth.bottle_image_url || null,
      };
    }

    if (isPresenter) {
      response.scoring_snapshot = sessionRow?.scoring_snapshot ?? null;
      response.cask_options_snapshot = sessionRow?.cask_options_snapshot ?? null;
      response.region_options_snapshot = sessionRow?.region_options_snapshot ?? null;
    }
    

    // ログは重要な変更時のみ記録（ポーリングで頻繁に呼ばれるため）
    // 状態が変わった時のみ記録する場合は、前回の状態を保存して比較する必要がある
    // console.log('[DEBUG] Round status - Final response:', {
    //   sample_id: sampleId,
    //   state: sample.state,
    //   truth_entered: truthEntered,
    //   all_submitted: allSubmitted,
    //   all_graded: allGraded,
    // });

    return successResponse(response);
  } catch (error) {
    console.error('Unexpected error:', error);
    writeErrorLog('ROUND_STATUS_ERROR', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
