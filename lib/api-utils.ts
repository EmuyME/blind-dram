// API共通ユーティリティ
import { NextResponse } from 'next/server';
import { sql } from './db';

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

// 認証チェック: owner_token
export async function verifyOwnerToken(ownerToken: string) {
  try {
    const rows = await sql`
      SELECT id, state
      FROM sessions
      WHERE owner_token = ${ownerToken}
      LIMIT 1
    `;
    return rows[0] ?? null;
  } catch (error) {
    console.error('verifyOwnerToken error:', error);
    return null;
  }
}

// 認証チェック: participant_token
export async function verifyParticipantToken(participantToken: string) {
  try {
    const rows = await sql`
      SELECT id, session_id, display_name
      FROM participants
      WHERE participant_token = ${participantToken}
      LIMIT 1
    `;
    return rows[0] ?? null;
  } catch (error) {
    console.error('verifyParticipantToken error:', error);
    return null;
  }
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
