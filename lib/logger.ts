import fs from 'fs';
import path from 'path';

const LOGS_DIR = path.join(process.cwd(), 'logs');

// logsディレクトリが存在しない場合は作成
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

export function writeLog(prefix: string, data: unknown) {
  try {
    const timestamp = new Date().toISOString();
    const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const logFile = path.join(LOGS_DIR, `debug-${dateStr}.log`);
    
    const logEntry = `[${timestamp}] [${prefix}] ${JSON.stringify(data, null, 2)}\n`;
    
    fs.appendFileSync(logFile, logEntry, 'utf-8');
  } catch (error) {
    console.error('Failed to write log:', error);
  }
}

export function writeErrorLog(prefix: string, error: unknown) {
  try {
    const timestamp = new Date().toISOString();
    const dateStr = new Date().toISOString().split('T')[0];
    const logFile = path.join(LOGS_DIR, `error-${dateStr}.log`);
    
    const logEntry = `[${timestamp}] [${prefix}] ERROR: ${error instanceof Error ? error.message : JSON.stringify(error)}\n${error instanceof Error ? error.stack : ''}\n\n`;
    
    fs.appendFileSync(logFile, logEntry, 'utf-8');
  } catch (err) {
    console.error('Failed to write error log:', err);
  }
}
