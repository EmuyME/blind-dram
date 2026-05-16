// GET /api/round-result/get
// 逐次モードでラウンド終了時に表示する結果を取得
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { supabase } from '@/lib/supabase';
import { calculateScore } from '@/lib/score-calculator';
import { getAnswerSectionFlavor, tier1ListFromFlavorChart, toScoringConfig } from '@/lib/json-helpers';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const joinToken = searchParams.get('join_token');
    const sampleId = searchParams.get('sample_id');

    if (!joinToken || !sampleId) {
      return errorResponse('join_tokenとsample_idが必要です', 'MISSING_PARAMETER', 400);
    }

    // Session取得
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, title, mode, state, flavor_chart_snapshot, scoring_snapshot')
      .eq('join_token', joinToken)
      .single();

    if (sessionError || !session) {
      return errorResponse('Sessionが見つかりません', 'SESSION_NOT_FOUND', 404);
    }

    // 逐次モードでない場合はエラー
    if (session.mode !== 'sequential') {
      return errorResponse('逐次モードの時のみ使用できます', 'INVALID_MODE', 400);
    }

    // Sample取得と状態チェック（プレゼンター情報も取得）
    const { data: sample, error: sampleError } = await supabase
      .from('samples')
      .select('id, label, state, session_id, sort_order, presenter_participant_id')
      .eq('id', sampleId)
      .eq('session_id', session.id)
      .single();

    if (sampleError || !sample) {
      return errorResponse('Sampleが見つかりません', 'SAMPLE_NOT_FOUND', 404);
    }

    // 結果表示の対象となる状態かチェック
    // - 逐次モードでは、基本的に`revealed`状態で結果を表示する
    // - ただし、将来的な仕様変更や集計処理の都合で`closed`になるケースも考慮しておく
    if (sample.state !== 'revealed' && sample.state !== 'closed') {
      return errorResponse('このラウンドはまだ公開されていません', 'ROUND_NOT_FINISHED', 400);
    }

    // 参加者一覧取得
    const { data: participants, error: participantsError } = await supabase
      .from('participants')
      .select('id, display_name')
      .eq('session_id', session.id)
      .eq('is_attending', true);

    if (participantsError) {
      console.error('Participants fetch error:', participantsError);
      return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
    }

    // 完了したサンプル一覧取得（現段階での順位表用）
    const { data: completedSamples, error: completedSamplesError } = await supabase
      .from('samples')
      .select('id, label')
      .eq('session_id', session.id)
      .in('state', ['revealed', 'closed'])
      .order('sort_order');

    if (completedSamplesError) {
      console.error('Completed samples fetch error:', completedSamplesError);
      return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
    }

    // Truth一覧取得（完了したサンプルのみ）
    const completedSampleIds = completedSamples?.map((s) => s.id) || [];
    const { data: truths, error: truthsError } = await supabase
      .from('truths')
      .select('sample_id, true_cask, true_region, true_age, true_abv, true_distillery, bottle_image_url')
      .eq('session_id', session.id)
      .in('sample_id', completedSampleIds);

    if (truthsError) {
      console.error('Truths fetch error:', truthsError);
      return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
    }

    // 回答一覧取得（完了したサンプルのみ）
    const { data: answers, error: answersError } = await supabase
      .from('answers')
      .select('sample_id, participant_id, guessed_cask, guessed_region, guessed_age, guessed_abv, guessed_distillery, nose, palate, finish')
      .eq('session_id', session.id)
      .eq('status', 'submitted')
      .in('sample_id', completedSampleIds);

    if (answersError) {
      console.error('Answers fetch error:', answersError);
      return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
    }

    // 採点結果取得（完了したサンプルのみ）
    const { data: grades, error: gradesError } = await supabase
      .from('distillery_grades')
      .select('sample_id, participant_id, is_correct')
      .eq('session_id', session.id)
      .in('sample_id', completedSampleIds);

    if (gradesError) {
      console.error('Grades fetch error:', gradesError);
      return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
    }

    // 現段階での順位表作成（完了したサンプルのみ）
    const participantScores = new Map<string, { total: number; samples: Map<string, number> }>();

    (participants || []).forEach((p) => {
      participantScores.set(p.id, { total: 0, samples: new Map() });
    });

    (completedSamples || []).forEach((completedSample) => {
      const truth = truths?.find((t) => t.sample_id === completedSample.id);
      if (!truth) return;

      (participants || []).forEach((participant) => {
        const answer = answers?.find(
          (a) => a.sample_id === completedSample.id && a.participant_id === participant.id
        );
        if (!answer) return;

        const grade = grades?.find(
          (g) => g.sample_id === completedSample.id && g.participant_id === participant.id
        );

        const score = calculateScore(
          {
            guessed_cask: answer.guessed_cask,
            guessed_region: answer.guessed_region,
            guessed_age: answer.guessed_age,
            guessed_abv: answer.guessed_abv,
            guessed_distillery: answer.guessed_distillery,
          },
          {
            true_cask: truth.true_cask,
            true_region: truth.true_region,
            true_age: truth.true_age,
            true_abv: truth.true_abv,
            true_distillery: truth.true_distillery,
          },
          grade ? { is_correct: grade.is_correct } : null,
          toScoringConfig(session.scoring_snapshot)
        );

        const participantScore = participantScores.get(participant.id);
        if (participantScore) {
          participantScore.total += score;
          participantScore.samples.set(completedSample.id, score);
        }
      });
    });

    // ランキング作成
    const ranking = Array.from(participantScores.entries())
      .map(([participantId, scores]) => {
        const participant = participants?.find((p) => p.id === participantId);
        return {
          participant_id: participantId,
          display_name: participant?.display_name || '',
          total_score: scores.total,
        };
      })
      .sort((a, b) => b.total_score - a.total_score)
      .map((item, index) => ({
        ...item,
        rank: index + 1,
        sample_scores: (completedSamples || []).map((s) => ({
          sample_id: s.id,
          sample_label: s.label,
          score: participantScores.get(item.participant_id)?.samples.get(s.id) || 0,
        })),
      }));

    // プレゼンター情報を取得
    const presenter = sample.presenter_participant_id
      ? participants?.find((p) => p.id === sample.presenter_participant_id)
      : null;

    // 当該ラウンドの詳細情報
    const currentTruth = truths?.find((t) => t.sample_id === sampleId);
    if (!currentTruth) {
      return errorResponse('このラウンドの正解情報が見つかりません', 'TRUTH_NOT_FOUND', 404);
    }

    const currentAnswers = answers?.filter((a) => a.sample_id === sampleId) || [];
    const participantAnswers = currentAnswers.map((answer) => {
      const participant = participants?.find((p) => p.id === answer.participant_id);
      const grade = grades?.find(
        (g) => g.sample_id === sampleId && g.participant_id === answer.participant_id
      );
      const score = participantScores.get(answer.participant_id)?.samples.get(sampleId) || 0;
      return {
        participant_id: answer.participant_id,
        display_name: participant?.display_name || '',
        guessed_cask: answer.guessed_cask || '',
        guessed_region: answer.guessed_region || '',
        guessed_age: answer.guessed_age || null,
        guessed_abv: answer.guessed_abv || null,
        guessed_distillery: answer.guessed_distillery || '',
        is_correct_distillery: grade?.is_correct || false,
        score,
      };
    });

    // フレーバーコメント
    const comments = currentAnswers.map((answer) => {
      const participant = participants?.find((p) => p.id === answer.participant_id);
      return {
        participant_id: answer.participant_id,
        display_name: participant?.display_name || '',
        nose: answer.nose || { tier1_tags: [], tier2_terms: [], text: null },
        palate: answer.palate || { tier1_tags: [], tier2_terms: [], text: null },
        finish: answer.finish || { tier1_tags: [], tier2_terms: [], text: null },
      };
    });

    // サンプル別レーダーチャート
    const tier1List = tier1ListFromFlavorChart(session.flavor_chart_snapshot);
    const sampleTier1Counts: Record<string, number> = {};
    tier1List.forEach((tier1) => {
      sampleTier1Counts[tier1] = 0;
    });

    currentAnswers.forEach((answer) => {
      (['nose', 'palate', 'finish'] as const).forEach((section) => {
        const flavor = getAnswerSectionFlavor(answer, section);
        if (flavor?.tier1_tags && Array.isArray(flavor.tier1_tags)) {
          flavor.tier1_tags.forEach((tag) => {
            if (sampleTier1Counts[tag] !== undefined) {
              sampleTier1Counts[tag] = (sampleTier1Counts[tag] || 0) + 1;
            }
          });
        }
      });
    });

    // 「その他」Tier2用語の頻度集計
    const otherTermsCount: Record<string, number> = {};
    currentAnswers.forEach((answer) => {
      (['nose', 'palate', 'finish'] as const).forEach((section) => {
        const flavor = getAnswerSectionFlavor(answer, section);
        if (flavor?.tier1_tags && Array.isArray(flavor.tier1_tags)) {
          const hasOther = flavor.tier1_tags.includes('その他');
          if (hasOther && flavor.tier2_terms && Array.isArray(flavor.tier2_terms)) {
            flavor.tier2_terms.forEach((term) => {
              if (term && term.trim()) {
                otherTermsCount[term] = (otherTermsCount[term] || 0) + 1;
              }
            });
          }
        }
      });
    });

    const otherTerms = Object.entries(otherTermsCount)
      .map(([term, count]) => ({ term, count }))
      .sort((a, b) => b.count - a.count);

    // 既に次ラウンドが開始されているか（answering/grading が存在するか）を確認
    // 結果ページ側が「次に進む」タイミングを検知して自動遷移できるように返す
    const { data: activeSample } = await supabase
      .from('samples')
      .select('id, label, state, presenter_participant_id')
      .eq('session_id', session.id)
      .in('state', ['answering', 'grading'])
      .limit(1)
      .maybeSingle();

    // 次のサンプルが存在するかチェック
    // sort_orderの乱れで次サンプルが見つからないケースを避けるため、
    // 「同じセッション内の、自分以外のpendingサンプル」を単純に1件取得する
    // 次ラウンドのPresenter判定のため、presenter_participant_idも取得する
    const { data: nextSample } = await supabase
      .from('samples')
      .select('id, label, state, presenter_participant_id')
      .eq('session_id', session.id)
      .neq('id', sample.id)
      .eq('state', 'pending')
      .order('sort_order')
      .limit(1)
      .maybeSingle();


    // 「次へ」ボタンの状態を取得
    const { data: nextClicks, error: nextClicksError } = await supabase
      .from('round_next_clicks')
      .select('participant_id')
      .eq('sample_id', sampleId);

    if (nextClicksError) {
      console.error('Next clicks fetch error:', nextClicksError);
    }

    const clickedParticipantIds = new Set((nextClicks || []).map((c) => c.participant_id));
    const allClicked = (participants || []).length > 0 && (participants || []).every((p) => clickedParticipantIds.has(p.id));
    const totalCount = (participants || []).length;
    const clickedCount = clickedParticipantIds.size;
    const notClickedParticipants = (participants || [])
      .filter((p) => !clickedParticipantIds.has(p.id))
      .map((p) => ({ participant_id: p.id, display_name: p.display_name }));
    

    const responseData = {
      session: {
        id: session.id,
        title: session.title,
        mode: session.mode,
        state: session.state,
      },
      current_sample: {
        id: sample.id,
        label: sample.label,
      },
      rankings: ranking,
      sample_detail: {
        sample_id: sample.id,
        sample_label: sample.label,
        // プレゼンター名（存在しない場合はnull）
        presenter_name: presenter?.display_name || null,
        truth: {
          true_cask: currentTruth.true_cask,
          true_region: currentTruth.true_region,
          true_age: currentTruth.true_age,
          true_abv: currentTruth.true_abv,
          true_distillery: currentTruth.true_distillery,
          bottle_image_url: currentTruth.bottle_image_url || null,
        },
        participant_answers: participantAnswers,
        comments,
        radar: {
          tier1_counts: sampleTier1Counts,
        },
        other_terms: otherTerms,
      },
      active_sample: activeSample
        ? {
            id: activeSample.id,
            label: activeSample.label ?? null,
            state: activeSample.state ?? null,
            presenter_participant_id: activeSample.presenter_participant_id ?? null,
          }
        : null,
      has_next_sample: !!nextSample,
      next_sample: nextSample
        ? {
            id: nextSample.id,
            label: nextSample.label,
            presenter_participant_id: nextSample.presenter_participant_id ?? null,
          }
        : null,
      all_clicked_next: allClicked,
      next_clicks: {
        clicked_count: clickedCount,
        total_count: totalCount,
        not_clicked_participants: notClickedParticipants,
      },
    };

    return successResponse(responseData);
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
