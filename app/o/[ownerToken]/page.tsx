"use client";

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PhaseBanner } from '@/components/common/PhaseBanner';
import { NextActionCard } from '@/components/common/NextActionCard';
import { SampleOrderList } from '@/components/common/SampleOrderList';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/common/Toast';
import { Toast } from '@/components/common/Toast';
import { copyToClipboard, openLineJoinInviteShare, setOwnerToken as persistOwnerToken } from '@/lib/utils';
import { buildResultsPageUrl } from '@/lib/results-share';
import { normalizeScoringConfig, mergeLegacyOptionColumnsIntoScoring, type FullScoringConfig, DEFAULT_CASK_CHOICE_OPTIONS, DEFAULT_REGION_CHOICE_OPTIONS } from '@/lib/scoring-schema';
import { resolvedTier1NightingaleColors, type Tier1NightingaleRgb } from '@/lib/flavor-chart-colors';
import { DEFAULT_FLAVOR_CHART, ensureTier1NightingaleVisibleMap } from '@/lib/default-flavor-chart';
import { ScoringSettingsPanel } from '@/components/settings/ScoringSettingsPanel';
import { OwnerSelfJoinForm } from '@/components/common/OwnerSelfJoinForm';
import { disambiguatedDisplayName } from '@/lib/participant-display';
import { defaultBottleLabel } from '@/lib/default-bottle-label';
import { displayBottleCount } from '@/lib/display-count';

/** settings/save 前までの旧フラット配点（正規化して保存される） */
const LEGACY_DEFAULT_SCORING_FLAT = {
  cask: 5,
  region: 2,
  age: 3,
  abv: 3,
  distillery: 5,
  age_penalty_per_year: 1,
  abv_penalty_per_percent: 2,
};

const DEFAULT_OWNER_SCORING = mergeLegacyOptionColumnsIntoScoring(
  LEGACY_DEFAULT_SCORING_FLAT,
  [...DEFAULT_CASK_CHOICE_OPTIONS],
  [...DEFAULT_REGION_CHOICE_OPTIONS],
);

interface Session {
  id: string;
  title: string;
  mode: 'sequential' | 'simultaneous';
  state: 'registering' | 'ordering' | 'running' | 'aggregating' | 'published' | 'closed';
  owner_token: string;
  join_token: string;
  join_code?: string | null;
  /** true のとき全員が結果を閲覧可能。false のときは owner_token 付きでのみ閲覧 */
  public_results?: boolean;
  results_ranking_image_url?: string | null;
}

interface Participant {
  id: string;
  display_name: string;
  is_attending: boolean;
  brought_count: number;
}

interface Sample {
  id: string;
  label: string;
  sort_order: number;
  state: string;
  presenter_participant_id?: string;
}

interface AppSettings {
  id?: string | null;
  name?: string;
  cask_options: string[];
  region_options: string[];
  flavor_chart: {
    version: string;
    tier1: string[];
    tier2_suggestions: Record<string, string[]>;
    /** フレーバー・ナイチンゲール・ローズ・チャートの Tier1 ベース色 */
    tier1_nightingale_colors?: Record<string, Tier1NightingaleRgb>;
    /** Tier1 ごとにナイチンゲール・チャートへ載せるか（false＝集計のみ・チャート軸から除外） */
    tier1_nightingale_visible?: Record<string, boolean>;
    /** レガシー: tier1_nightingale_visible が無いとき「その他」だけに効く */
    include_other_in_nightingale_chart?: boolean;
  };
  scoring?: FullScoringConfig;
}

const defaultOwnerFlavorChart = (): AppSettings['flavor_chart'] => {
  const base: AppSettings['flavor_chart'] = {
    ...DEFAULT_FLAVOR_CHART,
    tier1_nightingale_colors: resolvedTier1NightingaleColors(DEFAULT_FLAVOR_CHART),
  };
  return {
    ...base,
    tier1_nightingale_visible: ensureTier1NightingaleVisibleMap(base),
  };
};

interface SettingsTemplate {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export default function OwnerPage() {
  const params = useParams();
  const router = useRouter();
  const [ownerToken, setOwnerToken] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'session' | 'settings'>('session');

  useEffect(() => {
    if (params && typeof params.ownerToken === 'string') {
      setOwnerToken(params.ownerToken);
    }
  }, [params]);
  
  const [joinToken, setJoinToken] = useState<string | null>(null);

  useEffect(() => {
    if (joinToken && ownerToken) {
      persistOwnerToken(joinToken, ownerToken);
    }
  }, [joinToken, ownerToken]);
  
  // クエリからjoin_tokenを取得（クライアントでのみ取得）
  // 未指定の場合はowner_tokenからjoin_tokenを取得
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const searchParams = new URLSearchParams(window.location.search);
    const joinTokenFromUrl = searchParams.get('join_token');
    if (joinTokenFromUrl) {
      setJoinToken(joinTokenFromUrl);
      return;
    }

    if (!ownerToken) return;
    const fetchJoinToken = async () => {
      try {
        const response = await fetch(`/api/session/get?owner_token=${ownerToken}`);
        const result = await response.json();
        if (response.ok && result.data?.join_token) {
          setJoinToken(result.data.join_token);
        }
      } catch (error) {
        console.error('Fetch join_token error:', error);
      }
    };
    fetchJoinToken();
  }, [ownerToken]);

  // オーナーページから参加ページに遷移する際、オーナートークンを保存
  useEffect(() => {
    if (joinToken && ownerToken && typeof window !== 'undefined') {
      // localStorageにオーナートークンを保存
      localStorage.setItem(`bd:owner_token:${joinToken}`, ownerToken);
    }
  }, [joinToken, ownerToken]);

  const { toast, showToast, hideToast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const ownerParticipantPeers = useMemo(
    () => participants.map((p) => ({ participant_id: p.id, display_name: p.display_name })),
    [participants],
  );
  const [samples, setSamples] = useState<Sample[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // 設定関連のstate
  const [settingsTemplates, setSettingsTemplates] = useState<SettingsTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [editedSettings, setEditedSettings] = useState<AppSettings | null>(null);
  const [settingName, setSettingName] = useState<string>('デフォルト設定');
  const [isSavingResultsVisibility, setIsSavingResultsVisibility] = useState(false);

  useEffect(() => {
    if (!joinToken) return;
    loadSession();
    
    // セッション状態を定期的に更新（ポーリング）
    // Round終了などの状態変更を自動的に反映
    const interval = setInterval(() => {
      loadSession();
    }, 3000); // 3秒ごとに更新
    
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadSession を依存に入れるとポーリングが毎レンダーでリセットされる
  }, [joinToken]);

  // Session 開始後は設定タブへ誘導しない（セッション進行に集中）
  useEffect(() => {
    if (!session) return;
    const settingsAllowed = session.state === 'registering' || session.state === 'ordering';
    if (!settingsAllowed && activeTab === 'settings') {
      setActiveTab('session');
    }
  }, [session, activeTab]);

  useEffect(() => {
    
    if (ownerToken && session?.id) {
      loadParticipants();
      
      // Sample一覧も読み込む（registering状態以外）
      if (session.state !== 'registering') {
        loadSamples();
      }
      
      // すべての状態で定期的に参加者一覧とSample一覧を更新（ポーリング）
      // Round終了などの状態変更を自動的に反映
      const interval = setInterval(() => {
        loadParticipants();
        if (session.state !== 'registering') {
          loadSamples();
        }
      }, 3000); // 3秒ごとに更新
      
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadParticipants/loadSamples は ownerToken ベースで十分
  }, [ownerToken, session?.id, session?.state]);

  const loadSession = async () => {
    try {
      const response = await fetch(`/api/session/get?join_token=${joinToken}`);
      const result = await response.json();

      if (!response.ok) {
        showToast(result.error || 'Session取得に失敗しました', 'error');
        return;
      }

      setSession(result.data);
      // loadParticipantsはownerTokenが設定された後にuseEffectで呼ばれる
      // Sample一覧も常に読み込む（registering状態でもSampleが存在する可能性がある）
      if (ownerToken) {
        await loadSamples();
      }
    } catch (error) {
      console.error('Load error:', error);
      showToast('ネットワークエラーが発生しました', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetResultsVisibility = async (publicResults: boolean) => {
    if (!ownerToken) return;
    setIsSavingResultsVisibility(true);
    try {
      const response = await fetch('/api/owner/set-results-visibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner_token: ownerToken, public_results: publicResults }),
      });
      const result = await response.json();
      if (!response.ok) {
        showToast(result.error || '公開範囲の更新に失敗しました', 'error');
        return;
      }
      showToast(publicResults ? '結果を全員に公開しました' : '結果を限定公開にしました', 'success');
      await loadSession();
    } catch (e) {
      console.error(e);
      showToast('ネットワークエラーが発生しました', 'error');
    } finally {
      setIsSavingResultsVisibility(false);
    }
  };

  const loadParticipants = async () => {
    
    if (!ownerToken) {
      return;
    }
    
    try {
      
      const response = await fetch(`/api/owner/get-participants?owner_token=${ownerToken}`);
      const result = await response.json();


      if (!response.ok) {
        console.error('Load participants error:', result.error);
        return;
      }

      setParticipants(result.data.participants || []);
      
    } catch (error) {
      console.error('Load participants error:', error);
    }
  };

  const loadSamples = async () => {
    if (!ownerToken) return;
    
    try {
      // Sample一覧を取得（owner_tokenで認証）
      const response = await fetch(`/api/owner/get-samples?owner_token=${ownerToken}`);
      const result = await response.json();
      
      if (response.ok && result.data?.samples) {
        setSamples(result.data.samples);
      }
    } catch (error) {
      console.error('Load samples error:', error);
    }
  };

  const handleCloseRegistration = async () => {
    if (typeof window !== 'undefined') {
      const ok = window.confirm(
        '参加登録を締め切り、順番決めに進みますか？\n\n' +
          'このページの「あなた（オーナー）の参加登録」をまだ行っていない場合、あなたは不参加（進行・操作のみ）として扱われます。',
      );
      if (!ok) return;
    }
    try {
      // 最新のセッション状態を再取得して検証
      const sessionCheckResponse = await fetch(`/api/session/get?join_token=${joinToken}`);
      const sessionCheckResult = await sessionCheckResponse.json();
      
      if (!sessionCheckResponse.ok || !sessionCheckResult.data) {
        showToast('セッション状態の確認に失敗しました', 'error');
        await loadSession(); // 状態を再読み込み
        return;
      }
      
      if (sessionCheckResult.data.state !== 'registering') {
        showToast(`現在の状態では実行できません。現在の状態: ${sessionCheckResult.data.state}`, 'error');
        await loadSession(); // 状態を再読み込み
        return;
      }
      
      const response = await fetch('/api/owner/close-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner_token: ownerToken }),
      });

      const result = await response.json();

      if (!response.ok) {
        showToast(result.error || '登録締切に失敗しました', 'error');
        await loadSession(); // 状態を再読み込み
        return;
      }

      showToast('登録を締め切りました', 'success');
      
      // レスポンスからsamplesとparticipantsを取得
      if (result.data.samples) {
        setSamples(result.data.samples);
      }
      if (result.data.participants) {
        setParticipants(result.data.participants);
      }
      
      await loadSession();
    } catch (error) {
      console.error('Close registration error:', error);
      showToast('ネットワークエラーが発生しました', 'error');
      await loadSession(); // エラー時も状態を再読み込み
    }
  };

  const [selectedSettingForSession, setSelectedSettingForSession] = useState<string | null>(null);
  const [isStartingSession, setIsStartingSession] = useState(false);

  const handleStartSession = async () => {
    if (isStartingSession) return;
    if (typeof window !== 'undefined') {
      const ok = window.confirm('Sessionを開始しますか？\n（参加者が回答入力を開始できるようになります）');
      if (!ok) return;
    }

    setIsStartingSession(true);
    try {
      // 最新のセッション状態を再取得して検証
      const sessionCheckResponse = await fetch(`/api/session/get?join_token=${joinToken}`);
      const sessionCheckResult = await sessionCheckResponse.json();
      
      if (!sessionCheckResponse.ok || !sessionCheckResult.data) {
        showToast('セッション状態の確認に失敗しました', 'error');
        await loadSession(); // 状態を再読み込み
        return;
      }
      
      if (sessionCheckResult.data.state !== 'ordering') {
        showToast(`現在の状態では実行できません。現在の状態: ${sessionCheckResult.data.state}`, 'error');
        await loadSession(); // 状態を再読み込み
        return;
      }
      
      const response = await fetch('/api/owner/start-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner_token: ownerToken,
          setting_id: selectedSettingForSession || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        showToast(result.error || 'Session開始に失敗しました', 'error');
        await loadSession(); // 状態を再読み込み
        return;
      }

      showToast('Sessionを開始しました', 'success');
      // セッション状態を更新
      await loadSession();
      // 少し遅延してから再度更新（状態遷移が反映されるまで）
      setTimeout(() => {
        loadSession();
      }, 1000);
    } catch (error) {
      console.error('Start session error:', error);
      showToast('ネットワークエラーが発生しました', 'error');
      await loadSession(); // エラー時も状態を再読み込み
    } finally {
      setIsStartingSession(false);
    }
  };

  const handleForceClose = async () => {
    // 確認ダイアログ
    const confirmed = window.confirm(
      'イベントを強制終了しますか？\n\nこの操作は取り消せません。'
    );

    if (!confirmed) {
      return;
    }

    try {
      // 最新のセッション状態を再取得して検証（closed状態でないことを確認）
      const sessionCheckResponse = await fetch(`/api/session/get?join_token=${joinToken}`);
      const sessionCheckResult = await sessionCheckResponse.json();
      
      if (!sessionCheckResponse.ok || !sessionCheckResult.data) {
        showToast('セッション状態の確認に失敗しました', 'error');
        await loadSession(); // 状態を再読み込み
        return;
      }
      
      if (sessionCheckResult.data.state === 'closed') {
        showToast('イベントは既に終了しています', 'error');
        await loadSession(); // 状態を再読み込み
        return;
      }
      
      const response = await fetch('/api/owner/force-close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner_token: ownerToken }),
      });

      const result = await response.json();

      if (!response.ok) {
        showToast(result.error || '強制終了に失敗しました', 'error');
        await loadSession(); // 状態を再読み込み
        return;
      }

      showToast('イベントを強制終了しました', 'success');
      await loadSession();
    } catch (error) {
      console.error('Force close error:', error);
      showToast('ネットワークエラーが発生しました', 'error');
      await loadSession(); // エラー時も状態を再読み込み
    }
  };

  // 設定テンプレート一覧読み込み
  const loadSettingsTemplates = async () => {
    if (!ownerToken) return;

    try {
      const response = await fetch(`/api/settings/list?owner_token=${ownerToken}`);
      const result = await response.json();

      if (!response.ok) {
        console.error('Settings list fetch error:', result.error);
        return;
      }

      setSettingsTemplates(result.data.settings || []);
    } catch (error) {
      console.error('Load settings templates error:', error);
    }
  };

  // 設定読み込み
  const loadSettings = async (templateId?: string | null) => {
    if (!ownerToken) return;

    setIsLoadingSettings(true);
    try {
      const url = templateId
        ? `/api/settings/get?owner_token=${ownerToken}&id=${templateId}`
        : `/api/settings/get?owner_token=${ownerToken}`;
      const response = await fetch(url);
      const result = await response.json();

      if (!response.ok) {
        showToast(result.error || '設定の取得に失敗しました', 'error');
        return;
      }

      const data = result.data as AppSettings;
      const scoring = mergeLegacyOptionColumnsIntoScoring(
        data.scoring ?? LEGACY_DEFAULT_SCORING_FLAT,
        data.cask_options,
        data.region_options,
      );
      setEditedSettings({
        ...data,
        scoring,
        cask_options: scoring.items.cask.options ?? [],
        region_options: scoring.items.region.options ?? [],
        flavor_chart: {
          ...data.flavor_chart,
          tier1_nightingale_visible: ensureTier1NightingaleVisibleMap(data.flavor_chart),
        },
      });
      setSettingName(data.name || 'デフォルト設定');
      setSelectedTemplateId(data.id || null);
    } catch (error) {
      console.error('Load settings error:', error);
      showToast('ネットワークエラーが発生しました', 'error');
    } finally {
      setIsLoadingSettings(false);
    }
  };

  // 設定保存
  const handleSaveSettings = async () => {
    if (!ownerToken || !editedSettings || !settingName.trim()) {
      showToast('設定名を入力してください', 'error');
      return;
    }

    setIsSavingSettings(true);
    try {
      const scoringNorm = normalizeScoringConfig(
        editedSettings.scoring ?? LEGACY_DEFAULT_SCORING_FLAT,
      );
      const cask_options = scoringNorm.items.cask.options ?? [];
      const region_options = scoringNorm.items.region.options ?? [];
      const fc = editedSettings.flavor_chart;
      const visSynced = ensureTier1NightingaleVisibleMap(fc);
      const flavor_chart = {
        ...fc,
        tier1_nightingale_visible: visSynced,
        include_other_in_nightingale_chart: fc.tier1.includes('その他') ? visSynced['その他'] === true : false,
      };

      const response = await fetch('/api/settings/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner_token: ownerToken,
          id: selectedTemplateId || undefined,
          name: settingName.trim(),
          cask_options,
          region_options,
          flavor_chart,
          scoring: scoringNorm,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        showToast(result.error || '設定保存に失敗しました', 'error');
        setIsSavingSettings(false);
        return;
      }

      // 保存成功後、最新の設定を反映
      showToast('設定を保存しました', 'success');
      
      // 保存されたデータを即座に反映
      if (result.data) {
        const data = result.data as AppSettings;
        const scoring = mergeLegacyOptionColumnsIntoScoring(
          data.scoring ?? LEGACY_DEFAULT_SCORING_FLAT,
          data.cask_options,
          data.region_options,
        );
        setEditedSettings({
          ...data,
          scoring,
          cask_options: scoring.items.cask.options ?? [],
          region_options: scoring.items.region.options ?? [],
          flavor_chart: {
            ...data.flavor_chart,
            tier1_nightingale_visible: ensureTier1NightingaleVisibleMap(data.flavor_chart),
          },
        });
        setSettingName(result.data.name);
        setSelectedTemplateId(result.data.id);
      }
      
      // テンプレート一覧を再読み込み
      await loadSettingsTemplates();
    } catch (error) {
      console.error('Save settings error:', error);
      showToast('ネットワークエラーが発生しました', 'error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // 設定削除
  const handleDeleteSettings = async () => {
    if (!ownerToken || !selectedTemplateId) {
      showToast('削除する設定を選択してください', 'error');
      return;
    }

    // デフォルト設定は削除できない
    if (settingName === 'デフォルト設定' || !selectedTemplateId) {
      showToast('デフォルト設定は削除できません', 'error');
      return;
    }

    // 確認ダイアログ
    if (!confirm(`「${settingName}」を削除してもよろしいですか？`)) {
      return;
    }

    try {
      const response = await fetch(`/api/settings/delete?owner_token=${ownerToken}&id=${selectedTemplateId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        showToast(result.error || '設定の削除に失敗しました', 'error');
        return;
      }

      // 削除成功後、デフォルト設定に戻る
      showToast('設定を削除しました', 'success');
      
      // デフォルト設定を読み込む
      const defaultSettings: AppSettings = {
        id: null,
        name: 'デフォルト設定',
        cask_options: DEFAULT_OWNER_SCORING.items.cask.options ?? [],
        region_options: DEFAULT_OWNER_SCORING.items.region.options ?? [],
        flavor_chart: defaultOwnerFlavorChart(),
        scoring: DEFAULT_OWNER_SCORING,
      };
      setEditedSettings(defaultSettings);
      setSettingName('デフォルト設定');
      setSelectedTemplateId(null);
      
      // テンプレート一覧を再読み込み
      await loadSettingsTemplates();
    } catch (error) {
      console.error('Delete settings error:', error);
      showToast('ネットワークエラーが発生しました', 'error');
    }
  };

  // 設定タブがアクティブになったときに設定を読み込む
  useEffect(() => {
    if (activeTab === 'settings' && ownerToken) {
      loadSettingsTemplates();
      loadSettings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 設定読み込みはタブ／ownerToken 切替時のみ
  }, [activeTab, ownerToken]);

  if (joinToken === null) {
    return (
      <div className="min-h-screen bg-neutral-900 pt-8 pb-20 px-4">
        <div className="max-w-md mx-auto mt-8">
          <p className="text-center text-stone-400">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!joinToken) {
    return (
      <div className="min-h-screen bg-neutral-900 pt-8 pb-20 px-4">
        <div className="max-w-md mx-auto mt-8 space-y-4">
          <p className="text-center text-stone-400">join_tokenが指定されていません。</p>
          <Button
            variant="secondary"
            onClick={() => router.push('/')}
            className="w-full"
          >
            ホームに戻る
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading || !session) {
    return (
      <div className="min-h-screen bg-neutral-900 pt-8 pb-20 px-4">
        <div className="max-w-md mx-auto mt-8">
          <p className="text-center text-stone-400">読み込み中...</p>
        </div>
      </div>
    );
  }

  const joinUrl = typeof window !== 'undefined' ? `${window.location.origin}/s/${joinToken}` : '';
  const settingsTabAllowed =
    session.state === 'registering' || session.state === 'ordering';

  return (
    <div className="min-h-screen bg-neutral-900 pt-8 pb-20 px-4">
      <PhaseBanner
        sessionState={session.state}
        mode={session.mode}
      />

      <div className="max-w-2xl mx-auto mt-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-semibold text-stone-100 tracking-tight">{session.title}</h1>
        </div>

        {/* タブ */}
        <div className="flex gap-2 border-b border-white/10">
          <button
            type="button"
            onClick={() => setActiveTab('session')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'session'
                ? 'text-bd-accent border-b-2 border-bd-accent'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            セッション管理
          </button>
          {settingsTabAllowed && (
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'settings'
                  ? 'text-bd-accent border-b-2 border-bd-accent'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              設定
            </button>
          )}
        </div>

        {/* セッション管理タブ */}
        {activeTab === 'session' && (
          <>

        {session.state === 'registering' && (
          <>
            <OwnerSelfJoinForm
              joinToken={joinToken}
              showToast={showToast}
              onRegistered={() => {
                if (session.id) void loadParticipants();
              }}
            />

            {/* URLコピーボタン */}
            <div className="bg-neutral-800 rounded-2xl shadow-xl shadow-black/40 border border-white/10 p-6">
              <h2 className="text-xl font-semibold text-stone-100 mb-4 tracking-tight">参加URL</h2>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="url"
                  readOnly
                  value={joinUrl}
                  className="flex-1 min-w-0 px-4 py-2.5 bg-neutral-700 border border-white/10 rounded-xl text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-bd-accent/50 focus:border-bd-accent/50 transition-all"
                />
                <div className="flex gap-2 shrink-0">
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      const copied = await copyToClipboard(joinUrl);
                      if (copied) {
                        showToast('URLをクリップボードにコピーしました', 'success');
                      } else {
                        showToast('コピーに失敗しました', 'error');
                      }
                    }}
                    className="px-5 sm:px-6 flex-1 sm:flex-initial"
                  >
                    コピー
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      if (openLineJoinInviteShare(joinUrl, session.title)) {
                        showToast('LINEの送信画面を開きました', 'success');
                      } else {
                        showToast('ポップアップがブロックされました。許可してから再度お試しください', 'error');
                      }
                    }}
                    className="px-5 sm:px-6 flex-1 sm:flex-initial whitespace-nowrap border-[#06C755]/40 text-[#86efac] hover:bg-[#06C755]/10"
                    aria-label="LINEで参加URLを送る"
                  >
                    LINEで送る
                  </Button>
                </div>
              </div>
              <p className="text-stone-500 text-xs mt-2 leading-relaxed">
                「LINEで送る」は公式の共有画面を開きます。LINE未ログインの場合はログイン後に相手を選んで送信してください。
              </p>
            </div>

            <div className="bg-neutral-800 rounded-2xl shadow-xl shadow-black/40 border border-white/10 p-6">
              <Button
                variant="primary"
                onClick={handleCloseRegistration}
                disabled={participants.length === 0}
                className="w-full"
              >
                {participants.length === 0 ? '参加者がいません' : '参加登録を締め切る'}
              </Button>
              <p className="text-stone-500 text-sm mt-3 leading-relaxed">
                他の参加者の参加が終わったら締め切ってください。オーナー本人は上のフォームで登録しないまま締め切ると不参加（進行のみ）です。
              </p>
            </div>
            
            {/* 参加コード表示 */}
            {session?.join_code && (
              <div className="bg-neutral-800 rounded-2xl shadow-xl shadow-black/40 border border-white/10 p-6">
                <h2 className="text-xl font-semibold text-stone-100 mb-4 tracking-tight">参加コード</h2>
                <p className="text-stone-400 mb-4 leading-relaxed text-sm">
                  参加コードを共有すれば、URLをコピーせずに参加できます。
                </p>
                <div className="flex gap-2">
                  <div className="flex-1 px-4 py-2.5 bg-neutral-700 border border-white/10 rounded-xl text-stone-100 text-2xl font-mono font-semibold text-center tracking-wider">
                    {session.join_code}
                  </div>
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      const copied = await copyToClipboard(session.join_code || '');
                      if (copied) {
                        showToast('参加コードをクリップボードにコピーしました', 'success');
                      } else {
                        showToast('コピーに失敗しました', 'error');
                      }
                    }}
                    className="px-6"
                  >
                    コピー
                  </Button>
                </div>
                <p className="text-stone-400 mt-3 text-sm">
                  参加者は <a href="/join" className="text-bd-accent hover:underline" target="_blank" rel="noopener noreferrer">参加コードで参加</a> ページでこのコードを入力できます。
                </p>
              </div>
            )}
            
            {/* デバッグ用：模擬参加者（開発環境のみ） */}
            {process.env.NODE_ENV !== 'production' && (
              <div className="bg-neutral-800 rounded-2xl shadow-xl shadow-black/40 border border-white/10 p-6 border-bd-accent/30">
                <h2 className="text-xl font-semibold text-stone-100 mb-4 tracking-tight">デバッグ用：模擬参加者</h2>
                <p className="text-stone-400 mb-4 leading-relaxed text-sm">
                  テスト用に模擬参加者を簡単に作成できます。
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-stone-300 mb-1">
                      表示名
                    </label>
                    <input
                      type="text"
                      id="mock-participant-name"
                      placeholder="参加者名"
                      className="w-full px-4 py-2.5 bg-neutral-700 border border-white/10 rounded-xl text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-bd-accent/50 focus:border-bd-accent/50 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-300 mb-1">
                      持参ボトル数
                    </label>
                    <input
                      type="number"
                      id="mock-participant-bottles"
                      min="0"
                      defaultValue="0"
                      className="w-full px-4 py-2.5 bg-neutral-700 border border-white/10 rounded-xl text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-bd-accent/50 focus:border-bd-accent/50 transition-all"
                    />
                  </div>
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      const nameInput = document.getElementById('mock-participant-name') as HTMLInputElement;
                      const bottlesInput = document.getElementById('mock-participant-bottles') as HTMLInputElement;
                      
                      const displayName = nameInput.value.trim() || `参加者${participants.length + 1}`;
                      const bottleCount = parseInt(bottlesInput.value) || 0;
                      
                      try {
                        const response = await fetch('/api/participants/create-mock', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            join_token: joinToken,
                            display_name: displayName,
                            brought_count: bottleCount,
                            bottle_labels: Array.from({ length: bottleCount }, (_, i) =>
                              defaultBottleLabel(displayName, i),
                            ),
                          }),
                        });

                        const result = await response.json();

                        if (!response.ok) {
                          showToast(result.error || '模擬参加者の作成に失敗しました', 'error');
                          return;
                        }

                        showToast(`模擬参加者「${displayName}」を作成しました`, 'success');
                        
                        // 参加者一覧を更新
                        await loadParticipants();
                        
                        // 入力フィールドをクリア
                        nameInput.value = '';
                        bottlesInput.value = '0';
                      } catch (error) {
                        console.error('Create mock participant error:', error);
                        showToast('ネットワークエラーが発生しました', 'error');
                      }
                    }}
                    className="w-full"
                  >
                    模擬参加者を作成
                  </Button>
                </div>
              </div>
            )}
            
            {participants.length > 0 && (
              <div className="bg-neutral-800 rounded-2xl shadow-xl shadow-black/40 border border-white/10 p-6">
                <h2 className="text-xl font-semibold text-stone-100 mb-4 tracking-tight">参加者一覧 ({participants.length}人)</h2>
                <div className="space-y-3">
                  {participants.map((participant) => (
                    <div key={participant.id} className="flex items-center justify-between py-3 border-b border-white/10">
                      <div>
                        <span className="font-medium text-stone-100">
                          {disambiguatedDisplayName(
                            participant.display_name,
                            participant.id,
                            ownerParticipantPeers,
                          )}
                        </span>
                        {participant.brought_count > 0 && (
                          <span className="ml-2 text-sm text-stone-400">
                            (持ち込み: {displayBottleCount(participant.brought_count)}本)
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {participants.length === 0 && (
              <div className="bg-neutral-800 rounded-2xl shadow-xl shadow-black/40 border border-white/10 p-8 text-center">
                <p className="text-stone-400">参加者がいません</p>
              </div>
            )}

            <div className="bg-red-500/15 border border-red-400/30 rounded-2xl shadow-xl shadow-black/40 p-6">
              <h3 className="text-lg font-semibold text-red-300 mb-3">緊急操作</h3>
              <Button
                variant="secondary"
                onClick={handleForceClose}
                className="w-full bg-red-500 hover:bg-red-600 text-white"
              >
                イベントを強制終了する
              </Button>
            </div>
          </>
        )}

        {session.state === 'ordering' && (
          <div className="space-y-6">
            {/* 設定テンプレート選択 */}
            <div className="bg-neutral-800 rounded-2xl shadow-xl shadow-black/40 border border-white/10 p-6 space-y-4">
              <h3 className="text-lg font-semibold text-stone-100 tracking-tight">セッション開始時の設定</h3>
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-2">使用する設定テンプレート</label>
                <select
                  value={selectedSettingForSession || ''}
                  onChange={(e) => setSelectedSettingForSession(e.target.value || null)}
                  className="w-full px-4 py-2 bg-neutral-700 border border-white/10 text-stone-100 rounded-lg focus:border-white/20 focus:ring-2 focus:ring-white/20 transition-all"
                >
                  <option value="">デフォルト設定を使用</option>
                  {settingsTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-sm text-stone-400">
                  設定テンプレートを選択すると、その設定がセッション開始時にスナップショットとして保存されます。
                </p>
              </div>
            </div>

            <NextActionCard
              title="順番を決めてください"
              description="Sampleの順番をドラッグ&ドロップで変更できます。"
              primaryAction={{
                label: isStartingSession ? '開始中...' : 'Sessionを開始する',
                onClick: handleStartSession,
                disabled: samples.length === 0 || isStartingSession,
                disabledReason: samples.length === 0 ? 'Sampleがありません' : undefined,
              }}
            />

            {samples.length > 0 && (
              <SampleOrderList
                samples={samples}
                participants={participants}
                ownerToken={ownerToken}
                onSamplesChange={setSamples}
                onError={(error) => showToast(error, 'error')}
                onSuccess={() => showToast('順番を保存しました', 'success')}
              />
            )}

            <div className="bg-red-500/15 border border-red-400/30 rounded-2xl shadow-xl shadow-black/40 p-6">
              <h3 className="text-lg font-semibold text-red-300 mb-3">緊急操作</h3>
              <Button
                variant="secondary"
                onClick={handleForceClose}
                className="w-full bg-red-500 hover:bg-red-600 text-white"
              >
                イベントを強制終了する
              </Button>
            </div>
          </div>
        )}

        {session.state === 'running' && (
          <div className="space-y-6">
            <div className="bg-neutral-800 rounded-2xl shadow-xl shadow-black/40 border border-white/10 p-6">
              <h2 className="text-xl font-semibold text-stone-100 mb-4 tracking-tight">Session進行中</h2>
              <p className="text-stone-400 leading-relaxed">現在、回答入力フェーズです。</p>
            </div>

            {joinToken && (
              <div className="bg-neutral-800 rounded-2xl shadow-xl shadow-black/40 border border-bd-accent/30 p-6">
                <h3 className="text-lg font-semibold text-stone-100 mb-2 tracking-tight">回答・プレゼン（参加者側）</h3>
                <p className="text-sm text-stone-400 mb-4 leading-relaxed">
                  この画面は進行管理用です。オーナー本人もゲームに参加する場合は、セッション参加者画面で回答入力やPresenterパネルへ進んでください（同じブラウザなら参加トークンを共有します）。
                </p>
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => router.push(`/session/${joinToken}`)}
                >
                  このタブでセッションを開く
                </Button>
                <Button
                  variant="secondary"
                  className="w-full mt-2"
                  onClick={() => window.open(`/session/${joinToken}`, '_blank', 'noopener,noreferrer')}
                >
                  別タブで開く
                </Button>
              </div>
            )}

            {/* 逐次モードでrevealed状態のサンプルがある場合、結果ページへのリンクを表示 */}
            {session.mode === 'sequential' && samples.some((s) => s.state === 'revealed') && (
              <div className="bg-emerald-500/15 border border-emerald-400/30 rounded-2xl shadow-xl shadow-black/40 p-6">
                <h3 className="text-lg font-semibold text-emerald-300 mb-3">ラウンド結果</h3>
                <p className="text-stone-400 mb-4 leading-relaxed">
                  終了したラウンドの結果を確認できます。
                </p>
                {samples
                  .filter((s) => s.state === 'revealed')
                  .map((sample) => (
                    <Button
                      key={sample.id}
                      variant="primary"
                      onClick={() => {
                        if (joinToken) {
                          router.push(`/session/${joinToken}/round-result/${sample.id}`);
                        }
                      }}
                      className="w-full mb-2"
                    >
                      Sample {sample.label} の結果を見る
                    </Button>
                  ))}
              </div>
            )}

            <div className="bg-red-500/15 border border-red-400/30 rounded-2xl shadow-xl shadow-black/40 p-6">
              <h3 className="text-lg font-semibold text-red-300 mb-3">緊急操作</h3>
              <Button
                variant="secondary"
                onClick={handleForceClose}
                className="w-full bg-red-500 hover:bg-red-600 text-white"
              >
                イベントを強制終了する
              </Button>
            </div>
          </div>
        )}

        {session.state === 'aggregating' && (
          <div className="space-y-6">
            <NextActionCard
              title="集計完了"
              description="結果を確認して公開してください"
              primaryAction={{
                label: '結果を公開する',
                onClick: async () => {
                  try {
                    // 最新のセッション状態を再取得して検証
                    const sessionCheckResponse = await fetch(`/api/session/get?join_token=${joinToken}`);
                    const sessionCheckResult = await sessionCheckResponse.json();
                    
                    if (!sessionCheckResponse.ok || !sessionCheckResult.data) {
                      showToast('セッション状態の確認に失敗しました', 'error');
                      await loadSession(); // 状態を再読み込み
                      return;
                    }
                    
                    if (sessionCheckResult.data.state !== 'aggregating') {
                      showToast(`現在の状態では実行できません。現在の状態: ${sessionCheckResult.data.state}`, 'error');
                      await loadSession(); // 状態を再読み込み
                      return;
                    }
                    
                    const response = await fetch('/api/owner/publish', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ owner_token: ownerToken }),
                    });

                    const result = await response.json();

                    if (!response.ok) {
                      showToast(result.error || '公開に失敗しました', 'error');
                      await loadSession(); // 状態を再読み込み
                      return;
                    }

                    showToast('結果を公開しました', 'success');
                    await loadSession();
                  } catch (error) {
                    console.error('Publish error:', error);
                    showToast('ネットワークエラーが発生しました', 'error');
                    await loadSession(); // エラー時も状態を再読み込み
                  }
                },
              }}
            />

            <div className="bg-red-500/15 border border-red-400/30 rounded-2xl shadow-xl shadow-black/40 p-6">
              <h3 className="text-lg font-semibold text-red-300 mb-3">緊急操作</h3>
              <Button
                variant="secondary"
                onClick={handleForceClose}
                className="w-full bg-red-500 hover:bg-red-600 text-white"
              >
                イベントを強制終了する
              </Button>
            </div>
          </div>
        )}

        {session.state === 'published' && (
          <div className="space-y-6">
            <div className="bg-neutral-800 rounded-2xl shadow-xl shadow-black/40 border border-white/10 p-6">
              <h2 className="text-xl font-semibold text-stone-100 mb-4 tracking-tight">結果公開済み</h2>
              <Button
                variant="primary"
                onClick={() => {
                  if (joinToken) {
                    router.push(`/session/${joinToken}/results`);
                  }
                }}
                className="w-full"
              >
                結果を見る
              </Button>
            </div>

            <div className="bg-neutral-800 rounded-2xl shadow-xl shadow-black/40 border border-white/10 p-6 space-y-4">
              <h3 className="text-lg font-semibold text-stone-100 tracking-tight">結果の共有</h3>
              <p className="text-sm text-stone-400 leading-relaxed">
                結果公開後は、下のURLからいつでも最終結果を閲覧できます。順位表画像の公開URLは結果ページから発行できます。
              </p>
              {joinToken && typeof window !== 'undefined' && (
                <div className="space-y-2">
                  <p className="text-xs text-stone-500">結果ページ</p>
                  <p className="text-xs text-sky-300 break-all">
                    {buildResultsPageUrl(
                      window.location.origin,
                      joinToken,
                      ownerToken,
                      session.public_results !== false,
                    )}
                  </p>
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={async () => {
                      const url = buildResultsPageUrl(
                        window.location.origin,
                        joinToken,
                        ownerToken,
                        session.public_results !== false,
                      );
                      const ok = await copyToClipboard(url);
                      showToast(ok ? '結果ページのURLをコピーしました' : 'コピーに失敗しました', ok ? 'success' : 'error');
                    }}
                  >
                    結果ページのURLをコピー
                  </Button>
                </div>
              )}
              {session.results_ranking_image_url && (
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <p className="text-xs text-stone-500">順位表画像（公開URL）</p>
                  <a
                    href={session.results_ranking_image_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs text-sky-300 break-all hover:underline"
                  >
                    {session.results_ranking_image_url}
                  </a>
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={async () => {
                      const ok = await copyToClipboard(session.results_ranking_image_url || '');
                      showToast(ok ? '画像URLをコピーしました' : 'コピーに失敗しました', ok ? 'success' : 'error');
                    }}
                  >
                    順位表画像のURLをコピー
                  </Button>
                </div>
              )}
            </div>

            <div className="bg-neutral-800 rounded-2xl shadow-xl shadow-black/40 border border-white/10 p-6 space-y-4">
              <h3 className="text-lg font-semibold text-stone-100 tracking-tight">結果ページの公開範囲</h3>
              <p className="text-sm text-stone-400 leading-relaxed">
                「限定公開」にすると、参加者はオーナー画面から開いた端末（保存済みのオーナートークン）でのみ結果とCSVを利用できます。
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant={session.public_results !== false ? 'primary' : 'secondary'}
                  disabled={isSavingResultsVisibility}
                  onClick={() => handleSetResultsVisibility(true)}
                  className="w-full sm:flex-1"
                >
                  全員に公開
                </Button>
                <Button
                  variant={session.public_results === false ? 'primary' : 'secondary'}
                  disabled={isSavingResultsVisibility}
                  onClick={() => handleSetResultsVisibility(false)}
                  className="w-full sm:flex-1"
                >
                  限定公開（オーナーのみ）
                </Button>
              </div>
            </div>

            <div className="bg-red-500/15 border border-red-400/30 rounded-2xl shadow-xl shadow-black/40 p-6">
              <h3 className="text-lg font-semibold text-red-300 mb-3">緊急操作</h3>
              <Button
                variant="secondary"
                onClick={handleForceClose}
                className="w-full bg-red-500 hover:bg-red-600 text-white"
              >
                イベントを強制終了する
              </Button>
            </div>
          </div>
        )}

        {session.state === 'closed' && (
          <div className="space-y-6">
            <div className="bg-neutral-800 rounded-2xl shadow-xl shadow-black/40 border border-white/10 p-8 text-center">
              <h2 className="text-xl font-semibold mb-4 text-stone-100 tracking-tight">イベントは終了しました</h2>
              <p className="text-stone-400 mb-6 leading-relaxed">このイベントは終了しました。</p>
            </div>

            <NextActionCard
              title="新しいイベントを始めましょう"
              description="新しいイベントを作成して、もう一度テイスティングを楽しみましょう。"
              primaryAction={{
                label: '新しいイベントを作成する',
                onClick: () => {
                  router.push('/create');
                },
              }}
            />
          </div>
        )}
          </>
        )}

        {/* 設定タブ */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {isLoadingSettings ? (
              <div className="bg-neutral-800 rounded-2xl shadow-xl shadow-black/40 border border-white/10 p-8 text-center">
                <p className="text-stone-400">設定を読み込み中...</p>
              </div>
            ) : editedSettings ? (
              <>
                {/* 設定テンプレート選択 */}
                <div className="bg-neutral-800 rounded-2xl shadow-xl shadow-black/40 border border-white/10 p-6 space-y-4">
                  <h2 className="text-xl font-semibold text-stone-100 tracking-tight">設定テンプレート</h2>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-stone-300 mb-2">設定名</label>
                      <input
                        type="text"
                        value={settingName}
                        onChange={(e) => setSettingName(e.target.value)}
                        placeholder="設定名を入力"
                        className="w-full px-4 py-2 bg-neutral-700 border border-white/10 text-stone-100 rounded-lg focus:border-white/20 focus:ring-2 focus:ring-white/20 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-300 mb-2">既存の設定テンプレートを読み込む</label>
                      <div className="flex gap-2">
                        <select
                          value={selectedTemplateId || ''}
                          onChange={(e) => {
                            const templateId = e.target.value || null;
                            setSelectedTemplateId(templateId);
                            if (templateId) {
                              loadSettings(templateId);
                            } else {
                              // 新規作成に戻す場合はデフォルト値を設定
                              const defaultSettings: AppSettings = {
                                id: null,
                                name: 'デフォルト設定',
                                cask_options: DEFAULT_OWNER_SCORING.items.cask.options ?? [],
                                region_options: DEFAULT_OWNER_SCORING.items.region.options ?? [],
                                flavor_chart: defaultOwnerFlavorChart(),
                                scoring: DEFAULT_OWNER_SCORING,
                              };
                              setEditedSettings(defaultSettings);
                              setSettingName('デフォルト設定');
                            }
                          }}
                          className="flex-1 px-4 py-2 bg-neutral-700 border border-white/10 text-stone-100 rounded-lg focus:border-white/20 focus:ring-2 focus:ring-white/20 transition-all"
                        >
                          <option value="">新規作成</option>
                          {settingsTemplates.map((template) => (
                            <option key={template.id} value={template.id}>
                              {template.name}
                            </option>
                          ))}
                        </select>
                        <Button
                          variant="secondary"
                          onClick={async () => {
                            await loadSettingsTemplates();
                            showToast('テンプレート一覧を更新しました', 'success');
                          }}
                          className="px-4"
                        >
                          更新
                        </Button>
                      </div>
                      {selectedTemplateId && settingName !== 'デフォルト設定' && (
                        <div className="mt-2">
                          <Button
                            variant="secondary"
                            onClick={handleDeleteSettings}
                            className="w-full bg-red-500/15 text-red-300 border border-red-400/30 hover:bg-red-500/25"
                          >
                            この設定を削除
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-neutral-800 rounded-2xl shadow-xl shadow-black/40 border border-white/10 p-6 space-y-4">
                  <h2 className="text-xl font-semibold text-stone-100 tracking-tight">配点設定</h2>
                  <ScoringSettingsPanel
                    value={normalizeScoringConfig(editedSettings.scoring ?? LEGACY_DEFAULT_SCORING_FLAT)}
                    onChange={(scoring) =>
                      setEditedSettings({
                        ...editedSettings,
                        scoring,
                        cask_options: scoring.items.cask.options ?? [],
                        region_options: scoring.items.region.options ?? [],
                      })
                    }
                  />
                </div>

                {/* フレーバーチャート */}
                <div className="bg-neutral-800 rounded-2xl shadow-xl shadow-black/40 border border-white/10 p-6 space-y-6">
                  <h2 className="text-xl font-semibold text-stone-100 tracking-tight">フレーバーチャート</h2>
                  
                  {/* Tier1 */}
                  <div>
                    <h3 className="text-lg font-medium text-stone-100 mb-3">Tier1（第1階層）</h3>
                    <p className="text-sm text-stone-500 mb-3 leading-relaxed">
                      Tier1 ごとのナイチンゲール・ローズ・チャートのベース色を RGB（0〜255）で調整できます。セッション開始時のスナップショットが結果チャートに使われます。各 Tier1 の「チャートに表示」で、ローズ・チャートの軸への掲載の有無を切り替えられます（オフでも回答・集計の Tier1 はそのままです）。
                    </p>
                    <div className="space-y-2">
                      {editedSettings.flavor_chart.tier1.map((tier1, index) => {
                        const colorMap = editedSettings.flavor_chart.tier1_nightingale_colors || {};
                        const rgb =
                          colorMap[tier1] ||
                          resolvedTier1NightingaleColors({
                            tier1: editedSettings.flavor_chart.tier1,
                            tier1_nightingale_colors: colorMap,
                          })[tier1] || { r: 128, g: 128, b: 128 };

                        return (
                          <div
                            key={index}
                            className="rounded-lg border border-white/5 bg-neutral-800/30 p-3 space-y-2"
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={tier1}
                                onChange={(e) => {
                                  const newTier1 = [...editedSettings.flavor_chart.tier1];
                                  const oldName = tier1;
                                  newTier1[index] = e.target.value;
                                  const newTier2Suggestions = { ...editedSettings.flavor_chart.tier2_suggestions };
                                  if (newTier2Suggestions[oldName] !== undefined) {
                                    newTier2Suggestions[e.target.value] = newTier2Suggestions[oldName];
                                    delete newTier2Suggestions[oldName];
                                  } else if (!newTier2Suggestions[e.target.value]) {
                                    newTier2Suggestions[e.target.value] = [];
                                  }
                                  const prevColors = editedSettings.flavor_chart.tier1_nightingale_colors || {};
                                  const newColors = { ...prevColors };
                                  if (oldName !== e.target.value && newColors[oldName] !== undefined) {
                                    newColors[e.target.value] = newColors[oldName];
                                    delete newColors[oldName];
                                  }
                                  const prevVis = editedSettings.flavor_chart.tier1_nightingale_visible || {};
                                  const newVis = { ...prevVis };
                                  if (oldName !== e.target.value && oldName in newVis) {
                                    newVis[e.target.value] = newVis[oldName];
                                    delete newVis[oldName];
                                  }
                                  const nextTier1List = newTier1;
                                  const includeOtherSync = nextTier1List.includes('その他')
                                    ? newVis['その他'] === true
                                    : false;
                                  setEditedSettings({
                                    ...editedSettings,
                                    flavor_chart: {
                                      ...editedSettings.flavor_chart,
                                      tier1: newTier1,
                                      tier2_suggestions: newTier2Suggestions,
                                      tier1_nightingale_colors: newColors,
                                      tier1_nightingale_visible: newVis,
                                      include_other_in_nightingale_chart: includeOtherSync,
                                    },
                                  });
                                }}
                                className="flex-1 px-4 py-2 bg-neutral-700 border border-white/10 text-stone-100 rounded-lg focus:border-white/20 focus:ring-2 focus:ring-white/20 transition-all"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const nextTier1 = editedSettings.flavor_chart.tier1.filter((_, i) => i !== index);
                                  const newTier2Suggestions = { ...editedSettings.flavor_chart.tier2_suggestions };
                                  delete newTier2Suggestions[tier1];
                                  const newColors = { ...(editedSettings.flavor_chart.tier1_nightingale_colors || {}) };
                                  delete newColors[tier1];
                                  const newVis = { ...(editedSettings.flavor_chart.tier1_nightingale_visible || {}) };
                                  delete newVis[tier1];
                                  const includeOtherSync = nextTier1.includes('その他')
                                    ? newVis['その他'] === true
                                    : false;
                                  setEditedSettings({
                                    ...editedSettings,
                                    flavor_chart: {
                                      ...editedSettings.flavor_chart,
                                      tier1: nextTier1,
                                      tier2_suggestions: newTier2Suggestions,
                                      tier1_nightingale_colors: newColors,
                                      tier1_nightingale_visible: newVis,
                                      include_other_in_nightingale_chart: includeOtherSync,
                                    },
                                  });
                                }}
                                className="px-3 py-2 bg-red-500/15 text-red-300 border border-red-400/30 rounded-lg hover:bg-red-500/25 transition-colors"
                              >
                                削除
                              </button>
                            </div>
                            <label className="flex items-center gap-2 text-xs text-stone-400">
                              <input
                                type="checkbox"
                                checked={
                                  ensureTier1NightingaleVisibleMap(editedSettings.flavor_chart)[tier1]
                                }
                                onChange={(e) => {
                                  const vis = { ...(editedSettings.flavor_chart.tier1_nightingale_visible || {}) };
                                  vis[tier1] = e.target.checked;
                                  const includeOtherSync = editedSettings.flavor_chart.tier1.includes('その他')
                                    ? vis['その他'] === true
                                    : false;
                                  setEditedSettings({
                                    ...editedSettings,
                                    flavor_chart: {
                                      ...editedSettings.flavor_chart,
                                      tier1_nightingale_visible: vis,
                                      include_other_in_nightingale_chart: includeOtherSync,
                                    },
                                  });
                                }}
                                className="h-4 w-4 rounded border-white/20 bg-neutral-700 text-bd-accent focus:ring-bd-accent/40 shrink-0"
                              />
                              <span>ナイチンゲール・チャートに表示</span>
                            </label>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
                              <span className="text-stone-500 shrink-0">RGB</span>
                              {(['r', 'g', 'b'] as const).map((ch) => (
                                <label key={ch} className="flex items-center gap-1.5 text-stone-400">
                                  <span className="uppercase w-3 font-mono">{ch}</span>
                                  <input
                                    type="number"
                                    min={0}
                                    max={255}
                                    value={rgb[ch]}
                                    onChange={(e) => {
                                      const n = Math.min(255, Math.max(0, parseInt(e.target.value, 10) || 0));
                                      const base = { ...(editedSettings.flavor_chart.tier1_nightingale_colors || {}) };
                                      setEditedSettings({
                                        ...editedSettings,
                                        flavor_chart: {
                                          ...editedSettings.flavor_chart,
                                          tier1_nightingale_colors: {
                                            ...base,
                                            [tier1]: { ...rgb, [ch]: n },
                                          },
                                        },
                                      });
                                    }}
                                    className="w-16 px-2 py-1 bg-neutral-900 border border-white/10 text-stone-100 rounded-md font-mono"
                                  />
                                </label>
                              ))}
                              <span
                                className="inline-block h-7 w-12 rounded border border-white/15 shrink-0"
                                style={{
                                  backgroundColor: `rgb(${rgb.r},${rgb.g},${rgb.b})`,
                                }}
                                title="プレビュー"
                                aria-hidden
                              />
                            </div>
                          </div>
                        );
                      })}
                      <button
                        onClick={() => {
                          const newTier1 = [...editedSettings.flavor_chart.tier1, ''];
                          const newTier2Suggestions = { ...editedSettings.flavor_chart.tier2_suggestions, '': [] };
                          const newVis: Record<string, boolean> = {
                            ...(editedSettings.flavor_chart.tier1_nightingale_visible || {}),
                            '': true,
                          };
                          const includeOtherSync = newTier1.includes('その他') ? newVis['その他'] === true : false;
                          setEditedSettings({
                            ...editedSettings,
                            flavor_chart: {
                              ...editedSettings.flavor_chart,
                              tier1: newTier1,
                              tier2_suggestions: newTier2Suggestions,
                              tier1_nightingale_visible: newVis,
                              include_other_in_nightingale_chart: includeOtherSync,
                            },
                          });
                        }}
                        className="w-full px-4 py-2 bg-neutral-700 text-stone-200 border border-white/10 rounded-lg hover:bg-neutral-600 transition-colors"
                      >
                        + Tier1を追加
                      </button>
                    </div>
                  </div>

                  {/* Tier2サジェスト */}
                  <div>
                    <h3 className="text-lg font-medium text-stone-100 mb-3">Tier2サジェスト（第2階層）</h3>
                    <div className="space-y-4">
                      {editedSettings.flavor_chart.tier1.map((tier1) => (
                        <div key={tier1} className="bg-neutral-700 rounded-lg p-4 border border-white/10">
                          <h4 className="font-medium text-stone-100 mb-2">{tier1}</h4>
                          <div className="space-y-2">
                            {(editedSettings.flavor_chart.tier2_suggestions[tier1] || []).map((term, termIndex) => (
                              <div key={termIndex} className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={term}
                                  onChange={(e) => {
                                    const newTier2Suggestions = { ...editedSettings.flavor_chart.tier2_suggestions };
                                    const newTerms = [...(newTier2Suggestions[tier1] || [])];
                                    newTerms[termIndex] = e.target.value;
                                    newTier2Suggestions[tier1] = newTerms;
                                    setEditedSettings({
                                      ...editedSettings,
                                      flavor_chart: {
                                        ...editedSettings.flavor_chart,
                                        tier2_suggestions: newTier2Suggestions,
                                      },
                                    });
                                  }}
                                  className="flex-1 px-4 py-2 bg-neutral-800 border border-white/10 text-stone-100 rounded-lg focus:border-white/20 focus:ring-2 focus:ring-white/20 transition-all"
                                />
                                <button
                                  onClick={() => {
                                    const newTier2Suggestions = { ...editedSettings.flavor_chart.tier2_suggestions };
                                    newTier2Suggestions[tier1] = (newTier2Suggestions[tier1] || []).filter((_, i) => i !== termIndex);
                                    setEditedSettings({
                                      ...editedSettings,
                                      flavor_chart: {
                                        ...editedSettings.flavor_chart,
                                        tier2_suggestions: newTier2Suggestions,
                                      },
                                    });
                                  }}
                                  className="px-3 py-2 bg-red-500/15 text-red-300 border border-red-400/30 rounded-lg hover:bg-red-500/25 transition-colors"
                                >
                                  削除
                                </button>
                              </div>
                            ))}
                            <button
                              onClick={() => {
                                const newTier2Suggestions = { ...editedSettings.flavor_chart.tier2_suggestions };
                                newTier2Suggestions[tier1] = [...(newTier2Suggestions[tier1] || []), ''];
                                setEditedSettings({
                                  ...editedSettings,
                                  flavor_chart: {
                                    ...editedSettings.flavor_chart,
                                    tier2_suggestions: newTier2Suggestions,
                                  },
                                });
                              }}
                              className="w-full px-4 py-2 bg-neutral-800 text-stone-200 border border-white/10 rounded-lg hover:bg-neutral-700 transition-colors"
                            >
                              + サジェストを追加
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 保存ボタン */}
                  <div className="pt-4">
                    <Button
                      variant="primary"
                      onClick={handleSaveSettings}
                      disabled={isSavingSettings}
                      className="w-full"
                    >
                      {isSavingSettings ? '保存中...' : '設定を保存'}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-neutral-800 rounded-2xl shadow-xl shadow-black/40 border border-white/10 p-8 text-center">
                <p className="text-stone-400">設定を読み込めませんでした</p>
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


