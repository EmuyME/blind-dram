"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PhaseBanner } from '@/components/common/PhaseBanner';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/common/Toast';
import { Toast } from '@/components/common/Toast';
import { PageSkeleton } from '@/components/common/PageSkeleton';
import { getParticipantToken, setParticipantToken as persistParticipantToken } from '@/lib/utils';
import {
  SCORING_ITEM_KEYS,
  normalizeScoringConfig,
  type FullScoringConfig,
  type ScoringItemKey,
} from '@/lib/scoring-schema';
import { ScoringFieldBlock } from '@/components/scoring/ScoringFieldBlock';
import { FlavorTastingSections } from '@/components/flavor/FlavorTastingSections';
import { clampTier1Intensity } from '@/lib/json-helpers';
import { DEFAULT_FLAVOR_CHART } from '@/lib/default-flavor-chart';

interface Answer {
  guessed_cask?: string;
  guessed_region?: string;
  guessed_age?: string | number;
  guessed_abv?: string | number;
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

type FlavorSection = NonNullable<Answer['nose']>;

const emptyFlavorSection = (): FlavorSection => ({
  tier1_tags: [],
  tier2_terms: [],
  text: '',
});

const cloneFlavorSection = (s: FlavorSection): FlavorSection => ({
  tier1_tags: [...(s.tier1_tags || [])],
  tier2_terms: [...(s.tier2_terms || [])],
  text: s.text || '',
  tier1_intensity: s.tier1_intensity ? { ...s.tier1_intensity } : undefined,
});

/** ポーリング用: 未保存の入力がサーバーの遅れで消えないよう、ローカルが手前なら保持する */
const flavorSectionPollScore = (sec?: FlavorSection): number => {
  if (!sec) return 0;
  const tags = sec.tier1_tags?.filter(Boolean).length ?? 0;
  const terms = sec.tier2_terms?.filter(Boolean).length ?? 0;
  const text = (sec.text || '').trim().length > 0 ? 1 : 0;
  const intKeys = sec.tier1_intensity ? Object.keys(sec.tier1_intensity).length : 0;
  return tags * 10 + terms + text * 5 + intKeys;
};

const normalizeFlavorSectionKey = (sec: FlavorSection): string => {
  const clean = (x: unknown) => (typeof x === 'string' ? x.trim() : x);
  const sortStrs = (arr?: string[]) =>
    Array.isArray(arr) ? [...arr].filter(Boolean).map((x) => x.trim()).sort() : [];
  const tags = sortStrs(sec.tier1_tags);
  const o: Record<string, number> = {};
  for (const t of tags) {
    o[t] = clampTier1Intensity(sec.tier1_intensity?.[t]);
  }
  return JSON.stringify({
    tier1_tags: tags,
    tier1_intensity: o,
    tier2_terms: sortStrs(sec.tier2_terms),
    text: clean(sec.text || ''),
  });
};

const mergeFlavorSectionForSilentPoll = (
  local: FlavorSection | undefined,
  server: FlavorSection | undefined,
): FlavorSection => {
  const loc = local ?? emptyFlavorSection();
  const srv = server ?? emptyFlavorSection();
  const ls = flavorSectionPollScore(loc);
  const ss = flavorSectionPollScore(srv);
  if (ss === 0 && ls > 0) return cloneFlavorSection(loc);
  if (ls > ss) return cloneFlavorSection(loc);
  if (ls === ss && ls > 0 && normalizeFlavorSectionKey(loc) !== normalizeFlavorSectionKey(srv)) {
    return cloneFlavorSection(loc);
  }
  return cloneFlavorSection(srv);
};

const mergeLooseTrimmedText = (local?: string, remote?: string): string => {
  const l = (local ?? '').trim();
  const r = (remote ?? '').trim();
  if (!r) return local ?? '';
  if (!l) return remote ?? '';
  if (r !== l) return local ?? '';
  return remote ?? '';
};

const mergeOptionalAgeAbv = (
  local?: string | number,
  remote?: string | number,
): string | number | undefined => {
  const hasRemote =
    remote !== null &&
    remote !== undefined &&
    remote !== '' &&
    (typeof remote === 'number' ? Number.isFinite(remote) : String(remote).trim() !== '');
  if (hasRemote) return remote;
  const hasLocal =
    local !== null &&
    local !== undefined &&
    local !== '' &&
    (typeof local === 'number' ? Number.isFinite(local) : String(local).trim() !== '');
  if (hasLocal) return local;
  return undefined;
};

const mergeOptionalNumber = (local?: number, remote?: number): number | undefined => {
  if (typeof remote === 'number' && Number.isFinite(remote)) return remote;
  if (typeof local === 'number' && Number.isFinite(local)) return local;
  return undefined;
};

const mergeAnswerFromSilentPoll = (prev: Answer, server: Answer): Answer => {
  const next: Answer = {
    guessed_cask: mergeLooseTrimmedText(prev.guessed_cask, server.guessed_cask),
    guessed_region: mergeLooseTrimmedText(prev.guessed_region, server.guessed_region),
    guessed_age: mergeOptionalAgeAbv(prev.guessed_age, server.guessed_age),
    guessed_abv: mergeOptionalAgeAbv(prev.guessed_abv, server.guessed_abv),
    guessed_distillery: mergeLooseTrimmedText(prev.guessed_distillery, server.guessed_distillery),
    guessed_other1: mergeLooseTrimmedText(prev.guessed_other1, server.guessed_other1),
    guessed_other2: mergeLooseTrimmedText(prev.guessed_other2, server.guessed_other2),
    nose: mergeFlavorSectionForSilentPoll(prev.nose, server.nose),
    palate: mergeFlavorSectionForSilentPoll(prev.palate, server.palate),
    finish: mergeFlavorSectionForSilentPoll(prev.finish, server.finish),
    score_0_100: mergeOptionalNumber(prev.score_0_100, server.score_0_100),
    status: server.status,
  };
  return next;
};

const normalizeAnswerForCompare = (a: Answer) => {
  const clean = (s: unknown) => (typeof s === 'string' ? s.trim() : s);
  const sortStrs = (arr?: string[]) =>
    Array.isArray(arr) ? [...arr].filter(Boolean).map((x) => x.trim()).sort() : [];
  const intensityForTags = (
    tags: string[],
    raw?: Record<string, unknown> | Record<string, number>,
  ): Record<string, number> => {
    const o: Record<string, number> = {};
    for (const t of tags) {
      const v = raw?.[t];
      o[t] = clampTier1Intensity(v);
    }
    return o;
  };
  const noseTags = sortStrs(a.nose?.tier1_tags);
  const palateTags = sortStrs(a.palate?.tier1_tags);
  const finishTags = sortStrs(a.finish?.tier1_tags);
  return {
    guessed_cask: clean(a.guessed_cask || ''),
    guessed_region: clean(a.guessed_region || ''),
    guessed_age: a.guessed_age ?? null,
    guessed_abv: a.guessed_abv ?? null,
    guessed_distillery: clean(a.guessed_distillery || ''),
    guessed_other1: clean(a.guessed_other1 || ''),
    guessed_other2: clean(a.guessed_other2 || ''),
    nose: {
      tier1_tags: noseTags,
      tier1_intensity: intensityForTags(noseTags, a.nose?.tier1_intensity),
      tier2_terms: sortStrs(a.nose?.tier2_terms),
      text: clean(a.nose?.text || ''),
    },
    palate: {
      tier1_tags: palateTags,
      tier1_intensity: intensityForTags(palateTags, a.palate?.tier1_intensity),
      tier2_terms: sortStrs(a.palate?.tier2_terms),
      text: clean(a.palate?.text || ''),
    },
    finish: {
      tier1_tags: finishTags,
      tier1_intensity: intensityForTags(finishTags, a.finish?.tier1_intensity),
      tier2_terms: sortStrs(a.finish?.tier2_terms),
      text: clean(a.finish?.text || ''),
    },
    score_0_100: a.score_0_100 ?? null,
  };
};

// デフォルト値（フォールバック用）
const DEFAULT_TIER1_OPTIONS = [...DEFAULT_FLAVOR_CHART.tier1];

const DEFAULT_CASK_OPTIONS = ['シェリー樽', 'バーボン樽', 'ワイン樽', 'その他'];
const DEFAULT_REGION_OPTIONS = ['スコットランド', 'アイルランド', 'アメリカ', '日本', 'その他'];

export default function RoundPage() {
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
  const [answer, setAnswer] = useState<Answer>({
    nose: { tier1_tags: [], tier2_terms: [] },
    palate: { tier1_tags: [], tier2_terms: [] },
    finish: { tier1_tags: [], tier2_terms: [] },
  });
  const [sampleState, setSampleState] = useState<string | null>(null);
  const [sessionMode, setSessionMode] = useState<'sequential' | 'simultaneous' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  // 設定（sessionから読み込む）
  const [caskOptions, setCaskOptions] = useState<string[]>(DEFAULT_CASK_OPTIONS);
  const [regionOptions, setRegionOptions] = useState<string[]>(DEFAULT_REGION_OPTIONS);
  const [scoringSnapshot, setScoringSnapshot] = useState<unknown>(null);
  const scoringFull: FullScoringConfig = useMemo(
    () => normalizeScoringConfig(scoringSnapshot),
    [scoringSnapshot],
  );
  const [tier1Options, setTier1Options] = useState<string[]>(DEFAULT_TIER1_OPTIONS);
  const [tier2Suggestions, setTier2Suggestions] = useState<Record<string, string[]>>({});

  type LocalDraft = { savedAt: number; answer: Answer };
  const localDraftKey = useMemo(() => {
    if (!joinToken || !sampleId) return null;
    return `bd:answer_draft:${joinToken}:${sampleId}`;
  }, [joinToken, sampleId]);
  const [localDraft, setLocalDraft] = useState<LocalDraft | null>(null);
  const [showLocalDraftRestore, setShowLocalDraftRestore] = useState(false);
  const [lastLocalSavedAt, setLastLocalSavedAt] = useState<number | null>(null);
  const serverAnswerSnapshotRef = useRef<string | null>(null);
  const autoSaveTimerRef = useRef<number | null>(null);

  const formatTime = (ts: number) => {
    try {
      return new Date(ts).toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return '';
    }
  };

  useEffect(() => {
    if (!localDraftKey) return;
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(localDraftKey);
      if (!raw) {
        setLocalDraft(null);
        return;
      }
      const parsed = JSON.parse(raw) as Partial<LocalDraft>;
      if (!parsed || typeof parsed.savedAt !== 'number' || !parsed.answer) {
        setLocalDraft(null);
        return;
      }
      setLocalDraft({ savedAt: parsed.savedAt, answer: parsed.answer });
      setLastLocalSavedAt(parsed.savedAt);
    } catch {
      setLocalDraft(null);
    }
  }, [localDraftKey]);

  useEffect(() => {
    if (!joinToken) return;

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
  }, [joinToken, router]);

  const loadSampleAndAnswer = useCallback(
    async (token: string, silentPoll = false) => {
      if (!sampleId) {
        setIsLoading(false);
        return;
      }

      try {
        const [statusResponse, answerResponse] = await Promise.all([
          fetch(`/api/round/status?sample_id=${sampleId}&participant_token=${token}`),
          fetch(`/api/answers/get?sample_id=${sampleId}&participant_token=${token}`),
        ]);
        const [statusText, answerText] = await Promise.all([
          statusResponse.text(),
          answerResponse.text(),
        ]);

        let statusResult: {
          data?: { state?: string; session_mode?: string | null };
          error?: string;
        } = {};
        try {
          statusResult = statusText ? (JSON.parse(statusText) as typeof statusResult) : {};
        } catch {
          if (!silentPoll) {
            showToast(
              `Sample情報の応答を解析できませんでした（HTTP ${statusResponse.status}）。`,
              'error',
            );
          }
          setIsLoading(false);
          return;
        }

        if (!statusResponse.ok) {
          if (!silentPoll) {
            showToast(statusResult.error || 'Sample情報の取得に失敗しました', 'error');
          }
          setIsLoading(false);
          return;
        }

        const state = statusResult.data?.state;
        if (state != null) {
          setSampleState(state);
        }
        const sm = statusResult.data?.session_mode;
        if (sm === 'sequential' || sm === 'simultaneous') {
          setSessionMode(sm);
        }

        let answerResult: { data?: { answer?: Record<string, unknown> } } = {};
        if (answerResponse.ok && answerText) {
          try {
            answerResult = JSON.parse(answerText) as typeof answerResult;
          } catch {
            if (!silentPoll) {
              showToast('保存済み回答の読み込みに失敗しました（形式エラー）', 'error');
            }
          }
        } else if (!answerResponse.ok && !silentPoll && answerText) {
          try {
            const errBody = JSON.parse(answerText) as { error?: string };
            if (errBody.error) {
              showToast(errBody.error, 'error');
            }
          } catch {
            if (answerResponse.status === 429) {
              showToast(
                'アクセスが集中しています。少し待ってから再度お試しください。',
                'error',
              );
            }
          }
        }

        if (answerResponse.ok && answerResult.data?.answer) {
          const existingAnswer = answerResult.data.answer;
          const next: Answer = {
            guessed_cask: (existingAnswer.guessed_cask as string) || '',
            guessed_region: (existingAnswer.guessed_region as string) || '',
            guessed_age: (existingAnswer.guessed_age as number) || undefined,
            guessed_abv: (existingAnswer.guessed_abv as number) || undefined,
            guessed_distillery: (existingAnswer.guessed_distillery as string) || '',
            guessed_other1: (existingAnswer.guessed_other1 as string) || '',
            guessed_other2: (existingAnswer.guessed_other2 as string) || '',
            nose: (existingAnswer.nose as Answer['nose']) || {
              tier1_tags: [],
              tier2_terms: [],
              text: '',
            },
            palate: (existingAnswer.palate as Answer['palate']) || {
              tier1_tags: [],
              tier2_terms: [],
              text: '',
            },
            finish: (existingAnswer.finish as Answer['finish']) || {
              tier1_tags: [],
              tier2_terms: [],
              text: '',
            },
            score_0_100: (existingAnswer.score_0_100 as number) || undefined,
            status: existingAnswer.status as Answer['status'],
          };
          if (silentPoll) {
            setAnswer((prev) => {
              const merged = mergeAnswerFromSilentPoll(prev, next);
              serverAnswerSnapshotRef.current = JSON.stringify(normalizeAnswerForCompare(merged));
              return merged;
            });
          } else {
            setAnswer(next);
            serverAnswerSnapshotRef.current = JSON.stringify(normalizeAnswerForCompare(next));
          }
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Load sample error:', error);
        if (!silentPoll) {
          showToast('ネットワークエラーが発生しました', 'error');
        }
        setIsLoading(false);
      }
    },
    [sampleId, showToast],
  );

  // Sessionから設定を読み込む
  useEffect(() => {
    if (!joinToken) return;

    const loadSessionSettings = async () => {
      try {
        const response = await fetch(`/api/session/get?join_token=${joinToken}`);
        const result = await response.json();


        if (response.ok && result.data) {
          const session = result.data;
          
          
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
          
          // フレーバーチャート
          if (session.flavor_chart_snapshot) {
            const chart = session.flavor_chart_snapshot;
            if (chart.tier1 && Array.isArray(chart.tier1)) {
              setTier1Options(chart.tier1);
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
    if (participantToken && sampleId) {
      loadSampleAndAnswer(participantToken, false);
    }
  }, [participantToken, sampleId, loadSampleAndAnswer]);

  // revealed/closed: 逐次は結果ページへ直接遷移。セッションホーム経由のみだと roundStatus の同期が遅れ、
  // プレゼンターが先に「次へ」するまで参加者が結果に進めないことがあった。
  useEffect(() => {
    if (!joinToken || !sampleId) return;
    const terminal = sampleState === 'revealed' || sampleState === 'closed';
    if (!terminal) return;

    let cancelled = false;

    const run = async () => {
      let mode = sessionMode;
      if (!mode) {
        try {
          const r = await fetch(`/api/session/get?join_token=${joinToken}`);
          const j = (await r.json()) as { data?: { mode?: string } };
          const m = j.data?.mode;
          if (m === 'sequential' || m === 'simultaneous') mode = m;
        } catch {
          /* fall through to session home */
        }
      }
      if (cancelled) return;
      if (mode === 'sequential') {
        router.push(`/session/${joinToken}/round-result/${sampleId}`);
        return;
      }
      router.push(`/session/${joinToken}`);
    };

    const delay = sessionMode === 'simultaneous' ? 2000 : 400;
    const t = window.setTimeout(() => void run(), delay);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [sampleState, sessionMode, joinToken, sampleId, router]);

  // すべての状態で定期的に状態をチェック（ポーリング）
  // pending状態でも、Roundが開始された場合に更新が必要
  useEffect(() => {
    if (participantToken && sampleId) {
      const interval = setInterval(() => {
        loadSampleAndAnswer(participantToken, true);
      }, 3000); // 3秒ごとに状態をチェック
      return () => clearInterval(interval);
    }
  }, [participantToken, sampleId, loadSampleAndAnswer]);

  const handleSaveDraft = async () => {
    if (!participantToken) return;

    setIsSaving(true);
    try {
      const response = await fetch('/api/answers/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participant_token: participantToken,
          sample_id: sampleId,
          status: 'draft',
          ...answer,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        showToast(result.error || '保存に失敗しました', 'error');
        return;
      }

      showToast('下書きを保存しました', 'success');
    } catch (error) {
      console.error('Save error:', error);
      showToast('ネットワークエラーが発生しました', 'error');
    } finally {
      setIsSaving(false);
    }
  };


  const handleSubmit = async () => {
    if (!participantToken) return;

    setIsSubmitting(true);
    try {
      console.log('[DEBUG] Round page - Submitting answer:', {
        sample_id: sampleId,
        participant_token: participantToken ? 'present' : 'missing',
        answer_data: {
          guessed_distillery: answer.guessed_distillery,
          guessed_cask: answer.guessed_cask,
          guessed_region: answer.guessed_region,
          has_nose: !!answer.nose,
          has_palate: !!answer.palate,
          has_finish: !!answer.finish,
        },
      });

      const { status, ...answerWithoutStatus } = answer;
      void status;
      
      const response = await fetch('/api/answers/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participant_token: participantToken,
          sample_id: sampleId,
          status: 'submitted',
          ...answerWithoutStatus,
        }),
      });

      const result = await response.json();

      console.log('[DEBUG] Round page - Submit response:', {
        ok: response.ok,
        status: response.status,
        result: result,
      });

      if (!response.ok) {
        showToast(result.error || '提出に失敗しました', 'error');
        setIsSubmitting(false);
        return;
      }

      console.log('[DEBUG] Round page - Answer submitted successfully:', {
        answer_id: result.data?.answer_id,
        status: result.data?.status,
        submitted_at: result.data?.submitted_at,
      });

      showToast('回答を提出しました', 'success');
      try {
        if (localDraftKey) {
          localStorage.removeItem(localDraftKey);
        }
        setLocalDraft(null);
        setShowLocalDraftRestore(false);
      } catch {
        // ignore
      }
      setTimeout(() => {
        if (joinToken) {
          router.push(`/session/${joinToken}`);
        }
      }, 1000);
    } catch (error) {
      console.error('[DEBUG] Round page - Submit error:', error);
      showToast('ネットワークエラーが発生しました', 'error');
      setIsSubmitting(false);
    }
  };

  const canEdit =
    sampleState === 'answering' || (sampleState === 'grading' && answer.status === 'draft');

  // ローカル自動保存（下書き）
  useEffect(() => {
    if (!canEdit) return;
    if (!localDraftKey) return;
    if (typeof window === 'undefined') return;

    if (autoSaveTimerRef.current) {
      window.clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    autoSaveTimerRef.current = window.setTimeout(() => {
      try {
        const payload: LocalDraft = { savedAt: Date.now(), answer };
        localStorage.setItem(localDraftKey, JSON.stringify(payload));
        setLocalDraft(payload);
        setLastLocalSavedAt(payload.savedAt);
      } catch {
        // ignore
      }
    }, 800);

    return () => {
      if (autoSaveTimerRef.current) {
        window.clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, [answer, canEdit, localDraftKey]);

  useEffect(() => {
    if (!localDraft) {
      setShowLocalDraftRestore(false);
      return;
    }
    const localSnap = JSON.stringify(normalizeAnswerForCompare(localDraft.answer));
    const serverSnap = serverAnswerSnapshotRef.current;
    if (!serverSnap) {
      setShowLocalDraftRestore(true);
      return;
    }
    setShowLocalDraftRestore(localSnap !== serverSnap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localDraft?.savedAt]);

  const guessFilled = useCallback(
    (key: ScoringItemKey, a: Answer): boolean => {
      const cfg = scoringFull.items[key];
      if (!cfg.enabled || cfg.maxPoints <= 0) return true;
      const t = (s?: string) => !!(s || '').trim();
      const n = (x?: string | number) => {
        if (x === null || x === undefined || x === '') return false;
        if (typeof x === 'number') return Number.isFinite(x);
        return String(x).trim() !== '' && Number.isFinite(parseFloat(String(x)));
      };
      switch (key) {
        case 'cask':
          return t(a.guessed_cask);
        case 'region':
          return t(a.guessed_region);
        case 'age':
          return cfg.inputType === 'choice' ? t(String(a.guessed_age ?? '')) : n(a.guessed_age);
        case 'abv':
          return cfg.inputType === 'choice' ? t(String(a.guessed_abv ?? '')) : n(a.guessed_abv);
        case 'distillery':
          return cfg.inputType === 'choice' ? t(a.guessed_distillery) : t(a.guessed_distillery);
        case 'other1':
          return cfg.inputType === 'choice' ? t(a.guessed_other1) : t(String(a.guessed_other1 ?? ''));
        case 'other2':
          return cfg.inputType === 'choice' ? t(a.guessed_other2) : t(String(a.guessed_other2 ?? ''));
        default:
          return true;
      }
    },
    [scoringFull],
  );

  const progress = useMemo(() => {
    const flavorFilled = (f?: { tier1_tags: string[]; tier2_terms: string[]; text?: string }) => {
      if (!f) return false;
      return (f.tier1_tags?.length || 0) > 0 || (f.tier2_terms?.length || 0) > 0 || !!(f.text || '').trim();
    };

    const guessItems: Array<{ key: string; label: string; ok: boolean; sectionId: string }> =
      SCORING_ITEM_KEYS.filter((key) => {
        const it = scoringFull.items[key];
        return it.enabled && it.maxPoints > 0;
      }).map((key) => ({
        key: `guess_${key}`,
        label: scoringFull.items[key].label || key,
        ok: guessFilled(key, answer),
        sectionId: 'section-guess',
      }));

    const items: Array<{ key: string; label: string; ok: boolean; sectionId: string }> = [
      ...guessItems,
      { key: 'nose', label: 'Nose', ok: flavorFilled(answer.nose), sectionId: 'section-nose' },
      { key: 'palate', label: 'Palate', ok: flavorFilled(answer.palate), sectionId: 'section-palate' },
      { key: 'finish', label: 'Finish', ok: flavorFilled(answer.finish), sectionId: 'section-finish' },
    ];

    const total = items.length;
    const done = items.filter((i) => i.ok).length;
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;
    const missing = items.filter((i) => !i.ok);
    return { total, done, percent, missing };
  }, [answer, scoringFull, guessFilled]);

  if (isLoading) {
    return <PageSkeleton rows={4} />;
  }

  if (sampleState && !canEdit) {
    return (
      <div className="min-h-screen bg-neutral-900 pt-16 pb-20 px-4">
        <PhaseBanner sessionState="running" mode="sequential" />
        <div className="max-w-2xl mx-auto mt-8">
          <div className="ui-card p-6">
            <h2 className="text-xl font-semibold text-stone-100 mb-4 tracking-tight">回答入力はできません</h2>
            <p className="text-stone-400 mb-4 leading-relaxed">
              {sampleState === 'pending' && 'このRoundはまだ開始されていません。'}
              {sampleState === 'grading' && 'このRoundは採点中です。'}
              {sampleState === 'revealed' && 'このRoundは終了しました。'}
              {sampleState === 'closed' && 'このRoundは終了しました。'}
            </p>
            <Button
              variant="primary"
              onClick={() => {
                if (joinToken) {
                  router.push(`/session/${joinToken}`);
                }
              }}
              className="w-full"
            >
              ホームに戻る
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-900 pt-16 pb-20 px-4">
      <PhaseBanner sessionState="running" mode="sequential" />

      <div className="max-w-2xl mx-auto mt-8 space-y-6">
        {sampleState === 'grading' && answer.status === 'draft' && (
          <div className="bg-bd-accent/10 border border-bd-accent/30 rounded-2xl p-4">
            <p className="text-amber-200 font-semibold">差し戻しされました</p>
            <p className="text-stone-300 text-sm mt-1 leading-relaxed">
              内容を修正して、再度「提出」してください。
            </p>
          </div>
        )}

        <div className="ui-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-stone-200">入力の進捗</div>
              <div className="text-xs text-stone-400 mt-1">
                入力は端末に自動保存されます
              </div>
            </div>
            <div className="text-right text-xs text-stone-400">
              {lastLocalSavedAt ? <div>下書き: {formatTime(lastLocalSavedAt)}</div> : <div>下書き: 未保存</div>}
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-stone-200">
                {progress.done}/{progress.total}
              </div>
              <div className="text-sm text-stone-300">{progress.percent}%</div>
            </div>
            <div className="mt-2 h-2 rounded-full bg-neutral-900/40 border border-white/10 overflow-hidden">
              <div className="h-full bg-bd-accent" style={{ width: `${progress.percent}%` }} />
            </div>
          </div>

          {progress.missing.length > 0 && (
            <div className="mt-4">
              <div className="text-xs font-semibold text-stone-400 mb-2">未入力（タップで移動）</div>
              <div className="flex flex-wrap gap-2">
                {progress.missing.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => document.getElementById(m.sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    className="px-3 py-2 rounded-full border border-white/10 bg-neutral-700 hover:bg-neutral-600 text-xs text-stone-200 min-h-[36px]"
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {showLocalDraftRestore && localDraft && (
            <div className="mt-4 p-4 rounded-xl bg-bd-accent/10 border border-bd-accent/30">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-semibold text-amber-200">ローカル下書きが見つかりました</div>
                  <div className="text-sm text-stone-300 mt-1">保存時刻: {formatTime(localDraft.savedAt)}</div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    onClick={() => {
                      setAnswer(localDraft.answer);
                      showToast('ローカル下書きを復元しました', 'success');
                    }}
                    className="min-w-[110px]"
                  >
                    復元
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      try {
                        if (localDraftKey) localStorage.removeItem(localDraftKey);
                      } catch {
                        // ignore
                      } finally {
                        setLocalDraft(null);
                        setShowLocalDraftRestore(false);
                        showToast('ローカル下書きを破棄しました', 'success');
                      }
                    }}
                    className="min-w-[110px]"
                  >
                    破棄
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        <h1 className="text-2xl md:text-3xl font-semibold text-stone-100 tracking-tight">回答入力</h1>

        <form className="space-y-6">
          {/* 推測入力 */}
          <div id="section-guess" className="ui-card p-6 space-y-4 scroll-mt-24">
            <h2 className="text-xl font-semibold text-stone-100 tracking-tight">推測</h2>
            {SCORING_ITEM_KEYS.map((key) => (
              <ScoringFieldBlock
                key={key}
                mode="guess"
                itemKey={key}
                cfg={scoringFull.items[key]}
                caskOptions={caskOptions}
                regionOptions={regionOptions}
                value={answer}
                disabled={!canEdit}
                onChange={(next) => setAnswer({ ...answer, ...next })}
              />
            ))}
          </div>

          {/* フレーバー入力（Nose / Palate / Finish） */}
          <FlavorTastingSections
            tier1Options={tier1Options}
            tier2Suggestions={tier2Suggestions}
            value={{
              nose: answer.nose,
              palate: answer.palate,
              finish: answer.finish,
            }}
            disabled={!canEdit}
            sectionIdPrefix="section"
            onChange={(flavor) =>
              setAnswer((prev) => ({
                ...prev,
                nose: flavor.nose !== undefined ? flavor.nose : prev.nose,
                palate: flavor.palate !== undefined ? flavor.palate : prev.palate,
                finish: flavor.finish !== undefined ? flavor.finish : prev.finish,
              }))
            }
          />

          {/* 点数入力 */}
          <div className="ui-card p-6">
            <label className="block text-base font-medium text-stone-100 mb-2">点数（0-100、任意）</label>
            <input
              name="score_0_100"
              type="number"
              min="0"
              max="100"
              value={answer.score_0_100 || ''}
              onChange={(e) =>
                setAnswer({ ...answer, score_0_100: parseInt(e.target.value) || undefined })
              }
              className="w-full px-4 py-3 bg-neutral-800 border border-white/10 text-stone-100 rounded-lg text-base min-h-[44px] focus:border-white/20 focus:ring-2 focus:ring-white/20 transition-all"
            />
          </div>

          {/* ボタン */}
          <div className="flex gap-4">
            <Button
              type="button"
              variant="secondary"
              onClick={handleSaveDraft}
              disabled={isSaving || isSubmitting}
              className="flex-1"
            >
              {isSaving ? '保存中...' : '下書き保存'}
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleSubmit}
              disabled={isSubmitting || isSaving}
              className="flex-1"
            >
              {isSubmitting ? '提出中...' : '提出する'}
            </Button>
          </div>
        </form>
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
