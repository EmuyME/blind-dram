"use client";

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { PhaseBanner } from '@/components/common/PhaseBanner';
import { ParticipantProgress } from '@/components/common/ParticipantProgress';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/common/Toast';
import { Toast } from '@/components/common/Toast';
import { getParticipantToken, setParticipantToken as persistParticipantToken } from '@/lib/utils';
import { CorrectnessBadge } from '@/components/common/CorrectnessBadge';
import { FlavorChips } from '@/components/common/FlavorChips';
import {
  SCORING_ITEM_KEYS,
  normalizeScoringConfig,
  itemNeedsManualGrading,
  type FullScoringConfig,
  type ItemGradesMap,
  type ScoringItemKey,
  type ItemVerdict,
} from '@/lib/scoring-schema';
import { disambiguatedDisplayName } from '@/lib/participant-display';
import { ScoringFieldBlock } from '@/components/scoring/ScoringFieldBlock';
import { BottleTruthMetaFields } from '@/components/common/BottleTruthMeta';
import { FlavorTastingSections } from '@/components/flavor/FlavorTastingSections';
import { clampTier1Intensity } from '@/lib/json-helpers';
import { DEFAULT_FLAVOR_CHART } from '@/lib/default-flavor-chart';

interface Truth {
  true_cask?: string;
  true_region?: string;
  true_age?: number;
  true_abv?: number;
  true_distillery?: string;
  true_other1?: string;
  true_other2?: string;
  /** ボトラーズ名（採点対象外） */
  true_bottler_name?: string;
  true_distillation_year?: number | null;
  true_bottling_year?: number | null;
  notes?: string;
  bottle_image_url?: string | null;
}

interface FlavorNotes {
  tier1_tags?: string[];
  /** Tier1 タグごとの強度 1〜5 */
  tier1_intensity?: Record<string, number>;
  tier2_terms?: string[];
  text?: string;
}

function formatTier1WithIntensity(tags?: string[], intensity?: Record<string, number> | null): string {
  if (!tags?.length) return '';
  return tags
    .map((t) => {
      const raw = intensity?.[t];
      if (raw != null && Number.isFinite(raw)) return `${t}（強度${clampTier1Intensity(raw)}）`;
      return t;
    })
    .join('、');
}

/** Presenter 本人の answers 行と同じ形（/api/answers/get・upsert） */
interface PresenterOwnAnswer {
  guessed_cask?: string;
  guessed_region?: string;
  guessed_age?: number;
  guessed_abv?: number;
  guessed_distillery?: string;
  guessed_other1?: string;
  guessed_other2?: string;
  nose?: {
    tier1_tags: string[];
    tier1_intensity?: Record<string, number>;
    tier2_terms: string[];
    text?: string;
  };
  palate?: {
    tier1_tags: string[];
    tier1_intensity?: Record<string, number>;
    tier2_terms: string[];
    text?: string;
  };
  finish?: {
    tier1_tags: string[];
    tier1_intensity?: Record<string, number>;
    tier2_terms: string[];
    text?: string;
  };
  score_0_100?: number;
  status?: 'draft' | 'submitted';
}

const DEFAULT_TIER1_OPTIONS = [...DEFAULT_FLAVOR_CHART.tier1];

interface Participant {
  participant_id: string;
  display_name: string;
  status: 'draft' | 'submitted' | 'graded';
  guessed_cask?: string | null;
  guessed_region?: string | null;
  guessed_age?: number | null;
  guessed_abv?: number | null;
  guessed_distillery?: string | null;
  guessed_other1?: string | null;
  guessed_other2?: string | null;
  nose?: FlavorNotes | null;
  palate?: FlavorNotes | null;
  finish?: FlavorNotes | null;
  is_correct?: boolean;
  item_grades?: ItemGradesMap;
  bottle_image_url?: string | null;
}

/** /api/round/status の participant_progress 1 行 */
type ApiParticipantProgressRow = {
  participant_id: string;
  display_name?: string;
  status?: string;
  submitted_at?: string | null;
  guessed_cask?: string | null;
  guessed_region?: string | null;
  guessed_age?: number | null;
  guessed_abv?: number | null;
  guessed_distillery?: string | null;
  guessed_other1?: string | null;
  guessed_other2?: string | null;
  nose?: FlavorNotes | null;
  palate?: FlavorNotes | null;
  finish?: FlavorNotes | null;
  bottle_image_url?: string | null;
  is_correct?: boolean;
  item_grades?: ItemGradesMap;
};

/** GET /api/round/status の JSON（抜粋） */
type RoundStatusApiEnvelope = {
  data?: {
    state?: string;
    session_mode?: 'sequential' | 'simultaneous';
    participant_progress?: ApiParticipantProgressRow[];
    all_graded?: boolean;
    truth_entered?: boolean;
    all_submitted?: boolean;
    label?: string | null;
    truth?: Truth;
    scoring_snapshot?: unknown;
    cask_options_snapshot?: unknown;
    region_options_snapshot?: unknown;
  };
  error?: string;
};

const DEFAULT_CASK_OPTIONS = ['シェリー樽', 'バーボン樽', 'ワイン樽', 'その他'];
const DEFAULT_REGION_OPTIONS = ['スコットランド', 'アイルランド', 'アメリカ', '日本', 'その他'];

/** Presenter が参加者画面で推測を提出していない（テイスティング専用 draft など）かの粗い判定 */
function presenterCoreGuessesLookEmpty(a: {
  guessed_cask?: string;
  guessed_region?: string;
  guessed_age?: number;
  guessed_abv?: number;
  guessed_distillery?: string;
}): boolean {
  return (
    !(a.guessed_distillery?.trim()) &&
    !(a.guessed_cask?.trim()) &&
    !(a.guessed_region?.trim()) &&
    (a.guessed_age == null || a.guessed_age === undefined) &&
    (a.guessed_abv == null || a.guessed_abv === undefined)
  );
}

function ParticipantGuessSummary({
  participant,
  fullScoring,
}: {
  participant: Participant;
  fullScoring: FullScoringConfig;
}) {
  const lines: { key: string; label: string; value: string }[] = [];
  for (const key of SCORING_ITEM_KEYS) {
    const it = fullScoring.items[key];
    if (!it.enabled || it.maxPoints <= 0) continue;
    let value = '未入力';
    switch (key) {
      case 'cask':
        value = participant.guessed_cask || '未入力';
        break;
      case 'region':
        value = participant.guessed_region || '未入力';
        break;
      case 'age':
        value =
          participant.guessed_age != null && Number.isFinite(participant.guessed_age)
            ? String(participant.guessed_age)
            : '未入力';
        break;
      case 'abv':
        value =
          participant.guessed_abv != null && Number.isFinite(participant.guessed_abv)
            ? `${participant.guessed_abv}%`
            : '未入力';
        break;
      case 'distillery':
        value = participant.guessed_distillery || '未入力';
        break;
      case 'other1':
        value = participant.guessed_other1 || '未入力';
        break;
      case 'other2':
        value = participant.guessed_other2 || '未入力';
        break;
      default:
        break;
    }
    lines.push({ key, label: it.label || key, value });
  }
  return (
    <div className="mt-2 space-y-2 text-sm">
      {lines.map((line) => (
        <div key={line.key} className="flex items-center gap-2">
          <span className="font-semibold text-stone-400 min-w-[88px] flex-shrink-0">{line.label}:</span>
          <span className="text-stone-100 break-words">{line.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function PresenterPage() {
  const params = useParams();
  const router = useRouter();
  const [joinToken, setJoinToken] = useState<string>('');
  const [sampleId, setSampleId] = useState<string>('');

  useEffect(() => {
    if (params) {
      if (typeof params.joinToken === 'string') {
        setJoinToken(params.joinToken);
      }
      if (typeof params.sampleId === 'string') {
        setSampleId(params.sampleId);
      }
    }
  }, [params]);

  const { toast, showToast, hideToast } = useToast();
  const [participantToken, setParticipantToken] = useState<string | null>(null);
  const [truth, setTruth] = useState<Truth>({});
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [roundState, setRoundState] = useState<string>('pending');
  const [isLoading, setIsLoading] = useState(true);
  const [allGraded, setAllGraded] = useState(false);
  const [sampleLabel, setSampleLabel] = useState<string>('');
  const [, setTruthEntered] = useState(false);
  const [, setAllSubmitted] = useState(false);
  
  // 設定（sessionから読み込む）
  const [caskOptions, setCaskOptions] = useState<string[]>(DEFAULT_CASK_OPTIONS);
  const [regionOptions, setRegionOptions] = useState<string[]>(DEFAULT_REGION_OPTIONS);
  const [scoringSnapshot, setScoringSnapshot] = useState<unknown>(null);
  const [tier1Options, setTier1Options] = useState<string[]>(DEFAULT_TIER1_OPTIONS);
  const [tier2Suggestions, setTier2Suggestions] = useState<Record<string, string[]>>({});
  const [myAnswer, setMyAnswer] = useState<PresenterOwnAnswer>({
    status: 'draft',
    nose: { tier1_tags: [], tier2_terms: [] },
    palate: { tier1_tags: [], tier2_terms: [] },
    finish: { tier1_tags: [], tier2_terms: [] },
  });

  const fullScoring: FullScoringConfig = useMemo(
    () => normalizeScoringConfig(scoringSnapshot),
    [scoringSnapshot],
  );

  const manualGradeKeys: ScoringItemKey[] = useMemo(
    () => SCORING_ITEM_KEYS.filter((k) => itemNeedsManualGrading(k, fullScoring.items[k])),
    [fullScoring],
  );

  const participantPeers = useMemo(
    () => participants.map((p) => ({ participant_id: p.participant_id, display_name: p.display_name })),
    [participants],
  );

  const [partialDraftByKey, setPartialDraftByKey] = useState<Record<string, string>>({});
  const [sessionMode, setSessionMode] = useState<'sequential' | 'simultaneous' | null>(null);
  
  // 画像アップロード関連
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  /** Presenter のテイスティング N/P/F はデフォルト閉じて縦幅を抑制 */
  const [presenterTastingOpen, setPresenterTastingOpen] = useState(false);

  // Sessionから設定を読み込む
  useEffect(() => {
    if (!joinToken) return;

    const loadSessionSettings = async () => {
      try {
        const response = await fetch(`/api/session/get?join_token=${joinToken}`);
        const result = await response.json();


        if (response.ok && result.data) {
          const session = result.data;
          
          // セッションモードを保存
          if (session.mode) {
            setSessionMode(session.mode);
          }
          
          
          // カスク選択肢
          if (session.cask_options_snapshot && Array.isArray(session.cask_options_snapshot)) {
            setCaskOptions(session.cask_options_snapshot);
          }
          
          // 地域選択肢
          if (session.region_options_snapshot && Array.isArray(session.region_options_snapshot)) {
            setRegionOptions(session.region_options_snapshot);
          }

          if (session.scoring_snapshot !== undefined && session.scoring_snapshot !== null) {
            setScoringSnapshot(session.scoring_snapshot);
          }

          if (session.flavor_chart_snapshot) {
            const chart = session.flavor_chart_snapshot as { tier1?: unknown; tier2_suggestions?: unknown };
            if (chart.tier1 && Array.isArray(chart.tier1)) {
              setTier1Options(chart.tier1 as string[]);
            }
            if (chart.tier2_suggestions && typeof chart.tier2_suggestions === 'object') {
              setTier2Suggestions(chart.tier2_suggestions as Record<string, string[]>);
            }
          }
          
        }
      } catch (error) {
        console.error('Load session settings error:', error);
        // エラー時はデフォルト値を使用
      }
    };

    loadSessionSettings();
  }, [joinToken]);

  useEffect(() => {
    if (!joinToken || !sampleId) return;

    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const debugTok = sp.get('debug_participant_token');
      if (debugTok) {
        persistParticipantToken(joinToken, debugTok);
        const url = new URL(window.location.href);
        url.searchParams.delete('debug_participant_token');
        window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
        setParticipantToken(debugTok);
        return;
      }
    }

    const token = getParticipantToken(joinToken);
    if (!token) {
      router.push(`/s/${joinToken}`);
      return;
    }
    setParticipantToken(token);
  }, [joinToken, sampleId, router]);

  const loadRoundStatus = useCallback(
    async (silentPoll = false) => {
      if (!participantToken || !sampleId) return;

      try {
        const response = await fetch(
          `/api/round/status?sample_id=${sampleId}&participant_token=${participantToken}`,
        );
        const text = await response.text();
        let result: RoundStatusApiEnvelope = {};
        try {
          result = text ? (JSON.parse(text) as RoundStatusApiEnvelope) : {};
        } catch {
          if (!silentPoll) {
            showToast(
              `サーバーからの応答を解析できませんでした（HTTP ${response.status}）。`,
              'error',
            );
          }
          setIsLoading(false);
          return;
        }

        if (!response.ok) {
          if (!silentPoll) {
            showToast(result.error || 'Round状態取得に失敗しました', 'error');
          }
          setIsLoading(false);
          return;
        }

        const payload = result.data;
        if (!payload || typeof payload.state !== 'string') {
          if (!silentPoll) {
            showToast('Round状態の形式が不正です', 'error');
          }
          setIsLoading(false);
          return;
        }

        setRoundState(payload.state);
        if (payload.session_mode === 'sequential' || payload.session_mode === 'simultaneous') {
          setSessionMode(payload.session_mode);
        }
        const participantsData = (payload.participant_progress || []) as ApiParticipantProgressRow[];
        const allGradedValue = payload.all_graded || false;
        const truthEnteredValue = payload.truth_entered || false;
        const allSubmittedValue = payload.all_submitted || false;

        if (payload.scoring_snapshot !== undefined && payload.scoring_snapshot !== null) {
          setScoringSnapshot(payload.scoring_snapshot);
        }
        if (payload.cask_options_snapshot && Array.isArray(payload.cask_options_snapshot)) {
          setCaskOptions(payload.cask_options_snapshot);
        }
        if (payload.region_options_snapshot && Array.isArray(payload.region_options_snapshot)) {
          setRegionOptions(payload.region_options_snapshot);
        }

        setParticipants((prevParticipants) => {
          const updated = participantsData.map((p) => {
            const existing = prevParticipants.find((prev) => prev.participant_id === p.participant_id);
            return {
              ...p,
              display_name: p.display_name ?? '',
              status: (p.status === 'submitted' || p.status === 'graded' ? p.status : 'draft') as Participant['status'],
              is_correct: p.is_correct !== undefined ? p.is_correct : existing?.is_correct,
              item_grades: p.item_grades !== undefined ? p.item_grades : existing?.item_grades,
            } as Participant;
          });
          return updated;
        });
      setAllGraded(allGradedValue);
      setSampleLabel(payload.label || '');
      setTruthEntered(truthEnteredValue);
      setAllSubmitted(allSubmittedValue);
      
      // Truth情報を取得
      if (payload.truth) {
        setTruth({
          true_cask: payload.truth.true_cask || '',
          true_region: payload.truth.true_region || '',
          true_age: payload.truth.true_age,
          true_abv: payload.truth.true_abv,
          true_distillery: payload.truth.true_distillery || '',
          true_other1: payload.truth.true_other1 || '',
          true_other2: payload.truth.true_other2 || '',
          true_bottler_name: payload.truth.true_bottler_name || '',
          true_distillation_year: payload.truth.true_distillation_year ?? null,
          true_bottling_year: payload.truth.true_bottling_year ?? null,
          notes: payload.truth.notes || '',
          bottle_image_url: payload.truth.bottle_image_url || null,
        });
        if (payload.truth.bottle_image_url) {
          setImagePreview(payload.truth.bottle_image_url);
        }
      }
    } catch (error) {
      console.error('Load error:', error);
      if (!silentPoll) {
        showToast('ネットワークエラーが発生しました', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  }, [participantToken, sampleId, showToast]);

  const loadMyAnswer = useCallback(async () => {
    if (!participantToken || !sampleId) return;
    try {
      const r = await fetch(
        `/api/answers/get?sample_id=${sampleId}&participant_token=${participantToken}`,
      );
      const text = await r.text();
      let result: { data?: { answer?: Record<string, unknown> | null } } = {};
      try {
        result = text ? (JSON.parse(text) as typeof result) : {};
      } catch {
        return;
      }
      if (!r.ok) return;
      const existingAnswer = result.data?.answer;
      if (!existingAnswer) {
        setMyAnswer({
          status: 'draft',
          nose: { tier1_tags: [], tier2_terms: [] },
          palate: { tier1_tags: [], tier2_terms: [] },
          finish: { tier1_tags: [], tier2_terms: [] },
        });
        return;
      }
      const next: PresenterOwnAnswer = {
        guessed_cask: (existingAnswer.guessed_cask as string) || '',
        guessed_region: (existingAnswer.guessed_region as string) || '',
        guessed_age: (existingAnswer.guessed_age as number) || undefined,
        guessed_abv: (existingAnswer.guessed_abv as number) || undefined,
        guessed_distillery: (existingAnswer.guessed_distillery as string) || '',
        guessed_other1: (existingAnswer.guessed_other1 as string) || '',
        guessed_other2: (existingAnswer.guessed_other2 as string) || '',
        nose: (existingAnswer.nose as PresenterOwnAnswer['nose']) || {
          tier1_tags: [],
          tier2_terms: [],
          text: '',
        },
        palate: (existingAnswer.palate as PresenterOwnAnswer['palate']) || {
          tier1_tags: [],
          tier2_terms: [],
          text: '',
        },
        finish: (existingAnswer.finish as PresenterOwnAnswer['finish']) || {
          tier1_tags: [],
          tier2_terms: [],
          text: '',
        },
        score_0_100: (existingAnswer.score_0_100 as number) || undefined,
        status: existingAnswer.status as PresenterOwnAnswer['status'],
      };
      setMyAnswer(next);
    } catch (e) {
      console.error('Load my answer error:', e);
    }
  }, [participantToken, sampleId]);

  useEffect(() => {
    if (participantToken && sampleId) {
      void loadMyAnswer();
    }
  }, [participantToken, sampleId, loadMyAnswer]);

  useEffect(() => {
    if (participantToken && sampleId) {
      loadRoundStatus(false);
    }
  }, [participantToken, sampleId, loadRoundStatus]);

  useEffect(() => {
    if (participantToken && sampleId) {
      // すべての状態で定期的に更新（ポーリング）
      // pending状態でも、他の参加者がRoundを開始した場合に更新が必要
      const interval = setInterval(() => {
        loadRoundStatus(true);
      }, 2000); // 2秒ごとに更新
      
      return () => {
        clearInterval(interval);
      };
    }
  }, [participantToken, sampleId, loadRoundStatus]);

  // 逐次モードでrevealed状態になった場合、結果ページにリダイレクト
  useEffect(() => {
    if (roundState === 'revealed' && sessionMode === 'sequential' && joinToken && sampleId) {
      router.push(`/session/${joinToken}/round-result/${sampleId}`);
    }
  }, [roundState, sessionMode, joinToken, sampleId, router]);

  const handleStartRound = async () => {
    if (!participantToken) return;

    try {
      const response = await fetch('/api/round/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participant_token: participantToken,
          sample_id: sampleId,
        }),
      });

      let result: { error?: string; code?: string; data?: { already_started?: boolean } } = {};
      try {
        const text = await response.text();
        result = text ? (JSON.parse(text) as typeof result) : {};
      } catch {
        showToast(
          `サーバーからの応答を解析できませんでした（HTTP ${response.status}）。しばらく待って再度お試しください。`,
          'error',
        );
        return;
      }

      if (!response.ok) {
        await loadRoundStatus();
        const msg =
          result.error ||
          (response.status === 429
            ? 'アクセスが集中しています。少し待ってから再度お試しください。'
            : `Round開始に失敗しました（HTTP ${response.status}）`);
        showToast(msg, 'error');
        return;
      }

      if (result.data?.already_started) {
        showToast('すでにRoundが開始されています。画面を更新しました。', 'success');
      } else {
        showToast('Roundを開始しました', 'success');
      }
      await loadRoundStatus();
    } catch (error) {
      console.error('Start round error:', error);
      showToast('ネットワークエラーが発生しました', 'error');
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!participantToken) return;

    // ファイルサイズチェック（10MB以下）
    if (file.size > 10 * 1024 * 1024) {
      showToast('画像サイズは10MB以下にしてください', 'error');
      return;
    }

    // ファイル形式チェック
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showToast('JPEG、PNG、WebP形式の画像を選択してください', 'error');
      return;
    }

    setIsUploadingImage(true);
    try {
      // Base64エンコード
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64Data = reader.result as string;
          const response = await fetch('/api/images/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              participant_token: participantToken,
              image_base64: base64Data,
              file_type: file.type,
            }),
          });

          const result = await response.json();

          if (!response.ok) {
            showToast(result.error || '画像のアップロードに失敗しました', 'error');
            setIsUploadingImage(false);
            return;
          }

          // 画像URLをtruthに保存
          const imageUrl = result.data.public_url;
          if (imageUrl) {
            setTruth({ ...truth, bottle_image_url: imageUrl });
            setImagePreview(imageUrl);
            showToast('画像をアップロードしました', 'success');
          } else {
            showToast('画像URLの取得に失敗しました', 'error');
          }
        } catch (error) {
          console.error('Image upload error:', error);
          showToast('画像のアップロードに失敗しました', 'error');
        } finally {
          setIsUploadingImage(false);
        }
      };
      reader.onerror = () => {
        showToast('画像の読み込みに失敗しました', 'error');
        setIsUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Image upload error:', error);
      showToast('画像のアップロードに失敗しました', 'error');
      setIsUploadingImage(false);
    }
  };

  const handleImageRemove = () => {
    setTruth({ ...truth, bottle_image_url: null });
    setImagePreview(null);
  };

  const handleSaveTruth = async () => {
    if (!participantToken) return;


    try {
      const requestBody = {
        participant_token: participantToken,
        sample_id: sampleId,
        ...truth,
      };
      

      const response = await fetch('/api/truths/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const result = (await response.json()) as {
        success?: boolean;
        data?: {
          state_transitioned?: boolean;
          schema_fallback?: 'omit_bottle_metadata' | 'legacy_core_only' | null;
        };
        error?: string;
        code?: string;
      };

      if (!response.ok) {
        showToast(
          result.error ||
            (result.code === 'SCHEMA_MISMATCH'
              ? 'DBの truths テーブルに不足列があります。Supabase でマイグレーション SQL を実行してください。'
              : 'Truth保存に失敗しました'),
          'error',
        );
        return;
      }

      const schemaFallback = result.data?.schema_fallback;
      const schemaWarning =
        schemaFallback === 'omit_bottle_metadata'
          ? '（ボトラーズ名・蒸留/ボトリング年は DB 未対応のため保存されませんでした。マイグレーションを適用してください）'
          : schemaFallback === 'legacy_core_only'
            ? '（その他項目・ボトルメタは DB 未対応のため、コア項目のみ保存しました。マイグレーションを適用してください）'
            : '';

      const tastingUpsertStatus: 'draft' | 'submitted' =
        myAnswer.status === 'submitted' ? 'submitted' : 'draft';

      const canSaveTastingWithTruth =
        roundState === 'answering' &&
        (myAnswer.status === 'draft' || myAnswer.status === 'submitted');

      if (canSaveTastingWithTruth) {
        const answerRes = await fetch('/api/answers/upsert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            participant_token: participantToken,
            sample_id: sampleId,
            ...myAnswer,
            status: tastingUpsertStatus,
          }),
        });
        const answerJson: { error?: string } = await answerRes.json().catch(() => ({}));
        if (!answerRes.ok) {
          showToast(
            answerJson.error
              ? `正解情報は保存しました。テイスティング: ${answerJson.error}`
              : '正解情報は保存しました。テイスティングの保存に失敗しました',
            'error',
          );
        } else {
          showToast(`正解情報とテイスティングを保存しました${schemaWarning}`, 'success');
        }
        await loadMyAnswer();
      } else {
        showToast(`正解情報を保存しました${schemaWarning}`, 'success');
      }

      // 状態遷移が発生した場合は即座に更新
      if (result.data?.state_transitioned) {
        console.log('[DEBUG] Truth saved - State transitioned to grading');
        setRoundState('grading');
        await loadRoundStatus();
      } else {
        console.log('[DEBUG] Truth saved - No state transition, reloading status');
        await loadRoundStatus();
        // 状態遷移が発生する可能性があるので、少し待ってから再度更新
        setTimeout(() => {
          loadRoundStatus();
        }, 2000);
      }
    } catch (error) {
      console.error('Save truth error:', error);
      showToast('ネットワークエラーが発生しました', 'error');
    }
  };

  const handleGradePatch = async (participantId: string, patch: ItemGradesMap) => {
    if (!participantToken) return;

    try {
      const response = await fetch('/api/distillery/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participant_token: participantToken,
          sample_id: sampleId,
          target_participant_id: participantId,
          item_grades: patch,
        }),
      });

      let result: { error?: string } = {};
      try {
        const text = await response.text();
        result = text ? JSON.parse(text) : {};
      } catch {
        showToast('サーバーからの応答の解析に失敗しました', 'error');
        return;
      }

      if (!response.ok) {
        showToast(result.error || `採点に失敗しました（${response.status}）`, 'error');
        return;
      }

      showToast('採点を保存しました', 'success');

      setParticipants((prev) =>
        prev.map((p) => {
          if (p.participant_id !== participantId) return p;
          const merged = { ...(p.item_grades || {}), ...patch };
          return { ...p, item_grades: merged };
        }),
      );

      await loadRoundStatus();
      window.setTimeout(() => void loadRoundStatus(), 500);
      window.setTimeout(() => void loadRoundStatus(), 1500);
    } catch (error) {
      console.error('Grade error:', error);
      showToast('ネットワークエラーが発生しました', 'error');
    }
  };

  const applyItemVerdict = (
    participantId: string,
    key: ScoringItemKey,
    verdict: ItemVerdict,
    partialScore?: number,
  ) => {
    const max = fullScoring.items[key]?.maxPoints ?? 0;
    if (verdict === 'partial') {
      const ps = partialScore ?? 0;
      void handleGradePatch(participantId, {
        [key]: { verdict: 'partial', partial_score: Math.max(0, Math.min(max, ps)) },
      });
      return;
    }
    void handleGradePatch(participantId, { [key]: { verdict } });
  };

  const handleRejectSubmission = async (targetParticipantId: string) => {
    if (!participantToken) return;

    const confirmed = window.confirm('この回答を差し戻しますか？参加者が再編集できるようになります。');

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch('/api/distillery/reject-submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participant_token: participantToken,
          sample_id: sampleId,
          target_participant_id: targetParticipantId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        showToast(result.error || '差し戻しに失敗しました', 'error');
        return;
      }

      showToast('回答を差し戻しました', 'success');
      // 即座に更新
      await loadRoundStatus();
      // 少し待ってから再度更新（状態遷移が発生する可能性がある）
      setTimeout(() => {
        loadRoundStatus();
      }, 1000);
    } catch (error) {
      console.error('Reject submission error:', error);
      showToast('ネットワークエラーが発生しました', 'error');
    }
  };

  const handleFinishRound = async () => {
    if (!participantToken) return;

    try {
      const response = await fetch('/api/round/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participant_token: participantToken,
          sample_id: sampleId,
        }),
      });

      const result = await response.json();


      if (!response.ok) {
        showToast(result.error || 'Round終了に失敗しました', 'error');
        return;
      }

      showToast('Roundを終了しました', 'success');
      // 状態を更新してから遷移
      await loadRoundStatus();
      setTimeout(() => {
        if (joinToken) {
          router.push(`/session/${joinToken}`);
        }
      }, 1000);
    } catch (error) {
      console.error('Finish round error:', error);
      showToast('ネットワークエラーが発生しました', 'error');
    }
  };

  const handleSavePresenterTasting = async () => {
    if (!participantToken) return;
    const statusForUpsert: 'draft' | 'submitted' =
      myAnswer.status === 'submitted' ? 'submitted' : 'draft';
    try {
      const res = await fetch('/api/answers/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participant_token: participantToken,
          sample_id: sampleId,
          ...myAnswer,
          status: statusForUpsert,
        }),
      });
      const j: { error?: string } = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(j.error || 'テイスティングの保存に失敗しました', 'error');
        return;
      }
      showToast('テイスティングを保存しました', 'success');
      await loadMyAnswer();
      await loadRoundStatus();
    } catch {
      showToast('ネットワークエラーが発生しました', 'error');
    }
  };

  const canEditPresenterTasting =
    roundState === 'answering' ||
    roundState === 'grading' ||
    roundState === 'revealed' ||
    roundState === 'closed';

  /** テイスティングの単独保存（draft＝プレゼンター専用の未提出行／submitted＝提出済み行の追記） */
  const showPresenterTastingStandaloneSave =
    (myAnswer.status === 'draft' || myAnswer.status === 'submitted') &&
    (roundState === 'answering' ||
      roundState === 'grading' ||
      roundState === 'revealed' ||
      roundState === 'closed');

  /** 正解ブロック内・採点中の差し戻しブロックを共通利用 */
  const presenterTastingSection = (
    <div className="space-y-3">
      {canEditPresenterTasting ? (
        <div className="rounded-lg border border-white/10 bg-neutral-800/40 overflow-hidden">
          {myAnswer.status === 'submitted' && roundState === 'answering' ? (
            <p className="text-stone-400 text-sm leading-relaxed px-4 pt-3">
              回答は提出済みですが、プレゼンターとしてのテイスティングは編集できます（保存すると結果のフレーバー・ナイチンゲール・ローズ・チャートにも反映されます）。
            </p>
          ) : null}
          <button
            type="button"
            className="flex w-full min-h-[48px] items-center justify-between gap-3 px-4 py-3 text-left hover:bg-white/5 active:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-bd-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900"
            onClick={() => setPresenterTastingOpen((o) => !o)}
            aria-expanded={presenterTastingOpen}
            aria-controls="presenter-tasting-panel"
            id="presenter-tasting-toggle"
          >
            <span className="text-base font-semibold text-stone-100 tracking-tight">
              テイスティング（任意）
            </span>
            <span
              className={`text-stone-400 text-sm leading-none shrink-0 transition-transform duration-200 ${
                presenterTastingOpen ? 'rotate-180' : ''
              }`}
              aria-hidden
            >
              ▼
            </span>
          </button>
          {presenterTastingOpen ? (
            <div
              id="presenter-tasting-panel"
              role="region"
              aria-labelledby="presenter-tasting-toggle"
              className="space-y-4 border-t border-white/10 px-4 py-4"
            >
              <p className="text-sm text-stone-500 leading-relaxed">
                {roundState === 'answering'
                  ? 'Nose / Palate / Finish のタグとコメントを入力できます。下の「正解情報を保存」でテイスティングもまとめて保存されます。'
                  : myAnswer.status === 'submitted'
                    ? '採点中でもプレゼンターのテイスティングだけ更新できます。下の「テイスティングを保存」を押してください。'
                    : 'Nose / Palate / Finish のタグとコメントを修正できます。差し戻し通知内の「テイスティングを保存」で保存してください。'}
              </p>
              <FlavorTastingSections
                tier1Options={tier1Options}
                tier2Suggestions={tier2Suggestions}
                value={{
                  nose: myAnswer.nose,
                  palate: myAnswer.palate,
                  finish: myAnswer.finish,
                }}
                disabled={!canEditPresenterTasting}
                sectionIdPrefix="section-presenter"
                onChange={(flavor) =>
                  setMyAnswer((prev) => ({
                    ...prev,
                    nose: flavor.nose !== undefined ? flavor.nose : prev.nose,
                    palate: flavor.palate !== undefined ? flavor.palate : prev.palate,
                    finish: flavor.finish !== undefined ? flavor.finish : prev.finish,
                  }))
                }
              />
              {showPresenterTastingStandaloneSave ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full sm:w-auto"
                  onClick={() => void handleSavePresenterTasting()}
                >
                  テイスティングを保存
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen pt-16 pb-20 px-4 bg-neutral-900">
        <div className="max-w-3xl mx-auto mt-8">
          <div className="bg-neutral-800 rounded-2xl shadow-xl shadow-black/40 border border-white/10 p-12 text-center">
            <p className="text-stone-400 text-lg">読み込み中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16 pb-20 px-4 bg-neutral-900">
      <PhaseBanner sessionState="running" mode="sequential" currentSample={sampleLabel ? { id: sampleId, label: sampleLabel } : undefined} />

      <div className="max-w-3xl mx-auto mt-8 space-y-6">
        {/* ヘッダー */}
        <div className="bg-neutral-800 rounded-2xl shadow-xl shadow-black/40 border border-white/10 p-6">
          <h1 className="text-3xl md:text-4xl font-semibold text-stone-100 tracking-tight">Presenterパネル</h1>
          <p className="text-sm text-stone-400 mt-2">
            Sample {sampleLabel} - Round状態: <span className="font-semibold text-stone-100">{roundState}</span>
          </p>
        </div>

        {/* pending状態: Round開始 */}
        {roundState === 'pending' && (
          <div className="bg-neutral-800 rounded-2xl shadow-xl shadow-black/40 border border-white/10 p-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-neutral-700 rounded-full mb-4">
                <span className="text-2xl">🚀</span>
              </div>
              <h2 className="text-2xl font-semibold text-stone-100 mb-2 tracking-tight">Round開始</h2>
              <p className="text-stone-400 leading-relaxed">
                このSampleのRoundを開始してください。
              </p>
            </div>
            <Button variant="primary" onClick={handleStartRound} className="w-full py-3 text-lg font-semibold">
              Roundを開始する
            </Button>
          </div>
        )}

        {/* answering状態: Truth入力、提出状況確認、提出済み回答閲覧 */}
        {roundState === 'answering' && (
          <div className="space-y-6">
            {/* Truth入力セクション */}
            <div className="bg-neutral-800 rounded-2xl shadow-xl shadow-black/40 border border-white/10 p-6 space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-stone-100 mb-2 tracking-tight">正解情報入力</h2>
                <p className="text-stone-400 leading-relaxed">
                  参加者が回答を入力している間、正解情報を入力してください。
                </p>
              </div>

              <div className="space-y-5">
                {SCORING_ITEM_KEYS.map((key) => (
                  <ScoringFieldBlock
                    key={key}
                    mode="truth"
                    itemKey={key}
                    cfg={fullScoring.items[key]}
                    caskOptions={caskOptions}
                    regionOptions={regionOptions}
                    value={truth}
                    onChange={(next) => setTruth({ ...truth, ...next })}
                  />
                ))}

                <BottleTruthMetaFields
                  value={truth}
                  onChange={(meta) => setTruth({ ...truth, ...meta })}
                >
                  {presenterTastingSection}

                  <div>
                    <label className="block text-sm font-semibold text-stone-100 mb-2">メモ（任意）</label>
                    <p className="text-xs text-stone-500 mb-2 leading-relaxed">
                      入力内容は結果画面・CSV にそのまま表示されます。
                    </p>
                    <textarea
                      value={truth.notes || ''}
                      onChange={(e) => setTruth({ ...truth, notes: e.target.value })}
                      className="w-full px-4 py-3 bg-neutral-800 border border-white/10 text-stone-100 placeholder:text-stone-500 rounded-lg text-base min-h-[100px] focus:border-white/20 focus:ring-2 focus:ring-white/20 transition-all"
                      placeholder="価格帯、購入店、補足説明など"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-stone-100 mb-2">ボトル画像（任意）</label>
                    {imagePreview || truth.bottle_image_url ? (
                      <div className="space-y-3">
                        <div className="relative w-full max-w-md mx-auto">
                          {(() => {
                            const src = imagePreview || truth.bottle_image_url || '';
                            const useNative =
                              src.startsWith('blob:') || src.startsWith('data:');
                            return useNative ? (
                              // blob/data URL は next/image で扱えない
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={src}
                                alt="ボトル画像"
                                className="w-full h-auto rounded-lg border border-white/10"
                              />
                            ) : (
                              <Image
                                src={src}
                                alt="ボトル画像"
                                width={800}
                                height={600}
                                className="w-full h-auto rounded-lg border border-white/10"
                              />
                            );
                          })()}
                          <button
                            type="button"
                            onClick={handleImageRemove}
                            className="absolute top-2 right-2 px-3 py-1.5 bg-red-500/15 text-red-300 border border-red-400/30 rounded-lg hover:bg-red-500/25 transition-colors text-sm font-medium"
                          >
                            削除
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center">
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleImageUpload(file);
                            }
                          }}
                          className="hidden"
                          id="bottle-image-upload"
                          disabled={isUploadingImage}
                        />
                        <label
                          htmlFor="bottle-image-upload"
                          className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-neutral-700 text-stone-200 border border-white/10 rounded-lg hover:bg-neutral-600 transition-colors ${
                            isUploadingImage ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          {isUploadingImage ? 'アップロード中...' : '画像を選択'}
                        </label>
                        <p className="text-sm text-stone-400 mt-2">JPEG、PNG、WebP形式、10MB以下</p>
                      </div>
                    )}
                  </div>
                </BottleTruthMetaFields>

                <Button variant="primary" onClick={handleSaveTruth} className="w-full py-3 text-lg font-semibold mt-2">
                  正解情報を保存
                </Button>
              </div>
            </div>

            {/* 提出状況一覧 */}
            <ParticipantProgress
              participants={participants.map((p) => ({
                id: p.participant_id,
                display_name: p.display_name,
                status: p.status,
              }))}
            />

            {/* 提出済み回答の閲覧 */}
            {participants.filter((p) => p.status === 'submitted').length > 0 ? (
              <div className="bg-neutral-800 rounded-2xl shadow-xl shadow-black/40 border border-white/10 p-6 space-y-5">
                <h3 className="text-xl font-semibold text-stone-100 tracking-tight">提出済み回答の閲覧</h3>
                {participants
                  .filter((p) => p.status === 'submitted')
                  .map((participant) => (
                    <div
                      key={participant.participant_id}
                      className="p-5 border border-white/10 rounded-xl space-y-4 bg-neutral-700 transition-all"
                    >
                      <div>
                        <p className="font-semibold text-lg text-stone-100 mb-3 break-words">
                          {disambiguatedDisplayName(
                            participant.display_name,
                            participant.participant_id,
                            participantPeers,
                          )}
                        </p>
                        <ParticipantGuessSummary participant={participant} fullScoring={fullScoring} />
                      </div>
                      
                      {(participant.nose || participant.palate || participant.finish) && (
                        <div className="mt-3 pt-3 border-t border-white/10 space-y-3 text-sm">
                          {participant.nose && (
                            <div>
                              <p className="font-semibold text-stone-100 mb-1">Nose</p>
                              {participant.nose.tier1_tags && participant.nose.tier1_tags.length > 0 && (
                                <p className="text-stone-400">
                                  Tier1:{' '}
                                  {formatTier1WithIntensity(
                                    participant.nose.tier1_tags,
                                    participant.nose.tier1_intensity,
                                  )}
                                </p>
                              )}
                              {participant.nose.tier2_terms && participant.nose.tier2_terms.length > 0 && (
                                <p className="text-stone-400">Tier2: {participant.nose.tier2_terms.join(', ')}</p>
                              )}
                              {participant.nose.text && (
                                <p className="text-stone-300 mt-1 leading-relaxed">{participant.nose.text}</p>
                              )}
                            </div>
                          )}
                          {participant.palate && (
                            <div>
                              <p className="font-semibold text-stone-100 mb-1">Palate</p>
                              {participant.palate.tier1_tags && participant.palate.tier1_tags.length > 0 && (
                                <p className="text-stone-400">
                                  Tier1:{' '}
                                  {formatTier1WithIntensity(
                                    participant.palate.tier1_tags,
                                    participant.palate.tier1_intensity,
                                  )}
                                </p>
                              )}
                              {participant.palate.tier2_terms && participant.palate.tier2_terms.length > 0 && (
                                <p className="text-stone-400">Tier2: {participant.palate.tier2_terms.join(', ')}</p>
                              )}
                              {participant.palate.text && (
                                <p className="text-stone-300 mt-1 leading-relaxed">{participant.palate.text}</p>
                              )}
                            </div>
                          )}
                          {participant.finish && (
                            <div>
                              <p className="font-semibold text-stone-100 mb-1">Finish</p>
                              {participant.finish.tier1_tags && participant.finish.tier1_tags.length > 0 && (
                                <p className="text-stone-400">
                                  Tier1:{' '}
                                  {formatTier1WithIntensity(
                                    participant.finish.tier1_tags,
                                    participant.finish.tier1_intensity,
                                  )}
                                </p>
                              )}
                              {participant.finish.tier2_terms && participant.finish.tier2_terms.length > 0 && (
                                <p className="text-stone-400">Tier2: {participant.finish.tier2_terms.join(', ')}</p>
                              )}
                              {participant.finish.text && (
                                <p className="text-stone-300 mt-1 leading-relaxed">{participant.finish.text}</p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      <div className="mt-2">
                        <Button
                          variant="secondary"
                          onClick={() => handleRejectSubmission(participant.participant_id)}
                          className="w-full text-sm py-2"
                        >
                          差し戻し（提出を解除）
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="bg-neutral-800 rounded-2xl shadow-xl shadow-black/40 border border-white/10 p-6">
                <p className="text-stone-400 text-center leading-relaxed">
                  提出済みの回答はまだありません。参加者が回答を提出すると、ここに表示されます。
                </p>
              </div>
            )}

          </div>
        )}

        {/* grading状態: 採点 */}
        {roundState === 'grading' && (
          <div className="space-y-6">
            {myAnswer.status === 'draft' && (
              <>
                {presenterCoreGuessesLookEmpty(myAnswer) ? (
                  <div className="rounded-2xl border border-white/10 bg-neutral-800/50 p-4">
                    <p className="text-sm text-stone-300 leading-relaxed">
                      参加者としての回答は提出していません。テイスティングだけ入力して保存すると、公開後のフレーバー・ナイチンゲール・ローズ・チャートに反映されます。
                    </p>
                  </div>
                ) : (
                  <div className="bg-bd-accent/10 border border-bd-accent/30 rounded-2xl p-4">
                    <p className="text-amber-200 font-semibold">差し戻されました</p>
                    <p className="text-stone-300 text-sm mt-1 leading-relaxed">
                      内容を修正して保存してください。
                    </p>
                  </div>
                )}
                <div className="bg-neutral-800 rounded-2xl shadow-xl shadow-black/40 border border-white/10 p-6 space-y-4">
                  {presenterTastingSection}
                </div>
              </>
            )}
            {myAnswer.status === 'submitted' && (
              <div className="bg-neutral-800 rounded-2xl shadow-xl shadow-black/40 border border-white/10 p-6 space-y-4">
                <p className="text-sm text-stone-400 leading-relaxed">
                  プレゼンターのテイスティングは、結果公開後のフレーバー・ナイチンゲール・ローズ・チャートに含まれます。採点中でも追加・修正できます。
                </p>
                {presenterTastingSection}
              </div>
            )}
            <div className="bg-neutral-800 rounded-2xl shadow-xl shadow-black/40 border border-white/10 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-500/15 border border-emerald-400/30 rounded-full">
                  <span className="text-xl">✓</span>
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-stone-100 tracking-tight">採点</h2>
                  <p className="text-stone-400 text-sm mt-1 leading-relaxed">
                    手動採点が必要な項目について、正解・不正解・部分点を入力してください。
                  </p>
                </div>
              </div>
            </div>

            {/* 採点対象の参加者一覧 */}
            {participants.filter((p) => p.status === 'submitted').length > 0 ? (
              <div className="bg-neutral-800 rounded-2xl shadow-xl shadow-black/40 border border-white/10 p-6 space-y-5">
                <h3 className="text-xl font-semibold text-stone-100 tracking-tight">参加者の推測</h3>
                {participants
                  .filter((p) => p.status === 'submitted')
                  .map((participant) => (
                    <div
                      key={participant.participant_id}
                      className="p-5 border border-white/10 rounded-xl space-y-4 bg-neutral-700 transition-all"
                    >
                      <div>
                        <p className="font-semibold text-lg text-stone-100 mb-3 break-words">
                          {disambiguatedDisplayName(
                            participant.display_name,
                            participant.participant_id,
                            participantPeers,
                          )}
                        </p>
                        <ParticipantGuessSummary participant={participant} fullScoring={fullScoring} />
                      </div>

                      {manualGradeKeys.length > 0 ? (
                        <div className="mt-4 space-y-4 border-t border-white/10 pt-4">
                          <div className="text-xs font-semibold text-stone-400">手採点</div>
                          {manualGradeKeys.map((key) => {
                            const it = fullScoring.items[key];
                            const max = it.maxPoints;
                            const g = participant.item_grades?.[key];
                            const draftKey = `${participant.participant_id}:${key}`;
                            const verdictLabel =
                              g?.verdict === 'correct'
                                ? '正解'
                                : g?.verdict === 'wrong'
                                  ? '不正解'
                                  : g?.verdict === 'partial'
                                    ? `部分点 (${g.partial_score ?? '?'})`
                                    : '未採点';
                            return (
                              <div key={key} className="rounded-lg bg-neutral-800/80 p-3 space-y-2">
                                <div className="text-sm font-semibold text-stone-200">
                                  {it.label}（満点 {max}）
                                </div>
                                <div className="text-xs text-stone-400">状態: {verdictLabel}</div>
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    variant={g?.verdict === 'correct' ? 'primary' : 'secondary'}
                                    onClick={() => applyItemVerdict(participant.participant_id, key, 'correct')}
                                    className={`py-2 text-sm ${
                                      g?.verdict === 'correct'
                                        ? 'bg-sky-500 hover:bg-sky-600 text-white'
                                        : ''
                                    }`}
                                  >
                                    正解
                                  </Button>
                                  <Button
                                    variant={g?.verdict === 'wrong' ? 'primary' : 'secondary'}
                                    onClick={() => applyItemVerdict(participant.participant_id, key, 'wrong')}
                                    className={`py-2 text-sm ${
                                      g?.verdict === 'wrong'
                                        ? 'bg-bd-ink hover:bg-bd-ink-hover text-bd-paper'
                                        : ''
                                    }`}
                                  >
                                    不正解
                                  </Button>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <input
                                    type="number"
                                    min={0}
                                    max={max}
                                    step={0.5}
                                    placeholder="部分点"
                                    value={
                                      partialDraftByKey[draftKey] ??
                                      (g?.verdict === 'partial' && g.partial_score != null
                                        ? String(g.partial_score)
                                        : '')
                                    }
                                    onChange={(e) =>
                                      setPartialDraftByKey((prev) => ({
                                        ...prev,
                                        [draftKey]: e.target.value,
                                      }))
                                    }
                                    className="w-28 px-2 py-1.5 bg-neutral-700 border border-white/10 rounded text-stone-100 text-sm"
                                  />
                                  <Button
                                    variant="secondary"
                                    className="py-2 text-sm"
                                    onClick={() => {
                                      const raw = partialDraftByKey[draftKey] ?? '';
                                      const n = parseFloat(raw);
                                      applyItemVerdict(
                                        participant.participant_id,
                                        key,
                                        'partial',
                                        Number.isFinite(n) ? n : 0,
                                      );
                                    }}
                                  >
                                    部分点で保存
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-stone-500 mt-2 border-t border-white/10 pt-3">
                          この設定に手採点の項目はありません（採点は自動です）。
                        </p>
                      )}

                      {manualGradeKeys.length === 0 && (
                        <div className="flex justify-end">
                          <CorrectnessBadge value={participant.is_correct} size="md" />
                        </div>
                      )}
                      
                      {(participant.nose || participant.palate || participant.finish) && (
                        <div className="mt-3 pt-3 border-t border-white/10 space-y-3 text-sm">
                          <FlavorChips label="Nose" flavor={participant.nose} />
                          <FlavorChips label="Palate" flavor={participant.palate} />
                          <FlavorChips label="Finish" flavor={participant.finish} />
                        </div>
                      )}
                      <div className="mt-2">
                        <Button
                          variant="secondary"
                          onClick={() => handleRejectSubmission(participant.participant_id)}
                          className="w-full text-sm py-2"
                        >
                          差し戻し（提出を解除）
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="bg-neutral-800 rounded-2xl shadow-xl shadow-black/40 border border-white/10 p-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-neutral-700 rounded-full mb-4">
                  <span className="text-2xl">📝</span>
                </div>
                <p className="text-stone-400 text-lg">提出済みの回答がありません</p>
              </div>
            )}

            {/* 提出状況一覧 */}
            <ParticipantProgress
              participants={participants.map((p) => ({
                id: p.participant_id,
                display_name: p.display_name,
                status: p.status,
              }))}
            />

            {/* Round終了ボタン */}
            {allGraded ? (
              <div className="bg-emerald-500/15 border-2 border-emerald-400/30 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-500 rounded-full">
                    <span className="text-white text-xl">✓</span>
                  </div>
                  <div>
                    <p className="font-semibold text-emerald-300 text-lg">全員の採点が完了しました</p>
                    <p className="text-sm text-emerald-300/80 mt-1">Roundを終了できます</p>
                  </div>
                </div>
                <Button variant="primary" onClick={handleFinishRound} className="w-full py-3 text-lg font-semibold">
                  Roundを終了する
                </Button>
              </div>
            ) : (
              <div className="bg-neutral-800 border-2 border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-neutral-700 rounded-full">
                    <span className="text-stone-400 text-xl">⏳</span>
                  </div>
                  <div>
                    <p className="font-semibold text-stone-100 text-lg">採点が完了していません</p>
                    <p className="text-sm text-stone-400 mt-1">全参加者の採点を完了してください</p>
                  </div>
                </div>
                <Button 
                  variant="secondary" 
                  onClick={handleFinishRound} 
                  className="w-full py-3 text-lg font-semibold opacity-50 cursor-not-allowed"
                  disabled
                >
                  Roundを終了する（採点未完了）
                </Button>
              </div>
            )}
          </div>
        )}

        {/* revealed/closed状態: Round終了 */}
        {(roundState === 'revealed' || roundState === 'closed') && (
          <div className="space-y-6">
            <div className="bg-neutral-800 rounded-2xl shadow-xl shadow-black/40 border border-white/10 p-6 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/15 border border-emerald-400/30 rounded-full mb-4">
                <span className="text-2xl">✓</span>
              </div>
              <h2 className="text-2xl font-semibold text-stone-100 mb-2 tracking-tight">Round終了</h2>
              <p className="text-stone-400 mb-6 leading-relaxed">このRoundは終了しました。</p>
              {sessionMode === 'sequential' ? (
                <Button
                  variant="primary"
                  onClick={() => {
                    if (joinToken && sampleId) {
                      router.push(`/session/${joinToken}/round-result/${sampleId}`);
                    }
                  }}
                  className="w-full py-3 text-lg font-semibold"
                >
                  結果を見る
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={() => {
                    if (joinToken) {
                      router.push(`/session/${joinToken}`);
                    }
                  }}
                  className="w-full py-3 text-lg font-semibold"
                >
                  ホームに戻る
                </Button>
              )}
            </div>
            {(myAnswer.status === 'draft' || myAnswer.status === 'submitted') && (
              <div className="bg-neutral-800 rounded-2xl shadow-xl shadow-black/40 border border-white/10 p-6 space-y-4">
                <p className="text-sm text-stone-400 leading-relaxed">
                  結果画面のフレーバー・ナイチンゲール・ローズ・チャート用に、プレゼンターのテイスティングを追加・修正できます（保存すると公開済み結果にも反映されます）。
                </p>
                {presenterTastingSection}
              </div>
            )}
          </div>
        )}
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}
    </div>
  );
}
