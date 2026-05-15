import { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 自動修正ロジック
 * エラーパターンを検出して自動的に修正を試みる
 */
export class AutoFix {
  constructor(private page: Page) {}

  /**
   * エラーを検出して修正を試みる
   */
  async detectAndFix(): Promise<{ fixed: boolean; errorType: string; details: any }> {
    // ページが閉じられていないか確認
    if (this.page.isClosed()) {
      return { fixed: false, errorType: 'PageClosed', details: { message: 'Page has been closed' } };
    }

    // コンソールエラーを取得（既にリスナーが設定されている場合は追加しない）
    const consoleErrors: string[] = [];
    const consoleHandler = (msg: any) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    };
    this.page.on('console', consoleHandler);

    // ページエラーを取得
    const pageErrors: string[] = [];
    const pageErrorHandler = (error: Error) => {
      pageErrors.push(error.message);
    };
    this.page.on('pageerror', pageErrorHandler);

    try {
      // エラーメッセージを待つ（ページが閉じられていない場合のみ）
      if (!this.page.isClosed()) {
        await this.page.waitForTimeout(2000);
      }
    } catch (error) {
      // ページが閉じられた場合はエラーを無視
      if (error instanceof Error && error.message.includes('Target page')) {
        return { fixed: false, errorType: 'PageClosed', details: { message: 'Page was closed during detection' } };
      }
      throw error;
    } finally {
      // リスナーを削除
      this.page.off('console', consoleHandler);
      this.page.off('pageerror', pageErrorHandler);
    }

    // エラーパターンを検出
    const allErrors = [...consoleErrors, ...pageErrors];
    
    for (const error of allErrors) {
      // ReferenceError: all_submitted is not defined
      if (error.includes('all_submitted is not defined') || error.includes('all_submitted')) {
        return await this.fixReferenceError('all_submitted', 'allSubmitted');
      }

      // ReferenceError: truth_entered is not defined
      if (error.includes('truth_entered is not defined') || error.includes('truth_entered')) {
        return await this.fixReferenceError('truth_entered', 'truthEntered');
      }

      // Module not found: Can't resolve 'uuid'
      if (error.includes("Can't resolve 'uuid'") || error.includes("Module not found: Can't resolve 'uuid'")) {
        return await this.fixUuidImport();
      }

      // Column does not exist
      if (error.includes('does not exist') && error.includes('column')) {
        return await this.fixMissingColumn(error);
      }

      // Table does not exist
      if (error.includes('Could not find the table')) {
        return await this.fixMissingTable(error);
      }

      // サーバーエラー
      if (error.includes('サーバーエラー') || error.includes('SERVER_ERROR')) {
        return await this.fixServerError(error);
      }
    }

    // UI上のエラーメッセージを確認
    const uiErrors = await this.page.locator('text=/エラー|error|Error|サーバーエラー/').allTextContents();
    if (uiErrors.length > 0) {
      return await this.fixUIError(uiErrors);
    }

    return { fixed: false, errorType: 'unknown', details: { errors: allErrors } };
  }

  /**
   * ReferenceErrorを修正（変数名の不一致）
   */
  async fixReferenceError(wrongName: string, correctName: string): Promise<{ fixed: boolean; errorType: string; details: any }> {
    console.log(`[AutoFix] Fixing ReferenceError: ${wrongName} -> ${correctName}`);
    
    const fixedFiles: string[] = [];
    
    // 修正対象のファイルを検索
    const targetFiles = [
      'app/api/answers/upsert/route.ts',
      'app/api/truths/upsert/route.ts',
      'app/api/round/finish/route.ts',
    ];
    
    for (const filePath of targetFiles.map(f => path.join(process.cwd(), f))) {
      if (!fs.existsSync(filePath)) continue;
      
      let content = fs.readFileSync(filePath, 'utf-8');
      let modified = false;
      
      // パターン1: オブジェクト内の参照（data: { ... all_submitted ... }）
      const pattern1 = new RegExp(`(data:\\{[^}]*?)${wrongName}([^}]*?\\})`, 'g');
      if (pattern1.test(content)) {
        content = content.replace(pattern1, (match, before, after) => {
          return before + correctName + after;
        });
        modified = true;
      }
      
      // パターン2: ログ内の変数参照（all_submitted:all_submitted）
      const pattern2 = new RegExp(`${wrongName}:${wrongName}`, 'g');
      if (pattern2.test(content)) {
        content = content.replace(pattern2, `${wrongName}:${correctName}`);
        modified = true;
      }
      
      // パターン3: JSON.stringify内の参照
      const pattern3 = new RegExp(`JSON\\.stringify\\([^)]*${wrongName}[^)]*\\)`, 'g');
      if (pattern3.test(content)) {
        // より慎重に修正（JSON.stringify内のオブジェクトリテラル）
        content = content.replace(
          new RegExp(`(JSON\\.stringify\\(\\{[^}]*?)${wrongName}([^}]*?\\}[^)]*\\))`, 'g'),
          (match, before, after) => {
            return before + correctName + after;
          }
        );
        modified = true;
      }
      
      if (modified) {
        fs.writeFileSync(filePath, content, 'utf-8');
        fixedFiles.push(filePath);
        console.log(`[AutoFix] Fixed ${wrongName} -> ${correctName} in ${filePath}`);
      }
    }
    
    return { 
      fixed: fixedFiles.length > 0, 
      errorType: 'ReferenceError', 
      details: { wrongName, correctName, fixedFiles } 
    };
  }

  /**
   * uuidインポートエラーを修正
   */
  private async fixUuidImport(): Promise<{ fixed: boolean; errorType: string; details: any }> {
    console.log('[AutoFix] Fixing uuid import error');
    
    // images/upload/route.tsを確認
    const filePath = path.join(process.cwd(), 'app/api/images/upload/route.ts');
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf-8');
      
      if (content.includes("from 'uuid'") || content.includes('from "uuid"')) {
        // uuidインポートを削除
        content = content.replace(/import\s+.*from\s+['"]uuid['"];?\n?/g, '');
        
        // uuidv4()をgenerateUUID()に置換
        content = content.replace(/uuidv4\(\)/g, 'generateUUID()');
        
        // generateUUIDがインポートされているか確認
        if (!content.includes('generateUUID')) {
          // api-utilsからインポートを追加
          const importLine = content.match(/import\s+.*from\s+['"]@\/lib\/api-utils['"]/);
          if (importLine) {
            content = content.replace(
              /import\s+([^}]+)\s+from\s+['"]@\/lib\/api-utils['"]/,
              (match, imports) => {
                if (!imports.includes('generateUUID')) {
                  return `import ${imports}, generateUUID from '@/lib/api-utils'`;
                }
                return match;
              }
            );
          } else {
            // 新しいインポート行を追加
            const firstImport = content.match(/^import\s+.*$/m);
            if (firstImport) {
              content = content.replace(
                firstImport[0],
                `${firstImport[0]}\nimport { generateUUID } from '@/lib/api-utils';`
              );
            }
          }
        }
        
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`[AutoFix] Fixed uuid import in ${filePath}`);
        
        return { fixed: true, errorType: 'ModuleNotFound', details: { file: filePath } };
      }
    }

    return { fixed: false, errorType: 'ModuleNotFound', details: {} };
  }

  /**
   * 欠落しているカラムエラーを修正
   */
  private async fixMissingColumn(error: string): Promise<{ fixed: boolean; errorType: string; details: any }> {
    console.log('[AutoFix] Detected missing column error');
    
    // エラーメッセージからカラム名を抽出
    const columnMatch = error.match(/column\s+[\w.]+\.(\w+)\s+does not exist/);
    if (columnMatch) {
      const columnName = columnMatch[1];
      console.log(`[AutoFix] Missing column: ${columnName}`);
      
      // このエラーはデータベースマイグレーションが必要なので、自動修正は難しい
      // 代わりに、APIコードでカラムの存在チェックを追加する修正を試みる
      
      return { 
        fixed: false, 
        errorType: 'MissingColumn', 
        details: { 
          column: columnName,
          message: 'Database migration required. Please run the migration script.',
          suggestion: `ALTER TABLE ... ADD COLUMN ${columnName} ...`
        } 
      };
    }

    return { fixed: false, errorType: 'MissingColumn', details: { error } };
  }

  /**
   * 欠落しているテーブルエラーを修正
   */
  private async fixMissingTable(error: string): Promise<{ fixed: boolean; errorType: string; details: any }> {
    console.log('[AutoFix] Detected missing table error');
    
    // エラーメッセージからテーブル名を抽出
    const tableMatch = error.match(/Could not find the table ['"]([\w.]+)['"]/);
    if (tableMatch) {
      const tableName = tableMatch[1];
      console.log(`[AutoFix] Missing table: ${tableName}`);
      
      // APIコードでテーブルの存在チェックを追加する修正を試みる
      // settings/get/route.tsなどで既に実装されているパターンを確認
      
      return { 
        fixed: false, 
        errorType: 'MissingTable', 
        details: { 
          table: tableName,
          message: 'Database table does not exist. Please run the migration script.',
          suggestion: `CREATE TABLE ${tableName} ...`
        } 
      };
    }

    return { fixed: false, errorType: 'MissingTable', details: { error } };
  }

  /**
   * サーバーエラーを修正
   */
  private async fixServerError(error: string): Promise<{ fixed: boolean; errorType: string; details: any }> {
    console.log('[AutoFix] Detected server error');
    
    // エラーの詳細を取得
    const errorDetails = await this.page.evaluate(() => {
      const errorElement = document.querySelector('[class*="error"], [class*="Error"]');
      return errorElement?.textContent || '';
    });

    // スクリーンショットを取得
    const screenshotPath = path.join(process.cwd(), 'e2e/screenshots', `server-error-${Date.now()}.png`);
    await this.page.screenshot({ path: screenshotPath, fullPage: true });

    return { 
      fixed: false, 
      errorType: 'ServerError', 
      details: { 
        error,
        errorDetails,
        screenshot: screenshotPath,
        message: 'Server error detected. Check logs for details.'
      } 
    };
  }

  /**
   * UIエラーを修正
   */
  private async fixUIError(errors: string[]): Promise<{ fixed: boolean; errorType: string; details: any }> {
    console.log('[AutoFix] Detected UI errors:', errors);
    
    // スクリーンショットを取得
    const screenshotPath = path.join(process.cwd(), 'e2e/screenshots', `ui-error-${Date.now()}.png`);
    await this.page.screenshot({ path: screenshotPath, fullPage: true });

    // エラーメッセージの内容に応じて修正を試みる
    for (const error of errors) {
      if (error.includes('サーバーエラー')) {
        // ページをリロードして再試行
        await this.page.reload();
        await this.page.waitForTimeout(2000);
        
        // エラーが解消されたか確認
        const stillHasError = await this.page.locator('text=/エラー|error|Error|サーバーエラー/').count();
        if (stillHasError === 0) {
          return { fixed: true, errorType: 'UIError', details: { error, action: 'reload' } };
        }
      }
    }

    return { 
      fixed: false, 
      errorType: 'UIError', 
      details: { 
        errors,
        screenshot: screenshotPath 
      } 
    };
  }

  /**
   * 修正後の検証
   */
  async verifyFix(): Promise<boolean> {
    // ページをリロード
    await this.page.reload();
    await this.page.waitForTimeout(2000);

    // エラーが残っているか確認
    const consoleErrors: string[] = [];
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await this.page.waitForTimeout(1000);

    const uiErrors = await this.page.locator('text=/エラー|error|Error|サーバーエラー/').count();

    return consoleErrors.length === 0 && uiErrors === 0;
  }

  /**
   * 複数のエラーを一括で修正
   */
  async fixMultipleErrors(errors: string[]): Promise<{ fixed: number; total: number; details: any[] }> {
    const results: any[] = [];
    let fixedCount = 0;

    for (let i = 0; i < errors.length; i++) {
      const result = await this.detectAndFix();
      results.push(result);
      if (result.fixed) {
        fixedCount++;
      }
    }

    return {
      fixed: fixedCount,
      total: errors.length,
      details: results,
    };
  }

  /**
   * エラーログをファイルに保存
   */
  async saveErrorLog(error: string, details: any): Promise<string> {
    const logDir = path.join(process.cwd(), 'e2e', 'error-logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const logFile = path.join(logDir, `error-${Date.now()}.json`);
    const logData = {
      timestamp: new Date().toISOString(),
      error,
      details,
      url: this.page.url(),
    };

    fs.writeFileSync(logFile, JSON.stringify(logData, null, 2), 'utf-8');
    return logFile;
  }

  /**
   * エラーレポートから修正を試みる
   */
  async fixFromErrorReport(errorReportContent: string): Promise<{ fixed: boolean; errorType: string; details: any }> {
    // エラーレポートの内容を分析
    if (errorReportContent.includes('読み込み中...')) {
      // 開発サーバーが起動していない可能性
      console.log('[AutoFix] Detected "読み込み中..." - checking dev server...');
      try {
        const response = await this.page.goto('http://localhost:3000', { timeout: 5000 });
        if (response && response.ok()) {
          return { fixed: true, errorType: 'LoadingStuck', details: { message: 'Dev server is running' } };
        }
      } catch {
        return { 
          fixed: false, 
          errorType: 'LoadingStuck', 
          details: { 
            message: 'Dev server is not running',
            suggestion: 'Please run: npm run dev'
          } 
        };
      }
    }

    // その他のエラーパターンは通常のdetectAndFixで処理
    return await this.detectAndFix();
  }
}
