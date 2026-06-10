// GET /api/results/get
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { sql } from '@/lib/db';
import { calculateScore } from '@/lib/score-calculator';
import {
  getAnswerSectionFlavor,
  tier1ListForSessionRadar,
  addAnswerMaxFlavorIntensitiesToTotals,
  mergeSubmittedAndPresenterDraftsForFlavorRadar,
  flavorCommentsFromAnswer,
  tier1CountsForAnswerFlavor,
  mergePresenterTastingTier2FromAnswers,
} from '@/lib/json-helpers';
import { resolvedTier1NightingaleColors } from '@/lib/flavor-chart-colors';
import type { ItemGradesMap } from '@/lib/scoring-schema';
type SessionRowForResults = {
  id: string;
  title: string;
  mode: string;
  state: string;
  flavor_chart_snapshot: unknown;
  scoring_snapshot: unknown;
  cask_options_snapshot?: unknown;
  region_options_snapshot?: unknown;
  owner_token: string;
  public_results?: boolean | null;
};

type ParticipantRow = { id: string; display_name: string };
type SampleRow = { id: string; label: string; presenter_participant_id: string | null };
type TruthRow = {
  sample_id: string;
  true_cask: string | null;
  true_region: string | null;
  true_age: number | null;
  true_abv: number | null;
  true_distillery: string | null;
  true_other1: string | null;
  true_other2: string | null;
  true_bottler_name: string | null;
  true_distillation_year: number | null;
  true_bottling_year: number | null;
  notes: string | null;
  bottle_image_url: string | null;
};
type AnswerRow = {
  sample_id: string;
  participant_id: string;
  guessed_cask: string | null;
  guessed_region: string | null;
  guessed_age: number | null;
  guessed_abv: number | null;
  guessed_distillery: string | null;
  guessed_other1: string | null;
  guessed_other2: string | null;
  nose: unknown;
  palate: unknown;
  finish: unknown;
  bottle_image_url: string | null;
};
type DraftAnswerRow = {
  sample_id: string;
  participant_id: string;
  status: string;
  nose: unknown;
  palate: unknown;
  finish: unknown;
};
type GradeRow = {
  sample_id: string;
  participant_id: string;
  is_correct: boolean;
  item_grades: ItemGradesMap | null;
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const joinToken = searchParams.get('join_token');
    const ownerTokenParam = searchParams.get('owner_token');

    if (!joinToken) {
      return errorResponse('join_tokenが必要です', 'MISSING_PARAMETER', 400);
    }

    const sessionRows = await sql`
      SELECT id, title, mode, state, flavor_chart_snapshot, scoring_snapshot,
             cask_options_snapshot, region_options_snapshot, owner_token, public_results
      FROM sessions
      WHERE join_token = ${joinToken}
      LIMIT 1
    `;
    const session = sessionRows[0] as SessionRowForResults | undefined;

    if (!session) {
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

    const participants = await sql`
      SELECT id, display_name FROM participants
      WHERE session_id = ${session.id} AND is_attending = true
    `;

    const samples = await sql`
      SELECT id, label, presenter_participant_id FROM samples
      WHERE session_id = ${session.id}
      ORDER BY sort_order
    `;

    const truths = await sql`
      SELECT sample_id, true_cask, true_region, true_age, true_abv, true_distillery,
             true_other1, true_other2, true_bottler_name, true_distillation_year,
             true_bottling_year, notes, bottle_image_url
      FROM truths
      WHERE session_id = ${session.id}
    `;

    const answers = await sql`
      SELECT sample_id, participant_id, guessed_cask, guessed_region, guessed_age, guessed_abv,
             guessed_distillery, guessed_other1, guessed_other2, nose, palate, finish, bottle_image_url
      FROM answers
      WHERE session_id = ${session.id} AND status = 'submitted'
    `;

    const participantRows = participants as ParticipantRow[];
    const sampleRows = samples as SampleRow[];
    const truthRows = truths as TruthRow[];
    const answerRows = answers as AnswerRow[];
    let draftAnswerRows: DraftAnswerRow[] = [];
    try {
      draftAnswerRows = (await sql`
        SELECT sample_id, participant_id, status, nose, palate, finish
        FROM answers
        WHERE session_id = ${session.id} AND status = 'draft'
      `) as DraftAnswerRow[];
    } catch (draftAnswersError) {
      console.error('Draft answers fetch error (flavor radar):', draftAnswersError);
    }

    const answersForFlavorRadar = mergeSubmittedAndPresenterDraftsForFlavorRadar(
      answerRows,
      draftAnswerRows,
      sampleRows,
    );

    const gradeRows = (await sql`
      SELECT sample_id, participant_id, is_correct, item_grades
      FROM distillery_grades
      WHERE session_id = ${session.id}
    `) as GradeRow[];

    // 点数計算とランキング作成
    const participantScores = new Map<string, { total: number; samples: Map<string, number> }>();

    participantRows.forEach((p) => {
      participantScores.set(p.id, { total: 0, samples: new Map() });
    });

    const caskOpts = Array.isArray(session.cask_options_snapshot)
      ? (session.cask_options_snapshot as string[])
      : [];
    const regionOpts = Array.isArray(session.region_options_snapshot)
      ? (session.region_options_snapshot as string[])
      : [];

    sampleRows.forEach((sample) => {
      const truth = truthRows.find((t) => t.sample_id === sample.id);
      if (!truth) return;

      participantRows.forEach((participant) => {
        if (sample.presenter_participant_id === participant.id) {
          return;
        }
        const answer = answerRows.find(
          (a) => a.sample_id === sample.id && a.participant_id === participant.id
        );
        if (!answer) return;

        const grade = gradeRows.find(
          (g) => g.sample_id === sample.id && g.participant_id === participant.id
        );

        const score = calculateScore(
          {
            guessed_cask: answer.guessed_cask,
            guessed_region: answer.guessed_region,
            guessed_age: answer.guessed_age,
            guessed_abv: answer.guessed_abv,
            guessed_distillery: answer.guessed_distillery,
            guessed_other1: (answer as { guessed_other1?: string | null }).guessed_other1,
            guessed_other2: (answer as { guessed_other2?: string | null }).guessed_other2,
          },
          {
            true_cask: truth.true_cask,
            true_region: truth.true_region,
            true_age: truth.true_age,
            true_abv: truth.true_abv,
            true_distillery: truth.true_distillery,
            true_other1: (truth as { true_other1?: string | null }).true_other1,
            true_other2: (truth as { true_other2?: string | null }).true_other2,
          },
          grade
            ? {
                is_correct: grade.is_correct,
                item_grades: (grade.item_grades || null) as ItemGradesMap | null,
              }
            : null,
          session.scoring_snapshot,
          caskOpts,
          regionOpts
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
        const participant = participantRows.find((p) => p.id === participantId);
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
    const tier1List = tier1ListForSessionRadar(session.flavor_chart_snapshot);

    tier1List.forEach((tier1) => {
      tier1Counts[tier1] = 0;
    });

    answersForFlavorRadar.forEach((answer) => {
      addAnswerMaxFlavorIntensitiesToTotals(answer, tier1Counts, tier1List);
    });

    if (process.env.DEBUG_FLAVOR_RADAR === '1') {
      const summarize = (rows: typeof answersForFlavorRadar) =>
        rows.map((a) => ({
          sample_id: a.sample_id,
          participant_id: a.participant_id,
          hasNose: !!a.nose,
        }));
      console.log(
        '[DEBUG_FLAVOR_RADAR] results/get',
        JSON.stringify({
          tier1_axis_count: tier1List.length,
          submitted_count: answerRows.length,
          draft_count: draftAnswerRows.length,
          merged_for_radar: answersForFlavorRadar.length,
          snapshot_has_tier1: Array.isArray(
            (session.flavor_chart_snapshot as { tier1?: unknown } | null)?.tier1,
          ),
          merged_sample_ids: [...new Set(answersForFlavorRadar.map((x) => x.sample_id))],
          answers_summarize: summarize(answersForFlavorRadar),
        }),
      );
    }

    // サンプル別詳細
    const sampleDetails = sampleRows.map((sample) => {
      // サンプル別レーダーチャート
      const sampleTier1Counts: Record<string, number> = {};
      tier1List.forEach((tier1) => {
        sampleTier1Counts[tier1] = 0;
      });

      const sampleAnswersForRadar = answersForFlavorRadar.filter((a) => a.sample_id === sample.id);
      const presenterId = sample.presenter_participant_id;
      const presenterAnswersForSampleRadar =
        presenterId != null
          ? sampleAnswersForRadar.filter((a) => a.participant_id === presenterId)
          : [];
      presenterAnswersForSampleRadar.forEach((answer) => {
        addAnswerMaxFlavorIntensitiesToTotals(answer, sampleTier1Counts, tier1List);
      });

      const comments = sampleAnswersForRadar.map((answer) => {
        const participant = participantRows.find((p) => p.id === answer.participant_id);
        return {
          participant_id: answer.participant_id,
          display_name: participant?.display_name || '',
          ...flavorCommentsFromAnswer(answer),
        };
      });

      const per_participant_radar = sampleAnswersForRadar.map((answer) => ({
        participant_id: answer.participant_id,
        tier1_counts: tier1CountsForAnswerFlavor(answer, tier1List),
      }));

      // 「その他」Tier2用語の頻度集計
      const otherTermsCount: Record<string, number> = {};
      sampleAnswersForRadar.forEach((answer) => {
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

      const presenter_tasting_tier2 = mergePresenterTastingTier2FromAnswers(presenterAnswersForSampleRadar);

      return {
        sample_id: sample.id,
        sample_label: sample.label,
        radar: {
          tier1_counts: sampleTier1Counts,
        },
        comments,
        other_terms: otherTerms,
        presenter_tasting_tier2,
        per_participant_radar,
      };
    });

    // ランキングにsample_scoresを追加
    const rankingsWithScores = ranking.map((r) => {
      const participantScore = participantScores.get(r.participant_id);
      const sampleScores = sampleRows.map((sample) => ({
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
    const sampleDetailsWithTruth = sampleRows.map((sample) => {
      const truth = truthRows.find((t) => t.sample_id === sample.id);
      const presenter = sample.presenter_participant_id
        ? participantRows.find((p) => p.id === sample.presenter_participant_id)
        : null;
      const sampleAnswers = answerRows.filter((a) => a.sample_id === sample.id);
      const participantAnswers = sampleAnswers.map((answer) => {
        const participant = participantRows.find((p) => p.id === answer.participant_id);
        const grade = gradeRows.find(
          (g) => g.sample_id === sample.id && g.participant_id === answer.participant_id
        );
        const score = participantScores.get(answer.participant_id)?.samples.get(sample.id) || 0;
        return {
          participant_id: answer.participant_id,
          display_name: participant?.display_name || '',
          guessed_cask: answer.guessed_cask || '',
          guessed_region: answer.guessed_region || '',
          guessed_age: answer.guessed_age ?? null,
          guessed_abv: answer.guessed_abv ?? null,
          guessed_distillery: answer.guessed_distillery || '',
          guessed_other1: answer.guessed_other1 ?? null,
          guessed_other2: answer.guessed_other2 ?? null,
          is_correct_distillery: grade?.is_correct || false,
          is_correct: grade?.is_correct ?? null,
          item_grades: grade?.item_grades ?? null,
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
            true_age: null,
            true_abv: null,
            true_distillery: '',
            true_other1: null,
            true_other2: null,
            true_bottler_name: null,
            true_distillation_year: null,
            true_bottling_year: null,
            notes: null,
            bottle_image_url: null,
          },
          participant_answers: participantAnswers,
          scoring_snapshot: session.scoring_snapshot ?? null,
          radar: sampleDetail?.radar || { tier1_counts: {} },
          comments: sampleDetail?.comments || [],
          other_terms: sampleDetail?.other_terms || [],
          presenter_tasting_tier2: sampleDetail?.presenter_tasting_tier2 ?? {
            nose: [],
            palate: [],
            finish: [],
          },
          per_participant_radar: sampleDetail?.per_participant_radar || [],
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
          true_other1: truth.true_other1 ?? null,
          true_other2: truth.true_other2 ?? null,
          true_bottler_name: truth.true_bottler_name ?? null,
          true_distillation_year: truth.true_distillation_year ?? null,
          true_bottling_year: truth.true_bottling_year ?? null,
          notes: truth.notes ?? null,
          bottle_image_url: truth.bottle_image_url || null,
        },
        participant_answers: participantAnswers,
        scoring_snapshot: session.scoring_snapshot ?? null,
        radar: sampleDetail?.radar || { tier1_counts: {} },
        other_terms: sampleDetail?.other_terms || [],
        presenter_tasting_tier2: sampleDetail?.presenter_tasting_tier2 ?? {
          nose: [],
          palate: [],
          finish: [],
        },
        comments: sampleDetail?.comments || [],
        per_participant_radar: sampleDetail?.per_participant_radar || [],
      };
    });

    const responseData = {
      session: {
        id: session.id,
        title: session.title,
        mode: session.mode,
        state: session.state,
      },
      scoring_snapshot: session.scoring_snapshot ?? null,
      rankings: rankingsWithScores,
      sample_details: sampleDetailsWithTruth,
      flavor_radar: {
        tier1_counts: tier1Counts,
      },
      tier1_nightingale_colors: resolvedTier1NightingaleColors(session.flavor_chart_snapshot),
      /** ナイチンゲール表示フィルタにスナップショット全体を渡す（tier1_nightingale_visible 等） */
      flavor_chart_snapshot: session.flavor_chart_snapshot,
    };


    return successResponse(responseData);
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
