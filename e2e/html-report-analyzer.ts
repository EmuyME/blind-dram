import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Playwright HTMLレポートからエラー情報を抽出して分析
 */
export class HtmlReportAnalyzer {
  private reportDir: string;

  constructor(reportDir: string = 'playwright-report') {
    this.reportDir = reportDir;
  }

  /**
   * HTMLレポートからエラー情報を抽出
   */
  async extractErrorsFromHtmlReport(): Promise<Array<{
    test: string;
    error: string;
    errorType: string;
    details: any;
  }>> {
    const errors: Array<{
      test: string;
      error: string;
      errorType: string;
      details: any;
    }> = [];

    if (!existsSync(this.reportDir)) {
      console.log(`[HtmlReportAnalyzer] Report directory does not exist: ${this.reportDir}`);
      return errors;
    }

    const dataDir = join(this.reportDir, 'data');
    if (!existsSync(dataDir)) {
      console.log(`[HtmlReportAnalyzer] Data directory does not exist: ${dataDir}`);
      return errors;
    }

    // マークダウンファイル（エラーコンテキスト）を読み取る
    const files = readdirSync(dataDir, { withFileTypes: true })
      .filter(dirent => dirent.isFile() && dirent.name.endsWith('.md'))
      .map(dirent => dirent.name);

    console.log(`[HtmlReportAnalyzer] Found ${files.length} markdown files in report data`);

    for (const file of files) {
      const filePath = join(dataDir, file);
      try {
        const content = readFileSync(filePath, 'utf-8');
        const errorInfo = this.parseErrorMarkdown(content);
        if (errorInfo) {
          errors.push(errorInfo);
        }
      } catch (error) {
        console.error(`[HtmlReportAnalyzer] Failed to read ${filePath}:`, error);
      }
    }

    return errors;
  }

  /**
   * マークダウンファイルからエラー情報を解析
   */
  private parseErrorMarkdown(content: string): {
    test: string;
    error: string;
    errorType: string;
    details: any;
  } | null {
    // エラーメッセージを抽出（複数のパターンを試す）
    let errorMatch = content.match(/## Error Message\s*\n\s*```\s*\n([^`]+)\s*```/);
    if (!errorMatch) {
      errorMatch = content.match(/Error Message[:\s]*\n\s*```[^\n]*\n([^`]+)```/);
    }
    if (!errorMatch) {
      // ページスナップショットからエラーを検出
      if (content.includes('読み込み中...')) {
        return {
          test: 'Unknown Test',
          error: 'ページが「読み込み中...」で止まっている',
          errorType: 'LoadingStuck',
          details: {
            fullContent: content,
            detectedFrom: 'page snapshot',
          },
        };
      }
    }

    const errorTypeMatch = content.match(/## Error Type\s*\n\s*([^\n]+)/);
    const codeFrameMatch = content.match(/## Code Frame\s*\n\s*```[^\n]*\n([^`]+)```/);

    const error = errorMatch ? errorMatch[1].trim() : '';
    const errorType = errorTypeMatch ? errorTypeMatch[1].trim() : 'Unknown';
    const codeFrame = codeFrameMatch ? codeFrameMatch[1].trim() : '';

    // エラーが空の場合は、ページスナップショットから検出を試みる
    if (!error && content.includes('読み込み中...')) {
      return {
        test: 'Unknown Test',
        error: 'ページが「読み込み中...」で止まっている',
        errorType: 'LoadingStuck',
        details: {
          fullContent: content,
          detectedFrom: 'page snapshot',
        },
      };
    }

    if (!error && !content.includes('読み込み中...')) {
      return null;
    }

    // テスト名を抽出（ファイル名から推測）
    const testMatch = content.match(/at\s+([^\s(]+)/);
    const test = testMatch ? testMatch[1] : 'Unknown Test';

    // エラータイプを特定
    let detectedErrorType = 'Unknown';
    const errorText = error || content;
    
    if (errorText.includes('ReferenceError') || errorText.includes('is not defined')) {
      detectedErrorType = 'ReferenceError';
    } else if (errorText.includes('Module not found') || errorText.includes("Can't resolve")) {
      detectedErrorType = 'ModuleNotFound';
    } else if (errorText.includes('Timeout') || errorText.includes('timeout')) {
      detectedErrorType = 'Timeout';
    } else if (errorText.includes('ERR_CONNECTION_REFUSED')) {
      detectedErrorType = 'ConnectionRefused';
    } else if (errorText.includes('locator') && errorText.includes('not found')) {
      detectedErrorType = 'SelectorNotFound';
    } else if (errorText.includes('読み込み中') || content.includes('読み込み中...')) {
      detectedErrorType = 'LoadingStuck';
    }

    return {
      test,
      error: error || 'ページが「読み込み中...」で止まっている',
      errorType: detectedErrorType,
      details: {
        originalErrorType: errorType,
        codeFrame,
        fullContent: content,
      },
    };
  }

  /**
   * エラー情報を分析して修正案を提示
   */
  analyzeErrors(errors: Array<{
    test: string;
    error: string;
    errorType: string;
    details: any;
  }>): {
    autoFixable: Array<{ error: any; fix: string }>;
    manualFixable: Array<{ error: any; suggestion: string }>;
  } {
    const autoFixable: Array<{ error: any; fix: string }> = [];
    const manualFixable: Array<{ error: any; suggestion: string }> = [];

    for (const error of errors) {
      switch (error.errorType) {
        case 'ReferenceError':
          // 変数名を抽出
          const varMatch = error.error.match(/(\w+)\s+is not defined/);
          if (varMatch) {
            const wrongVar = varMatch[1];
            const correctVar = this.suggestCorrectVariableName(wrongVar);
            autoFixable.push({
              error,
              fix: `Replace ${wrongVar} with ${correctVar} in the code`,
            });
          }
          break;

        case 'ModuleNotFound':
          const moduleMatch = error.error.match(/Can't resolve '([^']+)'/);
          if (moduleMatch) {
            const moduleName = moduleMatch[1];
            autoFixable.push({
              error,
              fix: `Replace ${moduleName} import with alternative (e.g., generateUUID() for uuid)`,
            });
          }
          break;

        case 'LoadingStuck':
          autoFixable.push({
            error,
            fix: 'Check if dev server is running: npm run dev',
          });
          break;

        case 'SelectorNotFound':
          manualFixable.push({
            error,
            suggestion: 'Check screenshot and update selector in e2e/helpers.ts',
          });
          break;

        case 'Timeout':
          manualFixable.push({
            error,
            suggestion: 'Increase timeout: --timeout=120000',
          });
          break;

        case 'ConnectionRefused':
          autoFixable.push({
            error,
            fix: 'Start dev server: npm run dev',
          });
          break;

        default:
          manualFixable.push({
            error,
            suggestion: 'Check error details and fix manually',
          });
      }
    }

    return { autoFixable, manualFixable };
  }

  /**
   * 変数名の修正案を提示
   */
  private suggestCorrectVariableName(wrongVar: string): string {
    // スネークケースをキャメルケースに変換
    if (wrongVar.includes('_')) {
      const parts = wrongVar.split('_');
      return parts[0] + parts.slice(1).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
    }
    return wrongVar;
  }
}
