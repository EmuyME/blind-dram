"use client";

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { PhaseBanner } from '@/components/common/PhaseBanner';
import { ParticipantProgress } from '@/components/common/ParticipantProgress';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/common/Toast';
import { Toast } from '@/components/common/Toast';
import { getParticipantToken } from '@/lib/utils';
import { CorrectnessBadge } from '@/components/common/CorrectnessBadge';
import { FlavorChips } from '@/components/common/FlavorChips';

interface Truth {
  true_cask?: string;
  true_region?: string;
  true_age?: number;
  true_abv?: number;
  true_distillery?: string;
  notes?: string;
  bottle_image_url?: string | null;
}

interface FlavorNotes {
  tier1_tags?: string[];
  tier2_terms?: string[];
  text?: string;
}

interface Participant {
  participant_id: string;
  display_name: string;
  status: 'draft' | 'submitted' | 'graded';
  guessed_cask?: string | null;
  guessed_region?: string | null;
  guessed_age?: number | null;
  guessed_abv?: number | null;
  guessed_distillery?: string | null;
  nose?: FlavorNotes | null;
  palate?: FlavorNotes | null;
  finish?: FlavorNotes | null;
  is_correct?: boolean;
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
  nose?: FlavorNotes | null;
  palate?: FlavorNotes | null;
  finish?: FlavorNotes | null;
  bottle_image_url?: string | null;
  is_correct?: boolean;
};

const DEFAULT_CASK_OPTIONS = ['シェリー樽', 'バーボン樽', 'ワイン樽', 'その他'];
const DEFAULT_REGION_OPTIONS = ['スコットランド', 'アイルランド', 'アメリカ', '日本', 'その他'];

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
  const [truthEntered, setTruthEntered] = useState(false);
  const [allSubmitted, setAllSubmitted] = useState(false);
  
  // 設定（sessionから読み込む）
  const [caskOptions, setCaskOptions] = useState<string[]>(DEFAULT_CASK_OPTIONS);
  const [regionOptions, setRegionOptions] = useState<string[]>(DEFAULT_REGION_OPTIONS);
  
  // セッション情報（モード確認用）
  const [sessionMode, setSessionMode] = useState<'sequential' | 'simultaneous' | null>(null);
  
  // 画像アップロード関連
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // #region agent log
  useEffect(() => {
    const submittedCount = participants.filter((p) => p.status === 'submitted').length;
    const gradingVisible = roundState === 'grading';

    // NOTE: tokenなどの秘匿情報はログに出さない
    fetch('http://127.0.0.1:7243/ingest/699882dd-cd61-413c-8229-b42b014179ee', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'app/session/[joinToken]/presenter/[sampleId]/page.tsx:dbg-grade-ui-dup',
        message: 'Presenter grading UI visibility',
        data: {
          round_state: roundState,
          truth_entered: truthEntered,
          all_submitted: allSubmitted,
          participants_total: participants.length,
          submitted_count: submittedCount,
          grading_visible: gradingVisible,
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run-grade-ui-dup',
        hypothesisId: 'H_UI',
      }),
    }).catch(() => {});
  }, [roundState, truthEntered, allSubmitted, participants]);
  // #endregion

  // Sessionから設定を読み込む
  useEffect(() => {
    if (!joinToken) return;

    const loadSessionSettings = async () => {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/699882dd-cd61-413c-8229-b42b014179ee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/session/[joinToken]/presenter/[sampleId]/page.tsx:105',message:'loadSessionSettings - Entry',data:{join_token:joinToken},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
      // #endregion
      try {
        const response = await fetch(`/api/session/get?join_token=${joinToken}`);
        const result = await response.json();

        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/699882dd-cd61-413c-8229-b42b014179ee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/session/[joinToken]/presenter/[sampleId]/page.tsx:110',message:'loadSessionSettings - API response',data:{ok:response.ok,has_data:!!result.data,has_error:!!result.error,error:result.error},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
        // #endregion

        if (response.ok && result.data) {
          const session = result.data;
          
          // セッションモードを保存
          if (session.mode) {
            setSessionMode(session.mode);
          }
          
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/699882dd-cd61-413c-8229-b42b014179ee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/session/[joinToken]/presenter/[sampleId]/page.tsx:116',message:'loadSessionSettings - Processing session data',data:{has_cask_options:!!session.cask_options_snapshot,has_region_options:!!session.region_options_snapshot},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
          // #endregion
          
          // カスク選択肢
          if (session.cask_options_snapshot && Array.isArray(session.cask_options_snapshot)) {
            setCaskOptions(session.cask_options_snapshot);
          }
          
          // 地域選択肢
          if (session.region_options_snapshot && Array.isArray(session.region_options_snapshot)) {
            setRegionOptions(session.region_options_snapshot);
          }
          
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/699882dd-cd61-413c-8229-b42b014179ee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/session/[joinToken]/presenter/[sampleId]/page.tsx:128',message:'loadSessionSettings - Settings processed',data:{cask_options_count:session.cask_options_snapshot?.length||0,region_options_count:session.region_options_snapshot?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
          // #endregion
        }
      } catch (error) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/699882dd-cd61-413c-8229-b42b014179ee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/session/[joinToken]/presenter/[sampleId]/page.tsx:133',message:'loadSessionSettings - Error',data:{error:String(error),error_stack:error instanceof Error ? error.stack : undefined},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
        // #endregion
        console.error('Load session settings error:', error);
        // エラー時はデフォルト値を使用
      }
    };

    loadSessionSettings();
  }, [joinToken]);

  useEffect(() => {
    if (!joinToken || !sampleId) return;
    
    const token = getParticipantToken(joinToken);
    if (!token) {
      router.push(`/s/${joinToken}`);
      return;
    }
    setParticipantToken(token);
  }, [joinToken, sampleId, router]);

  const loadRoundStatus = useCallback(async () => {
    if (!participantToken || !sampleId) return;

    try {
      const response = await fetch(
        `/api/round/status?sample_id=${sampleId}&participant_token=${participantToken}`
      );
      const result = await response.json();

      if (!response.ok) {
        showToast(result.error || 'Round状態取得に失敗しました', 'error');
        setIsLoading(false);
        return;
      }

      setRoundState(result.data.state);
      const participantsData = (result.data.participant_progress || []) as ApiParticipantProgressRow[];
      const allGradedValue = result.data.all_graded || false;
      const truthEnteredValue = result.data.truth_entered || false;
      const allSubmittedValue = result.data.all_submitted || false;
      
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/699882dd-cd61-413c-8229-b42b014179ee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/session/[joinToken]/presenter/[sampleId]/page.tsx:91',message:'Round status loaded',data:{state:result.data.state,truth_entered:truthEnteredValue,all_submitted:allSubmittedValue,participants_count:participantsData.length,submitted_count:participantsData.filter((p) => p.status === 'submitted').length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
      
      console.log('[DEBUG] Presenter panel - Loaded round status:', {
        state: result.data.state,
        participants_count: participantsData.length,
        participants: participantsData.map((p) => ({
          id: p.participant_id,
          name: p.display_name,
          status: p.status,
          has_guessed_distillery: !!p.guessed_distillery,
          guessed_distillery: p.guessed_distillery,
          is_correct: p.is_correct,
        })),
        all_graded: allGradedValue,
        all_submitted: allSubmittedValue,
        truth_entered: truthEnteredValue,
      });
      
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/699882dd-cd61-413c-8229-b42b014179ee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/session/[joinToken]/presenter/[sampleId]/page.tsx:149',message:'Setting participants with grades',data:{participants_count:participantsData.length,participants:participantsData.map((p) => ({id:p.participant_id,status:p.status,is_correct:p.is_correct}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run-grade-click',hypothesisId:'H_GRADE'})}).catch(()=>{});
      // #endregion
      
      // 採点結果を保持するため、既存のparticipantsのis_correctを保持
      setParticipants((prevParticipants) => {
        const updated = participantsData.map((p) => {
          const existing = prevParticipants.find((prev) => prev.participant_id === p.participant_id);
          // APIから取得したデータにis_correctが含まれている場合はそれを使用、なければ既存の値を保持
          return {
            ...p,
            display_name: p.display_name ?? '',
            status: (p.status === 'submitted' || p.status === 'graded' ? p.status : 'draft') as Participant['status'],
            is_correct: p.is_correct !== undefined ? p.is_correct : existing?.is_correct,
          } as Participant;
        });
        return updated;
      });
      setAllGraded(allGradedValue);
      setSampleLabel(result.data.label || '');
      setTruthEntered(truthEnteredValue);
      setAllSubmitted(allSubmittedValue);
      
      // Truth情報を取得
      if (result.data.truth) {
        setTruth({
          true_cask: result.data.truth.true_cask || '',
          true_region: result.data.truth.true_region || '',
          true_age: result.data.truth.true_age,
          true_abv: result.data.truth.true_abv,
          true_distillery: result.data.truth.true_distillery || '',
          notes: result.data.truth.notes || '',
          bottle_image_url: result.data.truth.bottle_image_url || null,
        });
        if (result.data.truth.bottle_image_url) {
          setImagePreview(result.data.truth.bottle_image_url);
        }
      }
    } catch (error) {
      console.error('Load error:', error);
      showToast('ネットワークエラーが発生しました', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [participantToken, sampleId, showToast]);

  useEffect(() => {
    if (participantToken && sampleId) {
      loadRoundStatus();
    }
  }, [participantToken, sampleId, loadRoundStatus]);

  useEffect(() => {
    if (participantToken && sampleId) {
      // すべての状態で定期的に更新（ポーリング）
      // pending状態でも、他の参加者がRoundを開始した場合に更新が必要
      const interval = setInterval(() => {
        loadRoundStatus();
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

      let result: { error?: string; code?: string } = {};
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
        const msg =
          result.error ||
          (response.status === 429
            ? 'アクセスが集中しています。少し待ってから再度お試しください。'
            : `Round開始に失敗しました（HTTP ${response.status}）`);
        showToast(msg, 'error');
        return;
      }

      showToast('Roundを開始しました', 'success');
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

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/699882dd-cd61-413c-8229-b42b014179ee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/session/[joinToken]/presenter/[sampleId]/page.tsx:373',message:'handleSaveTruth called',data:{has_bottle_image_url:!!truth.bottle_image_url,bottle_image_url:truth.bottle_image_url,truth_keys:Object.keys(truth)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
    // #endregion

    try {
      const requestBody = {
        participant_token: participantToken,
        sample_id: sampleId,
        ...truth,
      };
      
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/699882dd-cd61-413c-8229-b42b014179ee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/session/[joinToken]/presenter/[sampleId]/page.tsx:380',message:'Sending truth to API',data:{request_body_keys:Object.keys(requestBody),has_bottle_image_url:!!requestBody.bottle_image_url,bottle_image_url:requestBody.bottle_image_url},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
      // #endregion

      const response = await fetch('/api/truths/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (!response.ok) {
        showToast(result.error || 'Truth保存に失敗しました', 'error');
        return;
      }

      showToast('正解情報を保存しました', 'success');
      
      // 状態遷移が発生した場合は即座に更新
      if (result.data.state_transitioned) {
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

  const handleGradeDistillery = async (participantId: string, isCorrect: boolean) => {
    if (!participantToken) return;

    try {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/699882dd-cd61-413c-8229-b42b014179ee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'app/session/[joinToken]/presenter/[sampleId]/page.tsx:handleGradeDistillery:entry',
          message: 'Grade click (distillery)',
          data: {
            round_state: roundState,
            truth_entered: truthEntered,
            all_submitted: allSubmitted,
            target_participant_id: participantId,
            is_correct: isCorrect,
            has_participant_token: !!participantToken,
            has_sample_id: !!sampleId,
          },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run-grade-click',
          hypothesisId: 'H_GRADE',
        }),
      }).catch(() => {});
      // #endregion

      const response = await fetch('/api/distillery/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participant_token: participantToken,
          sample_id: sampleId,
          target_participant_id: participantId,
          is_correct: isCorrect,
        }),
      });

      let result;
      try {
        const text = await response.text();
        result = text ? JSON.parse(text) : {};
      } catch {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/699882dd-cd61-413c-8229-b42b014179ee', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'app/session/[joinToken]/presenter/[sampleId]/page.tsx:handleGradeDistillery:parseError',
            message: 'Grade API response parse error',
            data: { status: response.status, ok: response.ok },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'run-grade-click',
            hypothesisId: 'H_GRADE',
          }),
        }).catch(() => {});
        // #endregion
        showToast('サーバーからの応答の解析に失敗しました', 'error');
        return;
      }

      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/699882dd-cd61-413c-8229-b42b014179ee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'app/session/[joinToken]/presenter/[sampleId]/page.tsx:handleGradeDistillery:response',
          message: 'Grade API response',
          data: {
            status: response.status,
            ok: response.ok,
            has_error: !!result?.error,
            error_code: result?.code,
          },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run-grade-click',
          hypothesisId: 'H_GRADE',
        }),
      }).catch(() => {});
      // #endregion

      if (!response.ok) {
        showToast(result.error || `採点に失敗しました（${response.status}）`, 'error');
        return;
      }

      showToast('採点を保存しました', 'success');
      
      // 採点結果を即座にUIに反映するため、participantsの状態を先に更新
      setParticipants((prevParticipants) =>
        prevParticipants.map((p) =>
          p.participant_id === participantId
            ? { ...p, is_correct: isCorrect }
            : p
        )
      );
      
      // 採点後、状態を更新（採点結果をUIに反映）
      await loadRoundStatus();
      
      // 少し待ってから再度更新（採点結果がDBに反映されるまで）
      setTimeout(async () => {
        await loadRoundStatus();
      }, 500);
      
      // さらに待ってから再度更新（状態遷移が発生する可能性がある）
      setTimeout(async () => {
        await loadRoundStatus();
      }, 1500);
    } catch (error) {
      console.error('Grade error:', error);
      showToast('ネットワークエラーが発生しました', 'error');
    }
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
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/699882dd-cd61-413c-8229-b42b014179ee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/session/[joinToken]/presenter/[sampleId]/page.tsx:299',message:'handleFinishRound - Calling API',data:{sample_id:sampleId,current_state:roundState},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H8'})}).catch(()=>{});
      // #endregion
      const response = await fetch('/api/round/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participant_token: participantToken,
          sample_id: sampleId,
        }),
      });

      const result = await response.json();

      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/699882dd-cd61-413c-8229-b42b014179ee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/session/[joinToken]/presenter/[sampleId]/page.tsx:312',message:'handleFinishRound - API response',data:{ok:response.ok,new_state:result.data?.state,next_sample_id:result.data?.next_sample_id,error:result.error},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H8'})}).catch(()=>{});
      // #endregion

      if (!response.ok) {
        showToast(result.error || 'Round終了に失敗しました', 'error');
        return;
      }

      showToast('Roundを終了しました', 'success');
      // 状態を更新してから遷移
      await loadRoundStatus();
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/699882dd-cd61-413c-8229-b42b014179ee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/session/[joinToken]/presenter/[sampleId]/page.tsx:319',message:'handleFinishRound - Navigating',data:{join_token:joinToken},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H8'})}).catch(()=>{});
      // #endregion
      setTimeout(() => {
        if (joinToken) {
          router.push(`/session/${joinToken}`);
        }
      }, 1000);
    } catch (error) {
      console.error('Finish round error:', error);
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/699882dd-cd61-413c-8229-b42b014179ee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/session/[joinToken]/presenter/[sampleId]/page.tsx:325',message:'handleFinishRound - Error',data:{error:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H8'})}).catch(()=>{});
      // #endregion
      showToast('ネットワークエラーが発生しました', 'error');
    }
  };

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
                <div>
                  <label className="block text-sm font-semibold text-stone-100 mb-2">カスク</label>
                  <select
                    name="true_cask"
                    value={truth.true_cask || ''}
                    onChange={(e) => setTruth({ ...truth, true_cask: e.target.value })}
                    className="w-full px-4 py-3 bg-neutral-800 border border-white/10 text-stone-100 rounded-lg text-base min-h-[44px] focus:border-white/20 focus:ring-2 focus:ring-white/20 transition-all"
                  >
                    <option value="">選択してください</option>
                    {caskOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-stone-100 mb-2">地域</label>
                  <select
                    name="true_region"
                    value={truth.true_region || ''}
                    onChange={(e) => setTruth({ ...truth, true_region: e.target.value })}
                    className="w-full px-4 py-3 bg-neutral-800 border border-white/10 text-stone-100 rounded-lg text-base min-h-[44px] focus:border-white/20 focus:ring-2 focus:ring-white/20 transition-all"
                  >
                    <option value="">選択してください</option>
                    {regionOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-stone-100 mb-2">熟成年数</label>
                  <input
                    name="true_age"
                    type="number"
                    min="0"
                    value={truth.true_age || ''}
                    onChange={(e) =>
                      setTruth({ ...truth, true_age: parseInt(e.target.value) || undefined })
                    }
                    className="w-full px-4 py-3 bg-neutral-800 border border-white/10 text-stone-100 rounded-lg text-base min-h-[44px] focus:border-white/20 focus:ring-2 focus:ring-white/20 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-stone-100 mb-2">度数（%）</label>
                  <input
                    name="true_abv"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={truth.true_abv || ''}
                    onChange={(e) =>
                      setTruth({ ...truth, true_abv: parseFloat(e.target.value) || undefined })
                    }
                    className="w-full px-4 py-3 bg-neutral-800 border border-white/10 text-stone-100 rounded-lg text-base min-h-[44px] focus:border-white/20 focus:ring-2 focus:ring-white/20 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-stone-100 mb-2">蒸留所名</label>
                  <input
                    name="true_distillery"
                    type="text"
                    value={truth.true_distillery || ''}
                    onChange={(e) => setTruth({ ...truth, true_distillery: e.target.value })}
                    className="w-full px-4 py-3 bg-neutral-800 border border-white/10 text-stone-100 placeholder:text-stone-500 rounded-lg text-base min-h-[44px] focus:border-white/20 focus:ring-2 focus:ring-white/20 transition-all"
                    placeholder="例: マッカラン"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-stone-100 mb-2">メモ（任意）</label>
                  <textarea
                    value={truth.notes || ''}
                    onChange={(e) => setTruth({ ...truth, notes: e.target.value })}
                    className="w-full px-4 py-3 bg-neutral-800 border border-white/10 text-stone-100 placeholder:text-stone-500 rounded-lg text-base min-h-[100px] focus:border-white/20 focus:ring-2 focus:ring-white/20 transition-all"
                    placeholder="任意のメモを入力"
                  />
                </div>

                {/* ボトル画像アップロード */}
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
                        <p className="font-semibold text-lg text-stone-100 mb-3 break-words">{participant.display_name}</p>
                        <div className="mt-2 space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-stone-400 min-w-[80px] flex-shrink-0">カスク:</span>
                            <span className="text-stone-100 break-words">{participant.guessed_cask || '未入力'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-stone-400 min-w-[80px] flex-shrink-0">地域:</span>
                            <span className="text-stone-100 break-words">{participant.guessed_region || '未入力'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-stone-400 min-w-[80px] flex-shrink-0">年数:</span>
                            <span className="text-stone-100">{participant.guessed_age ?? '未入力'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-stone-400 min-w-[80px] flex-shrink-0">度数:</span>
                            <span className="text-stone-100">{participant.guessed_abv ?? '未入力'}%</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-stone-400 min-w-[80px] flex-shrink-0">蒸留所名:</span>
                            <span className="text-stone-100 font-medium break-words">{participant.guessed_distillery || '未入力'}</span>
                          </div>
                        </div>
                      </div>
                      
                      {(participant.nose || participant.palate || participant.finish) && (
                        <div className="mt-3 pt-3 border-t border-white/10 space-y-3 text-sm">
                          {participant.nose && (
                            <div>
                              <p className="font-semibold text-stone-100 mb-1">Nose</p>
                              {participant.nose.tier1_tags && participant.nose.tier1_tags.length > 0 && (
                                <p className="text-stone-400">Tier1: {participant.nose.tier1_tags.join(', ')}</p>
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
                                <p className="text-stone-400">Tier1: {participant.palate.tier1_tags.join(', ')}</p>
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
                                <p className="text-stone-400">Tier1: {participant.finish.tier1_tags.join(', ')}</p>
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
            <div className="bg-neutral-800 rounded-2xl shadow-xl shadow-black/40 border border-white/10 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-500/15 border border-emerald-400/30 rounded-full">
                  <span className="text-xl">✓</span>
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-stone-100 tracking-tight">採点</h2>
                  <p className="text-stone-400 text-sm mt-1 leading-relaxed">
                    参加者の蒸留所名の推測を採点してください
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
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="font-semibold text-lg text-stone-100 mb-3 break-words">{participant.display_name}</p>
                          <div className="mt-2 space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-stone-400 min-w-[80px] flex-shrink-0">カスク:</span>
                              <span className="text-stone-100 break-words">{participant.guessed_cask || '未入力'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-stone-400 min-w-[80px] flex-shrink-0">地域:</span>
                              <span className="text-stone-100 break-words">{participant.guessed_region || '未入力'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-stone-400 min-w-[80px] flex-shrink-0">年数:</span>
                              <span className="text-stone-100">{participant.guessed_age ?? '未入力'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-stone-400 min-w-[80px] flex-shrink-0">度数:</span>
                              <span className="text-stone-100">{participant.guessed_abv ?? '未入力'}%</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-stone-400 min-w-[80px] flex-shrink-0">蒸留所名:</span>
                              <span className="text-stone-100 font-medium break-words">{participant.guessed_distillery || '未入力'}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <div className="text-xs font-semibold text-stone-400 mb-1">採点</div>
                          <div className="flex gap-2">
                            <Button
                              variant={participant.is_correct === true ? 'primary' : 'secondary'}
                              onClick={() => handleGradeDistillery(participant.participant_id, true)}
                              className={`min-w-[70px] py-2.5 font-semibold text-lg transition-all ${
                                participant.is_correct === true 
                                  ? 'bg-sky-500 hover:bg-sky-600 text-white' 
                                  : 'bg-neutral-700 hover:bg-neutral-600 text-stone-200 border border-white/10'
                              }`}
                            >
                              <span className="flex items-center justify-center gap-2">
                                <span className="text-xl leading-none" aria-hidden="true">✓</span>
                                <span className="text-sm font-semibold">正解</span>
                              </span>
                            </Button>
                            <Button
                              variant={participant.is_correct === false ? 'primary' : 'secondary'}
                              onClick={() => handleGradeDistillery(participant.participant_id, false)}
                              className={`min-w-[70px] py-2.5 font-semibold text-lg transition-all ${
                                participant.is_correct === false 
                                  ? 'bg-amber-500 hover:bg-amber-600 text-black/90' 
                                  : 'bg-neutral-700 hover:bg-neutral-600 text-stone-200 border border-white/10'
                              }`}
                            >
                              <span className="flex items-center justify-center gap-2">
                                <span className="text-xl leading-none" aria-hidden="true">✗</span>
                                <span className="text-sm font-semibold">不正解</span>
                              </span>
                            </Button>
                          </div>
                          <div className="mt-2">
                            <CorrectnessBadge value={participant.is_correct} size="md" />
                          </div>
                        </div>
                      </div>
                      
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
