import fs from 'fs';
import path from 'path';

const LOGS_DIR = path.join(process.cwd(), 'logs');

/** Vercel など読み取り専用 FS の環境ではファイルログを使わない */
function canUseFileLogs(): boolean {
  if (process.env.VERCEL === '1') return false;
  return true;
}

function ensureLogsDir(): boolean {
  if (!canUseFileLogs()) return false;
  try {
    if (!fs.existsSync(LOGS_DIR)) {
      fs.mkdirSync(LOGS_DIR, { recursive: true });
    }
    return true;
  } catch {
    return false;
  }
}

export function writeLog(prefix: string, data: unknown) {
  try {
    if (!ensureLogsDir()) {
      console.log(`[${prefix}]`, data);
      return;
    }
    const timestamp = new Date().toISOString();
    const dateStr = new Date().toISOString().split('T')[0];
    const logFile = path.join(LOGS_DIR, `debug-${dateStr}.log`);

    const logEntry = `[${timestamp}] [${prefix}] ${JSON.stringify(data, null, 2)}\n`;

    fs.appendFileSync(logFile, logEntry, 'utf-8');
  } catch (error) {
    console.error('Failed to write log:', error);
  }
}

export function writeErrorLog(prefix: string, error: unknown) {
  try {
    const msg = error instanceof Error ? error.message : JSON.stringify(error);
    const stack = error instanceof Error ? error.stack : '';
    console.error(`[${prefix}]`, msg, stack);

    if (!ensureLogsDir()) {
      return;
    }
    const timestamp = new Date().toISOString();
    const dateStr = new Date().toISOString().split('T')[0];
    const logFile = path.join(LOGS_DIR, `error-${dateStr}.log`);

    const logEntry = `[${timestamp}] [${prefix}] ERROR: ${msg}\n${stack || ''}\n\n`;

    fs.appendFileSync(logFile, logEntry, 'utf-8');
  } catch (err) {
    console.error('Failed to write error log:', err);
  }
}
