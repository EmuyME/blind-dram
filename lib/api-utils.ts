// API共通ユーティリティ
import { NextResponse } from 'next/server';
import { supabase } from './supabase';

export interface ApiError {
  error: string;
  code: string;
}

export function successResponse<T>(data: T, status: number = 200) {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status }
  );
}

export function errorResponse(
  error: string,
  code: string,
  status: number = 400
) {
  return NextResponse.json(
    {
      error,
      code,
    },
    { status }
  );
}

/** sessions.public_results 列が無い DB（マイグレーション未適用）向けのエラー判定 */
export function isMissingPublicResultsColumn(error: { code?: string; message?: string } | null): boolean {
  if (!error || typeof error.message !== 'string') return false;
  return error.message.includes('public_results');
}

// 認証チェック: owner_token
export async function verifyOwnerToken(ownerToken: string) {
  const { data, error } = await supabase
    .from('sessions')
    .select('id, state')
    .eq('owner_token', ownerToken)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

// 認証チェック: participant_token
export async function verifyParticipantToken(participantToken: string) {
  const { data, error } = await supabase
    .from('participants')
    .select('id, session_id, display_name')
    .eq('participant_token', participantToken)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

// UUID生成
export function generateUUID(): string {
  return crypto.randomUUID();
}

// 参加コード生成（4-6文字の英数字）
export function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 0, O, I, 1を除外して見間違いを防ぐ
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}