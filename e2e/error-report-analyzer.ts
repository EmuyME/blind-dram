import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * エラーレポートを分析して修正を試みる
 */
export class ErrorReportAnalyzer {
  private testResultsDir: string;

  constructor(testResultsDir: string = 'test-results') {
    this.testResultsDir = testResultsDir;
  }

  /**
   * 最新のエラーレポートを取得
   */
  getLatestErrorReport(): { path: string; content: string } | null {
    if (!existsSync(this.testResultsDir)) {
      console.log(`[ErrorReportAnalyzer] test-results directory does not exist: ${this.testResultsDir}`);
      return null;
    }

    const dirs = readdirSync(this.testResultsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name)
      .sort()
      .reverse(); // 最新のものを最初に

    console.log(`[ErrorReportAnalyzer] Found ${dirs.length} test result directories`);

    for (const dir of dirs) {
      const errorContextPath = join(this.testResultsDir, dir, 'error-context.md');
      console.log(`[ErrorReportAnalyzer] Checking: ${errorContextPath}`);
      if (existsSync(errorContextPath)) {
        const content = readFileSync(errorContextPath, 'utf-8');
        console.log(`[ErrorReportAnalyzer] Found error report: ${errorContextPath}`);
        return { path: errorContextPath, content };
      }
    }

    console.log(`[ErrorReportAnalyzer] No error-context.md files found`);
    return null;
  }

  /**
   * エラーレポートを分析して問題を特定
   */
  analyzeErrorReport(content: string): {
    errorType: string;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];

    // エラーパターンを検出
    if (content.includes('読み込み中...')) {
      issues.push('ページが「読み込み中...」で止まっている');
      suggestions.push('開発サーバーが起動しているか確認してください');
      suggestions.push('npm run dev を実行してください');
    }

    if (content.includes('Timeout') || content.includes('timeout')) {
      issues.push('タイムアウトエラーが発生している');
      suggestions.push('タイムアウト設定を延長してください');
      suggestions.push('--timeout=120000 を追加してください');
    }

    if (content.includes('locator') && content.includes('not found')) {
      issues.push('セレクタが見つからない');
      suggestions.push('スクリーンショットを確認してセレクタを修正してください');
    }

    if (content.includes('ERR_CONNECTION_REFUSED')) {
      issues.push('開発サーバーに接続できない');
      suggestions.push('開発サーバーが起動しているか確認してください');
      suggestions.push('npm run dev を実行してください');
    }

    if (content.includes('ReferenceError')) {
      issues.push('変数名の不一致エラー');
      suggestions.push('変数名を確認して修正してください');
    }

    if (content.includes('Module not found')) {
      issues.push('モジュールが見つからない');
      suggestions.push('必要なパッケージをインストールしてください');
    }

    // エラータイプを特定
    let errorType = 'Unknown';
    if (issues.some(i => i.includes('読み込み中'))) {
      errorType = 'LoadingStuck';
    } else if (issues.some(i => i.includes('タイムアウト'))) {
      errorType = 'Timeout';
    } else if (issues.some(i => i.includes('セレクタ'))) {
      errorType = 'SelectorNotFound';
    } else if (issues.some(i => i.includes('接続'))) {
      errorType = 'ConnectionRefused';
    } else if (issues.some(i => i.includes('変数名'))) {
      errorType = 'ReferenceError';
    } else if (issues.some(i => i.includes('モジュール'))) {
      errorType = 'ModuleNotFound';
    }

    return { errorType, issues, suggestions };
  }

  /**
   * すべてのエラーレポートを取得
   */
  getAllErrorReports(): Array<{ dir: string; path: string; content: string }> {
    if (!existsSync(this.testResultsDir)) {
      return [];
    }

    const reports: Array<{ dir: string; path: string; content: string }> = [];

    const dirs = readdirSync(this.testResultsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    for (const dir of dirs) {
      const errorContextPath = join(this.testResultsDir, dir, 'error-context.md');
      if (existsSync(errorContextPath)) {
        const content = readFileSync(errorContextPath, 'utf-8');
        reports.push({ dir, path: errorContextPath, content });
      }
    }

    return reports;
  }
}
