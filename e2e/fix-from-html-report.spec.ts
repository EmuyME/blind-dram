import { test } from '@playwright/test';
import { HtmlReportAnalyzer } from './html-report-analyzer';
import { AutoFix } from './auto-fix';
import * as fs from 'fs';
import * as path from 'path';

/**
 * HTMLレポートからエラー情報を抽出して自動修正を試みる
 */
test.describe('Fix From HTML Report', () => {
  test('HTMLレポートからエラーを抽出して自動修正', async ({ page }) => {
    const analyzer = new HtmlReportAnalyzer();
    const autoFix = new AutoFix(page);

    console.log('[AutoFix] Extracting errors from HTML report...');

    // 1. HTMLレポートからエラー情報を抽出
    const errors = await analyzer.extractErrorsFromHtmlReport();

    if (errors.length === 0) {
      console.log('[AutoFix] No errors found in HTML report');
      return;
    }

    console.log(`[AutoFix] Found ${errors.length} error(s) in HTML report\n`);

    // 2. エラーを分析
    const analysis = analyzer.analyzeErrors(errors);

    console.log(`[AutoFix] Auto-fixable: ${analysis.autoFixable.length}`);
    console.log(`[AutoFix] Manual fix required: ${analysis.manualFixable.length}\n`);

    // 3. 自動修正可能なエラーを修正
    const fixResults: Array<{ error: any; fixed: boolean; details: any }> = [];

    for (const { error, fix } of analysis.autoFixable) {
      console.log(`[AutoFix] Attempting to fix: ${error.errorType}`);
      console.log(`[AutoFix] Error: ${error.error.substring(0, 100)}...`);
      console.log(`[AutoFix] Fix: ${fix}\n`);

      let fixed = false;
      let details: any = {};

      switch (error.errorType) {
        case 'ReferenceError':
          // 変数名を抽出して修正
          const varMatch = error.error.match(/(\w+)\s+is not defined/);
          if (varMatch) {
            const wrongVar = varMatch[1];
            const correctVar = wrongVar.includes('_')
              ? wrongVar.split('_').map((p, i) => i === 0 ? p : p.charAt(0).toUpperCase() + p.slice(1)).join('')
              : wrongVar;
            
            const fixResult = await autoFix.fixReferenceError(wrongVar, correctVar);
            fixed = fixResult.fixed;
            details = fixResult.details;
          }
          break;

        case 'ModuleNotFound':
          const moduleFixResult = await autoFix.fixUuidImport();
          fixed = moduleFixResult.fixed;
          details = moduleFixResult.details;
          break;

        case 'LoadingStuck':
        case 'ConnectionRefused':
          // 開発サーバーが起動しているか確認
          try {
            const response = await page.goto('http://localhost:3000', { timeout: 5000 });
            if (response && response.ok()) {
              fixed = true;
              details = { message: 'Dev server is running' };
            }
          } catch {
            fixed = false;
            details = { message: 'Dev server is not running. Please run: npm run dev' };
          }
          break;
      }

      fixResults.push({ error, fixed, details });

      if (fixed) {
        console.log(`[AutoFix] ✓ Fixed: ${error.errorType}\n`);
      } else {
        console.log(`[AutoFix] ✗ Could not fix: ${error.errorType}\n`);
      }
    }

    // 4. 手動修正が必要なエラーの詳細を表示
    if (analysis.manualFixable.length > 0) {
      console.log('[AutoFix] Manual fix required:');
      for (const { error, suggestion } of analysis.manualFixable) {
        console.log(`  - ${error.errorType}: ${suggestion}`);
        console.log(`    Error: ${error.error.substring(0, 100)}...\n`);
      }
    }

    // 5. 修正結果を保存
    const resultDir = path.join(process.cwd(), 'e2e', 'fix-results');
    if (!fs.existsSync(resultDir)) {
      fs.mkdirSync(resultDir, { recursive: true });
    }

    const resultFile = path.join(resultDir, `html-report-fix-${Date.now()}.json`);
    const result = {
      timestamp: new Date().toISOString(),
      totalErrors: errors.length,
      autoFixable: analysis.autoFixable.length,
      manualFixable: analysis.manualFixable.length,
      fixed: fixResults.filter(r => r.fixed).length,
      errors,
      analysis,
      fixResults,
    };

    fs.writeFileSync(resultFile, JSON.stringify(result, null, 2), 'utf-8');
    console.log(`[AutoFix] Fix results saved to: ${resultFile}`);

    // 6. 修正結果のサマリー
    console.log('\n[AutoFix] Summary:');
    console.log(`  Total errors: ${errors.length}`);
    console.log(`  Fixed: ${fixResults.filter(r => r.fixed).length}`);
    console.log(`  Could not fix: ${fixResults.filter(r => !r.fixed).length}`);
    console.log(`  Manual fix required: ${analysis.manualFixable.length}`);
  });
});
