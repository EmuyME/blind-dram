import { test } from '@playwright/test';
import { ErrorReportAnalyzer } from './error-report-analyzer';
import { AutoFix } from './auto-fix';
import * as fs from 'fs';
import * as path from 'path';

/**
 * エラーレポートを自動で確認して修正するテスト
 */
test.describe('Auto Fix From Error Reports', () => {
  test('エラーレポートを確認して自動修正', async ({ page }) => {
    const analyzer = new ErrorReportAnalyzer();
    const autoFix = new AutoFix(page);

    // 1. 最新のエラーレポートを取得
    const errorReport = analyzer.getLatestErrorReport();
    
    if (!errorReport) {
      console.log('[AutoFix] No error reports found. Running a test first...');
      // エラーレポートがない場合は、まずテストを実行してエラーを生成
      return;
    }

    console.log(`[AutoFix] Found error report: ${errorReport.path}`);
    
    // 2. エラーレポートを分析
    const analysis = analyzer.analyzeErrorReport(errorReport.content);
    console.log(`[AutoFix] Error type: ${analysis.errorType}`);
    console.log(`[AutoFix] Issues: ${analysis.issues.join(', ')}`);
    console.log(`[AutoFix] Suggestions: ${analysis.suggestions.join(', ')}`);

    // 3. エラータイプに応じて修正を試みる
    let fixed = false;

    switch (analysis.errorType) {
      case 'LoadingStuck':
        // 開発サーバーが起動しているか確認
        console.log('[AutoFix] Checking if dev server is running...');
        try {
          const response = await page.goto('http://localhost:3000', { timeout: 5000 });
          if (response && response.ok()) {
            console.log('[AutoFix] Dev server is running');
            fixed = true;
          }
        } catch {
          console.log('[AutoFix] Dev server is not running. Please start it with: npm run dev');
          // 開発サーバーを起動する試み（バックグラウンドで）
          try {
            console.log('[AutoFix] Attempting to start dev server...');
            // 注意: これは実際には動作しない可能性がある（別プロセスが必要）
            // ユーザーに手動で起動してもらう必要がある
          } catch {
            console.log('[AutoFix] Could not start dev server automatically');
          }
        }
        break;

      case 'ReferenceError':
        // ReferenceErrorの修正を試みる
        console.log('[AutoFix] Attempting to fix ReferenceError...');
        const fixResult = await autoFix.detectAndFix();
        if (fixResult.fixed) {
          console.log(`[AutoFix] Fixed ReferenceError: ${fixResult.details}`);
          fixed = true;
        }
        break;

      case 'ModuleNotFound':
        // ModuleNotFoundの修正を試みる
        console.log('[AutoFix] Attempting to fix ModuleNotFound...');
        const moduleFixResult = await autoFix.detectAndFix();
        if (moduleFixResult.fixed) {
          console.log(`[AutoFix] Fixed ModuleNotFound: ${moduleFixResult.details}`);
          fixed = true;
        }
        break;

      case 'SelectorNotFound':
        // セレクタの問題は手動修正が必要
        console.log('[AutoFix] Selector not found. Manual fix required.');
        console.log('[AutoFix] Please check the screenshot and update selectors in e2e/helpers.ts');
        break;

      case 'Timeout':
        // タイムアウト設定を延長する提案
        console.log('[AutoFix] Timeout error detected. Consider increasing timeout.');
        break;

      default:
        console.log(`[AutoFix] Unknown error type: ${analysis.errorType}`);
    }

    // 4. 修正結果を記録
    const result = {
      timestamp: new Date().toISOString(),
      errorReport: errorReport.path,
      errorType: analysis.errorType,
      issues: analysis.issues,
      suggestions: analysis.suggestions,
      fixed,
    };

    const resultDir = path.join(process.cwd(), 'e2e', 'fix-results');
    if (!fs.existsSync(resultDir)) {
      fs.mkdirSync(resultDir, { recursive: true });
    }

    const resultFile = path.join(resultDir, `fix-result-${Date.now()}.json`);
    fs.writeFileSync(resultFile, JSON.stringify(result, null, 2), 'utf-8');
    console.log(`[AutoFix] Fix result saved to: ${resultFile}`);

    // 5. 修正が成功した場合、テストを再実行
    if (fixed) {
      console.log('[AutoFix] Fix applied. Please re-run the test to verify.');
    } else {
      console.log('[AutoFix] Could not auto-fix. Please check the suggestions above.');
    }
  });

  test('すべてのエラーレポートを確認', async () => {
    const analyzer = new ErrorReportAnalyzer();
    const allReports = analyzer.getAllErrorReports();

    console.log(`[AutoFix] Found ${allReports.length} error report(s)`);

    for (const report of allReports) {
      const analysis = analyzer.analyzeErrorReport(report.content);
      console.log(`\n[AutoFix] Report: ${report.dir}`);
      console.log(`[AutoFix] Error type: ${analysis.errorType}`);
      console.log(`[AutoFix] Issues: ${analysis.issues.join(', ')}`);
      console.log(`[AutoFix] Suggestions: ${analysis.suggestions.join(', ')}`);
    }
  });
});
