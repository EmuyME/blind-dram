// GET /api/export/csv
import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api-utils';
import { sql } from '@/lib/db';
import { calculateScore } from '@/lib/score-calculator';
import type { ItemGradesMap } from '@/lib/scoring-schema';

type ParticipantRow = {
  id: string;
  display_name: string;
};

type SampleRow = {
  id: string;
  label: string;
  sort_order: number;
  presenter_participant_id: string | null;
};

type TruthRow = {
  sample_id: string;
  true_cask: string | null;
  true_region: string | null;
  true_age: number | null;
  true_abv: number | null;
  true_distillery: string | null;
  true_other1?: string | null;
  true_other2?: string | null;
  true_bottler_name?: string | null;
  true_distillation_year?: number | null;
  true_bottling_year?: number | null;
  notes?: string | null;
};

type AnswerRow = {
  sample_id: string;
  participant_id: string;
  status: string | null;
  submitted_at: string | null;
  guessed_cask: string | null;
  guessed_region: string | null;
  guessed_age: number | null;
  guessed_abv: number | null;
  guessed_distillery: string | null;
  guessed_other1?: string | null;
  guessed_other2?: string | null;
  nose: unknown;
  palate: unknown;
  finish: unknown;
};

type GradeRow = {
  sample_id: string;
  participant_id: string;
  is_correct: boolean | null;
  item_grades?: ItemGradesMap | null;
};

type FlavorSection = {
  tier1_tags?: unknown;
  tier2_terms?: unknown;
  text?: unknown;
};

/** CSV 取得用のセッション行（マイグレーション未適用時は public_results なし） */
type SessionRowForCsv = {
  id: string;
  title: string;
  owner_token: string;
  state: string;
  scoring_snapshot: unknown;
  cask_options_snapshot?: unknown;
  region_options_snapshot?: unknown;
  public_results?: boolean | null;
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const joinToken = searchParams.get('join_token');
    const ownerToken = searchParams.get('owner_token');

    if (!joinToken) {
      return errorResponse('join_tokenが必要です', 'MISSING_PARAMETER', 400);
    }

    const sessionRows = await sql`
      SELECT id, title, owner_token, state, scoring_snapshot,
             cask_options_snapshot, region_options_snapshot, public_results
      FROM sessions
      WHERE join_token = ${joinToken}
      LIMIT 1
    `;
    const session = sessionRows[0] as SessionRowForCsv | undefined;

    if (!session) {
      return errorResponse('Sessionが見つかりません', 'SESSION_NOT_FOUND', 404);
    }

    // 結果が公開されている場合のみCSVをダウンロード可能
    if (session.state !== 'published') {
      return errorResponse('結果が公開されていません', 'NOT_PUBLISHED', 403);
    }

    const sessionRow = session as { owner_token?: string; public_results?: boolean | null };
    if (sessionRow.public_results === false) {
      if (!ownerToken || ownerToken !== sessionRow.owner_token) {
        return errorResponse(
          'このセッションの結果は限定公開です。オーナー画面から開くか、オーナーによる共有を待ってください。',
          'RESULTS_NOT_PUBLIC',
          403,
        );
      }
    }

    // owner_tokenが提供されている場合は認証をチェック（オプション）
    if (ownerToken && session.owner_token !== ownerToken) {
      return errorResponse('認証トークンが不正です', 'UNAUTHORIZED', 401);
    }

    const participants = await sql`
      SELECT id, display_name FROM participants
      WHERE session_id = ${session.id} AND is_attending = true
      ORDER BY display_name
    `;

    const samples = await sql`
      SELECT id, label, sort_order, presenter_participant_id FROM samples
      WHERE session_id = ${session.id}
      ORDER BY sort_order
    `;

    const truths = await sql`
      SELECT sample_id, true_cask, true_region, true_age, true_abv, true_distillery,
             true_other1, true_other2, true_bottler_name, true_distillation_year,
             true_bottling_year, notes
      FROM truths
      WHERE session_id = ${session.id}
    `;

    const answers = await sql`
      SELECT sample_id, participant_id, status, submitted_at, guessed_cask, guessed_region,
             guessed_age, guessed_abv, guessed_distillery, guessed_other1, guessed_other2,
             nose, palate, finish
      FROM answers
      WHERE session_id = ${session.id}
    `;

    const grades = await sql`
      SELECT sample_id, participant_id, is_correct, item_grades
      FROM distillery_grades
      WHERE session_id = ${session.id}
    `;

    const scoringSnapshot = session.scoring_snapshot;
    const caskOpts = Array.isArray(session.cask_options_snapshot)
      ? (session.cask_options_snapshot as string[])
      : [];
    const regionOpts = Array.isArray(session.region_options_snapshot)
      ? (session.region_options_snapshot as string[])
      : [];

    const csvEscape = (value: unknown) => {
      if (value === null || value === undefined) return '';
      const s = String(value);
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const asArrayOfStrings = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);
    const flavorToCells = (section: unknown) => {
      const s: FlavorSection =
        typeof section === 'object' && section !== null ? (section as FlavorSection) : {};
      const tier1 = asArrayOfStrings(s.tier1_tags).join('|');
      const tier2 = asArrayOfStrings(s.tier2_terms).join('|');
      const text = typeof s.text === 'string' ? s.text : '';
      return { tier1, tier2, text };
    };

    const participantRows = ((participants || []) as unknown as ParticipantRow[]).filter(
      (p) => !!p && typeof p.id === 'string'
    );
    const sampleRows = ((samples || []) as unknown as SampleRow[]).filter(
      (s) => !!s && typeof s.id === 'string'
    );
    const truthRows = ((truths || []) as unknown as TruthRow[]).filter(
      (t) => !!t && typeof t.sample_id === 'string'
    );
    const answerRows = ((answers || []) as unknown as AnswerRow[]).filter(
      (a) => !!a && typeof a.sample_id === 'string' && typeof a.participant_id === 'string'
    );
    const gradeRows = ((grades || []) as unknown as GradeRow[]).filter(
      (g) => !!g && typeof g.sample_id === 'string' && typeof g.participant_id === 'string'
    );

    const participantsById = new Map<string, ParticipantRow>(participantRows.map((p) => [p.id, p]));
    const truthsBySampleId = new Map<string, TruthRow>(truthRows.map((t) => [t.sample_id, t]));
    const answersByKey = new Map<string, AnswerRow>(
      answerRows.map((a) => [`${a.sample_id}:${a.participant_id}`, a])
    );
    const gradesByKey = new Map<string, GradeRow>(
      gradeRows.map((g) => [`${g.sample_id}:${g.participant_id}`, g])
    );

    type Row = {
      sample_id: string;
      sample_label: string;
      round_no: number;
      presenter_id: string | null;
      presenter_name: string;
      participant_id: string;
      participant_name: string;
      answer_status: string;
      submitted_at: string;
      guessed_cask: string;
      guessed_region: string;
      guessed_age: string;
      guessed_abv: string;
      guessed_distillery: string;
      guessed_other1: string;
      guessed_other2: string;
      nose_tier1: string;
      nose_tier2: string;
      nose_text: string;
      palate_tier1: string;
      palate_tier2: string;
      palate_text: string;
      finish_tier1: string;
      finish_tier2: string;
      finish_text: string;
      true_cask: string;
      true_region: string;
      true_age: string;
      true_abv: string;
      true_distillery: string;
      true_other1: string;
      true_other2: string;
      true_bottler_name: string;
      true_distillation_year: string;
      true_bottling_year: string;
      truth_notes: string;
      is_correct: string;
      item_grades_json: string;
      score: number | null;
    };

    const rows: Row[] = [];
    const totals = new Map<string, number>();

    sampleRows.forEach((sample) => {
      const truth = truthsBySampleId.get(sample.id);
      const presenterId: string | null = sample.presenter_participant_id ?? null;
      const presenterName = presenterId ? participantsById.get(presenterId)?.display_name || '' : '';
      const roundNo = Number.isFinite(sample.sort_order) ? sample.sort_order + 1 : 0;

      participantRows.forEach((p) => {
        if (presenterId && p.id === presenterId) return; // 回答者のみ

        const key = `${sample.id}:${p.id}`;
        const answer = answersByKey.get(key) || null;
        const grade = gradesByKey.get(key) || null;
        const isCorrectCell =
          grade?.is_correct === true ? '○' : grade?.is_correct === false ? '×' : '';

        const nose = flavorToCells(answer?.nose);
        const palate = flavorToCells(answer?.palate);
        const finish = flavorToCells(answer?.finish);

        const canScore = !!truth && !!answer && answer.status === 'submitted';
        const score = canScore
          ? calculateScore(
              {
                guessed_cask: answer.guessed_cask,
                guessed_region: answer.guessed_region,
                guessed_age: answer.guessed_age,
                guessed_abv: answer.guessed_abv,
                guessed_distillery: answer.guessed_distillery,
                guessed_other1: answer.guessed_other1,
                guessed_other2: answer.guessed_other2,
              },
              {
                true_cask: truth.true_cask,
                true_region: truth.true_region,
                true_age: truth.true_age,
                true_abv: truth.true_abv,
                true_distillery: truth.true_distillery,
                true_other1: truth.true_other1,
                true_other2: truth.true_other2,
              },
              grade && typeof grade.is_correct === 'boolean'
                ? {
                    is_correct: grade.is_correct,
                    item_grades: grade.item_grades ?? null,
                  }
                : grade?.item_grades
                  ? { is_correct: null, item_grades: grade.item_grades }
                  : null,
              scoringSnapshot,
              caskOpts,
              regionOpts,
            )
          : null;

        if (typeof score === 'number' && Number.isFinite(score)) {
          totals.set(p.id, (totals.get(p.id) ?? 0) + score);
        }

        const itemGradesJson =
          grade?.item_grades && typeof grade.item_grades === 'object'
            ? JSON.stringify(grade.item_grades)
            : '';

        rows.push({
          sample_id: sample.id,
          sample_label: sample.label || '',
          round_no: roundNo,
          presenter_id: presenterId,
          presenter_name: presenterName,
          participant_id: p.id,
          participant_name: p.display_name || '',
          answer_status: answer?.status || '',
          submitted_at: answer?.submitted_at || '',
          guessed_cask: answer?.guessed_cask || '',
          guessed_region: answer?.guessed_region || '',
          guessed_age: answer?.guessed_age?.toString() || '',
          guessed_abv: answer?.guessed_abv?.toString() || '',
          guessed_distillery: answer?.guessed_distillery || '',
          guessed_other1: answer?.guessed_other1 || '',
          guessed_other2: answer?.guessed_other2 || '',
          nose_tier1: nose.tier1,
          nose_tier2: nose.tier2,
          nose_text: nose.text,
          palate_tier1: palate.tier1,
          palate_tier2: palate.tier2,
          palate_text: palate.text,
          finish_tier1: finish.tier1,
          finish_tier2: finish.tier2,
          finish_text: finish.text,
          true_cask: truth?.true_cask || '',
          true_region: truth?.true_region || '',
          true_age: truth?.true_age?.toString() || '',
          true_abv: truth?.true_abv?.toString() || '',
          true_distillery: truth?.true_distillery || '',
          true_other1: truth?.true_other1 || '',
          true_other2: truth?.true_other2 || '',
          true_bottler_name: truth?.true_bottler_name || '',
          true_distillation_year: truth?.true_distillation_year?.toString() || '',
          true_bottling_year: truth?.true_bottling_year?.toString() || '',
          truth_notes: truth?.notes || '',
          is_correct: isCorrectCell,
          item_grades_json: itemGradesJson,
          score,
        });
      });
    });

    const csvRows: string[] = [];
    const header = [
      'session_title',
      'round_no',
      'sample_id',
      'sample_label',
      'presenter_id',
      'presenter_name',
      'participant_id',
      'participant_name',
      'answer_status',
      'submitted_at',
      'guessed_cask',
      'guessed_region',
      'guessed_age',
      'guessed_abv',
      'guessed_distillery',
      'guessed_other1',
      'guessed_other2',
      'nose_tier1',
      'nose_tier2',
      'nose_text',
      'palate_tier1',
      'palate_tier2',
      'palate_text',
      'finish_tier1',
      'finish_tier2',
      'finish_text',
      'true_cask',
      'true_region',
      'true_age',
      'true_abv',
      'true_distillery',
      'true_other1',
      'true_other2',
      'true_bottler_name',
      'true_distillation_year',
      'true_bottling_year',
      'truth_notes',
      'is_correct',
      'item_grades_json',
      'score',
      'participant_total_score',
    ];
    csvRows.push(header.join(','));

    rows.forEach((r) => {
      const total = totals.get(r.participant_id) ?? 0;
      const line = [
        csvEscape(session.title),
        csvEscape(r.round_no),
        csvEscape(r.sample_id),
        csvEscape(r.sample_label),
        csvEscape(r.presenter_id || ''),
        csvEscape(r.presenter_name),
        csvEscape(r.participant_id),
        csvEscape(r.participant_name),
        csvEscape(r.answer_status),
        csvEscape(r.submitted_at),
        csvEscape(r.guessed_cask),
        csvEscape(r.guessed_region),
        csvEscape(r.guessed_age),
        csvEscape(r.guessed_abv),
        csvEscape(r.guessed_distillery),
        csvEscape(r.guessed_other1),
        csvEscape(r.guessed_other2),
        csvEscape(r.nose_tier1),
        csvEscape(r.nose_tier2),
        csvEscape(r.nose_text),
        csvEscape(r.palate_tier1),
        csvEscape(r.palate_tier2),
        csvEscape(r.palate_text),
        csvEscape(r.finish_tier1),
        csvEscape(r.finish_tier2),
        csvEscape(r.finish_text),
        csvEscape(r.true_cask),
        csvEscape(r.true_region),
        csvEscape(r.true_age),
        csvEscape(r.true_abv),
        csvEscape(r.true_distillery),
        csvEscape(r.true_other1),
        csvEscape(r.true_other2),
        csvEscape(r.true_bottler_name),
        csvEscape(r.true_distillation_year),
        csvEscape(r.true_bottling_year),
        csvEscape(r.truth_notes),
        csvEscape(r.is_correct),
        csvEscape(r.item_grades_json),
        csvEscape(r.score ?? ''),
        csvEscape(total),
      ];
      csvRows.push(line.join(','));
    });

    // CSV文字列生成（UTF-8 BOM付き）
    const csvContent = '\uFEFF' + csvRows.join('\n');

    // ファイル名生成
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `blind_dram_${session.title}_${timestamp}.csv`.replace(/[^\w\-_.]/g, '_');

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
