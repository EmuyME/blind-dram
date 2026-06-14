// POST /api/answers/upsert
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { sql, jsonb } from '@/lib/db';
import { writeLog, writeErrorLog } from '@/lib/logger';
import { normalizeAgeAbvStorage } from '@/lib/storage-value';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      participant_token,
      sample_id,
      status,
      guessed_cask,
      guessed_region,
      guessed_age,
      guessed_abv,
      guessed_distillery,
      guessed_other1,
      guessed_other2,
      nose,
      palate,
      finish,
      score_0_100,
    } = body;

    if (!participant_token || !sample_id || !status) {
      return errorResponse('participant_token、sample_id、statusが必要です', 'MISSING_PARAMETER', 400);
    }

    if (status !== 'draft' && status !== 'submitted') {
      return errorResponse('ステータスが不正です。draft または submitted を指定してください', 'INVALID_STATUS', 400);
    }

    const participants = await sql`
      SELECT id, session_id FROM participants
      WHERE participant_token = ${participant_token}
      LIMIT 1
    `;
    const participant = participants[0];
    if (!participant) {
      return errorResponse('認証トークンが不正です', 'UNAUTHORIZED', 401);
    }

    const samples = await sql`
      SELECT id, session_id, state, presenter_participant_id FROM samples
      WHERE id = ${sample_id}
      LIMIT 1
    `;
    const sample = samples[0];
    if (!sample) {
      return errorResponse('Sampleが見つかりません', 'SAMPLE_NOT_FOUND', 404);
    }

    const existingRows = await sql`
      SELECT version, status FROM answers
      WHERE session_id = ${sample.session_id}
        AND sample_id = ${sample_id}
        AND participant_id = ${participant.id}
      LIMIT 1
    `;
    const existingAnswer = existingRows[0] as { version: number; status: string } | undefined;

    const isPresenter =
      sample.presenter_participant_id != null &&
      sample.presenter_participant_id === participant.id;
    const sampleState = sample.state as string;
    const isPostRoundSample =
      sampleState === 'revealed' || sampleState === 'closed';
    const presenterMayCreateFirstAnswerRow =
      isPresenter &&
      !existingAnswer &&
      (sample.state === 'grading' || isPostRoundSample);
    const canUpsertInCurrentState =
      sample.state === 'answering' ||
      presenterMayCreateFirstAnswerRow ||
      (sample.state === 'grading' && existingAnswer?.status === 'draft') ||
      (sample.state === 'grading' && existingAnswer?.status === 'submitted' && isPresenter) ||
      (isPostRoundSample && isPresenter && existingAnswer?.status === 'submitted');
    if (!canUpsertInCurrentState) {
      return errorResponse(
        'Round状態が不正です。answering状態、または差し戻し後のみ回答できます（提出済みプレゼンターのテイスティング更新は grading または revealed/closed でも可）',
        'INVALID_STATE',
        400
      );
    }

    let preservedSubmittedRow: {
      version: number;
      guessed_cask: string | null;
      guessed_region: string | null;
      guessed_age: string | null;
      guessed_abv: string | null;
      guessed_distillery: string | null;
      guessed_other1: string | null;
      guessed_other2: string | null;
      score_0_100: number | null;
      bottle_image_url: string | null;
      submitted_at: string | null;
      nose: unknown;
      palate: unknown;
      finish: unknown;
    } | null = null;

    if (isPostRoundSample && isPresenter && existingAnswer?.status === 'submitted') {
      const fullRows = await sql`
        SELECT version, guessed_cask, guessed_region, guessed_age, guessed_abv,
               guessed_distillery, guessed_other1, guessed_other2, score_0_100,
               bottle_image_url, submitted_at, nose, palate, finish
        FROM answers
        WHERE session_id = ${sample.session_id}
          AND sample_id = ${sample_id}
          AND participant_id = ${participant.id}
        LIMIT 1
      `;
      const fullRow = fullRows[0] as {
        version: number;
        guessed_cask: string | null;
        guessed_region: string | null;
        guessed_age: string | null;
        guessed_abv: string | null;
        guessed_distillery: string | null;
        guessed_other1: string | null;
        guessed_other2: string | null;
        score_0_100: number | null;
        bottle_image_url: string | null;
        submitted_at: string | null;
        nose: unknown;
        palate: unknown;
        finish: unknown;
      };
      if (!fullRow) {
        return errorResponse('提出済み回答の取得に失敗しました', 'ANSWER_NOT_FOUND', 400);
      }
      preservedSubmittedRow = fullRow;
    }

    const newVersion = existingAnswer ? existingAnswer.version + 1 : 1;
    const submittedAt = status === 'submitted' ? new Date().toISOString() : null;

    let finalGuessedAge = normalizeAgeAbvStorage(guessed_age);
    let finalGuessedAbv = normalizeAgeAbvStorage(guessed_abv);

    let finalStatus = status;
    let finalVersion = newVersion;
    let finalSubmittedAt: string | null = submittedAt;
    let finalGuessedCask = guessed_cask || null;
    let finalGuessedRegion = guessed_region || null;
    let finalGuessedDistillery = guessed_distillery || null;
    let finalGuessedOther1 =
      typeof guessed_other1 === 'string' ? guessed_other1.trim() || null : guessed_other1 ?? null;
    let finalGuessedOther2 =
      typeof guessed_other2 === 'string' ? guessed_other2.trim() || null : guessed_other2 ?? null;
    let finalNose = nose || null;
    let finalPalate = palate || null;
    let finalFinish = finish || null;
    let finalScore = score_0_100 || null;
    let finalBottleImageUrl: string | null = null;

    if (preservedSubmittedRow) {
      finalStatus = 'submitted';
      finalVersion = preservedSubmittedRow.version + 1;
      finalSubmittedAt = preservedSubmittedRow.submitted_at;
      finalGuessedCask = preservedSubmittedRow.guessed_cask;
      finalGuessedRegion = preservedSubmittedRow.guessed_region;
      finalGuessedAge = preservedSubmittedRow.guessed_age;
      finalGuessedAbv = preservedSubmittedRow.guessed_abv;
      finalGuessedDistillery = preservedSubmittedRow.guessed_distillery;
      finalGuessedOther1 = preservedSubmittedRow.guessed_other1;
      finalGuessedOther2 = preservedSubmittedRow.guessed_other2;
      finalScore = preservedSubmittedRow.score_0_100;
      finalBottleImageUrl = preservedSubmittedRow.bottle_image_url;
      finalNose = nose !== undefined ? nose : preservedSubmittedRow.nose;
      finalPalate = palate !== undefined ? palate : preservedSubmittedRow.palate;
      finalFinish = finish !== undefined ? finish : preservedSubmittedRow.finish;
    }

    const saveLogData = {
      participant_id: participant.id,
      sample_id: sample_id,
      status: status,
      has_guessed_distillery: !!guessed_distillery,
    };
    console.log('[DEBUG] Answer upsert - Saving answer:', saveLogData);
    writeLog('ANSWER_UPSERT_SAVE', saveLogData);

    const updatedAt = new Date().toISOString();
    let answerRows;
    try {
      answerRows = await sql`
        INSERT INTO answers (
          session_id, sample_id, participant_id, status,
          guessed_cask, guessed_region, guessed_age, guessed_abv,
          guessed_distillery, guessed_other1, guessed_other2,
          nose, palate, finish, score_0_100, bottle_image_url,
          version, submitted_at, updated_at
        ) VALUES (
          ${sample.session_id}, ${sample_id}, ${participant.id}, ${finalStatus},
          ${finalGuessedCask}, ${finalGuessedRegion}, ${finalGuessedAge}, ${finalGuessedAbv},
          ${finalGuessedDistillery}, ${finalGuessedOther1}, ${finalGuessedOther2},
          ${jsonb(finalNose)}::jsonb, ${jsonb(finalPalate)}::jsonb, ${jsonb(finalFinish)}::jsonb,
          ${finalScore}, ${finalBottleImageUrl},
          ${finalVersion}, ${finalSubmittedAt}, ${updatedAt}
        )
        ON CONFLICT (session_id, sample_id, participant_id)
        DO UPDATE SET
          status = EXCLUDED.status,
          guessed_cask = EXCLUDED.guessed_cask,
          guessed_region = EXCLUDED.guessed_region,
          guessed_age = EXCLUDED.guessed_age,
          guessed_abv = EXCLUDED.guessed_abv,
          guessed_distillery = EXCLUDED.guessed_distillery,
          guessed_other1 = EXCLUDED.guessed_other1,
          guessed_other2 = EXCLUDED.guessed_other2,
          nose = EXCLUDED.nose,
          palate = EXCLUDED.palate,
          finish = EXCLUDED.finish,
          score_0_100 = EXCLUDED.score_0_100,
          bottle_image_url = EXCLUDED.bottle_image_url,
          version = EXCLUDED.version,
          submitted_at = EXCLUDED.submitted_at,
          updated_at = EXCLUDED.updated_at
        RETURNING id, status, version, submitted_at
      `;
    } catch (upsertError) {
      console.error('Answer upsert error:', upsertError);
      writeErrorLog('ANSWER_UPSERT_ERROR', upsertError);
      return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
    }

    const answer = answerRows[0];
    if (!answer) {
      return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
    }

    const successLogData = {
      answer_id: answer.id,
      status: answer.status,
      submitted_at: answer.submitted_at,
    };
    console.log('[DEBUG] Answer upsert - Saved successfully:', successLogData);
    writeLog('ANSWER_UPSERT_SUCCESS', successLogData);

    if (status === 'submitted' && sample.state === 'answering') {
      const sampleWithPresenterRows = await sql`
        SELECT presenter_participant_id FROM samples WHERE id = ${sample_id} LIMIT 1
      `;
      const sampleWithPresenter = sampleWithPresenterRows[0];

      const allParticipants = await sql`
        SELECT id FROM participants
        WHERE session_id = ${sample.session_id} AND is_attending = true
      `;

      const nonPresenterParticipants = sampleWithPresenter?.presenter_participant_id
        ? allParticipants.filter((p) => p.id !== sampleWithPresenter.presenter_participant_id)
        : allParticipants;

      const submittedAnswers = await sql`
        SELECT participant_id FROM answers
        WHERE sample_id = ${sample_id} AND status = 'submitted'
      `;

      const truthRows = await sql`
        SELECT id FROM truths WHERE sample_id = ${sample_id} LIMIT 1
      `;

      const submittedParticipantIds = new Set(submittedAnswers.map((a) => a.participant_id));
      const allSubmitted =
        nonPresenterParticipants.length > 0
          ? nonPresenterParticipants.every((p) => submittedParticipantIds.has(p.id))
          : true;
      const truthEntered = truthRows.length > 0;

      const transitionLogData = {
        sample_id: sample_id,
        current_state: sample.state,
        presenter_id: sampleWithPresenter?.presenter_participant_id,
        all_participants_count: allParticipants.length,
        non_presenter_count: nonPresenterParticipants.length,
        submitted_count: submittedAnswers.length,
        all_submitted: allSubmitted,
        truth_entered: truthEntered,
        submitted_participant_ids: Array.from(submittedParticipantIds),
        non_presenter_ids: nonPresenterParticipants.map((p) => p.id),
      };
      console.log('[DEBUG] Answer upsert - State transition check:', transitionLogData);
      writeLog('ANSWER_UPSERT_STATE_CHECK', transitionLogData);

      if (allSubmitted && truthEntered) {
        console.log('[DEBUG] Answer upsert - All participants submitted and truth entered, attempting state transition to grading');
        writeLog('ANSWER_UPSERT_STATE_TRANSITION', {
          sample_id,
          from: 'answering',
          to: 'grading',
          reason: 'all_submitted_and_truth_entered',
        });

        try {
          const updatedSamples = await sql`
            UPDATE samples SET state = 'grading'
            WHERE id = ${sample_id} AND state = 'answering'
            RETURNING state
          `;
          if (updatedSamples.length > 0) {
            console.log('[DEBUG] Answer upsert - State transitioned successfully to grading');
            writeLog('ANSWER_UPSERT_STATE_TRANSITION_SUCCESS', { sample_id, new_state: 'grading' });
          } else {
            console.log('[DEBUG] Answer upsert - State was already changed by another request (likely truths/upsert)');
            writeLog('ANSWER_UPSERT_STATE_ALREADY_CHANGED', { sample_id, expected_state: 'answering' });
          }
        } catch (stateUpdateError) {
          console.error('[DEBUG] Answer upsert - State update error:', stateUpdateError);
          writeErrorLog('ANSWER_UPSERT_STATE_UPDATE_ERROR', stateUpdateError);
        }
      }
    }

    return successResponse({
      answer_id: answer.id,
      status: answer.status,
      version: answer.version,
      submitted_at: answer.submitted_at,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
