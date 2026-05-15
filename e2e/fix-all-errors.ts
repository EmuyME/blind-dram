/**
 * エラーレポートを自動で確認して修正するスクリプト
 * Playwrightテストとして実行: npm run test:e2e -- e2e/fix-all-errors.spec.ts
 */

import { test } from '@playwright/test';
import { ErrorReportAnalyzer } from './error-report-analyzer';
import * as fs from 'fs';
import * as path from 'path';

test('エラーレポートを分析して修正案を提示', async () => {
  console.log('[AutoFix] Starting error report analysis...\n');

  const analyzer = new ErrorReportAnalyzer();
  
  // 1. すべてのエラーレポートを取得
  const allReports = analyzer.getAllErrorReports();
  
  if (allReports.length === 0) {
    console.log('[AutoFix] No error reports found.');
    console.log('[AutoFix] Run tests first to generate error reports.');
    return;
  }

  console.log(`[AutoFix] Found ${allReports.length} error report(s)\n`);

  // 2. 各エラーレポートを分析
  const fixes: Array<{
    report: string;
    errorType: string;
    issues: string[];
    suggestions: string[];
    canAutoFix: boolean;
  }> = [];

  for (const report of allReports) {
    const analysis = analyzer.analyzeErrorReport(report.content);
    
    console.log(`[AutoFix] Analyzing: ${report.dir}`);
    console.log(`  Error type: ${analysis.errorType}`);
    console.log(`  Issues: ${analysis.issues.join(', ')}`);
    console.log(`  Suggestions: ${analysis.suggestions.join(', ')}\n`);

    // 自動修正可能かどうかを判定
    const canAutoFix = [
      'ReferenceError',
      'ModuleNotFound',
      'LoadingStuck',
    ].includes(analysis.errorType);

    fixes.push({
      report: report.dir,
      errorType: analysis.errorType,
      issues: analysis.issues,
      suggestions: analysis.suggestions,
      canAutoFix,
    });
  }

  // 3. 修正可能なエラーをまとめる
  const autoFixable = fixes.filter(f => f.canAutoFix);
  const manualFixable = fixes.filter(f => !f.canAutoFix);

  console.log('\n[AutoFix] Summary:');
  console.log(`  Auto-fixable: ${autoFixable.length}`);
  console.log(`  Manual fix required: ${manualFixable.length}\n`);

  // 4. 自動修正可能なエラーの詳細を表示
  if (autoFixable.length > 0) {
    console.log('[AutoFix] Auto-fixable errors:');
    for (const fix of autoFixable) {
      console.log(`  - ${fix.report}: ${fix.errorType}`);
      console.log(`    Suggestions: ${fix.suggestions.join(', ')}`);
    }
    console.log('\n[AutoFix] Run the following command to attempt auto-fix:');
    console.log('  npm run test:e2e:fix-reports\n');
  }

  // 5. 手動修正が必要なエラーの詳細を表示
  if (manualFixable.length > 0) {
    console.log('[AutoFix] Manual fix required:');
    for (const fix of manualFixable) {
      console.log(`  - ${fix.report}: ${fix.errorType}`);
      console.log(`    Issues: ${fix.issues.join(', ')}`);
      console.log(`    Suggestions: ${fix.suggestions.join(', ')}`);
    }
    console.log('\n[AutoFix] Please check the screenshots and error context files for details.');
  }

  // 6. 修正結果をファイルに保存
  const resultDir = path.join(process.cwd(), 'e2e', 'fix-results');
  if (!fs.existsSync(resultDir)) {
    fs.mkdirSync(resultDir, { recursive: true });
  }

  const resultFile = path.join(resultDir, `analysis-${Date.now()}.json`);
  const result = {
    timestamp: new Date().toISOString(),
    totalReports: allReports.length,
    autoFixable: autoFixable.length,
    manualFixable: manualFixable.length,
    fixes,
  };

  fs.writeFileSync(resultFile, JSON.stringify(result, null, 2), 'utf-8');
  console.log(`\n[AutoFix] Analysis result saved to: ${resultFile}`);
});
