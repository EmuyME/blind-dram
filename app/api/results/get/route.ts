// GET /api/results/get
import { NextRequest } from 'next/server';
import { successResponse, errorResponse, isMissingPublicResultsColumn } from '@/lib/api-utils';
import { supabase } from '@/lib/supabase';
import { calculateScore } from '@/lib/score-calculator';
import { getAnswerSectionFlavor, tier1ListFromFlavorChart, toScoringConfig } from '@/lib/json-helpers';
import type { PostgrestError } from '@supabase/supabase-js';

type SessionRowForResults = {
  id: string;
  title: string;
  mode: string;
  state: string;
  flavor_chart_snapshot: unknown;
  scoring_snapshot: unknown;
  owner_token: string;
  public_results?: boolean | null;
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const joinToken = searchParams.get('join_token');
    const ownerTokenParam = searchParams.get('owner_token');

    if (!joinToken) {
      return errorResponse('join_tokenが必要です', 'MISSING_PARAMETER', 400);
    }

    const sessionSelectWithPublic =
      'id, title, mode, state, flavor_chart_snapshot, scoring_snapshot, owner_token, public_results';
    const sessionSelectWithoutPublic =
      'id, title, mode, state, flavor_chart_snapshot, scoring_snapshot, owner_token';

    let session: SessionRowForResults | null = null;
    let sessionError: PostgrestError | null = null;

    const first = await supabase
      .from('sessions')
      .select(sessionSelectWithPublic)
      .eq('join_token', joinToken)
      .single();

    session = first.data as SessionRowForResults | null;
    sessionError = first.error;

    if (sessionError && isMissingPublicResultsColumn(sessionError)) {
      const retry = await supabase
        .from('sessions')
        .select(sessionSelectWithoutPublic)
        .eq('join_token', joinToken)
        .single();
      session = retry.data as SessionRowForResults | null;
      sessionError = retry.error;
    }

    if (sessionError || !session) {
      return errorResponse('Sessionが見つかりません', 'SESSION_NOT_FOUND', 404);
    }

    if (session.state !== 'published') {
      return errorResponse(
        '結果が公開されていません。Session状態がpublished以降の時のみ閲覧できます',
        'NOT_PUBLISHED',
        403
      );
    }

    const sessionRow = session as { owner_token?: string; public_results?: boolean | null };
    if (sessionRow.public_results === false) {
      if (!ownerTokenParam || ownerTokenParam !== sessionRow.owner_token) {
        return errorResponse(
          'このセッションの結果は限定公開です。オーナー画面から開くか、オーナーによる共有を待ってください。',
          'RESULTS_NOT_PUBLIC',
          403,
        );
      }
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

    // Sample一覧取得（プレゼンター情報も取得）
    const { data: samples, error: samplesError } = await supabase
      .from('samples')
      .select('id, label, presenter_participant_id')
      .eq('session_id', session.id)
      .order('sort_order');

    if (samplesError) {
      console.error('Samples fetch error:', samplesError);
      return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
    }

    // Truth一覧取得
    const { data: truths, error: truthsError } = await supabase
      .from('truths')
      .select('sample_id, true_cask, true_region, true_age, true_abv, true_distillery, bottle_image_url')
      .eq('session_id', session.id);


    if (truthsError) {
      console.error('Truths fetch error:', truthsError);
      return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
    }

    // 回答一覧取得
    const { data: answers, error: answersError } = await supabase
      .from('answers')
      .select('sample_id, participant_id, guessed_cask, guessed_region, guessed_age, guessed_abv, guessed_distillery, nose, palate, finish, bottle_image_url')
      .eq('session_id', session.id)
      .eq('status', 'submitted');

    if (answersError) {
      console.error('Answers fetch error:', answersError);
      return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
    }

    // 採点結果取得
    const { data: grades, error: gradesError } = await supabase
      .from('distillery_grades')
      .select('sample_id, participant_id, is_correct')
      .eq('session_id', session.id);

    if (gradesError) {
      console.error('Grades fetch error:', gradesError);
      return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
    }

    // 点数計算とランキング作成
    const participantScores = new Map<string, { total: number; samples: Map<string, number> }>();

    (participants || []).forEach((p) => {
      participantScores.set(p.id, { total: 0, samples: new Map() });
    });

    (samples || []).forEach((sample) => {
      const truth = truths?.find((t) => t.sample_id === sample.id);
      if (!truth) return;

      (participants || []).forEach((participant) => {
        const answer = answers?.find(
          (a) => a.sample_id === sample.id && a.participant_id === participant.id
        );
        if (!answer) return;

        const grade = grades?.find(
          (g) => g.sample_id === sample.id && g.participant_id === participant.id
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
          participantScore.samples.set(sample.id, score);
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
      }));

    // フレーバーレーダーチャート集計（総合）
    const tier1Counts: Record<string, number> = {};
    const tier1List = tier1ListFromFlavorChart(session.flavor_chart_snapshot);

    tier1List.forEach((tier1) => {
      tier1Counts[tier1] = 0;
    });

    (answers || []).forEach((answer) => {
      (['nose', 'palate', 'finish'] as const).forEach((section) => {
        const flavor = getAnswerSectionFlavor(answer, section);
        if (flavor?.tier1_tags && Array.isArray(flavor.tier1_tags)) {
          flavor.tier1_tags.forEach((tag) => {
            if (tier1Counts[tag] !== undefined) {
              tier1Counts[tag] = (tier1Counts[tag] || 0) + 1;
            }
          });
        }
      });
    });

    // サンプル別詳細
    const sampleDetails = (samples || []).map((sample) => {
      // サンプル別レーダーチャート
      const sampleTier1Counts: Record<string, number> = {};
      tier1List.forEach((tier1) => {
        sampleTier1Counts[tier1] = 0;
      });

      const sampleAnswers = answers?.filter((a) => a.sample_id === sample.id) || [];
      sampleAnswers.forEach((answer) => {
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

      // コメント一覧
      const comments = sampleAnswers.map((answer) => {
        const participant = participants?.find((p) => p.id === answer.participant_id);
        return {
          participant_id: answer.participant_id,
          display_name: participant?.display_name || '',
          nose: answer.nose || { tier1_tags: [], tier2_terms: [], text: null },
          palate: answer.palate || { tier1_tags: [], tier2_terms: [], text: null },
          finish: answer.finish || { tier1_tags: [], tier2_terms: [], text: null },
        };
      });

      // 「その他」Tier2用語の頻度集計
      const otherTermsCount: Record<string, number> = {};
      sampleAnswers.forEach((answer) => {
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

      // 頻度順にソート
      const otherTerms = Object.entries(otherTermsCount)
        .map(([term, count]) => ({ term, count }))
        .sort((a, b) => b.count - a.count);

      return {
        sample_id: sample.id,
        sample_label: sample.label,
        radar: {
          tier1_counts: sampleTier1Counts,
        },
        comments,
        other_terms: otherTerms,
      };
    });

    // ランキングにsample_scoresを追加
    const rankingsWithScores = ranking.map((r) => {
      const participantScore = participantScores.get(r.participant_id);
      const sampleScores = (samples || []).map((sample) => ({
        sample_id: sample.id,
        sample_label: sample.label,
        score: participantScore?.samples.get(sample.id) || 0,
      }));
      return {
        ...r,
        sample_scores: sampleScores,
      };
    });

    // サンプル詳細にtruthとparticipant_answersを追加
    const sampleDetailsWithTruth = (samples || []).map((sample) => {
      const truth = truths?.find((t) => t.sample_id === sample.id);
      const presenter = sample.presenter_participant_id
        ? participants?.find((p) => p.id === sample.presenter_participant_id)
        : null;
      const sampleAnswers = answers?.filter((a) => a.sample_id === sample.id) || [];
      const participantAnswers = sampleAnswers.map((answer) => {
        const participant = participants?.find((p) => p.id === answer.participant_id);
        const grade = grades?.find(
          (g) => g.sample_id === sample.id && g.participant_id === answer.participant_id
        );
        const score = participantScores.get(answer.participant_id)?.samples.get(sample.id) || 0;
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

      const sampleDetail = sampleDetails.find((sd) => sd.sample_id === sample.id);
      
      // truthが存在しない場合はエラーを返す
      if (!truth) {
        console.error(`Truth not found for sample ${sample.id}`);
        return {
          sample_id: sample.id,
          sample_label: sample.label,
          presenter_name: presenter?.display_name || null,
          truth: {
            true_cask: '',
            true_region: '',
            true_age: 0,
            true_abv: 0,
            true_distillery: '',
          },
          participant_answers: participantAnswers,
          radar: sampleDetail?.radar || { tier1_counts: {} },
          comments: sampleDetail?.comments || [],
        };
      }


      return {
        sample_id: sample.id,
        sample_label: sample.label,
        presenter_name: presenter?.display_name || null,
        truth: {
          true_cask: truth.true_cask,
          true_region: truth.true_region,
          true_age: truth.true_age,
          true_abv: truth.true_abv,
          true_distillery: truth.true_distillery,
          bottle_image_url: truth.bottle_image_url || null,
        },
        participant_answers: participantAnswers,
        radar: sampleDetail?.radar || { tier1_counts: {} },
        other_terms: sampleDetail?.other_terms || [],
        comments: sampleDetail?.comments || [],
      };
    });

    const responseData = {
      session: {
        id: session.id,
        title: session.title,
        mode: session.mode,
        state: session.state,
      },
      rankings: rankingsWithScores,
      sample_details: sampleDetailsWithTruth,
      flavor_radar: {
        tier1_counts: tier1Counts,
      },
    };


    return successResponse(responseData);
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
